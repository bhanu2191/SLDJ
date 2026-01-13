import { PhotoUpload } from '../components/registration/PhotoUpload';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { UserPlus, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateNextStudentId, commitNextStudentId } from '../lib/idGenerator';
import { saveStudent } from '../lib/storage';
import { useAuth } from '../context/AuthContext';

export function Registration() {
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const [previewId, setPreviewId] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        dob: '',
        phone: '',
        email: '',
        classKey: '',
        guardian: '',
        guardianPhone: ''
    });

    useEffect(() => {
        // Show what the NEXT ID will be
        setPreviewId(generateNextStudentId());
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        // Handle select element which doesn't have an id attribute in the original code, 
        // need to check how I'll wire it up.
        // The select below uses hardcoded options and no ID initially.
        // I will add IDs to inputs in the render below to match these keys.
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    // Special handler for the select since it might not have an ID or I want to be explicit
    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, classKey: e.target.value }));
    };

    const handleRegister = async () => {
        // Validation Checks
        if (!formData.fullName) {
            alert("Error: Student Name is required!");
            return;
        }
        if (!formData.classKey) {
            alert("Error: Please assign a Class to the student.");
            return;
        }

        try {
            // 1. Generate and commit the ID
            const finalId = commitNextStudentId();

            // 2. Save student
            await saveStudent({
                regNum: finalId,
                name: formData.fullName,
                class: getClassName(formData.classKey), // helper to get readable name
                dob: formData.dob,
                phone: formData.phone,
                email: formData.email,
                guardian: formData.guardian,
                guardianPhone: formData.guardianPhone,
                avatar: avatar || undefined // Pass avatar (or undefined if null, storage.ts will handle it)
            });

            // 3. Navigate
            alert(`Student Registered Successfully! ID: ${finalId}`);
            navigate(`/${userRole}/students`);
        } catch (error) {
            console.error("Registration failed:", error);
            alert("Failed to save student. Please try again.");
        }
    };

    const getClassName = (key: string) => {
        const map: Record<string, string> = {
            'N5': 'JLPT N5',
            'N4': 'JLPT N4',
            'AL': 'Adv. Level',
            'OL': 'Ord. Level'
        };
        return map[key] || key;
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Student Registration</h1>
                    <p className="text-slate-500">Add a new student to the system</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left Column: Photo & Personal Info */}
                        <div className="lg:col-span-1 space-y-6">
                            <PhotoUpload onImageSelect={setAvatar} />

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
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="dob">Date of Birth</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        value={formData.dob}
                                        onChange={handleChange}
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
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="text-lg font-medium text-slate-800 mb-4">Academic & Guardian Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="classKey">Assigned Class</Label>
                                        <select
                                            id="classKey"
                                            value={formData.classKey}
                                            onChange={handleClassChange}
                                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        >
                                            <option value="">Select Class...</option>
                                            <option value="N5">JLPT N5 - Basic</option>
                                            <option value="N4">JLPT N4 - Elementary</option>
                                            <option value="AL">Advanced Level Japanese</option>
                                            <option value="OL">Ordinary Level Japanese</option>
                                        </select>
                                    </div>

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
                                        <Input
                                            id="guardianPhone"
                                            type="tel"
                                            placeholder="077xxxxxxx"
                                            value={formData.guardianPhone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        onClick={() => navigate('/students')}
                        className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
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
