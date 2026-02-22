import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Save, Download, FileSpreadsheet, Check, X, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';

interface StudentResult {
    regNum: string;
    name: string;
    className: string;
    result: 'Pass' | 'Fail' | 'None';
    date: string;
    isDirty?: boolean; // Track if changed by user but not saved
}

export default function ExamResults({ isAdmin = false }: { isAdmin?: boolean }) {
    const [classes, setClasses] = useState<string[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [students, setStudents] = useState<StudentResult[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');

    // Export Dialog State
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [exportFilter, setExportFilter] = useState('All');

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        loadClasses();

        // Set default dates for export
        const today = new Date();
        setExportEndDate(today.toISOString().split('T')[0]);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        setExportStartDate(sixMonthsAgo.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (selectedClass) {
            loadResults(selectedClass, filterStatus);
        } else {
            setStudents([]);
        }
    }, [selectedClass, filterStatus]);

    const loadClasses = async () => {
        try {
            // @ts-ignore
            const categories = await window.electronAPI.getClassCategories();
            setClasses(categories.map((c: any) => c.name));
            if (categories.length > 0) {
                setSelectedClass(categories[0].name);
            }
        } catch (error) {
            console.error("Failed to load classes", error);
            toast.error("Failed to load classes");
        }
    };

    const loadResults = async (className: string, status: string) => {
        try {
            setIsLoading(true);
            setHasUnsavedChanges(false);
            // @ts-ignore
            const data = await window.electronAPI.getExamResults({ className, statusFilter: status });
            setStudents(data);
        } catch (error) {
            console.error("Failed to load exam results", error);
            toast.error("Failed to load exam results");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResultChange = (regNum: string, newResult: 'Pass' | 'Fail' | 'None') => {
        setStudents(prev => prev.map(s => {
            if (s.regNum === regNum) {
                // If it's a new change, mark dirty
                if (s.result !== newResult) {
                    setHasUnsavedChanges(true);
                    return { ...s, result: newResult, isDirty: true, date: new Date().toISOString().split('T')[0] };
                }
            }
            return s;
        }));
    };

    const handleSave = async () => {
        const dirtyStudents = students.filter(s => s.isDirty);
        if (dirtyStudents.length === 0) return;

        try {
            setIsSaving(true);
            // @ts-ignore
            await window.electronAPI.saveExamResults({
                className: selectedClass,
                results: dirtyStudents.map(s => ({ regNum: s.regNum, result: s.result, date: s.date }))
            });

            toast.success("Exam results saved successfully!");

            // Clear dirty flags
            setStudents(prev => prev.map(s => ({ ...s, isDirty: false })));
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error("Failed to save results", error);
            toast.error("Failed to save exam results");
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        try {
            if (!exportStartDate || !exportEndDate) {
                toast.error("Please select both start and end dates for the report duration.");
                return;
            }

            // Get fresh data based on export filter just in case
            // @ts-ignore
            const exportData = await window.electronAPI.getExamResults({
                className: selectedClass,
                statusFilter: exportFilter
            });

            if (exportData.length === 0) {
                toast.warning("No data found for the selected criteria.");
                setIsExportOpen(false);
                return;
            }

            const durationString = `${exportStartDate} to ${exportEndDate}`;

            // @ts-ignore
            const result = await window.electronAPI.exportExamResults({
                className: selectedClass,
                duration: durationString,
                data: exportData
            });

            if (result.success) {
                toast.success(`Export successful! Saved to: ${result.path}`);
                setIsExportOpen(false);
            }
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to export results. Ensure the file is not currently open in another program.");
        }
    };

    // Derived filtered list for search
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.regNum.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Exam Results</h1>
                    <p className="text-slate-500 mt-1 dark:text-slate-400">Record and manage student exam outcomes.</p>
                </div>

                <div className="flex items-center gap-3">
                    {!isAdmin && (
                        <>
                            {hasUnsavedChanges && (
                                <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium flex items-center gap-1.5 animate-pulse dark:bg-amber-900/40 dark:text-amber-300">
                                    Unsaved Changes
                                </div>
                            )}
                            <Button
                                onClick={handleSave}
                                disabled={!hasUnsavedChanges || isSaving}
                                className="gap-2"
                            >
                                {isSaving ? (
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Save Changes
                            </Button>
                        </>
                    )}

                    {isAdmin && (
                        <Button
                            variant="outline"
                            className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                            onClick={() => setIsExportOpen(true)}
                        >
                            <Download className="h-4 w-4" />
                            Export Excel
                        </Button>
                    )}
                </div>
            </div>

            <Card className="shadow-sm dark:border-slate-800">
                <CardHeader className="px-6 py-4 border-b bg-slate-50/50 dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-64">
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block dark:text-slate-400">Course</label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950 dark:border-slate-800">
                                        <SelectValue placeholder="Select Course" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-40">
                                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block dark:text-slate-400">Status</label>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950 dark:border-slate-800">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Students</SelectItem>
                                        <SelectItem value="Pass">Passed</SelectItem>
                                        <SelectItem value="Fail">Failed</SelectItem>
                                        <SelectItem value="None">Not Graded</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-end">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search student..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-white dark:bg-slate-950 dark:border-slate-800"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 dark:bg-slate-900/30 dark:hover:bg-slate-900/30 dark:border-slate-800">
                                    <TableHead className="w-[120px] dark:text-slate-400">Reg No</TableHead>
                                    <TableHead className="dark:text-slate-400">Student Name</TableHead>
                                    <TableHead className="text-right dark:text-slate-400 w-[280px]">Result</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-32 text-center text-slate-500">
                                            Loading students...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredStudents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-32 text-center text-slate-500">
                                            <FileSpreadsheet className="mx-auto h-8 w-8 text-slate-300 mb-2 dark:text-slate-600" />
                                            No students found for this course and filter.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <TableRow key={student.regNum} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 dark:border-slate-800">
                                            <TableCell className="font-mono text-sm text-slate-500 dark:text-slate-400">
                                                {student.regNum}
                                            </TableCell>
                                            <TableCell className="font-medium dark:text-slate-200">
                                                {student.name}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isAdmin ? (
                                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${student.result === 'Pass' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                            student.result === 'Fail' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                                                            }`}>
                                                            {student.result === 'None' ? 'Not Graded' : student.result}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant={student.result === 'Pass' ? 'default' : 'outline'}
                                                                className={`h-8 px-3 gap-1.5 ${student.result === 'Pass' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                                                                onClick={() => handleResultChange(student.regNum, 'Pass')}
                                                            >
                                                                <Check size={14} className={student.result === 'Pass' ? 'text-white' : 'text-emerald-500'} />
                                                                Pass
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant={student.result === 'Fail' ? 'destructive' : 'outline'}
                                                                className={`h-8 px-3 gap-1.5 ${student.result === 'Fail' ? '' : 'border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                                                                onClick={() => handleResultChange(student.regNum, 'Fail')}
                                                            >
                                                                <X size={14} className={student.result === 'Fail' ? 'text-white' : 'text-red-500'} />
                                                                Fail
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant={student.result === 'None' ? 'secondary' : 'outline'}
                                                                className={`h-8 px-3 gap-1.5 ${student.result === 'None' ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-400'}`}
                                                                onClick={() => handleResultChange(student.regNum, 'None')}
                                                            >
                                                                <Minus size={14} />
                                                                None
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Export Dialog for Admins */}
            {isAdmin && (
                <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Export Excel Report</DialogTitle>
                            <DialogDescription>
                                Set the course duration bounds to appear in the `{selectedClass}` results report.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Date</label>
                                    <Input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={(e) => setExportStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">End Date</label>
                                    <Input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={(e) => setExportEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Include Results</label>
                                <Select value={exportFilter} onValueChange={setExportFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Enrolled</SelectItem>
                                        <SelectItem value="Pass">Pass Only</SelectItem>
                                        <SelectItem value="Fail">Fail Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsExportOpen(false)}>Cancel</Button>
                            <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                                <Download className="h-4 w-4" />
                                Generate .xlsx
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
