import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Save, Check, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateNextStudentId, commitNextStudentId } from '../lib/idGenerator';
import { saveStudent } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

export function Registration() {
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const [previewId, setPreviewId] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        dob: '',
        phone: '',
        email: '',
        selectedClasses: [] as string[], // Changed from classKey string
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
                const categories = await window.electronAPI.getClassCategories();
                setClassCategories(categories);
            } catch (err) {
                console.error("Failed to load class categories", err);
            }
        };
        loadCategories();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        // If the ID matches a key in formData, update it
        if (id in formData) {
            // @ts-ignore
            setFormData(prev => ({ ...prev, [id]: value }));
        }
    };

    const validateField = (name: string, value: string): boolean => {
        switch (name) {
            case 'fullName':
                if (!value.trim()) {
                    showCuteAlert('Oops!', 'Student Name is required!', 'error', 'fullName');
                    return false;
                }
                return true;
            case 'dob':
                if (!value) {
                    showCuteAlert('Hey!', 'Date of Birth is missing.', 'error', 'dob');
                    return false;
                }
                return true;
            case 'phone':
                const phoneRegex = /^0\d{9}$/;
                if (!value || !phoneRegex.test(value)) {
                    showCuteAlert('Check Phone', 'Phone must be 10 digits starting with 0.', 'error', 'phone');
                    return false;
                }
                return true;
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (value && !emailRegex.test(value)) {
                    showCuteAlert('Email Error', 'That email looks invalid.', 'error', 'email');
                    return false;
                }
                return true;
            case 'guardian':
                if (!value.trim()) {
                    showCuteAlert('Guardian?', 'Guardian Name is required.', 'error', 'guardian');
                    return false;
                }
                return true;
            case 'guardianPhone':
                const gPhoneRegex = /^0\d{9}$/;
                if (!value || !gPhoneRegex.test(value)) {
                    showCuteAlert('Guardian Phone', 'Must be 10 digits starting with 0.', 'error', 'guardianPhone');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, currentId: string, nextId: string | null) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            // 1. Validate Current Field
            // @ts-ignore
            const isValid = validateField(currentId, formData[currentId]);

            if (isValid) {
                // 2. If valid, move to next
                if (nextId) {
                    const nextElement = document.getElementById(nextId);
                    if (nextElement) {
                        nextElement.focus();
                    }
                } else {
                    // If no nextId, it means we are at the end (Submit)
                    handleRegister();
                }
            }
            // If invalid, validateField handles the alert and we stay put (or auto-focus back via alert didClose)
        }
    };

    // "Cute & Small" Alert Configuration
    const showCuteAlert = (title: string, text: string, icon: 'success' | 'error' | 'warning', focusId?: string) => {
        Swal.fire({
            title: title,
            text: text,
            icon: icon,
            width: 280, // Very small width
            padding: '1rem',
            background: '#ffffff',
            confirmButtonColor: icon === 'error' ? '#FF8787' : '#69DB7C',
            confirmButtonText: 'OK',
            backdrop: `rgba(0,0,0,0.1)`, // Very light backdrop
            allowOutsideClick: false,
            customClass: {
                popup: 'rounded-[20px] shadow-lg border-2 border-slate-100', // Bubble shape
                title: 'text-lg font-bold text-slate-700',
                htmlContainer: 'text-sm text-slate-500',
                confirmButton: 'rounded-full px-5 py-1 text-sm font-bold shadow-sm'
            },
            showClass: {
                popup: 'animate__animated animate__zoomIn animate__faster'
            },
            hideClass: {
                popup: 'animate__animated animate__zoomOut animate__faster'
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
            dob: '',
            phone: '',
            email: '',
            selectedClasses: [],
            guardian: '',
            guardianPhone: ''
        });
        showCuteAlert('Cleared!', 'Form has been reset.', 'success');
    };

    const handleRegister = async () => {
        // --- Comprehensive & Strict Validation ---

        // 1. Full Name
        if (!formData.fullName.trim()) {
            showCuteAlert('Oops!', 'Student Name is required!', 'error', 'fullName');
            return;
        }

        // 2. Date of Birth
        if (!formData.dob) {
            showCuteAlert('Hey!', 'Date of Birth is missing.', 'error', 'dob');
            return;
        }

        // 3. Phone Number (Strict 10 digits, starting with 0)
        // Regex: ^0\d{9}$ (Starts with 0, followed by exactly 9 digits)
        const phoneRegex = /^0\d{9}$/;
        if (!formData.phone || !phoneRegex.test(formData.phone)) {
            showCuteAlert('Check Phone', 'Phone must be 10 digits starting with 0 (e.g. 0771234567).', 'error', 'phone');
            return;
        }

        // 4. Email (Strict Format check if provided)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            showCuteAlert('Email Error', 'That email looks invalid.', 'error', 'email');
            return;
        }

        // 5. Guardian Name
        if (!formData.guardian.trim()) {
            showCuteAlert('Guardian?', 'Guardian Name is required.', 'error', 'guardian');
            return;
        }

        // 6. Guardian Phone (Strict 10 digits, starting with 0)
        if (!formData.guardianPhone || !phoneRegex.test(formData.guardianPhone)) {
            showCuteAlert('Guardian Phone', 'Guardian Phone must be 10 digits starting with 0.', 'error', 'guardianPhone');
            return;
        }

        // 7. Class Selection
        if (formData.selectedClasses.length === 0) {
            showCuteAlert('No Class?', 'Please select at least one class.', 'error');
            return;
        }

        try {
            // 1. Generate and commit the ID
            const finalId = commitNextStudentId();

            // 2. Save student
            await saveStudent({
                regNum: finalId,
                name: formData.fullName,
                class: formData.selectedClasses, // Pass array, backend handles JSON stringify
                dob: formData.dob,
                phone: formData.phone,
                email: formData.email,
                guardian: formData.guardian,
                guardianPhone: formData.guardianPhone
            });

            // 3. Navigate
            // 3. Navigate
            await Swal.fire({
                icon: 'success',
                title: 'Done!',
                text: `ID: ${finalId}`,
                width: 250,
                padding: '1rem',
                confirmButtonColor: '#69DB7C',
                confirmButtonText: 'Cool',
                customClass: {
                    popup: 'rounded-[20px] shadow-lg border-2 border-slate-100',
                    title: 'text-lg font-bold text-slate-700',
                    htmlContainer: 'text-sm text-slate-500',
                    confirmButton: 'rounded-full px-5 py-1 text-sm font-bold shadow-sm'
                },
                timer: 3000
            });
            navigate(`/${userRole}/students`);
        } catch (error) {
            console.error("Registration failed:", error);
            showCuteAlert('Oh no!', 'Failed to save student. Try again.', 'error');
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">New Student Registration</h1>
                    <p className="text-slate-500">Enter student details to create a new record</p>
                </div>
                <button
                    onClick={handleClear}
                    className="flex items-center gap-2 px-4 py-2 text-slate-500 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-primary hover:border-slate-300 transition-all font-medium"
                    title="Clear Form"
                >
                    <RotateCcw className="h-4 w-4" />
                    <span>Clear Form</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left Column: Photo & Personal Info */}
                        <div className="lg:col-span-1 space-y-6">

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Registration Number</Label>
                                    <Input
                                        disabled
                                        value={previewId}
                                        className="bg-slate-50 font-mono text-slate-500"
                                    />
                                    <p className="text-xs text-slate-400">Auto-generated upon save</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Details & Guardian */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        placeholder="e.g. Kasun Perera"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'fullName', 'dob')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="dob">Date of Birth</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        value={formData.dob}
                                        onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'dob', 'phone')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="077xxxxxxx"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'phone', 'email')}
                                    />
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="student@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, 'email', 'guardian')}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="text-lg font-medium text-slate-800 mb-4">Guardian Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="guardian">Guardian Name</Label>
                                        <Input
                                            id="guardian"
                                            placeholder="Parent/Guardian Name"
                                            value={formData.guardian}
                                            onChange={handleChange}
                                            onKeyDown={(e) => handleKeyDown(e, 'guardian', 'guardianPhone')}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="guardianPhone">Guardian Phone</Label>
                                        <Input
                                            id="guardianPhone"
                                            type="tel"
                                            placeholder="077xxxxxxx"
                                            value={formData.guardianPhone}
                                            onChange={handleChange}
                                            onKeyDown={(e) => handleKeyDown(e, 'guardianPhone', null)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="text-lg font-medium text-slate-800 mb-4">Course Enrollment</h3>
                                <div className="space-y-4">
                                    <Label>Select Classes</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {classCategories.map((cat) => {
                                            const isSelected = formData.selectedClasses.includes(cat.name);
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
                                                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between group h-full ${isSelected
                                                        ? 'border-primary bg-primary/5 shadow-sm'
                                                        : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="font-semibold text-slate-800 group-hover:text-primary transition-colors">{cat.name}</div>
                                                        {isSelected && (
                                                            <div className="bg-primary text-white rounded-full p-1 animate-scale-in">
                                                                <Check className="h-3 w-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-500 mt-auto">LKR {cat.fee.toLocaleString()}/mo</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center border border-slate-100 mt-4">
                                        <div>
                                            <p className="text-sm font-medium text-slate-600">Total Monthly Fee</p>
                                            <p className="text-xs text-slate-400">Sum of selected class fees</p>
                                        </div>
                                        <span className="text-2xl font-bold text-primary">
                                            LKR {classCategories
                                                .filter(c => formData.selectedClasses.includes(c.name))
                                                .reduce((sum, c) => sum + parseInt(String(c.fee)), 0)
                                                .toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">

                    <button
                        onClick={handleRegister}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-medium shadow-sm hover:bg-primary-dark transition-colors flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        Register Student
                    </button>
                </div>
            </div>
        </div>
    );
}
