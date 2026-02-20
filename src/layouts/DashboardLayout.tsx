import { Sidebar } from '../components/ui/Sidebar';
import { Header } from '../components/ui/Header';
import { Outlet } from 'react-router-dom';

export function DashboardLayout() {
    return (
        <div className="min-h-screen bg-slate-50/50 flex font-sans text-slate-900 selection:bg-primary/10 selection:text-primary">
            {/* Fixed Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 ml-72 flex flex-col min-h-screen transition-all duration-300">
                <Header />

                <main className="flex-1 p-8 overflow-y-auto scroll-smooth">
                    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
