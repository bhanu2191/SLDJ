import { UserPlus, CreditCard } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ActivityFeedProps {
    activities: any[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
    const getIcon = (type: string) => {
        return type === 'registration' ? UserPlus : CreditCard;
    };

    const getColor = (type: string) => {
        return type === 'registration'
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-blue-100 text-blue-600';
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-800 text-lg">Recent Activity</h3>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 pr-2">
                {activities.map((item) => {
                    const Icon = getIcon(item.type);
                    return (
                        <div key={item.id} className="flex gap-4 group">
                            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110", getColor(item.type))}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="pb-4 border-b border-slate-50 last:border-0 last:pb-0 w-full">
                                <p className="font-medium text-slate-800 text-sm">{item.title}</p>
                                <p className="text-sm text-slate-500">{item.desc}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date(item.time).toLocaleDateString()}</p>
                            </div>
                        </div>
                    );
                })}
                {activities.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-4">No recent activity</p>
                )}
            </div>
        </div>
    );
}
