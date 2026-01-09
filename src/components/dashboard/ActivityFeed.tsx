import { UserPlus, CreditCard, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const activities = [
    {
        id: 1,
        type: 'registration',
        title: 'New Student Registered',
        desc: 'Kasun Perera - JLPT N5',
        time: '5 mins ago',
        icon: UserPlus,
        color: 'bg-emerald-100 text-emerald-600'
    },
    {
        id: 2,
        type: 'payment',
        title: 'Payment Received',
        desc: 'Amaya Silva - LKR 15,000',
        time: '2 hours ago',
        icon: CreditCard,
        color: 'bg-blue-100 text-blue-600'
    },
    {
        id: 3,
        type: 'payment',
        title: 'Payment Received',
        desc: 'Saman Kumara - LKR 12,000',
        time: '4 hours ago',
        icon: CreditCard,
        color: 'bg-blue-100 text-blue-600'
    },
    {
        id: 4,
        type: 'registration',
        title: 'New Student Registered',
        desc: 'Nimali De Silva - JLPT N4',
        time: 'Yesterday',
        icon: UserPlus,
        color: 'bg-emerald-100 text-emerald-600'
    }
];

export function ActivityFeed() {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-800 text-lg">Recent Activity</h3>
                <button className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                    View All <ArrowRight className="h-4 w-4" />
                </button>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 pr-2">
                {activities.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110", item.color)}>
                            <item.icon className="h-5 w-5" />
                        </div>
                        <div className="pb-4 border-b border-slate-50 last:border-0 last:pb-0 w-full">
                            <p className="font-medium text-slate-800 text-sm">{item.title}</p>
                            <p className="text-sm text-slate-500">{item.desc}</p>
                            <p className="text-xs text-slate-400 mt-1">{item.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
