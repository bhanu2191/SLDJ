import { ProfileHeader } from '../components/profile/ProfileHeader';
import { PaymentHistoryList } from '../components/profile/PaymentHistoryList';
import { useState, useEffect } from 'react';
import { Phone, Mail, Calendar, MapPin, Loader2, Edit, X, Save, Check } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getStudent, type Student } from '../lib/storage';
import Swal from 'sweetalert2';

// Shadcn Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export function StudentProfile() {
    const { id } = useParams<{ id: string }>();
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
        // Load payments logic... (simplified for now as backend might need adjustment)
        const loadPayments = async () => {
            if (id) { // Always load payments for the tab
                try {
                    // @ts-ignore
                    const history = await window.electronAPI.getStudentPayments(id);
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
    }, [id]);

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
                // @ts-ignore
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

            Toast.fire({ icon: 'success', title: 'Profile updated successfully' });
        } catch (err) {
            console.error("Failed to update profile", err);
            Toast.fire({ icon: 'error', title: 'Failed to update profile' });
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
        gender: student.gender,
        address: student.gender ? `Gender: ${student.gender}` : 'Gender: Not Saved',
        guardian: {
            name: student.guardian || 'N/A',
            phone: student.guardianPhone || 'N/A',
            relation: 'Guardian'
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-10">
            <ProfileHeader student={displayStudent} />

            <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="details">Personal Details</TabsTrigger>
                    <TabsTrigger value="payments">Payment History</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between space-y-0 pb-4">
                                <CardTitle className="text-base font-semibold text-slate-800">Contact Information</CardTitle>
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="h-8 gap-1">
                                            <X className="h-3 w-3" /> Cancel
                                        </Button>
                                        <Button size="sm" onClick={handleSave} className="h-8 gap-1 bg-green-600 hover:bg-green-700">
                                            <Save className="h-3 w-3" /> Save
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 text-primary hover:text-primary hover:bg-primary/10 gap-1">
                                        <Edit className="h-3 w-3" /> Edit
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <Mail className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Email Address</p>
                                            {isEditing ? (
                                                <Input
                                                    value={editForm.email}
                                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                    className="h-8 mt-1"
                                                />
                                            ) : (
                                                <p className="text-sm font-medium text-slate-800">{displayStudent.email}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <Phone className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Phone Number</p>
                                            {isEditing ? (
                                                <Input
                                                    value={editForm.phone}
                                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                    className="h-8 mt-1"
                                                />
                                            ) : (
                                                <p className="text-sm font-medium text-slate-800">{displayStudent.phone}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <Calendar className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Date of Birth</p>
                                            <p className="text-sm font-medium text-slate-800">{displayStudent.dob}</p>
                                        </div>
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="pt-6 border-t border-slate-100">
                                        <h4 className="font-medium text-slate-800 mb-4 text-sm">Enrolled Classes</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {allClasses.map(cls => (
                                                <div key={cls.id} className="flex items-center space-x-2 border rounded-lg p-2 hover:bg-slate-50">
                                                    <Checkbox
                                                        id={`cls-${cls.id}`}
                                                        checked={editForm.selectedClasses.includes(cls.name)}
                                                        onCheckedChange={(checked) => {
                                                            setEditForm(prev => ({
                                                                ...prev,
                                                                selectedClasses: checked
                                                                    ? [...prev.selectedClasses, cls.name]
                                                                    : prev.selectedClasses.filter(c => c !== cls.name)
                                                            }));
                                                        }}
                                                    />
                                                    <Label htmlFor={`cls-${cls.id}`} className="text-sm font-medium cursor-pointer flex-1">
                                                        {cls.name}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm h-fit dark:border-slate-800">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                                <CardTitle className="text-base font-semibold text-slate-800">Guardian Information</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                                    <h4 className="font-bold text-slate-800 text-lg">{displayStudent.guardian.name}</h4>
                                    <p className="text-slate-500 text-sm mb-4">{displayStudent.guardian.relation}</p>

                                    <div className="flex items-center gap-3 text-slate-700 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                        <Phone className="h-4 w-4 text-primary" />
                                        <span className="font-mono font-medium">{displayStudent.guardian.phone}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="payments" className="mt-6">
                    <PaymentHistoryList payments={payments} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
