import { User, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

interface ProfileHeaderProps {
    student: {
        name: string;
        regNum: string;
        class: string | string[];
        photo?: string;
        email: string;
        gender?: 'male' | 'female';
    };
}

export function ProfileHeader({ student }: ProfileHeaderProps) {
    const [isSuspended, setIsSuspended] = useState(false);

    return (
        <div className={cn(
            "rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-colors duration-300 dark:border-slate-800",
            isSuspended ? "bg-slate-100" : "bg-white"
        )}>
            {/* Cover / Top Strip */}
            <div className={cn(
                "h-32 w-full transition-colors duration-300",
                isSuspended
                    ? "bg-slate-300"
                    : student.gender?.toLowerCase() === 'female'
                        ? "bg-pink-400"
                        : "bg-primary"
            )}></div>

            <div className="px-8 pb-8">
                <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 gap-6">

                    {/* Avatar */}
                    <div className="h-32 w-32 rounded-full border-4 border-white bg-slate-200 overflow-hidden flex items-center justify-center shadow-md">
                        {student.photo ? (
                            <img src={student.photo} alt={student.name} className={cn("h-full w-full object-cover", isSuspended && "grayscale")} />
                        ) : (
                            <User className="h-12 w-12 text-slate-400" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 mb-2">
                        <div className="flex items-center gap-3">
                            <h1 className={cn("text-3xl font-bold", isSuspended ? "text-slate-500" : "text-slate-900")}>
                                {student.name}
                            </h1>
                            {isSuspended && (
                                <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> Suspended
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 font-mono mt-1">{student.regNum} • {Array.isArray(student.class) ? student.class.join(', ') : student.class}</p>
                    </div>

                    {/* Danger Zone */}
                    <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg dark:bg-slate-900 dark:border-slate-800">
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-700">Suspend Student</p>
                                <p className="text-[10px] text-slate-400">Restricts access</p>
                            </div>
                            <button
                                onClick={() => setIsSuspended(!isSuspended)}
                                className={cn(
                                    "w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative",
                                    isSuspended ? "bg-red-500" : "bg-slate-300"
                                )}
                            >
                                <span className={cn(
                                    "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm",
                                    isSuspended ? "translate-x-6" : "translate-x-0"
                                )} />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
