import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, RefreshCw, Play } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Swal from 'sweetalert2';

interface ClassCategory {
    id: number | string;
    name: string;
    fee: number | string;
    duration?: string;
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
    const [smsSaving, setSmsSaving] = useState(false);
    const [smsBalance, setSmsBalance] = useState<string | number | null>(null);

    useEffect(() => {
        loadCategories();
        loadSmsSettings();
    }, []);

    const loadSmsSettings = async () => {
        try {
            const settings = await window.electronAPI.getSmsConfig();
            if (settings) {
                setSmsSettings(settings);
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
        setClassCategories(prev => [...prev, { id: tempId, name: '', fee: '', duration: '3 months', isNew: true }]);
    };

    const handleChangeCategory = (id: number | string, field: keyof ClassCategory, value: string) => {
        setClassCategories(prev => prev.map(cat =>
            cat.id === id ? { ...cat, [field]: value } : cat
        ));
    };

    const handleDeleteCategory = (id: number | string) => {
        if (String(id).startsWith('temp-')) {
            setClassCategories(classCategories.filter(cat => cat.id !== id));
        } else {
            setDeletedIds([...deletedIds, id]);
            setClassCategories(classCategories.filter(cat => cat.id !== id));
        }
    };

    const handleSaveChanges = async () => {
        setSaving(true);
        try {
            for (const id of deletedIds) {
                await window.electronAPI.deleteClassCategory(id);
            }
            for (const cat of classCategories) {
                if (cat.isNew) {
                    if (cat.name && cat.fee) {
                        await window.electronAPI.addClassCategory({ name: cat.name, fee: Number(cat.fee), duration: cat.duration || '3 months' });
                    }
                } else {
                    await window.electronAPI.updateClassCategory({ id: cat.id, name: cat.name, fee: Number(cat.fee), duration: cat.duration || '3 months' });
                }
            }
            setDeletedIds([]);
            await loadCategories();
            Swal.fire('Saved!', 'Class categories updated successfully.', 'success');
        } catch (error) {
            console.error("Failed to save changes:", error);
            Swal.fire('Error', 'Failed to save changes.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSmsSettings = async () => {
        setSmsSaving(true);
        try {
            // @ts-ignore
            await window.electronAPI.saveSmsConfig(smsSettings);
            Swal.fire('Saved!', 'SMS Configuration saved!', 'success');
            await loadBalance();
        } catch (error) {
            console.error("Failed to save SMS settings:", error);
            Swal.fire('Error', 'Failed to save SMS configuration.', 'error');
        } finally {
            setSmsSaving(false);
        }
    };

    const handleRunReminders = async () => {
        const result = await Swal.fire({
            title: 'Run Payment Reminders?',
            text: "This will check for overdue payments and send SMS reminders to all relevant students.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, run it!',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        setReminderRunning(true);
        try {
            const res = await window.electronAPI.triggerPaymentReminders();
            if (res.success) {
                Swal.fire('Completed', `Reminders sent: ${res.sent}\nFailed: ${res.failed}`, 'success');
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        } catch (error) {
            console.error("Failed to run reminders:", error);
            Swal.fire('Error', 'Failed to run reminders.', 'error');
        } finally {
            setReminderRunning(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">System Configuration</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage global settings, class fees, and integrations.</p>
            </div>

            <Tabs defaultValue="classes" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-md mb-8">
                    <TabsTrigger value="classes">Classes & Fees</TabsTrigger>
                    <TabsTrigger value="sms">SMS Gateway</TabsTrigger>
                    <TabsTrigger value="reminders">Reminders</TabsTrigger>
                </TabsList>

                <TabsContent value="classes">
                    <Card className="dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Class Categories</CardTitle>
                                <CardDescription>Define the courses and their monthly fees.</CardDescription>
                            </div>
                            <Button onClick={handleAddCategory} size="sm" className="gap-2">
                                <Plus size={16} /> Add Category
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {classCategories.length === 0 && !loading && (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    No categories found. Add one to get started.
                                </div>
                            )}
                            {classCategories.map((category) => (
                                <div key={category.id} className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 border rounded-lg bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-800">
                                    <div className="md:col-span-4 space-y-2">
                                        <Label className="text-xs text-slate-500">Class Name</Label>
                                        <Input
                                            value={category.name || ''}
                                            onChange={(e) => handleChangeCategory(category.id, 'name', e.target.value)}
                                            placeholder="e.g. JLPT N5"
                                            className="dark:bg-slate-950 dark:border-slate-800"
                                        />
                                    </div>
                                    <div className="md:col-span-4 space-y-2">
                                        <Label className="text-xs text-slate-500">Monthly Fee (LKR)</Label>
                                        <Input
                                            type="number"
                                            value={category.fee || ''}
                                            onChange={(e) => handleChangeCategory(category.id, 'fee', e.target.value)}
                                            placeholder="5000"
                                            className="dark:bg-slate-950 dark:border-slate-800"
                                        />
                                    </div>
                                    <div className="md:col-span-3 space-y-2">
                                        <Label className="text-xs text-slate-500">Duration</Label>
                                        <select
                                            value={category.duration || '3 months'}
                                            onChange={(e) => handleChangeCategory(category.id, 'duration', e.target.value)}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800"
                                        >
                                            <option value="3 months">3 Months</option>
                                            <option value="6 months">6 Months</option>
                                            <option value="1 year">1 Year</option>
                                            <option value="Ongoing">No Duration (Ongoing)</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-1">
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => handleDeleteCategory(category.id)}
                                            className="w-full"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="justify-end border-t pt-6 dark:border-slate-800">
                            <Button onClick={handleSaveChanges} disabled={saving} className="gap-2">
                                <Save size={16} />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="sms">
                    <Card className="dark:border-slate-800">
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle>SMS Gateway Configuration</CardTitle>
                                <CardDescription>Configure your SMS provider settings (Text.lk recommended).</CardDescription>
                            </div>
                            {smsBalance !== null && (
                                <Badge variant="secondary" className="px-3 py-1 text-sm font-mono gap-2">
                                    Balance: {smsBalance} SMS
                                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-2 p-0" onClick={loadBalance}>
                                        <RefreshCw size={10} />
                                    </Button>
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Provider Name</Label>
                                    <Input
                                        value={smsSettings.provider || ''}
                                        onChange={(e) => setSmsSettings({ ...smsSettings, provider: e.target.value })}
                                        placeholder="e.g. text.lk"
                                        className="dark:bg-slate-950 dark:border-slate-800"
                                    />
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Set to <b>text.lk</b> for full Sinhala support.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Sender ID</Label>
                                    <Input
                                        value={smsSettings.senderId || ''}
                                        onChange={(e) => setSmsSettings({ ...smsSettings, senderId: e.target.value })}
                                        placeholder="SLDJ"
                                        className="dark:bg-slate-950 dark:border-slate-800"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                    type="password"
                                    value={smsSettings.apiKey || ''}
                                    onChange={(e) => setSmsSettings({ ...smsSettings, apiKey: e.target.value })}
                                    className="font-mono dark:bg-slate-950 dark:border-slate-800"
                                    placeholder="Enter your API key"
                                />
                            </div>
                            <div className="flex items-center space-x-2 rounded-lg border p-4 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
                                <Switch
                                    id="sms-enabled"
                                    checked={!!smsSettings.enabled}
                                    onCheckedChange={(checked: boolean) => setSmsSettings({ ...smsSettings, enabled: checked })}
                                />
                                <Label htmlFor="sms-enabled" className="font-medium cursor-pointer">Enable SMS Features</Label>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end border-t pt-6">
                            <Button onClick={handleSaveSmsSettings} disabled={smsSaving} className="gap-2">
                                <Save size={16} />
                                {smsSaving ? 'Saving...' : 'Update Configuration'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="reminders">
                    <Card className="dark:border-slate-800">
                        <CardHeader>
                            <CardTitle>Automated Reminders</CardTitle>
                            <CardDescription>Configure when the system automatically sends payment reminders to students.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Reminder Date (Monthly)</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800"
                                        value={smsSettings.reminderDate || 7}
                                        onChange={(e) => setSmsSettings({ ...smsSettings, reminderDate: Number(e.target.value) })}
                                    >
                                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                            <option key={day} value={day}>{day}th of the month</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">System checks for pending payments on this day.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Check Time</Label>
                                    <Input
                                        type="time"
                                        value={smsSettings.reminderTime || '09:00'}
                                        onChange={(e) => setSmsSettings({ ...smsSettings, reminderTime: e.target.value })}
                                        className="dark:bg-slate-950 dark:border-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-900">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-500">Manual Trigger</h4>
                                    <p className="text-xs text-amber-700 dark:text-amber-600">Run the reminder check immediateley (bypasses date check).</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-500 dark:hover:bg-amber-900/30"
                                    onClick={handleRunReminders}
                                    disabled={reminderRunning}
                                >
                                    <Play size={16} className="mr-2" />
                                    {reminderRunning ? 'Running...' : 'Run Now'}
                                </Button>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end border-t pt-6 dark:border-slate-800">
                            <Button onClick={handleSaveSmsSettings} disabled={smsSaving} className="gap-2">
                                <Save size={16} />
                                {smsSaving ? 'Saving...' : 'Update Schedule'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SystemSettings;
