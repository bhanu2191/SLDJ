import { useState, useEffect } from 'react';
import { CreditCard, Ban, Calendar, TrendingUp, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { PaymentReportModal } from '../../components/reports/PaymentReportModal';


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
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [allPaymentsData, setAllPaymentsData] = useState<Payment[]>([]); // Store unfiltered for reports
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    // Default to current month
    const [filterMonth, setFilterMonth] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    });
    const [filterClass, setFilterClass] = useState('');
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);

    useEffect(() => {
        setCurrentPage(1); // Reset page on filter change
        loadData();
    }, [filterMonth, filterClass]); // Reload/re-filter when filters change

    const loadData = async () => {
        try {
            setLoading(true);
            // @ts-ignore
            let allPayments = await window.electronAPI.getAllPayments();
            // @ts-ignore
            const statsData = await window.electronAPI.getAdminPaymentStats();

            setAllPaymentsData(allPayments); // Save raw data for reports

            // Extract unique classes
            const classes = Array.from(new Set(allPayments.map((p: Payment) => p.class))).filter(Boolean).sort() as string[];
            setAvailableClasses(classes);

            // Filter Logic
            if (filterMonth) {
                // filterMonth is "YYYY-MM"
                // payment.month is "January 2026"
                const [year, month] = filterMonth.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                const monthString = date.toLocaleString('default', { month: 'long', year: 'numeric' });

                allPayments = allPayments.filter((p: Payment) => p.month === monthString);
            }

            if (filterClass) {
                allPayments = allPayments.filter((p: Payment) => p.class === filterClass);
            }

            setPayments(allPayments);
            setStats(statsData);

            // Pagination Logic
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const paginatedPayments = allPayments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

            // Group payments by month (using paginated data)
            const grouped = paginatedPayments.reduce((acc: any, payment: Payment) => {
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

    // Calculate total pages based on current filtered payments count (need access to allPayments length effectively)
    // IMPORTANT: loadData updates state asynchronously. 
    // To handle pagination correctly dynamically without re-fetching everything, strictly we should filter first then paginate.
    // However, loadData does everything. Let's adjust loadData dependency:
    // Actually, `loadData` sets `payments` state to the *filtered* list. 
    // So we can re-derive the grouped data in a separate effect or memo, OR just update the current approach.
    // The current approach in `loadData` sets `payments` to `allPayments` (the filtered list).
    // So we can use `payments` state length for total pages calculation.
    // BUT `loadData` is setting `grouped` based on local `allPayments` variable. 
    // If I use `payments` state for rendering pagination controls, I need to make sure `groupByMonth` reflects the slice.

    // RETHINK: separating data loading/filtering from pagination/grouping would be cleaner, 
    // but to keep changes minimal to the existing structure:
    // I need `useEffect` on `currentPage` to re-run the slicing?
    // OR just include `currentPage` in the dependency array of `loadData`?
    // YES, adding `currentPage` to dependencies.

    useEffect(() => {
        loadData();
    }, [currentPage]);


    // Old CSV Export Removed
    /* 
    const exportCSV = () => { ... }
    */

    if (loading) {
        return <div className="flex items-center justify-center h-full">Loading...</div>;
    }

    // Helper to format currency
    const formatLKR = (amount: number) => `LKR ${amount.toLocaleString()}`;

    return (
        <div className="space-y-6">
            <PaymentReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                payments={allPaymentsData}
            />

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
                    <p className="text-gray-500">Track revenue and payment history</p>
                </div>
                <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition w-fit shadow-sm"
                >
                    <FileSpreadsheet size={18} />
                    Generate Report
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
                            <span className="text-sm text-gray-500">Filter by:</span>
                            <input
                                type="month"
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-primary focus:border-primary"
                            />

                            <select
                                value={filterClass}
                                onChange={(e) => setFilterClass(e.target.value)}
                                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-primary focus:border-primary min-w-[150px]"
                            >
                                <option value="">All Classes</option>
                                {availableClasses.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        {(filterMonth || filterClass) && (
                            <button
                                onClick={() => { setFilterMonth(''); setFilterClass(''); }}
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
                    {Object.keys(groupByMonth).length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            No payments found for this period.
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing dates <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, payments.length)}</span> of{' '}
                                <span className="font-medium">{payments.length}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => (prev * ITEMS_PER_PAGE < payments.length ? prev + 1 : prev))}
                                    disabled={currentPage * ITEMS_PER_PAGE >= payments.length}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPayments;
