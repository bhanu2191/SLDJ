
import * as React from "react"
import {
    CreditCard,
    Settings,
    User,
    LogOut,
    Users,
    MessageSquare,
    LayoutDashboard,
    Wallet
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
    const [isLogoutOpen, setIsLogoutOpen] = React.useState(false)
    const navigate = useNavigate();
    const { logout, userRole } = useAuth();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    if (!userRole) return null; // Don't show if not logged in

    return (
        <>
            {/* Optional: Trigger button can be added here if needed, but Ctrl+K is purely keyboard for now */}
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                        <CommandItem onSelect={() => runCommand(() => navigate(userRole === 'admin' ? '/admin' : '/operator'))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate(userRole === 'admin' ? '/admin/payments' : '/operator/payments'))}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Payments</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate(userRole === 'admin' ? '/admin/messages' : '/operator/messages'))}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span>Message Center</span>
                        </CommandItem>
                        {userRole === 'admin' && (
                            <CommandItem onSelect={() => runCommand(() => navigate('/admin/finance'))}>
                                <Wallet className="mr-2 h-4 w-4" />
                                <span>Finance Management</span>
                            </CommandItem>
                        )}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Students">
                        <CommandItem onSelect={() => runCommand(() => navigate(userRole === 'admin' ? '/admin/students' : '/operator/students'))}>
                            <Users className="mr-2 h-4 w-4" />
                            <span>Search Students</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate(userRole === 'admin' ? '/operator/register' : '/operator/register'))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>New Registration</span>
                            <CommandShortcut>⌘N</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Settings">
                        {userRole === 'admin' && (
                            <CommandItem onSelect={() => runCommand(() => navigate('/admin/settings'))}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>System Settings</span>
                            </CommandItem>
                        )}
                        <CommandItem onSelect={() => runCommand(() => setIsLogoutOpen(true))}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign Out</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
            <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                            You are about to log out of the {userRole === 'admin' ? 'Admin' : 'Operator'} Portal.
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
        </>
    )
}
