import { useState, useEffect } from 'react';
import { CreditCard, Ban, Calendar, TrendingUp, ChevronLeft, ChevronRight, FileSpreadsheet, RefreshCcw, Search } from 'lucide-react';
import { PaymentReportModal } from '../../components/reports/PaymentReportModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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
    const [filterClass, setFilterClass] = useState('ALL');
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);

    useEffect(() => {
        setCurrentPage(1); // Reset page on filter change
        loadData();
    }, [filterMonth, filterClass]); // Reload/re-filter when filters change

    useEffect(() => {
        loadData();
    }, [currentPage]);

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
                const [year, month] = filterMonth.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                const monthString = date.toLocaleString('default', { month: 'long', year: 'numeric' });

                allPayments = allPayments.filter((p: Payment) => p.month === monthString);
            }

            if (filterClass && filterClass !== 'ALL') {
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

    if (loading && payments.length === 0) {
        return <div className="flex items-center justify-center h-full">Loading...</div>;
    }

    // Helper to format currency
    const formatLKR = (amount: number) => `LKR ${amount.toLocaleString()}`;

    // Helper for Badge Colors
    const getTypeBadgeVariant = (type: string) => {
        switch (type.toLowerCase()) {
            case 'monthly fee': return 'default'; // primary
            case 'admission': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            <PaymentReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                payments={allPaymentsData}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Financial Overview</h1>
                    <p className="text-slate-500 mt-1 dark:text-slate-400">Monitor revenue streams and payment history.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        className="gap-2"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => setIsReportModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Generate Report
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <Card className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Revenue
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold dark:text-white">{formatLKR(stats.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1 dark:text-slate-400">
                            All-time earnings
                        </p>
                    </CardContent>
                </Card>

                {/* Monthly Revenue */}
                <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Monthly Revenue
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold dark:text-white">{formatLKR(stats.monthlyRevenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1 dark:text-slate-400">
                            For {new Date().toLocaleString('default', { month: 'long' })}
                        </p>
                    </CardContent>
                </Card>

                {/* Today's Revenue */}
                <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Today's Revenue
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold dark:text-white">{formatLKR(stats.todaysRevenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1 dark:text-slate-400">
                            {new Date().toLocaleDateString()}
                        </p>
                    </CardContent>
                </Card>

                {/* Pending */}
                <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pending Amount
                        </CardTitle>
                        <Ban className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold dark:text-white">{formatLKR(stats.pendingAmount)}</div>
                        <p className="text-xs text-orange-600 font-medium mt-1 dark:text-orange-400">
                            Estimated Unpaid Fees
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Payment History Section */}
            <Card className="shadow-sm dark:border-slate-800">
                <CardHeader className="px-6 py-4 border-b bg-slate-50/50 dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-semibold">Payment History</CardTitle>
                            <CardDescription>View and filter recent transactions.</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter by:</span>
                                <Input
                                    type="month"
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                    className="w-[160px] h-9 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:color-scheme-dark"
                                />
                                <Select value={filterClass} onValueChange={setFilterClass}>
                                    <SelectTrigger className="w-[180px] h-9 bg-white dark:bg-slate-950 dark:border-slate-800">
                                        <SelectValue placeholder="All Classes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Classes</SelectItem>
                                        {availableClasses.map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {(filterMonth || (filterClass && filterClass !== 'ALL')) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setFilterMonth(''); setFilterClass('ALL'); }}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-hidden">
                        {Object.keys(groupByMonth).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map((month) => (
                            <div key={month} className="border-b last:border-0 dark:border-slate-800">
                                <div className="px-6 py-2 bg-slate-100/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800">
                                    {month}
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 dark:bg-slate-900/30 dark:hover:bg-slate-900/30 dark:border-slate-800">
                                            <TableHead className="w-[120px] dark:text-slate-400">Date</TableHead>
                                            <TableHead className="dark:text-slate-400">Student</TableHead>
                                            <TableHead className="dark:text-slate-400">Class</TableHead>
                                            <TableHead className="dark:text-slate-400">Type</TableHead>
                                            <TableHead className="dark:text-slate-400">Method</TableHead>
                                            <TableHead className="text-right dark:text-slate-400">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupByMonth[month].map((payment) => (
                                            <TableRow key={payment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 dark:border-slate-800">
                                                <TableCell className="text-muted-foreground font-mono text-xs dark:text-slate-500">
                                                    {payment.date}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span className="dark:text-slate-200">{payment.studentName || 'N/A'}</span>
                                                        <span className="text-xs text-muted-foreground font-normal dark:text-slate-500">{payment.regNum}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-normal text-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                                                        {payment.class}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getTypeBadgeVariant(payment.type)} className="capitalize shadow-sm">
                                                        {payment.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="capitalize text-sm text-slate-600 dark:text-slate-400">
                                                    {payment.method}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-medium dark:text-slate-200">
                                                    {formatLKR(payment.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ))}

                        {Object.keys(groupByMonth).length === 0 && (
                            <div className="p-12 text-center text-slate-200 dark:text-slate-700">
                                <Search className="mx-auto h-12 w-12 text-slate-200 dark:text-slate-700" />
                                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No payments found</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters or check back later.</p>
                            </div>
                        )}
                    </div>
                </CardContent>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50 dark:bg-slate-900 dark:border-slate-800">
                    <p className="text-sm text-muted-foreground">
                        Showing <span className="font-medium text-slate-900 dark:text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium text-slate-900 dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, payments.length)}</span> of <span className="font-medium text-slate-900 dark:text-white">{payments.length}</span> results
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => (prev * ITEMS_PER_PAGE < payments.length ? prev + 1 : prev))}
                            disabled={currentPage * ITEMS_PER_PAGE >= payments.length}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AdminPayments;
