import { ProfileHeader } from '../components/profile/ProfileHeader';
import { PaymentHistoryList } from '../components/profile/PaymentHistoryList';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { Phone, Mail, Calendar, MapPin } from 'lucide-react';

const mockStudent = {
    name: "Kasun Perera",
    regNum: "SLDJ-2026-N5-0012",
    class: "JLPT N5 - Basic",
    email: "kasun.p@example.com",
    phone: "077-1234567",
    dob: "1998-05-15",
    address: "123, Temple Road, Colombo",
    guardian: {
        name: "Sunil Perera",
        phone: "071-9876543",
        relation: "Father"
    }
};

const mockPayments = [
    { id: '101', month: 'January 2026', amount: 5000, date: '2026-01-05', status: 'paid' as const },
    { id: '102', month: 'February 2026', amount: 5000, date: undefined, status: 'pending' as const },
    { id: '103', month: 'December 2025', amount: 5000, date: '2025-12-10', status: 'paid' as const },
];

export function StudentProfile() {
    const [activeTab, setActiveTab] = useState<'details' | 'payments'>('details');

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <ProfileHeader student={mockStudent} />

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={cn(
                            "pb-4 px-2 text-sm font-medium transition-all relative",
                            activeTab === 'details' ? "text-primary " : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Personal Details
                        {activeTab === 'details' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={cn(
                            "pb-4 px-2 text-sm font-medium transition-all relative",
                            activeTab === 'payments' ? "text-primary" : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Payment History
                        {activeTab === 'payments' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'details' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Contact Information</h3>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <span>{mockStudent.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    <span>{mockStudent.phone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span>Born {mockStudent.dob}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <MapPin className="h-4 w-4 text-slate-400" />
                                    <span>{mockStudent.address}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">Guardian Information</h3>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="font-medium text-slate-800">{mockStudent.guardian.name}</p>
                                <p className="text-sm text-slate-500">{mockStudent.guardian.relation}</p>
                                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                                    <Phone className="h-3 w-3" /> {mockStudent.guardian.phone}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <PaymentHistoryList payments={mockPayments} />
                )}
            </div>
        </div>
    );
}
