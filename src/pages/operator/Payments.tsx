import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, Printer, Check, Mail, ArrowLeft } from 'lucide-react';
import { PaymentHistoryList } from '../../components/profile/PaymentHistoryList';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

export const Payments = () => {
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [selectedClassesToPay, setSelectedClassesToPay] = useState<string[]>([]);
    const [autoSendEmail, setAutoSendEmail] = useState(true);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [classCategories, setClassCategories] = useState<any[]>([]);
    const [sendingEmail, setSendingEmail] = useState(false);
    const { userRole } = useAuth();



    const navigate = useNavigate();
    const location = useLocation();

    // Fetch class categories on mount
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const categories = await window.electronAPI.getClassCategories();
                setClassCategories(categories);
            } catch (err) {
                console.error("Failed to load class categories", err);
            }
        };
        loadCategories();
    }, []);

    // Handle navigation from student list
    useEffect(() => {
        if (location.state?.studentRegNum) {
            searchStudent(location.state.studentRegNum);
            // clean up state to prevent re-triggering if needed, but react-router state persists. 
            // We might want to clear it or just let it be. 
            // For now, it's fine.
        }
    }, [location.state]);

    const searchStudent = async (query: string) => {
        setPaymentSuccess(false);
        setSelectedStudent(null);

        if (query.length > 0) {
            try {
                // @ts-ignore
                const student = await window.electronAPI.getStudent(query);

                if (student) {
                    // Find matching category to get the fee
                    // If category is not loaded yet, we might miss this. 

                    // Simple logic: ensure categories are loaded
                    const fees = classCategories.length > 0 ? classCategories : await window.electronAPI.getClassCategories();

                    // Parse class list if it's not an array
                    let studentClasses = Array.isArray(student.class) ? student.class : [student.class];
                    try {
                        if (typeof student.class === 'string' && student.class.startsWith('[')) {
                            studentClasses = JSON.parse(student.class);
                        }
                    } catch (e) {
                        // fallback
                    }

                    // Map classes to includes fees and status
                    // backend 'getStudent' returns 'classStatuses' which we should use if available
                    // If not, we calculate locally for now to be safe or if backend is older version

                    const classDetails = studentClasses.map((cls: string) => {
                        const cat = fees.find((c: any) => c.name === cls);

                        // Check status from backend object if available
                        let status = 'pending';
                        if (student.classStatuses) {
                            const found = student.classStatuses.find((cs: any) => cs.className === cls);
                            if (found) status = found.status;
                        }

                        return {
                            name: cls,
                            fee: cat ? cat.fee : 0,
                            status: status
                        };
                    });

                    // Fetch payment history
                    let lastPaymentDate = 'No record';
                    try {
                        // @ts-ignore
                        const payments = await window.electronAPI.getStudentPayments(student.regNum);
                        if (payments && payments.length > 0) {
                            lastPaymentDate = payments[0].date;
                            setPaymentHistory(payments);
                        } else {
                            setPaymentHistory([]);
                        }
                    } catch (err) {
                        console.error("Failed to fetch payments", err);
                    }

                    const newStudent = {
                        id: student.regNum,
                        name: student.name,
                        email: student.email,
                        phone: student.phone, // Add phone number
                        regNum: student.regNum,
                        classes: classDetails, // Array of { name, fee, status }
                        lastPayment: lastPaymentDate,
                    };

                    setSelectedStudent(newStudent);

                    // Auto-select unpaid classes
                    const unpaid = classDetails
                        .filter((c: any) => c.status !== 'paid')
                        .map((c: any) => c.name);
                    setSelectedClassesToPay(unpaid);

                } else {
                    toast.info('Student not found');
                }
            } catch (error) {
                console.error("Search failed", error);
            }
        }
    };



    const handleProcessPayment = async () => {
        if (!selectedStudent || selectedClassesToPay.length === 0) {
            toast.warning('No classes selected');
            return;
        }

        const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const date = new Date().toISOString().split('T')[0];

        // Get selected method
        const methodInput = document.querySelector('input[name="method"]:checked') as HTMLInputElement;
        const method = methodInput ? methodInput.nextElementSibling?.textContent || 'Cash' : 'Cash';

        try {
            // Process each selected class as a separate payment
            for (const className of selectedClassesToPay) {
                const classInfo = selectedStudent.classes.find((c: any) => c.name === className);
                if (!classInfo) continue;

                const paymentData = {
                    regNum: selectedStudent.regNum,
                    amount: classInfo.fee,
                    month: month,
                    date: date,
                    method: method,
                    type: 'Monthly Fee',
                    class: className // Save class name
                };

                await window.electronAPI.addPayment(paymentData);
            }

            setPaymentSuccess(true);

            // Calculate totals for receipt
            const paidItems = selectedStudent.classes
                .filter((c: any) => selectedClassesToPay.includes(c.name));
            const totalAmount = paidItems.reduce((sum: number, c: any) => sum + c.fee, 0);
            const courseNames = paidItems.map((c: any) => c.name).join(', ');
            const receiptNo = 'REC-' + Date.now().toString().slice(-6);

            // 1. Auto-send email if enabled
            if (autoSendEmail && selectedStudent.email) {
                try {
                    setSendingEmail(true);

                    await window.electronAPI.sendReceiptEmail({
                        email: selectedStudent.email,
                        studentName: selectedStudent.name,
                        amount: totalAmount,
                        date: date,
                        receiptNo: receiptNo,
                        course: courseNames
                    });
                    console.log("Auto-email sent successfully");
                } catch (emailErr) {
                    console.error("Auto-email failed", emailErr);
                    // alert("Payment recorded, but failed to send auto-receipt email.");
                } finally {
                    setSendingEmail(false);
                }
            }

            // 2. Send SMS Notification
            if (selectedStudent.phone) {
                try {
                    const smsMessage = `SL Dream: Payment Received.\nLKR ${totalAmount}\nMonth: ${month}\nClass: ${courseNames}\nRef: ${receiptNo}\nThank you.`;

                    await window.electronAPI.sendManualSms({
                        recipients: [selectedStudent.phone],
                        message: smsMessage
                    });
                    console.log("Payment SMS sent successfully");
                } catch (smsErr: any) {
                    if (smsErr.message && smsErr.message.includes('disabled')) {
                        console.log("SMS skipped (service disabled)");
                    } else {
                        console.error("Payment SMS failed", smsErr);
                    }
                }
            }

            refreshData(); // Updates history and status
        } catch (error) {
            console.error("Payment failed", error);
            toast.error('Payment processing failed');
        }
    };

    const handleSendEmail = async () => {
        if (!selectedStudent || !selectedStudent.email) {
            toast.info('No email found for student');
            return;
        }

        // Calculate total info for receipt
        const paidItems = selectedStudent.classes
            .filter((c: any) => selectedClassesToPay.includes(c.name));
        const totalAmount = paidItems.reduce((sum: number, c: any) => sum + c.fee, 0);
        const courseNames = paidItems.map((c: any) => c.name).join(', ');

        setSendingEmail(true);
        try {
            const date = new Date().toISOString().split('T')[0];
            await window.electronAPI.sendReceiptEmail({
                email: selectedStudent.email,
                studentName: selectedStudent.name,
                amount: totalAmount,
                date: date,
                receiptNo: 'REC-' + Date.now().toString().slice(-6),
                course: courseNames
            });
            toast.success('Email receipt sent!');
        } catch (error) {
            console.error("Failed to send email:", error);
            toast.error('Failed to send email');
        } finally {
            setSendingEmail(false);
        }
    };

    // Helper to refresh data after payment
    const refreshData = () => {
        if (selectedStudent) {
            searchStudent(selectedStudent.regNum);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8" >
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(`/${userRole}/students`)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors dark:hover:bg-slate-800"
                >
                    <ArrowLeft className="text-gray-600 dark:text-slate-300" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Collection</h1>
                    <p className="text-gray-500 dark:text-slate-400">Record payments and issue receipts</p>
                </div>
            </div>



            {selectedStudent && (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in dark:bg-slate-900 dark:border-slate-800">
                    <div className="p-6 bg-primary-50 border-b border-primary-100 dark:bg-slate-800/50 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-primary-dark dark:text-white">{selectedStudent.name}</h2>
                            <p className="text-primary dark:text-slate-400 font-mono">{selectedStudent.regNum}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-primary dark:text-slate-400">Class Count</p>
                            <p className="font-bold text-primary-dark dark:text-white">{selectedStudent.classes.length} Classes</p>
                        </div>
                    </div>

                    <div className="p-8">
                        {!paymentSuccess ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div className="p-4 bg-gray-50 rounded-lg dark:bg-slate-900">
                                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Previous Payment</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{selectedStudent.lastPayment}</p>
                                    </div>
                                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/50">
                                        <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Total Selected</p>
                                        <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                                            LKR {selectedStudent.classes
                                                .filter((c: any) => selectedClassesToPay.includes(c.name))
                                                .reduce((sum: number, c: any) => sum + c.fee, 0)
                                                .toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Class Selection List */}
                                <div className="space-y-3 mb-8">
                                    <h3 className="font-medium text-gray-700 dark:text-slate-300">Select Classes to Pay</h3>
                                    <div className="grid gap-3">
                                        {selectedStudent.classes.map((cls: any) => (
                                            <label
                                                key={cls.name}
                                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedClassesToPay.includes(cls.name)
                                                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                    : 'border-slate-100 hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700'
                                                    } ${cls.status === 'paid' ? 'opacity-60 bg-green-50 border-green-200 cursor-not-allowed dark:bg-green-900/20 dark:border-green-900' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedClassesToPay.includes(cls.name)
                                                        ? 'bg-primary border-primary text-white dark:text-slate-900'
                                                        : 'border-slate-300 bg-white dark:bg-slate-900'
                                                        }`}>
                                                        {selectedClassesToPay.includes(cls.name) && <Check size={12} strokeWidth={3} />}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800 dark:text-slate-200">{cls.name}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            Status:
                                                            <span className={`ml-1 font-medium ${cls.status === 'overdue' ? 'text-red-500' :
                                                                cls.status === 'paid' ? 'text-green-600 dark:text-green-400' :
                                                                    'text-orange-500'
                                                                }`}>
                                                                {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="font-bold text-slate-700 dark:text-slate-300">
                                                    LKR {cls.fee.toLocaleString()}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    disabled={cls.status === 'paid'}
                                                    checked={selectedClassesToPay.includes(cls.name)}
                                                    onChange={() => {
                                                        if (cls.status === 'paid') return;
                                                        if (selectedClassesToPay.includes(cls.name)) {
                                                            setSelectedClassesToPay(prev => prev.filter(c => c !== cls.name));
                                                        } else {
                                                            setSelectedClassesToPay(prev => [...prev, cls.name]);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 py-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Payment Method</label>
                                        <div className="flex flex-col gap-3">
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer dark:text-slate-300">
                                                    <input type="radio" name="method" defaultChecked className="text-primary focus:ring-indigo-500" />
                                                    <span>Cash</span>
                                                </label>

                                            </div>

                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400">
                                                <input
                                                    type="checkbox"
                                                    checked={autoSendEmail}
                                                    onChange={(e) => setAutoSendEmail(e.target.checked)}
                                                    className="rounded border-gray-300 text-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-900"
                                                />
                                                <div className="flex items-center gap-1.5">
                                                    <Mail size={14} />
                                                    <span>Auto-send receipt email to student</span>
                                                </div>
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
                                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-green-900/40 dark:text-green-400">
                                    <Check size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h3>
                                <p className="text-gray-500 dark:text-slate-400 mb-8">Receipt #REC-2026-0089 generated successfully.</p>

                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={() => navigate(`/${userRole}/students`)}
                                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 from-medium dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white"
                                    >
                                        Back to List
                                    </button>
                                    <button
                                        onClick={handleSendEmail}
                                        disabled={sendingEmail}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Mail size={18} />
                                        {sendingEmail ? 'Sending...' : 'Send Email Receipt'}
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium flex items-center gap-2"
                                    >
                                        <Printer size={18} />
                                        Print Receipt
                                    </button>
                                </div>
                            </div>
                        )}


                        {/* Payment History Section */}
                        {paymentHistory.length > 0 && (
                            <div className="mt-8 border-t border-slate-100 pt-8 animate-fade-in dark:border-slate-800">
                                <PaymentHistoryList payments={paymentHistory.map(p => ({
                                    ...p,
                                    status: 'paid' // Historical payments are effectively paid
                                }))} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
};

export default Payments;
