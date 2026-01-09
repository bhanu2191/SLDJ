import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    className?: string;
    iconColorClass?: string;
    subtext?: string;
}

export function StatCard({ title, value, icon: Icon, className, iconColorClass, subtext }: StatCardProps) {
    return (
        <div className={cn("bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md", className)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-2">{value}</h3>
                    {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
                </div>
                <div className={cn("p-3 rounded-lg bg-opacity-10", iconColorClass || "bg-primary/10 text-primary")}>
                    <Icon className={cn("h-6 w-6", iconColorClass ? iconColorClass.replace('bg-', 'text-').replace('/10', '') : "text-primary")} />
                </div>
            </div>
        </div>
    );
}
