import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Check, RotateCcw, User, Phone, Mail, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateNextStudentId, commitNextStudentId } from '../lib/idGenerator';
import { saveStudent } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { cn } from '@/lib/utils';

export function Registration() {
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const [previewId, setPreviewId] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        gender: '',
        dob: '',
        phone: '',
        email: '',
        selectedClasses: [] as string[],
        guardian: '',
        guardianPhone: ''
    });

    const [classCategories, setClassCategories] = useState<any[]>([]);

    useEffect(() => {
        // Show what the NEXT ID will be
        setPreviewId(generateNextStudentId());

        // Fetch class categories
        const loadCategories = async () => {
            try {
                // @ts-ignore
                const categories = await window.electronAPI.getClassCategories();
                setClassCategories(categories);
            } catch (err) {
                console.error("Failed to load class categories", err);
            }
        };
        loadCategories();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        if (id in formData) {
            // @ts-ignore
            setFormData(prev => ({ ...prev, [id]: value }));
        }
    };

    const handleValueChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }



    // "Cute & Small" Alert Configuration (Preserved)
    const showCuteAlert = (title: string, text: string, icon: 'success' | 'error' | 'warning', focusId?: string) => {
        Swal.fire({
            title: title,
            text: text,
            icon: icon,
            width: 320,
            padding: '1.5rem',
            background: '#ffffff',
            confirmButtonColor: icon === 'error' ? '#ef4444' : '#053452',
            confirmButtonText: 'Okay',
            backdrop: `rgba(5, 52, 82, 0.2)`,
            allowOutsideClick: false,
            customClass: {
                popup: 'rounded-2xl shadow-xl border border-slate-100',
                title: 'text-xl font-bold text-slate-800 font-display',
                htmlContainer: 'text-sm text-slate-500',
                confirmButton: 'rounded-lg px-6 py-2 text-sm font-medium shadow-md'
            },
            didClose: () => {
                if (focusId) {
                    const element = document.getElementById(focusId);
                    if (element) {
                        element.focus();
                    }
                }
            }
        });
    };

    const handleClear = () => {
        setFormData({
            fullName: '',
            gender: '',
            dob: '',
            phone: '',
            email: '',
            selectedClasses: [],
            guardian: '',
            guardianPhone: ''
        });
        showCuteAlert('Reset', 'Form has been cleared.', 'success');
    };

    const handleRegister = async () => {
        // --- Validation ---
        if (!formData.fullName.trim()) return showCuteAlert('Required', 'Student Name is missing!', 'error', 'fullName');
        if (!formData.gender) return showCuteAlert('Required', 'Please select a gender.', 'error');
        if (!formData.dob) return showCuteAlert('Required', 'Date of Birth is missing.', 'error', 'dob');

        const phoneRegex = /^0\d{9}$/;
        if (!formData.phone || !phoneRegex.test(formData.phone)) return showCuteAlert('Invalid Phone', 'Must be 10 digits starting with 0.', 'error', 'phone');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) return showCuteAlert('Invalid Email', 'Please check the email format.', 'error', 'email');

        if (!formData.guardian.trim()) return showCuteAlert('Required', 'Guardian Name is missing.', 'error', 'guardian');
        if (!formData.guardianPhone || !phoneRegex.test(formData.guardianPhone)) return showCuteAlert('Invalid Phone', 'Guardian Phone must be 10 digits starting with 0.', 'error', 'guardianPhone');

        if (formData.selectedClasses.length === 0) return showCuteAlert('No Selection', 'Select at least one class.', 'error');

        try {
            const finalId = commitNextStudentId();
            const avatarUrl = formData.gender === 'male' ? 'boy.png' : 'girl.png';

            // Calculate enrollment end dates for selected classes
            const enrollments = formData.selectedClasses.map(className => {
                const category = classCategories.find(c => c.name === className);
                const duration = category?.duration || '3 months';
                const startDate = new Date();
                const endDate = new Date(startDate);

                let monthsToAdd = 3;
                if (duration === '6 months') monthsToAdd = 6;
                else if (duration === '1 year') monthsToAdd = 12;

                endDate.setMonth(endDate.getMonth() + monthsToAdd);

                return {
                    className,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    duration
                };
            });

            await saveStudent({
                regNum: finalId,
                name: formData.fullName,
                gender: formData.gender as 'male' | 'female',
                avatar: avatarUrl,
                class: formData.selectedClasses,
                enrollments: JSON.stringify(enrollments),
                dob: formData.dob,
                phone: formData.phone,
                email: formData.email,
                guardian: formData.guardian,
                guardianPhone: formData.guardianPhone
            });

            await Swal.fire({
                icon: 'success',
                title: 'Registration Successful!',
                text: `Student ID: ${finalId}`,
                width: 400,
                confirmButtonColor: '#053452',
                confirmButtonText: 'Done',
                customClass: {
                    popup: 'rounded-2xl shadow-xl border border-slate-100',
                    title: 'text-2xl font-bold text-slate-800 font-display',
                }
            });
            navigate(`/${userRole}/students`);
        } catch (error) {
            console.error("Registration failed:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            let displayMessage = `Failed to save: ${errorMessage}`;
            if (errorMessage.includes('UNIQUE constraint')) {
                displayMessage = 'This Student ID already exists. Please refresh.';
            }
            showCuteAlert('Error', displayMessage, 'error');
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">New Registration</h1>
                    <p className="text-slate-500 mt-1 dark:text-slate-400">Create a new student record and enroll in classes.</p>
                </div>
                <Button variant="outline" onClick={handleClear} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset Form
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: ID & Personal Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-slate-200 shadow-md dark:border-slate-800">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">System Info</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label>Registration ID</Label>
                                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-center dark:bg-slate-900 dark:border-slate-800">
                                    <span className="text-2xl font-mono font-bold text-primary tracking-widest">{previewId}</span>
                                </div>
                                <p className="text-xs text-center text-slate-400">Next available ID (Auto-assigned)</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                        <CardHeader>
                            <CardTitle>Quick Tips</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-500 space-y-2 dark:text-slate-400">
                            <p>• Ensure phone numbers are 10 digits.</p>
                            <p>• Select all applicable classes.</p>
                            <p>• Guardian info is mandatory.</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-slate-200 shadow-md dark:border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Personal Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    placeholder="e.g. Kasun Perera"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <Select value={formData.gender} onValueChange={(val) => handleValueChange('gender', val)}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100">
                                        <SelectValue placeholder="Select Gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dob">Date of Birth</Label>
                                <div className="relative">
                                    <Input
                                        id="dob"
                                        type="date"
                                        value={formData.dob}
                                        onChange={handleChange}
                                        className="bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:color-scheme-dark"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="077xxxxxxx"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="student@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-md dark:border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Guardian Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="guardian">Guardian Name</Label>
                                <Input
                                    id="guardian"
                                    placeholder="Parent/Guardian Name"
                                    value={formData.guardian}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guardianPhone">Guardian Phone</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    <Input
                                        id="guardianPhone"
                                        type="tel"
                                        placeholder="077xxxxxxx"
                                        value={formData.guardianPhone}
                                        onChange={handleChange}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-md dark:border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-primary" />
                                Course Enrollment
                            </CardTitle>
                            <CardDescription>Select all classes the student is enrolling in.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {classCategories.map((cat) => {
                                    const isSelected = formData.selectedClasses.includes(cat.name);

                                    // Calculate preview dates
                                    const today = new Date();
                                    const endDate = new Date(today);
                                    const duration = cat.duration || '3 months';
                                    let monthsToAdd = 3;
                                    if (duration === '6 months') monthsToAdd = 6;
                                    else if (duration === '1 year') monthsToAdd = 12;
                                    endDate.setMonth(endDate.getMonth() + monthsToAdd);

                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => {
                                                const cls = cat.name;
                                                setFormData(prev => {
                                                    const current = prev.selectedClasses;
                                                    if (current.includes(cls)) {
                                                        return { ...prev, selectedClasses: current.filter(c => c !== cls) };
                                                    } else {
                                                        return { ...prev, selectedClasses: [...current, cls] };
                                                    }
                                                });
                                            }}
                                            className={cn(
                                                "relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between group h-full select-none",
                                                isSelected
                                                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20 dark:bg-primary/10"
                                                    : "border-slate-200 hover:border-primary/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-semibold text-slate-800 group-hover:text-primary transition-colors text-sm">{cat.name}</div>
                                                {isSelected && (
                                                    <div className="bg-primary text-white rounded-full p-1 shadow-sm animate-in zoom-in-50 duration-200">
                                                        <Check className="h-3 w-3" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xs font-medium text-slate-500 mt-2">
                                                <div className="mb-1">Fee: LKR {cat.fee.toLocaleString()}/mo</div>
                                                <div className="mb-1">Duration: {duration}</div>
                                                <div className="p-2 mt-2 bg-slate-100 rounded-lg dark:bg-slate-800 text-[10px] space-y-1">
                                                    <div className="flex justify-between">
                                                        <span>Start:</span>
                                                        <span className="font-semibold">{today.toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>End:</span>
                                                        <span className="font-semibold text-primary">{endDate.toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between dark:bg-slate-900 dark:border-slate-800">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Monthly Fee</p>
                                    <p className="text-xs text-slate-400">Based on selection</p>
                                </div>
                                <span className="text-2xl font-bold text-primary font-display">
                                    LKR {classCategories
                                        .filter(c => formData.selectedClasses.includes(c.name))
                                        .reduce((sum, c) => sum + parseInt(String(c.fee)), 0)
                                        .toLocaleString()}
                                </span>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-end dark:bg-slate-900 dark:border-slate-800">
                            <Button size="lg" onClick={handleRegister} className="w-full md:w-auto gap-2 shadow-lg shadow-primary/20">
                                <Save className="h-4 w-4" />
                                Complete Registration
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
