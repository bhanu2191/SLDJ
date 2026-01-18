
import { useState, useEffect } from 'react';
import { Send, Users, AlertCircle, MessageSquare, Clock, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { format } from 'date-fns';

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

    const handleSend = async () => {
        const targets = getTargetStudents();

        if (targets.length === 0) {
            Swal.fire({ title: 'No recipients', text: 'No students found with phone numbers for this selection.', icon: 'warning' });
            return;
        }

        if (!message.trim()) {
            Swal.fire({ title: 'Empty Message', text: 'Please enter a message to send.', icon: 'warning' });
            return;
        }

        const result = await Swal.fire({
            title: 'Confirm Send?',
            text: `You are about to send this SMS to ${targets.length} students.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Send',
            confirmButtonColor: '#0f172a'
        });

        if (result.isConfirmed) {
            setSending(true);
            try {
                const recipients = targets.map(s => s.phone);
                const res = await window.electronAPI.sendManualSms({ recipients, message });

                await Swal.fire({
                    title: 'Sent!',
                    html: `Message sent successfully.<br/>Success: <b>${res.successCount}</b><br/>Failed: <b style="color:red">${res.failCount}</b>`,
                    icon: 'success'
                });
                setMessage(''); // Clear message
                loadLogs(); // Refresh history
            } catch (error: any) {
                console.error("Send failed:", error);
                Swal.fire({ title: 'Error', text: error.message || 'Failed to send messages.', icon: 'error' });
            } finally {
                setSending(false);
            }
        }
    };

    const charCount = message.length;
    const segmentCount = Math.ceil(charCount / 160) || 1;
    const isLongMessage = segmentCount > 1;

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6 overflow-hidden">
            {/* Left Panel: Composer (60%) */}
            <div className="flex-1 flex flex-col space-y-6 h-full overflow-y-auto pr-2">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="h-6 w-6 text-primary" />
                        New Campaign
                    </h1>
                    <p className="text-gray-500">Send bulk SMS notifications to your students.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-grow">
                    {/* Audience Section */}
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Audience</label>
                                <select
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm shadow-sm"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="all">All Students</option>
                                    <optgroup label="By Class">
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                            <div className="bg-indigo-50 px-5 py-2.5 rounded-lg border border-indigo-100 flex items-center gap-4 h-[44px]">
                                <div className="bg-white p-1.5 rounded-md shadow-sm text-indigo-600">
                                    <Users size={16} />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider leading-none mb-0.5">Recipients</div>
                                    <div className="text-lg font-black text-indigo-900 leading-none">{stats.selected}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Editor Section */}
                    <div className="p-6 flex flex-col flex-grow">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex justify-between">
                            Message Content
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isLongMessage ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                {segmentCount} SMS credit(s) per recipient
                            </span>
                        </label>
                        <div className="relative flex-grow flex flex-col">
                            <textarea
                                className="w-full flex-grow p-4 bg-gray-50 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm leading-relaxed"
                                placeholder="Type your message here..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            // maxLength={160 * 3} // Optional limit
                            ></textarea>
                            <div className="absolute bottom-3 right-3 flex items-center gap-3">
                                <div className={`text-xs font-medium px-2 py-1 rounded-md border shadow-sm ${charCount > 160 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                                    {charCount} chars
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Action */}
                    <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                            <AlertCircle size={14} />
                            <span>Estimated Total Credits: <b>{segmentCount * stats.selected}</b></span>
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={sending || stats.selected === 0 || !message.trim()}
                            className="bg-primary text-white px-8 py-2.5 rounded-lg font-medium shadow-md shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
                        >
                            {sending ? 'Sending...' : <><Send size={16} /> Send Now</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel: Recent History (40%) */}
            <div className="w-[380px] flex flex-col space-y-6 h-full hidden lg:flex">
                <div className="flex flex-col gap-1 invisible">
                    {/* Placeholder to match Left Panel Header height/spacing */}
                    <h1 className="text-2xl font-bold flex items-center gap-2">HIDDEN</h1>
                    <p className="">HIDDEN</p>
                </div>

                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Clock size={16} /> Recent Activity
                        </h3>
                        <button onClick={loadLogs} className="text-xs text-primary hover:underline">Refresh</button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-0">
                        {logs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 p-8 text-center">
                                <Smartphone size={32} className="opacity-20" />
                                <p className="text-sm">No recent messages sent.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {logs.map((log) => (
                                    <div key={log.id} className="p-4 hover:bg-gray-50/80 transition-all group border-l-2 border-transparent hover:border-primary">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-gray-200 group-hover:bg-primary transition-colors"></span>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {format(new Date(log.sent_at), 'MMM dd, HH:mm')}
                                                </div>
                                            </div>
                                            <div>
                                                {log.status === 'sent' || log.status === 'mock_sent' ? (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                        <CheckCircle size={10} strokeWidth={3} /> SENT
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                                        <XCircle size={10} strokeWidth={3} /> FAIL
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="pl-4">
                                            <div className="text-sm font-bold text-gray-800 mb-0.5">{log.recipient}</div>
                                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-medium">{log.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageCenter;
