import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getStoredStudents } from '@/lib/storage';
import { Search, MoreHorizontal, User, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BulkImport } from './BulkImport';

// UI Components
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Student {
    regNum: string;
    name: string;
    class: string | string[];
    classStatuses?: { className: string, status: 'paid' | 'pending' | 'overdue' }[];
    status: 'paid' | 'pending' | 'overdue';
    avatar?: string;
    email?: string;
    phone?: string;
}

const mockStudents: Student[] = [];

export function StudentTable() {
    const navigate = useNavigate();
    const { userRole } = useAuth();

    // State
    const [students, setStudents] = useState<Student[]>(mockStudents);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterClass, setFilterClass] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Delete Alert State
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, regNum: '' });

    // Load Data
    useEffect(() => {
        const loadStudents = async () => {
            const stored = await getStoredStudents();
            setStudents([...stored, ...mockStudents]);
        };
        loadStudents();
    }, []);

    // Filter Logic
    const uniqueClasses = Array.from(new Set(students.flatMap(s => {
        if (s.classStatuses && s.classStatuses.length > 0) {
            return s.classStatuses.map(cs => cs.className);
        }
        if (Array.isArray(s.class)) return s.class;
        return [s.class];
    }))).sort();

    const filteredStudents = students.filter(student => {
        const matchesStatus =
            filterStatus === 'all' ? true :
                filterStatus === 'paid' ? student.status === 'paid' :
                    (student.status === 'overdue' || student.status === 'pending');

        const matchesClass =
            filterClass === 'all' ? true :
                student.classStatuses ? student.classStatuses.some(cs => cs.className === filterClass) :
                    Array.isArray(student.class) ? student.class.includes(filterClass) :
                        student.class === filterClass;

        const matchesSearch =
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.regNum.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesStatus && matchesSearch && matchesClass;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleDelete = async () => {
        const regNum = deleteDialog.regNum;
        if (regNum) {
            await import('../../lib/storage').then(m => m.deleteStudent(regNum));
            setStudents(students.filter(s => s.regNum !== regNum));
        }
        setDeleteDialog({ isOpen: false, regNum: '' });
    };

    return (
        <Card className="shadow-md border-slate-200 dark:border-slate-800">
            {/* Delete Alert Dialog */}
            <AlertDialog open={deleteDialog.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteDialog({ isOpen: false, regNum: '' })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Student?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this student? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Yes, delete it!</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <CardHeader className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 dark:border-slate-800">
                <div>
                    <CardTitle className="text-xl font-bold">Student Directory</CardTitle>
                    <CardDescription>Manage user enrollment, payments, and profiles.</CardDescription>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {userRole === 'admin' && (
                        <div className="hidden md:block">
                            <BulkImport onImportComplete={() => {
                                // Trigger reload
                                const load = async () => {
                                    const stored = await getStoredStudents();
                                    setStudents([...stored, ...mockStudents]);
                                };
                                load();
                            }} />
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="hidden md:flex gap-2 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                        onClick={async () => {
                            try {
                                // @ts-ignore
                                const res = await window.electronAPI.exportStudents(filteredStudents);
                                if (res?.success) {
                                    import('sonner').then(m => m.toast.success("Export Successful", { description: `File saved to ${res.path}` }));
                                } else if (!res?.cancelled) {
                                    import('sonner').then(m => m.toast.error("Export Failed", { description: "An unknown error occurred" }));
                                }
                            } catch (err) {
                                import('sonner').then(m => m.toast.error("Export Error", { description: err instanceof Error ? err.message : "Failed to export students" }));
                            }
                        }}
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </Button>

                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Filters Toolbar */}
                <div className="p-4 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
                    {/* Search */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                            placeholder="Search by name or Reg ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white dark:bg-slate-950 dark:border-slate-800"
                        />
                    </div>

                    {/* Filter Group */}
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        {/* Class Filter */}
                        <Select value={filterClass} onValueChange={setFilterClass}>
                            <SelectTrigger className="w-[160px] bg-white dark:bg-slate-950 dark:border-slate-800">
                                <SelectValue placeholder="All Classes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Classes</SelectItem>
                                {uniqueClasses.map(cls => (
                                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[140px] bg-white dark:bg-slate-950 dark:border-slate-800">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="unpaid">Unpaid / Late</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Reset Filter */}
                        {(filterStatus !== 'all' || filterClass !== 'all' || searchQuery) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setFilterStatus('all');
                                    setFilterClass('all');
                                    setSearchQuery('');
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Data Table */}
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow className="dark:border-slate-800">
                            <TableHead className="w-[250px]">Student</TableHead>
                            <TableHead>Reg Number</TableHead>
                            <TableHead>Class Enrollment</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center text-slate-500 dark:text-slate-400">
                                    No students found matching your filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedStudents.map((student) => (
                                <TableRow
                                    key={student.regNum}
                                    className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/50 dark:border-slate-800"
                                    onClick={() => navigate(`/${userRole}/students/${encodeURIComponent(student.regNum)}`)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-white shadow-sm overflow-hidden dark:ring-slate-800">
                                                {student.avatar ? (
                                                    <img src={student.avatar.startsWith('/') ? student.avatar.slice(1) : student.avatar} alt={student.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <User className="h-4 w-4" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{student.name}</span>
                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium dark:text-slate-400">Student</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono text-xs bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                                            {student.regNum}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1.5">
                                            {student.classStatuses ? (
                                                student.classStatuses
                                                    .filter(cs => filterClass === 'all' || cs.className === filterClass)
                                                    .map((cs, idx) => (
                                                        <Badge
                                                            key={idx}
                                                            variant="secondary"
                                                            className={cn(
                                                                "border",
                                                                cs.status === 'paid' ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" :
                                                                    cs.status === 'overdue' ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" :
                                                                        "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                                                            )}
                                                        >
                                                            {cs.className}
                                                            {cs.status !== 'pending' && <span className="ml-1 opacity-70 text-[10px]">({cs.status})</span>}
                                                        </Badge>
                                                    ))
                                            ) : (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                                                    {Array.isArray(student.class)
                                                        ? (filterClass !== 'all' ? student.class.filter(c => c === filterClass).join(', ') : student.class.join(', '))
                                                        : student.class}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs text-slate-500">
                                            <span>{student.phone || 'No phone'}</span>
                                            <span className="text-[10px] opacity-70">{student.email || 'No email'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={student.status === 'paid' ? 'success' : student.status === 'overdue' ? 'destructive' : 'warning'}
                                            className="uppercase text-[10px] tracking-wider font-bold shadow-sm"
                                        >
                                            {student.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[160px]">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/${userRole}/students/${encodeURIComponent(student.regNum)}`);
                                                }}>
                                                    View Profile
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/operator/payments', { state: { studentRegNum: student.regNum } });
                                                }}>
                                                    Collect Payment
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {userRole === 'admin' && (
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteDialog({ isOpen: true, regNum: student.regNum });
                                                        }}
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between dark:bg-slate-900/50 dark:border-slate-800">
                    <span className="text-xs text-slate-500">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} entries
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium text-slate-600 min-w-[20px] text-center">{currentPage}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
