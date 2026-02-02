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

    // SMS Settings State
    const [smsSettings, setSmsSettings] = useState({
        provider: 'DefaultGateway',
        apiKey: '',
        senderId: 'SLDJ',
        enabled: true
    });
    const [smsSaving, setSmsSaving] = useState(false);
    const [smsBalance, setSmsBalance] = useState<string | number | null>(null);

    useEffect(() => {
        loadCategories();
        loadSmsSettings(); // Load SMS settings on mount
    }, []);

    const loadSmsSettings = async () => {
        try {
            const settings = await window.electronAPI.getSmsConfig();
            if (settings) {
                setSmsSettings(settings);
                // Also load balance
                loadBalance();
            }
        } catch (error) {
            console.error("Failed to load SMS settings:", error);
        }
    };

    const loadBalance = async () => {
        try {
            // @ts-ignore
            const result = await window.electronAPI.getSmsBalance();
            if (result.success) {
                setSmsBalance(result.balance);
            } else {
                setSmsBalance(result.error || "Unavailable");
            }
        } catch (error) {
            console.error("Failed to load balance:", error);
            setSmsBalance("Error");
        }
    };

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

    const handleSaveSmsSettings = async () => {
        setSmsSaving(true);
        try {
            // @ts-ignore
            await window.electronAPI.saveSmsConfig(smsSettings);
            alert('SMS Configuration saved!');
        } catch (error) {
            console.error("Failed to save SMS settings:", error);
            alert('Failed to save SMS configuration.');
        } finally {
            setSmsSaving(false);
        }
    };

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
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">SMS Gateway Configuration</h2>
                    {smsBalance !== null && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${String(smsBalance).toLowerCase().includes('error') || String(smsBalance).toLowerCase().includes('fail')
                                ? 'text-red-600 bg-red-50 border-red-100'
                                : 'text-green-600 bg-green-50 border-green-100'
                            }`}>
                            {String(smsBalance).toLowerCase().includes('error') ? smsBalance : `Balance: ${smsBalance} SMS`}
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                            value={smsSettings.provider || ''}
                            onChange={(e) => setSmsSettings({ ...smsSettings, provider: e.target.value })}
                            placeholder="e.g. text.lk"
                        />
                        <p className="text-xs text-gray-500 mt-1">Set to <b>text.lk</b> for Sinhala/Unicode support.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                            value={smsSettings.senderId || ''}
                            onChange={(e) => setSmsSettings({ ...smsSettings, senderId: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary font-mono"
                            value={smsSettings.apiKey || ''}
                            onChange={(e) => setSmsSettings({ ...smsSettings, apiKey: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="smsEnabled"
                            checked={!!smsSettings.enabled}
                            onChange={(e) => setSmsSettings({ ...smsSettings, enabled: e.target.checked })}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <label htmlFor="smsEnabled" className="text-sm font-medium text-gray-700">Enable SMS Features</label>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSaveSmsSettings}
                            disabled={smsSaving}
                            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-50">
                            <Save size={18} />
                            {smsSaving ? 'Saving...' : 'Update Configuration'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
