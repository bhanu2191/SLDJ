import React, { useState } from 'react';
import {
    format,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    startOfWeek,
    endOfWeek,
    subDays,
    startOfDay,
    isBefore,
    isAfter
} from 'date-fns';
import { getHolidayType, getHolidayName } from '@/lib/holidays';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExamResultsCalendarProps {
    onDateAssign: (type: 'start' | 'end', date: Date) => void;
    hasSelection: boolean;
}

export function ExamResultsCalendar({ onDateAssign, hasSelection }: ExamResultsCalendarProps) {
    const [fixedDateStr, setFixedDateStr] = useState<string>('');
    const [anchorDate, setAnchorDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Determines the 4 months to show. 
    // If fixedDate is provided, the last month is fixedDate's month.
    // Otherwise, defaults to current month.
    const month4 = startOfMonth(anchorDate);
    const month3 = subMonths(month4, 1);
    const month2 = subMonths(month4, 2);
    const month1 = subMonths(month4, 3);

    const months = [month1, month2, month3, month4];

    const handleFixedDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFixedDateStr(e.target.value);
        if (e.target.value) {
            setAnchorDate(new Date(e.target.value));
        }
    };

    const handleApplyDate = (type: 'start' | 'end') => {
        if (selectedDate && hasSelection) {
            onDateAssign(type, selectedDate);
        }
    };

    const windowStart = startOfDay(subDays(anchorDate, 90));
    const windowEnd = startOfDay(anchorDate);

    const getDayStyle = (date: Date, isCurrentMonth: boolean, isApplicable: boolean) => {
        if (!isCurrentMonth) return 'text-slate-300 dark:text-slate-600 opacity-20 pointer-events-none';
        if (!isApplicable) return 'text-slate-400 dark:text-slate-500 opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900 pointer-events-none';

        const type = getHolidayType(date);
        let baseStyle = 'hover:border-primary border border-transparent font-medium cursor-pointer transition-all';

        if (selectedDate && isSameDay(date, selectedDate)) {
            baseStyle += ' ring-2 ring-primary ring-offset-1 dark:ring-offset-slate-900';
        }

        switch (type) {
            case 'Govt':
                return cn(baseStyle, 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200');
            case 'Class':
                return cn(baseStyle, 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200');
            case 'Both':
                return cn(baseStyle, 'bg-purple-200 text-purple-900 dark:bg-purple-600/50 dark:text-purple-100 hover:bg-purple-300');
            default:
                return cn(baseStyle, 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300');
        }
    };

    return (
        <Card className="flex flex-col h-full shadow-sm dark:border-slate-800">
            <CardHeader className="py-4 px-6 border-b bg-slate-50/50 dark:bg-slate-900 dark:border-slate-800 shrink-0">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end justify-between">
                    <div>
                        <CardTitle className="text-lg mb-1">Course Date Assignment</CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Select a reference date to view the preceding 90 days (4 months). Click a date in the calendar and assign it to selected students.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-48">
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block dark:text-slate-400">
                                Reference Date
                            </label>
                            <Input
                                type="date"
                                value={fixedDateStr}
                                onChange={handleFixedDateChange}
                                className="bg-white dark:bg-slate-950 dark:border-slate-800 [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
                            Selected Date:
                        </span>
                        <span className="whitespace-nowrap px-3 py-1 rounded bg-white dark:bg-slate-900 border font-mono text-sm text-emerald-700 dark:text-emerald-400 shadow-sm">
                            {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'None'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => handleApplyDate('start')}
                            disabled={!selectedDate || !hasSelection}
                            variant="outline"
                            className="text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:bg-slate-900 dark:border-emerald-800 dark:hover:bg-emerald-900/50"
                        >
                            Set as Start Date
                        </Button>
                        <Button
                            onClick={() => handleApplyDate('end')}
                            disabled={!selectedDate || !hasSelection}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            Set as End Date
                        </Button>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-red-100 border border-red-200 dark:bg-red-900/40 dark:border-red-800"></div>
                        <span className="text-slate-600 dark:text-slate-400">Govt Holiday</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200 dark:bg-blue-900/40 dark:border-blue-800"></div>
                        <span className="text-slate-600 dark:text-slate-400">Class Holiday (Sun, Tue, Thu)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-purple-200 border border-purple-300 dark:bg-purple-600/50 dark:border-purple-500"></div>
                        <span className="text-slate-600 dark:text-slate-400">Both</span>
                    </div>
                </div>

                {/* 3 Months Grid */}
                <div className="flex flex-wrap gap-4 justify-center">
                    {months.map((month, idx) => (
                        <div key={idx} className="flex-1 min-w-[240px] bg-white dark:bg-slate-950 rounded-xl border dark:border-slate-800 p-4 shadow-sm">
                            <div className="text-center font-semibold mb-4 text-slate-800 dark:text-slate-200">
                                {format(month, 'MMMM yyyy')}
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-500 dark:text-slate-400 font-medium">
                                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-sm">
                                {eachDayOfInterval({
                                    start: startOfWeek(startOfMonth(month)),
                                    end: endOfWeek(endOfMonth(month))
                                }).map((day, dIdx) => {
                                    const isCurrentMonth = isSameMonth(day, month);
                                    const dayStart = startOfDay(day);
                                    const isApplicable = isCurrentMonth && !isBefore(dayStart, windowStart) && !isAfter(dayStart, windowEnd);

                                    const type = getHolidayType(day);

                                    let titleStr = '';
                                    if (isApplicable) {
                                        if (type === 'Govt' || type === 'Both') {
                                            const name = getHolidayName(day);
                                            if (name) titleStr = name;
                                        }
                                        if (type === 'Class' || type === 'Both') {
                                            titleStr += (titleStr ? ' & ' : '') + 'Class Holiday';
                                        }
                                    } else if (isCurrentMonth) {
                                        titleStr = 'Outside 90-day window';
                                    }

                                    return (
                                        <div
                                            key={dIdx}
                                            onClick={() => isApplicable && setSelectedDate(day)}
                                            title={titleStr || undefined}
                                            className={cn(
                                                "h-8 flex items-center justify-center rounded-md",
                                                getDayStyle(day, isCurrentMonth, isApplicable)
                                            )}
                                        >
                                            {format(day, 'd')}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

            </CardContent>
        </Card>
    );
}
