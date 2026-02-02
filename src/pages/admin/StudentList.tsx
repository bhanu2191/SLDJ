import { AdminStudentTable } from '../../components/students/AdminStudentTable';
import { Users } from 'lucide-react';

export function AdminStudentList() {
    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Student Management (Admin)</h1>
                        <p className="text-slate-500">View and manage all active students</p>
                    </div>
                </div>

            </div>

            <AdminStudentTable />
        </div>
    );
}
