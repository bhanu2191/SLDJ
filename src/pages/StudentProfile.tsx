import { ProfileHeader } from '../components/profile/ProfileHeader';
import { PaymentHistoryList } from '../components/profile/PaymentHistoryList';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Phone, Mail, Calendar, MapPin, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getStudent, Student } from '../lib/storage';

const mockPayments = [
    { id: '101', month: 'January 2026', amount: 5000, date: '2026-01-05', status: 'paid' as const },
    { id: '102', month: 'February 2026', amount: 5000, date: undefined, status: 'pending' as const },
    { id: '103', month: 'December 2025', amount: 5000, date: '2025-12-10', status: 'paid' as const },
];

export function StudentProfile() {
    const { id } = useParams<{ id: string }>();
    const [activeTab, setActiveTab] = useState<'details' | 'payments'>('details');
    const [student, setStudent] = useState<Student | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadStudent = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const data = await getStudent(id);
                if (data) {
                    setStudent(data);
                } else {
                    setError('Student not found');
                }
            } catch (err) {
                console.error("Failed to load student", err);
                setError('Failed to load student details');
            } finally {
                setIsLoading(false);
            }
        };
        loadStudent();
    }, [id]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading student details...</p>
            </div>
        );
    }

    if (error || !student) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-red-400">
                <p>{error || "Student not found"}</p>
            </div>
        );
    }

    const displayStudent = {
        name: student.name,
        regNum: student.regNum,
        class: student.class,
        photo: student.avatar,
        email: student.email || 'N/A',
        phone: student.phone || 'N/A',
        dob: student.dob || 'N/A',
        address: 'N/A', // Address not in DB yet
        guardian: {
            name: student.guardian || 'N/A',
            phone: student.guardianPhone || 'N/A',
            relation: 'Guardian'
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <ProfileHeader student={displayStudent} />

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={cn(
                            "pb-4 px-2 text-sm font-medium transition-all relative",
                            activeTab === 'details' ? "text-primary " : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Personal Details
                        {activeTab === 'details' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={cn(
                            "pb-4 px-2 text-sm font-medium transition-all relative",
                            activeTab === 'payments' ? "text-primary" : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Payment History
                        {activeTab === 'payments' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'details' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Contact Information</h3>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <span>{displayStudent.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    <span>{displayStudent.phone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span>Born {displayStudent.dob}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <MapPin className="h-4 w-4 text-slate-400" />
                                    <span>{displayStudent.address}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Guardian Information</h3>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="font-medium text-slate-800">{displayStudent.guardian.name}</p>
                                <p className="text-sm text-slate-500">{displayStudent.guardian.relation}</p>
                                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                                    <Phone className="h-3 w-3" /> {displayStudent.guardian.phone}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <PaymentHistoryList payments={mockPayments} />
                )}
            </div>
        </div>
    );
}
