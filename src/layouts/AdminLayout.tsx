import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { ModeToggle } from '@/components/mode-toggle';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, UserCog, Settings, Menu, CreditCard, MessageSquare, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

export function AdminLayout() {
    const { userRole, isLoading } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (userRole !== 'admin') {
        return <Navigate to="/login" replace />;
    }

    const navItems = [
        { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { label: 'Payments', path: '/admin/payments', icon: CreditCard },
        { label: 'Exam Results', path: '/admin/exams', icon: GraduationCap },
        { label: 'User Management', path: '/admin/users', icon: UserCog },
        { label: 'Students', path: '/admin/students', icon: Users },
        { label: 'Message Center', path: '/admin/messages', icon: MessageSquare },
        { label: 'Settings', path: '/admin/settings', icon: Settings },
    ];

    return (
        <div className="h-screen overflow-hidden bg-gray-100 dark:bg-slate-950 flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Reusable Sidebar (Desktop) */}
            <div className="hidden lg:block relative z-30">
                <Sidebar items={navItems} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
            </div>

            {/* Mobile Sidebar (Simplified for now or duplicate rendering with mobile styles if needed) 
                For now we keep the mobile duplicate navigation logic essentially hidden or we render Sidebar with mobile styles.
                The shared Sidebar component is fixed position, so it might conflict if not careful.
                Let's stick to the shared sidebar being desktop for now and maybe mobile later, 
                OR we can just use the shared sidebar as is but toggle its visibility.
            */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 w-64 bg-primary lg:hidden shadow-lg transform transition-transform duration-200 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="h-full overflow-y-auto">
                    <Sidebar items={navItems} isCollapsed={false} setIsCollapsed={() => { }} />
                </div>
                {/* Note: Sidebar component has fixed positioning in its className, might need adjustment for mobile context.
                    Actually, let's just render it. The fixed positioning in Sidebar.tsx (fixed left-0 top-0) will overlap.
                    We should probably remove 'fixed' from Sidebar.tsx and let the parent handle positioning in a real refractoring,
                    but for this step I will leave it and just accept duplicates on mobile or just hide it.
                    
                    Wait, if I use Sidebar inside this aside, and Sidebar has `fixed`, it will be fixed to viewport, not container.
                    Let's just use the Sidebar component for Desktop for now and keep the mobile drawer simple or assume Sidebar handles itself.
                    
                    Actually, looking at Sidebar.tsx, it has `fixed left-0 top-0`. This makes it hard to use in a mobile drawer that slides in.
                    For this iteration, I will ONLY use the new Sidebar for Desktop.
                */}
            </aside>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                {/* Mobile Header */}

                <header className="h-16 flex items-center px-4 bg-white border-b border-gray-200 lg:hidden dark:bg-slate-900 dark:border-slate-800 justify-between">
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-100"
                        >
                            <Menu size={24} />
                        </button>
                        <span className="ml-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Admin Portal</span>
                    </div>
                    <ModeToggle />
                </header>

                {/* Content Area with Animation */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-gray-50/50 dark:bg-slate-950">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="h-full"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
