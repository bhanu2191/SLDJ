import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';

interface ClassCategory {
    id: number | string;
    name: string;
    fee: number | string;
    isNew?: boolean;
}

export const SystemSettings = () => {
    const [classCategories, setClassCategories] = useState<ClassCategory[]>([]);
    const [deletedIds, setDeletedIds] = useState<(number | string)[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await window.electronAPI.getClassCategories();
            setClassCategories(data);
        } catch (error) {
            console.error("Failed to load categories:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = () => {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setClassCategories(prev => [...prev, { id: tempId, name: '', fee: '', isNew: true }]);
    };

    const handleChangeCategory = (id: number | string, field: keyof ClassCategory, value: string) => {
        setClassCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, [field]: value } : cat
        ));
    };

    const handleDeleteCategory = (id: number | string) => {
        if (String(id).startsWith('temp-')) {
            // Just remove from state if it's a new unsaved item
            setClassCategories(classCategories.filter(cat => cat.id !== id));
        } else {
            // Mark for deletion
            setDeletedIds([...deletedIds, id]);
            setClassCategories(classCategories.filter(cat => cat.id !== id));
        }
    };

    const handleSaveChanges = async () => {
        setSaving(true);
        try {
            // 1. Delete removed items
            for (const id of deletedIds) {
                await window.electronAPI.deleteClassCategory(id);
            }

            // 2. Process additions and updates
            for (const cat of classCategories) {
                if (cat.isNew) {
                    if (cat.name && cat.fee) {
                        await window.electronAPI.addClassCategory({ name: cat.name, fee: Number(cat.fee) });
                    }
                } else {
                    // Check if modified (optimally) or just update (simpler)
                    // For now, simple update
                    await window.electronAPI.updateClassCategory({ id: cat.id, name: cat.name, fee: Number(cat.fee) });
                }
            }

            // Reset state
            setDeletedIds([]);
            await loadCategories();
            alert('Changes saved successfully!');
        } catch (error) {
            console.error("Failed to save changes:", error);
            alert('Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const [smsSettings, _setSmsSettings] = useState({
        provider: 'DefaultGateway',
        apiKey: '********************',
        senderId: 'SLDJ'
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
                <p className="text-gray-500">Manage class fees, categories, and API settings</p>
            </div>

            {/* Class Categories & Fees */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">Class Categories & Fees</h2>
                    <button
                        onClick={handleAddCategory}
                        className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
                    >
                        <Plus size={16} /> Add Category
                    </button>
                </div>

                {loading ? (
                    <p className="text-gray-500 text-sm">Loading categories...</p>
                ) : (
                    <div className="space-y-4">
                        {classCategories.length === 0 && (
                            <p className="text-gray-400 text-sm text-center py-4">No class categories found. Add one to get started.</p>
                        )}
                        {classCategories.map((category) => (
                            <div key={category.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Class Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-primary focus:border-primary"
                                        value={category.name || ''}
                                        onChange={(e) => handleChangeCategory(category.id, 'name', e.target.value)}
                                        placeholder="e.g. JLPT N5"
                                    />
                                </div>
                                <div className="w-48">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Monthly Fee (LKR)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-primary focus:border-primary"
                                        value={category.fee || ''}
                                        onChange={(e) => handleChangeCategory(category.id, 'fee', e.target.value)}
                                        placeholder="5000"
                                    />
                                </div>
                                <div className="pt-5">
                                    <button
                                        onClick={() => handleDeleteCategory(category.id)}
                                        className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSaveChanges}
                        disabled={saving}
                        className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* SMS Gateway Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">SMS Gateway Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                            defaultValue={smsSettings.provider}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                            defaultValue={smsSettings.senderId}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary font-mono"
                            defaultValue={smsSettings.apiKey}
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors">
                        <Save size={18} />
                        Update Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
