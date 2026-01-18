import { LayoutDashboard, UserPlus, Users, Settings, GraduationCap, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: UserPlus, label: 'Registration', path: '/register' },
    { icon: Users, label: 'Students', path: '/students' },
    // { icon: CreditCard, label: 'Finance', path: '/finance' }, // Combined in Students for now as per view 3
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
    const location = useLocation();

    return (
        <div className="h-screen w-64 bg-charcoal text-white flex flex-col fixed left-0 top-0 shadow-xl z-50">
            <div className="p-6 flex items-center gap-3 border-b border-white/10">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <GraduationCap className="h-6 w-6 text-accent" />
                </div>
                <div>
                    <h1 className="font-bold text-lg leading-tight">SL Dream Japan</h1>
                    <p className="text-xs text-gray-400">Admin Portal</p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 mt-4">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                                isActive
                                    ? "bg-white/10 text-white font-medium border-l-4 border-accent"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 transition-colors",
                                isActive ? "text-accent" : "text-gray-400 group-hover:text-white"
                            )} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold">
                        AD
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium">System Admin</p>
                        <p className="text-xs text-gray-400">admin@sldj.lk</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
