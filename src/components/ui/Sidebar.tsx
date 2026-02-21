import { LogOut, type LucideIcon } from 'lucide-react';
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
}

export function Sidebar({ items }: SidebarProps) {
    const location = useLocation();
    const { logout, user } = useAuth();
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);

    return (
        <aside className="h-screen w-72 bg-primary dark:bg-slate-950 text-white flex flex-col fixed left-0 top-0 shadow-2xl z-50 overflow-hidden">
            {/* Logo Section */}
            <div className="p-8 pb-4 flex items-center gap-4 relative z-10">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-0 bg-white rounded-2xl shadow-lg"
                >
                    <img src={logo} alt="SL Dream Japan" className="h-12 w-auto object-contain p-0.5" />
                </motion.div>
                <div>
                    <motion.h1
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="font-display font-bold text-xl tracking-tight leading-none text-white"
                    >
                        SL DREAM
                    </motion.h1>
                    <motion.p
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-[10px] uppercase tracking-[0.2em] text-highlight/90 font-medium mt-1"
                    >
                        Japan
                    </motion.p>
                </div>
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
                            className={cn(
                                "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden",
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
                                "h-5 w-5 transition-colors duration-300 relative z-10",
                                isActive ? "text-highlight" : "text-slate-400 group-hover:text-white"
                            )} />
                            <span className="tracking-wide text-sm relative z-10">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile / Footer */}
            <div className="p-4 m-4">
                <div className="flex justify-end mb-2">
                    <ModeToggle className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white dark:bg-transparent dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:hover:text-white" />
                </div>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm p-4"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-highlight to-orange-400 flex items-center justify-center text-primary-dark font-bold shadow-lg border-2 border-primary">
                            {user?.role === 'admin' ? 'AD' : 'OP'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold truncate text-white">
                                {user?.role === 'admin' ? 'Administrator' : 'Operator'}
                            </p>
                            <p className="text-xs text-slate-400 truncate">System User</p>
                        </div>
                    </div>
                    <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
                        <DialogTrigger asChild>
                            <button
                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                                Sign Out
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

            {/* Background elements for premium feel */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-highlight/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        </aside>
    );
}
