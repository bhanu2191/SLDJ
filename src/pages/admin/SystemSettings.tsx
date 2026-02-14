import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, RefreshCw, Bell, Play } from 'lucide-react';

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
        adminPhone: '',
        reminderDate: 7,
        reminderTime: '09:00',
        enabled: true
    });

    const [reminderRunning, setReminderRunning] = useState(false);

    const handleRunReminders = async () => {
        if (!confirm("Are you sure you want to run the payment reminder check now? This will send SMS to all unpaid students.")) return;

        setReminderRunning(true);
        try {
            const result = await window.electronAPI.triggerPaymentReminders();
            if (result.success) {
                alert(`Reminder Check Completed.\nSent: ${result.sent}\nFailed: ${result.failed}`);
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error("Failed to run reminders:", error);
            alert("Failed to run reminders.");
        } finally {
            setReminderRunning(false);
        }
    };
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
                // Show actual error for debugging
                console.error("Balance Error:", result.error);
                setSmsBalance(typeof result.error === 'string' ? result.error.substring(0, 20) : "Failed");
            }
        } catch (error: any) {
            console.error("Failed to load balance:", error);
            setSmsBalance(error.message ? error.message.substring(0, 15) : "Net Error");
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
            // Refresh balance immediately with new keys
            await loadBalance();
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
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">SMS Gateway Configuration</h2>
                        <p className="text-sm text-gray-500">Configure your Text.lk or generic SMS provider settings.</p>
                    </div>
                    {smsBalance !== null && (
                        <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide leading-tight">Balance</span>
                                <span className="text-sm font-bold text-gray-800 leading-tight">
                                    {smsBalance} <span className="text-xs text-gray-500 font-normal">SMS</span>
                                </span>
                            </div>
                            <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>
                            <button
                                onClick={loadBalance}
                                title="Refresh Balance"
                                className="text-gray-400 hover:text-primary transition-colors p-1 rounded-full hover:bg-gray-100"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
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
                    <button
                        onClick={handleSaveSmsSettings}
                        disabled={smsSaving}
                        className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-50">
                        <Save size={18} />
                        {smsSaving ? 'Saving...' : 'Update Configuration'}
                    </button>
                </div>
            </div>

            {/* Automated Reminders Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Bell size={20} className="text-primary" />
                            Automated Payment Reminders
                        </h2>
                        <p className="text-sm text-gray-500">Configure when the system automatically sends payment reminders.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Date (Monthly)</label>
                        <select
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                            value={smsSettings.reminderDate || 7}
                            onChange={(e) => setSmsSettings({ ...smsSettings, reminderDate: Number(e.target.value) })}
                        >
                            {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                <option key={day} value={day}>{day}th of the month</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">System checks for pending payments on this day.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Check Time</label>
                        <input
                            type="time"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                            value={smsSettings.reminderTime || '09:00'}
                            onChange={(e) => setSmsSettings({ ...smsSettings, reminderTime: e.target.value })}
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-between items-center bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                    <div>
                        <h3 className="text-sm font-semibold text-yellow-800">Manual Trigger</h3>
                        <p className="text-xs text-yellow-700 mt-1">Run the reminder check immediately (bypasses date check).</p>
                    </div>
                    <button
                        onClick={handleRunReminders}
                        disabled={reminderRunning}
                        className="bg-white border border-yellow-300 text-yellow-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-yellow-100 transition-colors disabled:opacity-50 font-medium shadow-sm"
                    >
                        <Play size={16} />
                        {reminderRunning ? 'Running...' : 'Run Reminders Now'}
                    </button>
                </div>

                <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
                    <button
                        onClick={handleSaveSmsSettings}
                        disabled={smsSaving}
                        className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-50">
                        <Save size={18} />
                        {smsSaving ? 'Saving...' : 'Update Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
