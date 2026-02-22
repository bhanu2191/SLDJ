import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cake, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface BirthdayStudent {
    regNum: string;
    name: string;
    dob: string;
    classes: string[];
    daysUntil: number;
    nextBirthday: string;
}

export function UpcomingBirthdays() {
    const [birthdays, setBirthdays] = useState<BirthdayStudent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBirthdays = async () => {
            try {
                setIsLoading(true);
                // @ts-ignore
                const data = await window.electronAPI.getUpcomingBirthdays();
                setBirthdays(data);
            } catch (error) {
                console.error("Failed to fetch upcoming birthdays:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBirthdays();
    }, []);

    return (
        <Card className="shadow-sm dark:border-slate-800 shrink-0">
            <CardHeader className="py-4 px-6 border-b bg-slate-50/50 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                        <Cake size={18} />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold">Upcoming Birthdays</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-8 text-center text-sm text-slate-500 animate-pulse">Loading...</div>
                ) : birthdays.length === 0 ? (
                    <div className="py-8 px-4 text-center flex flex-col items-center justify-center text-slate-500 min-h-[120px]">
                        <CalendarDays className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">No birthdays in the next 5 days</p>
                    </div>
                ) : (
                    <div className="divide-y dark:divide-slate-800 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {birthdays.map((student) => (
                            <div key={student.regNum} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-1 max-w-[180px]" title={student.name}>
                                        {student.name}
                                    </span>
                                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                        {student.regNum}
                                    </span>
                                </div>

                                <div className="text-right flex flex-col items-end gap-1">
                                    <div className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
                                        student.daysUntil === 0
                                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"
                                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                    )}>
                                        {student.daysUntil === 0
                                            ? "Today! 🎉"
                                            : student.daysUntil === 1
                                                ? "Tomorrow"
                                                : `In ${student.daysUntil} days`}
                                    </div>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {format(parseISO(student.nextBirthday), 'MMM do')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
