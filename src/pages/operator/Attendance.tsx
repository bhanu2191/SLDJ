import { useState } from 'react';
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react';

interface StudentAttendance {
    id: string;
    name: string;
    regNum: string;
    status: 'present' | 'absent' | 'late' | 'pending';
    timeIn?: string;
}

const mockStudents: StudentAttendance[] = [
    { id: '1', name: 'Kasun Perera', regNum: 'SLDJ-2026-N5-0012', status: 'pending' },
    { id: '2', name: 'Amaya Silva', regNum: 'SLDJ-2026-N4-0045', status: 'pending' },
    { id: '3', name: 'Saman Kumara', regNum: 'SLDJ-2026-AL-0089', status: 'pending' },
];

export const Attendance = () => {
    const [selectedClass, setSelectedClass] = useState('JLPT N5');
    const [students, setStudents] = useState(mockStudents);
    const currentDate = new Date().toLocaleDateString();

    const markAttendance = (id: string, status: 'present' | 'absent' | 'late') => {
        setStudents(students.map(s => {
            if (s.id === id) {
                return {
                    ...s,
                    status,
                    timeIn: status === 'present' || status === 'late' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
                };
            }
            return s;
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Daily Attendance</h1>
                    <p className="text-gray-500">{currentDate} • Select a class to mark attendance</p>
                </div>
                <div className="w-48">
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option>JLPT N5</option>
                        <option>JLPT N4</option>
                        <option>JLPT N3</option>
                        <option>O/L Support</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search student by name or ID..."
                            className="pl-9 pr-4 py-2 w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="divide-y divide-gray-200">
                    {students.map((student) => (
                        <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                    {student.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900">{student.name}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{student.regNum}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {student.status === 'pending' ? (
                                    <>
                                        <button
                                            onClick={() => markAttendance(student.id, 'present')}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors flex flex-col items-center gap-1"
                                            title="Mark Present"
                                        >
                                            <CheckCircle size={24} />
                                            <span className="text-[10px] uppercase font-bold">Present</span>
                                        </button>
                                        <button
                                            onClick={() => markAttendance(student.id, 'late')}
                                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-full transition-colors flex flex-col items-center gap-1"
                                            title="Mark Late"
                                        >
                                            <Clock size={24} />
                                            <span className="text-[10px] uppercase font-bold">Late</span>
                                        </button>
                                        <button
                                            onClick={() => markAttendance(student.id, 'absent')}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors flex flex-col items-center gap-1"
                                            title="Mark Absent"
                                        >
                                            <XCircle size={24} />
                                            <span className="text-[10px] uppercase font-bold">Absent</span>
                                        </button>
                                    </>
                                ) : (
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${student.status === 'present' ? 'bg-green-100 text-green-800' :
                                        student.status === 'late' ? 'bg-orange-100 text-orange-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                                        {student.timeIn && <span className="text-xs opacity-75"> • {student.timeIn}</span>}
                                        <button
                                            onClick={() => setStudents(students.map(s => s.id === student.id ? { ...s, status: 'pending' } : s))}
                                            className="ml-2 text-xs underline opacity-50 hover:opacity-100"
                                        >
                                            Undo
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Attendance;
