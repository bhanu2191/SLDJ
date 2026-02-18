import { Search, Trash2, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredStudents } from '../../lib/storage';
import { useAuth } from '../../context/AuthContext';

import { BulkImport } from './BulkImport';

interface Student {
    // id removed
    regNum: string;
    name: string;
    class: string | string[];
    classStatuses?: { className: string, status: 'paid' | 'pending' | 'overdue' }[];
    status: 'paid' | 'pending' | 'overdue';
    avatar?: string;
}

const mockStudents: Student[] = [

];

export function AdminStudentTable() {
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [filterClass, setFilterClass] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [students, setStudents] = useState<Student[]>(mockStudents);
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const currentDate = new Date();
    const isLate = currentDate.getDate() > 10; // Logic for late payment highlight

    const loadStudents = async () => {
        const stored = await getStoredStudents();
        const allStudents = [...stored, ...mockStudents];
        setStudents(allStudents);

        // Extract unique classes
        const classes = new Set<string>();
        allStudents.forEach(s => {
            if (Array.isArray(s.class)) {
                s.class.forEach(c => classes.add(c));
            } else if (s.class) {
                classes.add(s.class);
            }
        });
        setAvailableClasses(Array.from(classes).sort());
    };

    useEffect(() => {
        loadStudents();
    }, []);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, filterClass, searchQuery]);

    const filteredStudents = students.filter(student => {
        const matchesFilter =
            filter === 'all' ? true :
                filter === 'paid' ? student.status === 'paid' :
                    (student.status === 'overdue' || student.status === 'pending');

        const matchesSearch =
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.regNum.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesClass = filterClass ? (
            Array.isArray(student.class)
                ? student.class.includes(filterClass)
                : student.class === filterClass
        ) : true;

        return matchesFilter && matchesSearch && matchesClass;
        return matchesFilter && matchesSearch && matchesClass;
    });

    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleDelete = async (regNum: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this student?')) {
            // In a real app, you might want to call the API to delete
            await import('../../lib/storage').then(m => m.deleteStudent(regNum));
            setStudents(students.filter(s => s.regNum !== regNum));
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header Controls */}
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by name or Reg ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <BulkImport onImportComplete={loadStudents} />
                    <div className="h-6 w-[1px] bg-slate-200 mx-1" />
                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-600 bg-white"
                    >
                        <option value="">All Classes</option>
                        {availableClasses.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setFilter(filter === 'paid' ? 'all' : 'paid')}
                        className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2",
                            filter === 'paid' ? "bg-status-success/10 border-status-success text-status-success" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <span className="h-2 w-2 rounded-full bg-status-success" />
                        Paid This Month
                    </button>
                    <button
                        onClick={() => setFilter(filter === 'unpaid' ? 'all' : 'unpaid')}
                        className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2",
                            filter === 'unpaid' ? "bg-status-danger/10 border-status-danger text-status-danger" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <span className="h-2 w-2 rounded-full bg-status-danger" />
                        Unpaid / Late
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">Reg Number</th>
                            <th className="px-6 py-4">Class</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedStudents.map((student) => {
                            const shouldHighlight = isLate && (student.status === 'overdue' || student.status === 'pending');
                            return (
                                <tr
                                    key={student.regNum}
                                    onClick={() => navigate(`/${userRole}/students/${encodeURIComponent(student.regNum)}`)}
                                    className={cn(
                                        "hover:bg-slate-50 transition-colors cursor-pointer group",
                                        shouldHighlight ? "bg-red-50/50 hover:bg-red-50/80" : ""
                                    )}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-400 group-hover:ring-2 group-hover:ring-primary/20 transition-all">
                                                {student.avatar ? (
                                                    <img
                                                        src={student.avatar?.startsWith('/') ? student.avatar.slice(1) : student.avatar}
                                                        alt={student.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="h-5 w-5" />
                                                )}
                                            </div>
                                            <span className="font-medium text-slate-800 group-hover:text-primary transition-colors">{student.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-500">{student.regNum}</td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div className="flex flex-wrap gap-2">
                                            {student.classStatuses ? (
                                                student.classStatuses.map((cs, idx) => (
                                                    <span key={idx} className={cn(
                                                        "px-2 py-1 rounded text-xs font-medium border",
                                                        cs.status === 'paid' ? "bg-green-50 text-green-700 border-green-200" :
                                                            cs.status === 'overdue' ? "bg-red-50 text-red-700 border-red-200" :
                                                                "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                    )}>
                                                        {cs.className}
                                                        {cs.status !== 'pending' && <span className="ml-1 opacity-75">({cs.status})</span>}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="px-2 py-1 rounded bg-slate-100 text-xs font-medium">
                                                    {Array.isArray(student.class) ? student.class.join(', ') : student.class}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <PaymentStatusBadge status={student.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {userRole === 'admin' ? (
                                                <button
                                                    className="p-2 text-red-500 hover:text-red-700 transition-colors hover:bg-red-50 rounded-full"
                                                    onClick={(e) => handleDelete(student.regNum, e)}
                                                    title="Delete Student"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            ) : null /* Operator actions handled in separate component or restored version */}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-slate-700">
                            Showing <span className="font-medium">{filteredStudents.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)}</span> of{' '}
                            <span className="font-medium">{filteredStudents.length}</span> students
                        </p>
                    </div>
                    <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="sr-only">Previous</span>
                                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="sr-only">Next</span>
                                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    );
}
