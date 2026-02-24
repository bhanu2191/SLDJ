import { LogOut, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import logo from '@/assets/SLDJ_PNG.png';
import { ModeToggle } from '@/components/mode-toggle';

interface NavItem {
    icon: LucideIcon;
    label: string;
    path: string;
}

interface SidebarProps {
    items: NavItem[];
    className?: string;
    isCollapsed?: boolean;
    setIsCollapsed?: (collapsed: boolean) => void;
}

export function Sidebar({ items, className, isCollapsed = false, setIsCollapsed }: SidebarProps) {
    const location = useLocation();
    const { logout, user } = useAuth();
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);

    return (
        <aside className={cn(
            "h-screen bg-primary dark:bg-slate-950 text-white shadow-2xl z-50 transition-all duration-300 relative",
            isCollapsed ? "w-20" : "w-64",
            className
        )}>
            {/* Background elements for premium feel */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-r-3xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-highlight/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>

            {/* Content Wrapper */}
            <div className="h-full w-full flex flex-col overflow-hidden relative z-10">
                {/* Logo Section */}
                <div className={cn(
                    "relative z-10 flex items-center transition-all duration-300",
                    isCollapsed ? "py-6 px-0 justify-center" : "p-8 pb-4 gap-4"
                )}>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-0 bg-white rounded-2xl shadow-lg shrink-0 flex items-center justify-center overflow-hidden"
                    >
                        <img src={logo} alt="SL Dream Japan" className={cn("object-contain p-0.5", isCollapsed ? "h-10 w-10" : "h-10 w-auto")} />
                    </motion.div>
                    {!isCollapsed && (
                        <div className="flex-1 overflow-hidden">
                            <motion.h1
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="font-display font-bold text-xl tracking-tight leading-none text-white truncate"
                            >
                                SL DREAM
                            </motion.h1>
                            <motion.p
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-[10px] uppercase tracking-[0.2em] text-highlight/90 font-medium mt-1 truncate"
                            >
                                Japan
                            </motion.p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-2">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar relative z-10">
                    {items.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={isCollapsed ? item.label : undefined}
                                className={cn(
                                    "flex items-center gap-3 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden shrink-0",
                                    isCollapsed ? "justify-center px-0 w-12 mx-auto" : "px-4 w-full",
                                    isActive
                                        ? "text-white font-medium"
                                        : "text-slate-300 hover:text-white"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active-bg"
                                        className="absolute inset-0 bg-white/10 border border-white/5 rounded-xl shadow-md"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active-indicator"
                                        className="absolute left-0 top-1 bottom-1 w-1 bg-highlight rounded-r-full"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}

                                <item.icon className={cn(
                                    "h-5 w-5 transition-colors duration-300 relative z-10 shrink-0",
                                    isActive ? "text-highlight" : "text-slate-400 group-hover:text-white"
                                )} />
                                {!isCollapsed && <span className="tracking-wide text-sm relative z-10 truncate whitespace-nowrap">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile / Footer */}
                <div className={`p-4 ${isCollapsed ? 'mb-4' : 'm-4 shrink-0'}`}>
                    <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'} mb-2`}>
                        <ModeToggle className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white dark:bg-transparent dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:hover:text-white" />
                    </div>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className={`bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm ${isCollapsed ? 'p-2' : 'p-4'}`}
                    >
                        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-3`}>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-highlight to-orange-400 flex items-center justify-center text-primary-dark font-bold shadow-lg border-2 border-primary shrink-0">
                                {user?.role === 'admin' ? 'AD' : 'OP'}
                            </div>
                            {!isCollapsed && (
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-semibold truncate text-white">
                                        {user?.role === 'admin' ? 'Administrator' : 'Operator'}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">System User</p>
                                </div>
                            )}
                        </div>
                        <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
                            <DialogTrigger asChild>
                                <button
                                    className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition-colors ${isCollapsed ? 'px-0' : ''}`}
                                    title={isCollapsed ? "Sign Out" : undefined}
                                >
                                    <LogOut className="h-4 w-4 shrink-0" />
                                    {!isCollapsed && "Sign Out"}
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[400px]">
                                <DialogHeader>
                                    <DialogTitle>Are you sure?</DialogTitle>
                                    <DialogDescription>
                                        You are about to log out of the {user?.role === 'admin' ? 'Admin' : 'Operator'} Portal.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="sm:justify-end gap-2 mt-4">
                                    <DialogClose asChild>
                                        <button className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium rounded-md transition-colors">
                                            Cancel
                                        </button>
                                    </DialogClose>
                                    <button
                                        onClick={() => {
                                            setIsLogoutOpen(false);
                                            logout();
                                        }}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                                    >
                                        Log Out
                                    </button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </motion.div>
                </div>
            </div>

            {/* Collapse Toggle Button - Outside the overflow: hidden box */}
            {setIsCollapsed && (
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute top-[3.25rem] -translate-y-1/2 -right-4 bg-slate-900/95 dark:bg-slate-800/90 text-slate-400 hover:text-white rounded-full p-1.5 shadow-lg border border-slate-800 dark:border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 hover:scale-110 transition-all z-50 flex items-center justify-center focus:outline-none"
                >
                    {isCollapsed ? <ChevronRight size={16} strokeWidth={3.5} className="ml-0.5" /> : <ChevronLeft size={16} strokeWidth={3.5} className="mr-0.5" />}
                </button>
            )}
        </aside>
    );
}
