import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Check, RotateCcw, User, Phone, Mail, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveStudent } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

export function Registration() {
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const [previewId, setPreviewId] = useState('');
    const [successDialog, setSuccessDialog] = useState({ isOpen: false, studentId: '' });

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
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [classCategories, setClassCategories] = useState<any[]>([]);

    useEffect(() => {
        const loadNextId = async () => {
            try {
                // @ts-ignore
                const nextId = await window.electronAPI.getNextStudentId();
                setPreviewId(nextId);
            } catch (e) {
                console.error("Could not fetch next ID");
            }
        };
        loadNextId();

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
            setErrors(prev => ({ ...prev, [id]: '' }));
        }
    };

    const handleValueChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        setErrors(prev => ({ ...prev, [key]: '' }));
    }



    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, nextFieldId: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextElement = document.getElementById(nextFieldId) || document.querySelector(`[data-field="${nextFieldId}"]`);
            if (nextElement) {
                (nextElement as HTMLElement).focus();
            }
        }
    };

    // "Cute & Small" Alert Configuration replaced with Sonner Toast wrapper
    const showCuteAlert = (title: string, text: string, icon: 'success' | 'error' | 'warning', focusId?: string) => {
        if (icon === 'success') {
            toast.success(title, { description: text });
        } else if (icon === 'error') {
            toast.error(title, { description: text });
        } else {
            toast.warning(title, { description: text });
        }

        if (focusId) {
            setTimeout(() => {
                const element = document.getElementById(focusId);
                if (element) {
                    element.focus();
                }
            }, 100);
        }
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
        setErrors({});
        showCuteAlert('Reset', 'Form has been cleared.', 'success');
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Student Name is required!';
        if (!formData.gender) newErrors.gender = 'Please select a gender.';
        if (!formData.dob) newErrors.dob = 'Date of Birth is required.';

        const phoneRegex = /^0\d{9}$/;
        if (!formData.phone) {
            newErrors.phone = 'Phone Number is required';
        } else if (!phoneRegex.test(formData.phone)) {
            newErrors.phone = 'Must be 10 digits starting with 0.';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            newErrors.email = 'Please check the email format.';
        }

        if (!formData.guardian.trim()) newErrors.guardian = 'Guardian Name is missing.';
        if (!formData.guardianPhone) {
            newErrors.guardianPhone = 'Guardian Phone is required';
        } else if (!phoneRegex.test(formData.guardianPhone)) {
            newErrors.guardianPhone = 'Guardian Phone must be 10 digits starting with 0.';
        }

        if (formData.selectedClasses.length === 0) newErrors.classes = 'Select at least one class.';

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            showCuteAlert('Validation Error', 'Please check the highlighted fields.', 'error');
            const firstError = Object.keys(newErrors)[0];
            const targetId = firstError === 'gender' ? 'gender-trigger' : firstError;
            if (targetId !== 'classes') {
                const el = document.getElementById(targetId);
                if (el) setTimeout(() => el.focus(), 100);
            }
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        // --- Validation ---
        if (!validateForm()) return;

        try {
            // @ts-ignore
            const finalId = await window.electronAPI.getNextStudentId();
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

                if (duration !== 'Ongoing') {
                    endDate.setMonth(endDate.getMonth() + monthsToAdd);
                }

                return {
                    className,
                    startDate: startDate.toISOString(),
                    endDate: duration === 'Ongoing' ? null : endDate.toISOString(),
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

            // Send Welcome SMS
            if (formData.phone) {
                try {
                    const message = `SL Dream Japan වෙත ලියාපදිංචි වූ ඔබට ස්තුතියි. ඔබගේ අධ්යාපනික හා වෘත්තීය අනාගතයට සාර්ථකත්වය ප්රාර්ථනා කරමු.`;
                    // @ts-ignore
                    const smsRes = await window.electronAPI.sendWelcomeSms(formData.phone, message);
                    if (smsRes?.success) {
                        toast.success("SMS Sent", { description: "Welcome message delivered to the student." });
                    } else {
                        toast.error("SMS Failed", { description: "Could not send welcome message." });
                    }
                } catch (smsError) {
                    console.error("Failed to send welcome SMS:", smsError);
                    toast.error("SMS Error", { description: "An error occurred while sending the SMS." });
                }
            }

            setSuccessDialog({ isOpen: true, studentId: finalId });
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
        <div className="pb-10">
            <AlertDialog open={successDialog.isOpen} onOpenChange={(open) => {
                if (!open) {
                    setSuccessDialog({ isOpen: false, studentId: '' });
                    navigate(`/${userRole}/students`);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Registration Successful!</AlertDialogTitle>
                        <AlertDialogDescription className="text-lg">
                            Student ID: <span className="font-bold text-slate-900 dark:text-white">{successDialog.studentId}</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction>Done</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                                <Label htmlFor="fullName" className={cn(errors.fullName && "text-red-500")}>Full Name</Label>
                                <Input
                                    id="fullName"
                                    placeholder="e.g. Kasun Perera"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    onKeyDown={(e) => handleKeyDown(e, 'gender-trigger')}
                                    className={cn(errors.fullName && "border-red-500 focus-visible:ring-red-500")}
                                />
                                {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className={cn(errors.gender && "text-red-500")}>Gender</Label>
                                <Select value={formData.gender} onValueChange={(val) => { handleValueChange('gender', val); document.getElementById('dob')?.focus(); }}>
                                    <SelectTrigger id="gender-trigger" data-field="gender-trigger" className={cn("bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100", errors.gender && "border-red-500 focus:ring-red-500")}>
                                        <SelectValue placeholder="Select Gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.gender && <p className="text-xs text-red-500 font-medium">{errors.gender}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dob" className={cn(errors.dob && "text-red-500")}>Date of Birth</Label>
                                <div className="relative">
                                    <Input
                                        id="dob"
                                        type="date"
                                        value={formData.dob}
                                        onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'phone')}
                                        className={cn("bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:color-scheme-dark", errors.dob && "border-red-500 focus-visible:ring-red-500")}
                                    />
                                </div>
                                {errors.dob && <p className="text-xs text-red-500 font-medium">{errors.dob}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className={cn(errors.phone && "text-red-500")}>Phone Number</Label>
                                <div className="relative">
                                    <Phone className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none", errors.phone ? "text-red-500" : "text-slate-400")} />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="077xxxxxxx"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'email')}
                                        className={cn("pl-9", errors.phone && "border-red-500 focus-visible:ring-red-500")}
                                    />
                                </div>
                                {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className={cn(errors.email && "text-red-500")}>Email Address</Label>
                                <div className="relative">
                                    <Mail className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none", errors.email ? "text-red-500" : "text-slate-400")} />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="student@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'guardian')}
                                        className={cn("pl-9", errors.email && "border-red-500 focus-visible:ring-red-500")}
                                    />
                                </div>
                                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
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
                                <Label htmlFor="guardian" className={cn(errors.guardian && "text-red-500")}>Guardian Name</Label>
                                <Input
                                    id="guardian"
                                    placeholder="Parent/Guardian Name"
                                    value={formData.guardian}
                                    onChange={handleChange}
                                    onKeyDown={(e) => handleKeyDown(e, 'guardianPhone')}
                                    className={cn(errors.guardian && "border-red-500 focus-visible:ring-red-500")}
                                />
                                {errors.guardian && <p className="text-xs text-red-500 font-medium">{errors.guardian}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guardianPhone" className={cn(errors.guardianPhone && "text-red-500")}>Guardian Phone</Label>
                                <div className="relative">
                                    <Phone className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none", errors.guardianPhone ? "text-red-500" : "text-slate-400")} />
                                    <Input
                                        id="guardianPhone"
                                        type="tel"
                                        placeholder="077xxxxxxx"
                                        value={formData.guardianPhone}
                                        onChange={handleChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const firstClassCard = document.querySelector('[data-class-card]');
                                                if (firstClassCard) (firstClassCard as HTMLElement).focus();
                                            }
                                        }}
                                        className={cn("pl-9", errors.guardianPhone && "border-red-500 focus-visible:ring-red-500")}
                                    />
                                </div>
                                {errors.guardianPhone && <p className="text-xs text-red-500 font-medium">{errors.guardianPhone}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={cn("border-slate-200 shadow-md dark:border-slate-800 transition-all duration-300", errors.classes && "border-red-500 shadow-red-500/10")}>
                        <CardHeader>
                            <CardTitle className={cn("flex items-center gap-2", errors.classes && "text-red-500")}>
                                <Check className={cn("h-5 w-5 text-primary", errors.classes && "text-red-500")} />
                                Course Enrollment
                            </CardTitle>
                            <CardDescription className={cn(errors.classes && "text-red-500 font-medium")}>
                                {errors.classes || "Select all classes the student is enrolling in."}
                            </CardDescription>
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

                                    if (duration !== 'Ongoing') {
                                        endDate.setMonth(endDate.getMonth() + monthsToAdd);
                                    }

                                    return (
                                        <div
                                            key={cat.id}
                                            data-class-card={true}
                                            tabIndex={0}
                                            onClick={() => {
                                                const cls = cat.name;
                                                setFormData(prev => {
                                                    const current = prev.selectedClasses;
                                                    if (current.includes(cls)) return { ...prev, selectedClasses: current.filter(c => c !== cls) };
                                                    return { ...prev, selectedClasses: [...current, cls] };
                                                });
                                                setErrors(prev => ({ ...prev, classes: '' }));
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    // Toggle selection
                                                    const cls = cat.name;
                                                    setFormData(prev => {
                                                        const current = prev.selectedClasses;
                                                        if (current.includes(cls)) return { ...prev, selectedClasses: current.filter(c => c !== cls) };
                                                        return { ...prev, selectedClasses: [...current, cls] };
                                                    });
                                                    setErrors(prev => ({ ...prev, classes: '' }));
                                                } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    // Move to next card or submit
                                                    const cards = document.querySelectorAll('[data-class-card]');
                                                    const currentIndex = Array.from(cards).indexOf(e.currentTarget);
                                                    if (currentIndex < cards.length - 1) {
                                                        (cards[currentIndex + 1] as HTMLElement).focus();
                                                    } else {
                                                        document.getElementById('submitBtn')?.focus();
                                                    }
                                                }
                                            }}
                                            className={cn(
                                                "relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between group h-full select-none focus:ring-4 focus:ring-primary/40 focus:outline-none",
                                                isSelected
                                                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20 dark:bg-primary/10"
                                                    : "border-slate-200 hover:border-primary/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors text-sm">{cat.name}</div>
                                                {isSelected && (
                                                    <div className="bg-primary text-white dark:text-slate-900 rounded-full p-1 shadow-sm animate-in zoom-in-50 duration-200">
                                                        <Check className="h-3 w-3 " strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">
                                                <div className="mb-1">Fee: LKR {cat.fee.toLocaleString()}/mo</div>
                                                <div className="mb-1">Duration: {duration}</div>
                                                <div className="p-2 mt-2 bg-slate-100 rounded-lg dark:bg-slate-800 text-[10px] space-y-1">
                                                    <div className="flex justify-between">
                                                        <span>Start:</span>
                                                        <span className="font-semibold">{today.toLocaleDateString()}</span>
                                                    </div>
                                                    {duration !== 'Ongoing' ? (
                                                        <div className="flex justify-between">
                                                            <span>End:</span>
                                                            <span className="font-semibold text-primary">{endDate.toLocaleDateString()}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between text-slate-500 dark:text-slate-400 italic">
                                                            <span>End:</span>
                                                            <span className="font-semibold">Ongoing Enrollment</span>
                                                        </div>
                                                    )}
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
                            <Button id="submitBtn" size="lg" onClick={handleRegister} className="w-full md:w-auto gap-2 shadow-lg shadow-primary/20 focus:ring-4 focus:ring-primary/40 outline-none">
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
