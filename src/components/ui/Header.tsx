import { Bell, Search, Menu } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // Ensure utils exists

export function Header() {
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 h-20 px-8 flex items-center justify-between sticky top-0 z-40 transition-all duration-200">
            {/* Left Section: Title & Date */}
            <div className="flex flex-col">
                <h2 className="text-xl font-display font-bold text-slate-800 tracking-tight">
                    Welcome back, Admin
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5 uppercase tracking-wider">
                    {currentDate}
                </p>
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-6">
                {/* Search Bar */}
                <div className="relative hidden md:flex items-center group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors duration-200" />
                    <Input
                        type="text"
                        placeholder="Quick search..."
                        className="pl-10 pr-4 w-72 h-10 bg-slate-50 border-slate-200/80 focus:bg-white focus:ring-primary/20 rounded-full transition-all duration-200 shadow-sm"
                    />
                </div>

                {/* Notifications & Actions */}

                {/* Notifications & Actions */}
                <div className="flex items-center gap-3">
                    <ModeToggle />
                    <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100 text-slate-500 hover:text-primary dark:hover:bg-slate-800 dark:text-slate-400">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white pointer-events-none ring-1 ring-red-500/20 animate-pulse" />
                    </Button>

                    {/* Mobile Menu Trigger (Hidden on Desktop) */}
                    <Button variant="ghost" size="icon" className="lg:hidden rounded-full hover:bg-slate-100 text-slate-500">
                        <Menu className="h-6 w-6" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
