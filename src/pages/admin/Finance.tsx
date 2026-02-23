import { useState, useEffect } from 'react';
import {
    Plus,
    TrendingUp,
    TrendingDown,
    Wallet,
    Trash2,
    Calendar as CalendarIcon,
    ArrowUpRight,
    ArrowDownRight,
    Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

interface FinanceRecord {
    id: number;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    date: string;
    reference: string;
}

interface FinanceSummary {
    studentRevenue: number;
    extraIncome: number;
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
}


export default function Finance() {
    const [records, setRecords] = useState<FinanceRecord[]>([]);
    const [summary, setSummary] = useState<FinanceSummary>({
        studentRevenue: 0,
        extraIncome: 0,
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0
    });
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [categories, setCategories] = useState<{ income: string[], expense: string[] }>({ income: [], expense: [] });

    // Date Filters
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // First day of current month
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // New Record Form State
    const [newRecord, setNewRecord] = useState({
        type: 'expense' as 'income' | 'expense',
        category: 'Document Fee',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        reference: ''
    });

    useEffect(() => {
        loadData();
        loadCategories();
    }, [startDate, endDate, filterType]);

    const loadCategories = async () => {
        try {
            // @ts-ignore
            const items = await window.electronAPI.getFinanceCategories();
            if (items && items.length > 0) {
                const grouped = items.reduce((acc: any, cat: any) => {
                    acc[cat.type].push(cat.name);
                    return acc;
                }, { income: [], expense: [] });
                setCategories(grouped);

                // Update default category if needed
                if (!grouped[newRecord.type].includes(newRecord.category)) {
                    setNewRecord(prev => ({ ...prev, category: grouped[prev.type][0] || '' }));
                }
            }
        } catch (error) {
            console.error("Failed to load categories:", error);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            // @ts-ignore
            const [recordsData, summaryData] = await Promise.all([
                // @ts-ignore
                window.electronAPI.getFinanceRecords({ startDate, endDate, type: filterType }),
                // @ts-ignore
                window.electronAPI.getFinanceSummary({ startDate, endDate })
            ]);
            setRecords(recordsData);
            setSummary(summaryData);
        } catch (error) {
            console.error("Failed to load finance data:", error);
            toast.error("Failed to load financial records");
        } finally {
            setLoading(false);
        }
    };

    const handleAddRecord = async () => {
        if (!newRecord.amount || Number(newRecord.amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        try {
            // @ts-ignore
            await window.electronAPI.addFinanceRecord({
                ...newRecord,
                amount: Number(newRecord.amount)
            });
            toast.success("Record added successfully");
            setIsDialogOpen(false);
            setNewRecord({
                type: 'expense',
                category: 'Document Fee',
                amount: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                reference: ''
            });
            loadData();
        } catch (error) {
            console.error("Failed to add record:", error);
            toast.error("Failed to add record");
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'Delete Record?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                // @ts-ignore
                await window.electronAPI.deleteFinanceRecord(id);
                toast.success("Record deleted");
                loadData();
            } catch (error) {
                toast.error("Failed to delete record");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Finance Management</h1>
                    <p className="text-slate-500 mt-1 dark:text-slate-400">Track institute earnings, expenses, and overall profit.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus size={18} /> Add New Entry
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add Financial Entry</DialogTitle>
                            <DialogDescription>
                                Enter details for a new income or expense transaction.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={newRecord.type}
                                        onValueChange={(val: 'income' | 'expense') =>
                                            setNewRecord({ ...newRecord, type: val, category: categories[val][0] || '' })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="expense">Expense (-)</SelectItem>
                                            <SelectItem value="income">Other Income (+)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                        value={newRecord.category}
                                        onValueChange={(val) => setNewRecord({ ...newRecord, category: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories[newRecord.type].map((cat: string) => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Amount (LKR)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={newRecord.amount}
                                        onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={newRecord.date}
                                        onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                    placeholder="Brief details..."
                                    value={newRecord.description}
                                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Reference (Optional)</Label>
                                <Input
                                    placeholder="Invoice # or Student ID"
                                    value={newRecord.reference}
                                    onChange={(e) => setNewRecord({ ...newRecord, reference: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddRecord}>Save Record</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm overflow-hidden relative">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-medium uppercase tracking-wider">Total Income</CardDescription>
                        <CardTitle className="text-2xl font-bold flex items-center justify-between">
                            LKR {summary.totalIncome.toLocaleString()}
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 dark:bg-blue-900/30">
                                <TrendingUp size={20} />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-[10px] text-slate-500 flex flex-col gap-1">
                            <span className="flex justify-between">Student Fees: <span>+ {summary.studentRevenue.toLocaleString()}</span></span>
                            <span className="flex justify-between">Extra Income: <span>+ {summary.extraIncome.toLocaleString()}</span></span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-medium uppercase tracking-wider">Total Expenses</CardDescription>
                        <CardTitle className="text-2xl font-bold flex items-center justify-between">
                            LKR {summary.totalExpense.toLocaleString()}
                            <div className="p-2 bg-red-50 rounded-lg text-red-600 dark:bg-red-900/30">
                                <TrendingDown size={20} />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-[10px] text-red-500 font-medium">
                            Includes salary, rent, and agent fees.
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 ${summary.netProfit >= 0 ? 'border-l-emerald-500' : 'border-l-amber-500'} shadow-sm overflow-hidden`}>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-medium uppercase tracking-wider text-slate-500">Net Profit</CardDescription>
                        <CardTitle className={`text-2xl font-bold flex items-center justify-between ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            LKR {summary.netProfit.toLocaleString()}
                            <div className={`p-2 rounded-lg ${summary.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} dark:bg-emerald-900/30`}>
                                <Wallet size={20} />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-[10px] text-slate-400">
                            Calculation: (Student Fees + Extra Income) - Expenses
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-slate-400 shadow-sm overflow-hidden bg-slate-900 text-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-medium uppercase tracking-wider text-slate-400">Quick Stats</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Current Period Transactions</span>
                            <span className="font-bold">{records.length}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (summary.studentRevenue / summary.totalIncome) * 100)}%` }}
                                className="bg-blue-400 h-full"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400">Primary revenue from student education.</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and List */}
            <Card className="shadow-sm dark:border-slate-800 overflow-hidden">
                <CardHeader className="px-6 py-4 border-b bg-slate-50/50 dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-slate-400">Time range</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        className="h-8 w-36 py-1 px-2 text-xs"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                    <span className="text-slate-300 text-xs">-</span>
                                    <Input
                                        type="date"
                                        className="h-8 w-36 py-1 px-2 text-xs"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-slate-400">Transaction Type</Label>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger className="h-8 w-32 py-1 px-2 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="income">Income only</SelectItem>
                                        <SelectItem value="expense">Expenses only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-end gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1 px-3">
                                <Download size={14} /> Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100/50 hover:bg-slate-100/50 dark:bg-slate-800/30">
                                <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider">Date</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider">Category</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider">Description</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Amount (LKR)</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-6 w-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                                            <span>Processing transaction ledger...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : records.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <CalendarIcon className="h-8 w-8 text-slate-200" />
                                            <span>No transactions found for this period.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                records.map((record) => (
                                    <TableRow key={record.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-b dark:border-slate-800/50">
                                        <TableCell className="font-mono text-xs text-slate-500">
                                            {record.date}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1 rounded ${record.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} dark:bg-slate-800`}>
                                                    {record.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                </div>
                                                <span className="font-semibold text-xs tracking-tight">{record.category}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                                            {record.description || '-'}
                                            {record.reference && (
                                                <span className="block text-[10px] text-slate-400 font-mono mt-0.5">Ref: {record.reference}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className={`text-right font-bold text-sm ${record.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {record.type === 'income' ? '+' : '-'} {record.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                onClick={() => handleDelete(record.id)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
