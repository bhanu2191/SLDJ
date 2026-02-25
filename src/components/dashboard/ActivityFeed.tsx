import { Coins, UserPlus, FileCheck, ArrowRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

export function ActivityFeed() {
    const [activities, setActivities] = useState<any[]>([]);

    useEffect(() => {
        const loadActivities = async () => {
            if (window.electronAPI) {
                try {
                    const data = await window.electronAPI.getRecentActivity();

                    // Map backend data to frontend format with icons
                    const mappedData = data.map((item: any) => {
                        let icon = Activity;
                        let color = 'text-slate-600 dark:text-slate-400';
                        let bg = 'bg-slate-100 dark:bg-slate-900/20';

                        if (item.type === 'payment') {
                            icon = Coins;
                            color = 'text-green-600 dark:text-green-400';
                            bg = 'bg-green-100 dark:bg-green-900/20';
                        } else if (item.type === 'registration') {
                            icon = UserPlus;
                            color = 'text-blue-600 dark:text-blue-400';
                            bg = 'bg-blue-100 dark:bg-blue-900/20';
                        } else if (item.type === 'exam') {
                            icon = FileCheck;
                            color = 'text-purple-600 dark:text-purple-400';
                            bg = 'bg-purple-100 dark:bg-purple-900/20';
                        }

                        return {
                            id: item.id,
                            type: item.type,
                            user: item.title,
                            action: '', // The backend gives us a fully formatted title and desc
                            target: item.desc,
                            time: item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true }) : 'Just now',
                            icon,
                            color,
                            bg
                        };
                    });

                    setActivities(mappedData);
                } catch (error) {
                    console.error("Failed to load recent activity", error);
                }
            }
        };
        loadActivities();
    }, []);
    return (
        <Card className="flex flex-col h-full shadow-md border-slate-100 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Recent Activity</CardTitle>
                <CardDescription className="dark:text-slate-400">Latest actions across the system</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-0">
                {activities.map((item, index) => (
                    <div
                        key={item.id}
                        className={cn(
                            "flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors cursor-default dark:hover:bg-slate-900",
                            index !== activities.length - 1 ? "border-b border-slate-50 dark:border-slate-800" : ""
                        )}
                    >
                        <div className={cn("p-2.5 rounded-full mt-1 flex-shrink-0", item.bg, item.color)}>
                            <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 dark:text-slate-200">
                                <span className="font-semibold hover:text-primary cursor-pointer transition-colors">{item.user}</span>
                                <span className="text-slate-500 dark:text-slate-400"> {item.action} </span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{item.target}</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                {item.time}
                            </p>
                        </div>
                    </div>
                ))}
            </CardContent>

            <CardFooter className="p-4 border-t border-slate-50 pt-4 dark:border-slate-800">
                <Button variant="ghost" className="w-full text-primary hover:text-primary hover:bg-primary/5 justify-center gap-2">
                    View All History <ArrowRight className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}
