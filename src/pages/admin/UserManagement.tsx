import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Shield, MoreHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Swal from 'sweetalert2';

interface Operator {
    id: number;
    name: string;
    email: string;
    role: 'operator';
    status: 'active' | 'suspended';
    lastActive: string;
}

const initialOperators: Operator[] = [];

export const UserManagement = () => {
    const [operators, setOperators] = useState<Operator[]>(initialOperators);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newOperator, setNewOperator] = useState({ name: '', email: '', password: '' });

    useEffect(() => {
        loadOperators();
    }, []);

    const loadOperators = async () => {
        try {
            // @ts-ignore
            const ops = await window.electronAPI.getOperators();
            setOperators(ops);
        } catch (error) {
            console.error("Failed to load operators", error);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                // @ts-ignore
                await window.electronAPI.deleteOperator(id);
                loadOperators();
                Swal.fire('Deleted!', 'Operator has been deleted.', 'success');
            } catch (error) {
                console.error("Failed to delete operator", error);
                Swal.fire('Error', 'Failed to delete operator.', 'error');
            }
        }
    };

    const handleToggleStatus = (id: number) => {
        setOperators(operators.map(op => {
            if (op.id === id) {
                return { ...op, status: op.status === 'active' ? 'suspended' : 'active' };
            }
            return op;
        }));
    };

    const handleAddOperator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOperator.name || !newOperator.email || !newOperator.password) return;

        try {
            const newOp = {
                ...newOperator,
                role: 'operator',
                status: 'active',
                lastActive: 'Just now'
            };
            // @ts-ignore
            await window.electronAPI.addOperator(newOp);
            loadOperators();
            setIsAddModalOpen(false);
            setNewOperator({ name: '', email: '', password: '' });
            Swal.fire('Success', 'Operator created successfully', 'success');
        } catch (error: any) {
            console.error("Failed to add operator", error);
            Swal.fire('Error', error.message || 'Failed to create operator', 'error');
        }
    };

    const filteredOperators = operators.filter(op =>
        op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">User Management</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage operator accounts and system access.</p>
                </div>
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus size={16} /> Add Operator
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Operator</DialogTitle>
                            <DialogDescription>
                                Create a new account for staff members. They will have access to student management and payments.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddOperator} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <Input
                                    placeholder="e.g. John Doe"
                                    value={newOperator.name}
                                    onChange={(e) => setNewOperator({ ...newOperator, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="e.g. john@sldj.edu"
                                    value={newOperator.email}
                                    onChange={(e) => setNewOperator({ ...newOperator, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={newOperator.password}
                                    onChange={(e) => setNewOperator({ ...newOperator, password: e.target.value })}
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Create Account</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="dark:border-slate-800">
                <CardHeader>
                    <CardTitle>Operators</CardTitle>
                    <CardDescription>A list of all registered operators having access to the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Filter operators..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 dark:bg-slate-950 dark:border-slate-800"
                            />
                        </div>
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:border-slate-800">
                                    <TableHead className="dark:text-slate-400">Name</TableHead>
                                    <TableHead className="dark:text-slate-400">Status</TableHead>
                                    <TableHead className="dark:text-slate-400">Last Active</TableHead>
                                    <TableHead className="text-right dark:text-slate-400">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOperators.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No operators found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOperators.map((operator) => (
                                        <TableRow key={operator.id} className="dark:border-slate-800">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {operator.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium dark:text-white">{operator.name}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{operator.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={operator.status === 'active' ? 'success' : 'destructive'}>
                                                    {operator.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-500 dark:text-slate-400">{operator.lastActive}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(operator.email)}>
                                                            Copy Email
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleToggleStatus(operator.id)}>
                                                            <Shield className="mr-2 h-4 w-4" />
                                                            {operator.status === 'active' ? 'Suspend' : 'Activate'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(operator.id)} className="text-red-600 focus:text-red-600">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default UserManagement;
