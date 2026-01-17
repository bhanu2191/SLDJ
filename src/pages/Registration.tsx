import { PhotoUpload } from '../components/registration/PhotoUpload';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Save } from 'lucide-react';
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

    // Special handler for the select since it uses classKey in state but might map to ID or Name
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

            // Find class name from selected key (which is the category name now)
            // If we store name directly in value, we use it directly.
            const selectedClass = formData.classKey;

            // 2. Save student
            await saveStudent({
                regNum: finalId,
                name: formData.fullName,
                class: selectedClass,
                dob: formData.dob,
                phone: formData.phone,
                email: formData.email,
                guardian: formData.guardian,
                guardianPhone: formData.guardianPhone,
                avatar: avatar || undefined
            });

            // 3. Navigate
            alert(`Student Registered Successfully! ID: ${finalId}`);
            navigate(`/${userRole}/students`);
        } catch (error) {
            console.error("Registration failed:", error);
            alert("Failed to save student. Please try again.");
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* ... (header code unchanged) ... */}

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
                                            {classCategories.map((cat) => (
                                                <option key={cat.id} value={cat.name}>
                                                    {cat.name} - LKR {cat.fee}
                                                </option>
                                            ))}
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
