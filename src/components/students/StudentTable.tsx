import { Search, MoreHorizontal, User, CreditCard } from 'lucide-react';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredStudents } from '../../lib/storage';
import { useAuth } from '../../context/AuthContext';

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

export function StudentTable() {
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [classFilter, setClassFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [students, setStudents] = useState<Student[]>(mockStudents);
    const currentDate = new Date();
    const isLate = currentDate.getDate() > 10; // Logic for late payment highlight

    useEffect(() => {
        const loadStudents = async () => {
            const stored = await getStoredStudents();
            setStudents([...stored, ...mockStudents]);
        };
        loadStudents();
    }, []);

    // Extract unique classes
    const uniqueClasses = Array.from(new Set(students.flatMap(s => {
        if (s.classStatuses && s.classStatuses.length > 0) {
            return s.classStatuses.map(cs => cs.className);
        }
        if (Array.isArray(s.class)) return s.class;
        return [s.class];
    }))).sort();

    const filteredStudents = students.filter(student => {
        const matchesFilter =
            filter === 'all' ? true :
                filter === 'paid' ? student.status === 'paid' :
                    (student.status === 'overdue' || student.status === 'pending');

        const matchesClass =
            classFilter === 'all' ? true :
                student.classStatuses ? student.classStatuses.some(cs => cs.className === classFilter) :
                    Array.isArray(student.class) ? student.class.includes(classFilter) :
                        student.class === classFilter;

        const matchesSearch =
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.regNum.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesFilter && matchesSearch && matchesClass;
    });

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
            <div className="p-6 border-b border-slate-200 flex flex-col xl:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
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

                    <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white min-w-[150px]"
                    >
                        <option value="all">All Classes</option>
                        {uniqueClasses.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                        {filteredStudents.map((student) => {
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
                                                student.classStatuses
                                                    .filter(cs => classFilter === 'all' || cs.className === classFilter)
                                                    .map((cs, idx) => (
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
                                                    {Array.isArray(student.class)
                                                        ? (classFilter !== 'all' ? student.class.filter(c => c === classFilter).join(', ') : student.class.join(', '))
                                                        : student.class}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <PaymentStatusBadge status={student.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/operator/payments', { state: { studentRegNum: student.regNum } });
                                                }}
                                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors"
                                                title="Collect Payment"
                                            >
                                                <CreditCard className="h-5 w-5" />
                                            </button>
                                            {userRole === 'admin' && (
                                                <button
                                                    className="p-2 text-red-500 hover:text-red-700 transition-colors hover:bg-red-50 rounded-full"
                                                    onClick={(e) => handleDelete(student.regNum, e)}
                                                    title="Delete Student"
                                                >
                                                    <MoreHorizontal className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination (Simple) */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
                <p>Showing {filteredStudents.length} students</p>
                <div className="flex gap-2">
                    <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50" disabled>Previous</button>
                    <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">Next</button>
                </div>
            </div>
        </div>
    );
}
