import { useState, useEffect } from 'react';
import { Download, CreditCard, Ban, Calendar, TrendingUp } from 'lucide-react';


interface Payment {
    id: number;
    regNum: string;
    studentName?: string;
    amount: number;
    month: string;
    date: string;
    method: string;
    type: string;
    class: string;
}

interface Stats {
    totalRevenue: number;
    monthlyRevenue: number;
    todaysRevenue: number;
    pendingAmount: number;
}

const AdminPayments = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stats, setStats] = useState<Stats>({ totalRevenue: 0, monthlyRevenue: 0, todaysRevenue: 0, pendingAmount: 0 });
    const [groupByMonth, setGroupByMonth] = useState<{ [key: string]: Payment[] }>({});
    const [loading, setLoading] = useState(true);

    const [filterDate, setFilterDate] = useState('');
    const [filterMonth, setFilterMonth] = useState('');

    useEffect(() => {
        loadData();
    }, [filterDate, filterMonth]); // Reload/re-filter when filters change

    const loadData = async () => {
        try {
            setLoading(true);
            // @ts-ignore
            let allPayments = await window.electronAPI.getAllPayments();
            // @ts-ignore
            const statsData = await window.electronAPI.getAdminPaymentStats();

            // Filter Logic
            if (filterDate) {
                // DB date format varies, but usually "M/D/YYYY" or similar locale string from `toLocaleDateString`.
                // Input date is "YYYY-MM-DD".
                // We need to normalize. Ideally we should have stored ISO in DB.
                // Let's try to match by creating a Date object from DB date string and comparing.
                allPayments = allPayments.filter((p: Payment) => {
                    const dbDate = new Date(p.date);
                    const filter = new Date(filterDate);
                    return dbDate.toDateString() === filter.toDateString();
                });
            } else if (filterMonth) {
                // filterMonth is "YYYY-MM"
                // payment.month is "January 2026"
                const [year, month] = filterMonth.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                const monthString = date.toLocaleString('default', { month: 'long', year: 'numeric' });

                allPayments = allPayments.filter((p: Payment) => p.month === monthString);
            }

            setPayments(allPayments);
            setStats(statsData);


            // Group payments by month
            const grouped = allPayments.reduce((acc: any, payment: Payment) => {
                const month = payment.month; // e.g. "January 2026"
                if (!acc[month]) acc[month] = [];
                acc[month].push(payment);
                return acc;
            }, {});
            setGroupByMonth(grouped);

        } catch (error) {
            console.error("Failed to load payment data", error);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        const headers = ['Receipt ID', 'Date', 'Student', 'Class', 'Type', 'Method', 'Month', 'Amount'];
        const rows = payments.map(p => [
            p.id,
            p.date,
            p.studentName || p.regNum,
            p.class,
            p.type,
            p.method,
            p.month,
            p.amount
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "payments_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full">Loading...</div>;
    }

    // Helper to format currency
    const formatLKR = (amount: number) => `LKR ${amount.toLocaleString()}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
                    <p className="text-gray-500">Track revenue and payment history</p>
                </div>
                <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition w-fit"
                >
                    <Download size={18} />
                    Export CSV
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatLKR(stats.totalRevenue)}</h3>
                        <p className="text-xs text-green-600 font-medium mt-1">All time earnings</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <CreditCard size={24} />
                    </div>
                </div>

                {/* Monthly Revenue */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatLKR(stats.monthlyRevenue)}</h3>
                        <p className="text-xs text-gray-500 mt-1">For {new Date().toLocaleString('default', { month: 'long' })}</p>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <Calendar size={24} />
                    </div>
                </div>

                {/* Today's Revenue */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Today's Revenue</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatLKR(stats.todaysRevenue)}</h3>
                        <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                        <TrendingUp size={24} />
                    </div>
                </div>

                {/* Pending */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Amount</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatLKR(stats.pendingAmount)}</h3>
                        <p className="text-xs text-orange-600 font-medium mt-1">Estimated unpaid fees</p>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                        <Ban size={24} />
                    </div>
                </div>
            </div>



            {/* Payment History Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-gray-900">Payment History</h2>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Filter:</span>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => {
                                    setFilterDate(e.target.value);
                                    if (e.target.value) setFilterMonth(''); // Clear month if date selected
                                }}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-primary focus:border-primary"
                            />
                            <span className="text-sm text-gray-400">OR</span>
                            <input
                                type="month"
                                value={filterMonth}
                                onChange={(e) => {
                                    setFilterMonth(e.target.value);
                                    if (e.target.value) setFilterDate(''); // Clear date if month selected
                                }}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-primary focus:border-primary"
                            />
                        </div>
                        {(filterDate || filterMonth) && (
                            <button
                                onClick={() => { setFilterDate(''); setFilterMonth(''); }}
                                className="text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {Object.keys(groupByMonth).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(month => (
                        <div key={month}>
                            <div className="px-6 py-3 bg-gray-50 border-y border-gray-200 font-semibold text-gray-700 text-sm">
                                {month}
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {groupByMonth[month].map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.studentName || payment.regNum}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.class}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{payment.type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{payment.method}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{formatLKR(payment.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminPayments;
