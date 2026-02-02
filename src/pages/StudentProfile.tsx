import { ProfileHeader } from '../components/profile/ProfileHeader';
import { PaymentHistoryList } from '../components/profile/PaymentHistoryList';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Phone, Mail, Calendar, MapPin, Loader2, Edit, X, Save } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getStudent, type Student } from '../lib/storage';
import Swal from 'sweetalert2';



export function StudentProfile() {
    const { id } = useParams<{ id: string }>();
    const [activeTab, setActiveTab] = useState<'details' | 'payments'>('details');

    const [student, setStudent] = useState<Student | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [payments, setPayments] = useState<any[]>([]);

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

    useEffect(() => {
        const loadPayments = async () => {
            if (id && activeTab === 'payments') {
                try {
                    const history = await window.electronAPI.getStudentPayments(id);
                    // Map DB records to UI interface (add status: 'paid')
                    const formattedHistory = history.map((p: any) => ({
                        ...p,
                        status: 'paid'
                    }));
                    setPayments(formattedHistory);
                } catch (err) {
                    console.error("Failed to load payments", err);
                }
            }
        };
        loadPayments();
    }, [id, activeTab]);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        phone: '',
        email: '',
        selectedClasses: [] as string[]
    });
    const [allClasses, setAllClasses] = useState<any[]>([]);

    useEffect(() => {
        const loadClasses = async () => {
            try {
                const categories = await window.electronAPI.getClassCategories();
                setAllClasses(categories);
            } catch (err) {
                console.error("Failed to load classes", err);
            }
        };
        loadClasses();
    }, []);

    useEffect(() => {
        if (student) {
            let currentClasses: string[] = [];
            if (Array.isArray(student.class)) {
                currentClasses = student.class;
            } else if (typeof student.class === 'string') {
                try {
                    currentClasses = JSON.parse(student.class);
                } catch {
                    currentClasses = [student.class];
                }
            }

            setEditForm({
                phone: student.phone || '',
                email: student.email || '',
                selectedClasses: currentClasses
            });
        }
    }, [student]);

    const handleSave = async () => {
        if (!student) return;

        // Toast configuration
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        });

        try {
            const updatedStudent = {
                ...student,
                phone: editForm.phone,
                email: editForm.email,
                class: editForm.selectedClasses
            };

            await import('../lib/storage').then(m => m.updateStudent(updatedStudent));
            setStudent(updatedStudent);
            setIsEditing(false);

            Toast.fire({
                icon: 'success',
                title: 'Profile updated successfully'
            });
        } catch (err) {
            console.error("Failed to update profile", err);
            Toast.fire({
                icon: 'error',
                title: 'Failed to update profile'
            });
        }
    };

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
        address: 'N/A',
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
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="font-semibold text-slate-800">Contact Information</h3>
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                        >
                                            <X size={16} /> Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="text-sm bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 flex items-center gap-2 transition-colors"
                                        >
                                            <Save size={16} /> Save
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-sm text-primary bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 flex items-center gap-2 transition-colors"
                                    >
                                        <Edit size={16} /> Edit
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                            className="border rounded px-2 py-1 text-sm w-full focus:outline-primary"
                                            placeholder="Enter email"
                                        />
                                    ) : (
                                        <span>{displayStudent.email}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            value={editForm.phone}
                                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                            className="border rounded px-2 py-1 text-sm w-full focus:outline-primary"
                                            placeholder="Enter phone"
                                        />
                                    ) : (
                                        <span>{displayStudent.phone}</span>
                                    )}
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

                            {isEditing && (
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <h4 className="font-medium text-slate-800 mb-3">Enrolled Classes</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {allClasses.map(cls => (
                                            <label key={cls.id} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 p-2 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.selectedClasses.includes(cls.name)}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        setEditForm(prev => ({
                                                            ...prev,
                                                            selectedClasses: isChecked
                                                                ? [...prev.selectedClasses, cls.name]
                                                                : prev.selectedClasses.filter(c => c !== cls.name)
                                                        }));
                                                    }}
                                                    className="rounded border-slate-300 text-primary focus:ring-primary"
                                                />
                                                <span>{cls.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                    <PaymentHistoryList payments={payments} />
                )}
            </div>
        </div>
    );
}
