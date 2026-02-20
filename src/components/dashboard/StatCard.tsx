import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card'; // We need to create card.tsx first if not exists, but I'll assume standard shadcn structure or create it.
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string;
    description: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    variant?: 'default' | 'premium' | 'danger' | 'warning';
}

export function StatCard({ title, value, description, icon: Icon, trend, trendValue, variant = 'default' }: StatCardProps) {

    const variants = {
        default: "bg-white border-slate-100 hover:border-primary/20 dark:bg-slate-900 dark:border-slate-800",
        premium: "bg-gradient-to-br from-primary to-primary-light text-white border-none shadow-xl shadow-primary/20",
        danger: "bg-gradient-to-br from-red-500 to-red-600 text-white border-none shadow-xl shadow-red-500/20",
        warning: "bg-gradient-to-br from-orange-400 to-orange-500 text-white border-none shadow-xl shadow-orange-500/20",
    };

    const isDark = variant !== 'default';

    return (
        <Card className={cn(
            "transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden relative",
            variants[variant]
        )}>
            {/* Background Pattern for Premium Cards */}
            {isDark && (
                <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                    <Icon className="w-32 h-32" />
                </div>
            )}

            <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={cn(
                        "p-3 rounded-xl",
                        isDark ? "bg-white/10 backdrop-blur-sm" : "bg-primary/5 text-primary dark:bg-slate-800 dark:text-primary"
                    )}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                            isDark ? "bg-white/10 text-white" : trend === 'up' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                            <span>{trend === 'up' ? '↑' : '↓'}</span>
                            <span>{trendValue}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className={cn("text-sm font-medium", isDark ? "text-white/80" : "text-slate-500 dark:text-slate-400")}>
                        {title}
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <h2 className={cn("text-3xl font-bold font-display", isDark ? "text-white" : "text-slate-800 dark:text-white")}>
                            {value}
                        </h2>
                    </div>
                    <p className={cn("text-xs mt-2", isDark ? "text-white/60" : "text-slate-400 dark:text-slate-500")}>
                        {description}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
