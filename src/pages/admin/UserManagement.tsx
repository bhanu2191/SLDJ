import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Shield, X, UserPlus, Eye, EyeOff } from 'lucide-react';

interface Operator {
    id: number;
    name: string;
    email: string;
    role: 'operator';
    status: 'active' | 'suspended';
    lastActive: string;
}

const initialOperators: Operator[] = []; // Start empty, fetch from DB

export const UserManagement = () => {
    const [operators, setOperators] = useState<Operator[]>(initialOperators);

    // Load users from DB on mount
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
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // New Operator Form State
    const [newOperatorName, setNewOperatorName] = useState('');
    const [newOperatorEmail, setNewOperatorEmail] = useState('');
    const [newOperatorPassword, setNewOperatorPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this operator?')) {
            try {
                // @ts-ignore
                await window.electronAPI.deleteOperator(id);
                loadOperators();
            } catch (error) {
                console.error("Failed to delete operator", error);
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
        if (!newOperatorName || !newOperatorEmail || !newOperatorPassword) return;

        const newOp = {
            name: newOperatorName,
            email: newOperatorEmail,
            role: 'operator',
            status: 'active',
            lastActive: 'Just now',
            password: newOperatorPassword // Send password to backend
        };

        if (!window.electronAPI) {
            alert("System Error: Electron API is missing. Please restart the application entirely (close and re-run).");
            return;
        }

        try {
            // @ts-ignore
            await window.electronAPI.addOperator(newOp);
            loadOperators(); // Refresh list
            setIsAddModalOpen(false);
            setNewOperatorName('');
            setNewOperatorEmail('');
            setNewOperatorPassword('');
        } catch (error: any) {
            console.error("Failed to add operator", error);
            alert(`Error adding operator: ${error.message || 'Unknown error'}. \n\nDid you restart the app after the last update?`);
        }
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">Manage operator accounts and permissions</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors shadow-md hover:shadow-lg"
                >
                    <Plus size={20} />
                    Add New Operator
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search operators..."
                            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {operators.map((operator) => (
                            <tr key={operator.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center text-primary font-bold">
                                            {operator.name.charAt(0)}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{operator.name}</div>
                                            <div className="text-sm text-gray-500">{operator.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${operator.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {operator.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {operator.lastActive}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleToggleStatus(operator.id)}
                                        className="text-primary hover:text-primary-dark mr-4"
                                        title={operator.status === 'active' ? 'Suspend' : 'Activate'}
                                    >
                                        <Shield size={18} />
                                    </button>
                                    <button
                                        className="text-gray-400 hover:text-gray-600 mr-4"
                                        title="Edit"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(operator.id)}
                                        className="text-red-600 hover:text-red-900"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Operator Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <UserPlus className="text-primary" size={24} />
                                Add New Operator
                            </h2>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddOperator}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        placeholder="e.g. John Doe"
                                        value={newOperatorName}
                                        onChange={(e) => setNewOperatorName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        placeholder="e.g. john@sldj.edu.lk"
                                        value={newOperatorEmail}
                                        onChange={(e) => setNewOperatorEmail(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all pr-10"
                                            placeholder="Min. 8 characters"
                                            value={newOperatorPassword}
                                            onChange={(e) => setNewOperatorPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors shadow-sm"
                                >
                                    Create Operator
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
