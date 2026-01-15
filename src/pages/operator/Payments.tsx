import { useState } from 'react';
import { Search, CreditCard, Printer, Check } from 'lucide-react';

export const Payments = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    // Search for demo
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setPaymentSuccess(false);
        setSelectedStudent(null);

        if (searchQuery.length > 0) {
            try {
                // @ts-ignore
                const student = await window.electronAPI.getStudent(searchQuery);

                if (student) {
                    setSelectedStudent({
                        id: student.regNum,
                        name: student.name,
                        regNum: student.regNum,
                        class: student.class,
                        monthlyFee: 5000, // Hardcoded for now, or add to DB schema
                        lastPayment: 'No record', // Need separate payments table to track this real history
                        dueAmount: 5000
                    });
                } else {
                    alert('Student not found');
                }
            } catch (error) {
                console.error("Search failed", error);
            }
        }
    };

    const handleProcessPayment = async () => {
        if (!selectedStudent) return;

        const amount = 5000; // Hardcoded for now based on requirement
        const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const date = new Date().toISOString().split('T')[0];

        // Get selected method
        const methodInput = document.querySelector('input[name="method"]:checked') as HTMLInputElement;
        const method = methodInput ? methodInput.nextElementSibling?.textContent || 'Cash' : 'Cash';

        const paymentData = {
            regNum: selectedStudent.regNum,
            amount: amount,
            month: month,
            date: date,
            method: method,
            type: 'Monthly Fee'
        };

        try {
            await window.electronAPI.addPayment(paymentData);
            setPaymentSuccess(true);
        } catch (error) {
            console.error("Payment failed", error);
            alert("Failed to process payment");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Payment Collection</h1>
                <p className="text-gray-500">Record payments and issue receipts</p>
            </div>

            {/* Search Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Enter Student Registration ID (e.g., SLDJ-2026-N5-0012)"
                            className="pl-10 w-full rounded-lg border-gray-300 focus:ring-primary focus:border-primary p-3"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="bg-primary text-white px-6 rounded-lg font-medium hover:bg-primary-dark transition-colors">
                        Find Student
                    </button>
                </form>
            </div>

            {selectedStudent && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
                    <div className="p-6 bg-primary-50 border-b border-primary-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-primary-dark">{selectedStudent.name}</h2>
                            <p className="text-primary font-mono">{selectedStudent.regNum}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-primary">Current Class</p>
                            <p className="font-bold text-primary-dark">{selectedStudent.class}</p>
                        </div>
                    </div>

                    <div className="p-8">
                        {!paymentSuccess ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-500 mb-1">Previous Payment</p>
                                        <p className="font-medium text-gray-900">{selectedStudent.lastPayment}</p>
                                    </div>
                                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                                        <p className="text-sm text-orange-600 mb-1">Amount Due</p>
                                        <p className="text-2xl font-bold text-orange-700">LKR {selectedStudent.dueAmount.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 py-4 border-t border-gray-100">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="method" defaultChecked className="text-primary focus:ring-indigo-500" />
                                                <span>Cash</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="method" className="text-primary focus:ring-indigo-500" />
                                                <span>Card</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="method" className="text-primary focus:ring-indigo-500" />
                                                <span>Bank Transfer</span>
                                            </label>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleProcessPayment}
                                        className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow-md hover:bg-green-700 transition-colors flex items-center gap-2"
                                    >
                                        <CreditCard size={20} />
                                        Collect Payment
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
                                <p className="text-gray-500 mb-8">Receipt #REC-2026-0089 generated successfully.</p>

                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={() => { setSelectedStudent(null); setSearchQuery(''); }}
                                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 from-medium"
                                    >
                                        Next Student
                                    </button>
                                    <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium flex items-center gap-2">
                                        <Printer size={18} />
                                        Print Receipt
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payments;
