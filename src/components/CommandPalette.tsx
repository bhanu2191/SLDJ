
import * as React from "react"
import {
    CreditCard,
    Settings,
    User,
    LogOut,
    Users,
    MessageSquare,
    LayoutDashboard
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
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
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
                        <CommandItem onSelect={() => runCommand(() => logout())}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign Out</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
