import { Sidebar } from '../components/ui/Sidebar';
import { Outlet } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';

export function DashboardLayout() {
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar />

            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="bg-white border-b border-slate-200 h-16 px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800">Welcome back, Admin</h2>
                        <p className="text-xs text-slate-500">{currentDate}</p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Quick search..."
                                className="pl-9 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64 transition-all"
                            />
                        </div>

                        <button className="relative p-2 text-slate-500 hover:text-primary transition-colors hover:bg-slate-100 rounded-full">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-status-danger border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
