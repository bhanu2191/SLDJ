import { useState, useEffect } from 'react';
import { Send, Users, AlertCircle, MessageSquare, Clock, Smartphone, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClassCategory {
    id: number | string;
    name: string;
}

interface Student {
    regNum: string;
    name: string;
    phone: string;
    class: string | string[];
}

interface SmsLog {
    id: number;
    recipient: string;
    message: string;
    status: string;
    sent_at: string;
}

export const MessageCenter = () => {
    const [categories, setCategories] = useState<ClassCategory[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [logs, setLogs] = useState<SmsLog[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [stats, setStats] = useState<{ total: number; selected: number }>({ total: 0, selected: 0 });

    // Dialog Data
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [resultDialog, setResultDialog] = useState({ isOpen: false, success: 0, fail: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [cats, studs] = await Promise.all([
                window.electronAPI.getClassCategories(),
                window.electronAPI.getStudents()
            ]);
            setCategories(cats);
            setStudents(studs);
            loadLogs();
        } catch (error) {
            console.error("Failed to load data:", error);
        }
    };

    const loadLogs = async () => {
        try {
            const history = await window.electronAPI.getSmsLogs();
            setLogs(history || []);
        } catch (e) {
            console.error("Failed to load logs", e);
        }
    }

    // Filter students based on selection
    const getTargetStudents = () => {
        if (selectedCategory === 'all') {
            return students.filter(s => s.phone); // Only those with phones
        }
        return students.filter(s => {
            if (!s.phone) return false;
            // Handle class being array or string
            const studentClasses = Array.isArray(s.class) ? s.class : [s.class];
            return studentClasses.includes(selectedCategory);
        });
    };

    useEffect(() => {
        const targets = getTargetStudents();
        setStats({
            total: students.length,
            selected: targets.length
        });
    }, [students, selectedCategory]);

    const handleSendClick = () => {
        const targets = getTargetStudents();

        if (targets.length === 0) {
            toast.warning('No recipients found with phone numbers for this selection.');
            return;
        }

        if (!message.trim()) {
            toast.warning('Please enter a message to send.');
            return;
        }

        setConfirmDialog(true);
    };

    const confirmSend = async () => {
        setConfirmDialog(false);
        setSending(true);
        const targets = getTargetStudents();

        try {
            const recipients = targets.map(s => s.phone);
            // @ts-ignore
            const res = await window.electronAPI.sendManualSms({ recipients, message });

            setResultDialog({ isOpen: true, success: res.successCount, fail: res.failCount });
            setMessage(''); // Clear message
            loadLogs(); // Refresh history
        } catch (error: any) {
            console.error("Send failed:", error);
            toast.error(error.message || 'Failed to send messages.');
        } finally {
            setSending(false);
        }
    };

    const charCount = message.length;
    const segmentCount = Math.ceil(charCount / 160) || 1;
    const isLongMessage = segmentCount > 1;

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6 overflow-hidden">
            {/* Confirm Send Dialog */}
            <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Send?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to send this SMS to <strong>{stats.selected}</strong> students.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmSend}>Yes, Send</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Result Dialog */}
            <AlertDialog open={resultDialog.isOpen} onOpenChange={(isOpen) => !isOpen && setResultDialog({ isOpen: false, success: 0, fail: 0 })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sent!</AlertDialogTitle>
                        <AlertDialogDescription>
                            Message sent successfully.<br />
                            Success: <strong className="text-emerald-600 dark:text-emerald-400">{resultDialog.success}</strong><br />
                            Failed: <strong className="text-red-500">{resultDialog.fail}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction>Done</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Left Panel: Composer (60%) */}
            <div className="flex-1 flex flex-col space-y-6 h-full overflow-y-auto pr-2">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight dark:text-white">
                        <MessageSquare className="h-6 w-6 text-primary" />
                        New Campaign
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Send bulk SMS notifications to your students.</p>
                </div>

                <Card className="flex flex-col flex-grow shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50 dark:bg-slate-900 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row gap-6 items-end">
                            <div className="flex-1 w-full space-y-2">
                                <Label>Target Audience</Label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950 dark:border-slate-800">
                                        <SelectValue placeholder="Select audience" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Students</SelectItem>
                                        <SelectGroup>
                                            <SelectLabel>By Class</SelectLabel>
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-4 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg dark:bg-indigo-950/30 dark:border-indigo-900/50">
                                <div className="p-2 bg-white rounded-md shadow-sm text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider dark:text-indigo-300">Recipients</p>
                                    <p className="text-xl font-black text-indigo-900 leading-none dark:text-indigo-100">{stats.selected}</p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-grow flex flex-col p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Message Content</Label>
                            <Badge variant={isLongMessage ? "destructive" : "secondary"} className="text-[10px]">
                                {segmentCount} SMS credit(s) per recipient
                            </Badge>
                        </div>

                        <div className="relative flex-grow flex flex-col">
                            <Textarea
                                className="flex-grow min-h-[200px] resize-none text-base leading-relaxed bg-slate-50 focus:bg-white transition-colors dark:bg-slate-950 dark:focus:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                                placeholder="Type your message here..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                            <div className="absolute bottom-3 right-3">
                                <span className={cn(
                                    "text-xs font-medium px-2 py-1 rounded-md border shadow-sm",
                                    charCount > 160
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-white text-slate-500 border-slate-200"
                                )}>
                                    {charCount} chars
                                </span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-between items-center dark:bg-slate-900 dark:border-slate-800">
                        <div className="text-xs text-slate-500 flex items-center gap-2 dark:text-slate-400">
                            <AlertCircle size={14} />
                            <span>Total Estimated Credits: <b className="text-slate-900 dark:text-slate-200">{segmentCount * stats.selected}</b></span>
                        </div>
                        <Button
                            onClick={handleSendClick}
                            disabled={sending || stats.selected === 0 || !message.trim()}
                            className="gap-2 shadow-lg shadow-primary/20"
                            size="lg"
                        >
                            {sending ? 'Sending...' : <><Send size={16} /> Send Campaign</>}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Right Panel: Recent History (40%) */}
            <div className="w-[400px] flex flex-col space-y-6 h-full hidden lg:flex">
                <div className="flex flex-col gap-1 invisible">
                    {/* Spacing alignment */}
                    <h1 className="text-2xl font-bold">HIDDEN</h1>
                    <p>HIDDEN</p>
                </div>

                <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden dark:border-slate-800">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 flex flex-row items-center justify-between dark:bg-slate-900 dark:border-slate-800">
                        <CardTitle className="text-base flex items-center gap-2 dark:text-slate-200">
                            <Clock size={16} className="text-slate-500" /> Recent Activity
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={loadLogs} className="h-8 w-8 p-0">
                            <RefreshCw size={14} />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        {logs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3 p-8 text-center">
                                <Smartphone size={48} className="opacity-20" />
                                <p className="text-sm font-medium">No messages sent yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {logs.map((log) => (
                                    <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors group dark:hover:bg-slate-900/50 dark:border-slate-800">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] font-mono font-normal text-slate-500 border-slate-200">
                                                    {format(new Date(log.sent_at), 'MMM dd, HH:mm')}
                                                </Badge>
                                            </div>
                                            {log.status === 'sent' || log.status === 'mock_sent' ? (
                                                <Badge variant="default" className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200 text-[10px] px-2 h-5">
                                                    SENT
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="text-[10px] px-2 h-5">
                                                    FAILED
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">{log.recipient}</div>
                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed dark:text-slate-400">{log.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default MessageCenter;
