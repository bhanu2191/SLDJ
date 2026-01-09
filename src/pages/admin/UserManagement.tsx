import { useState } from 'react';
import { Plus, Edit, Trash2, Search, Shield } from 'lucide-react';

interface Operator {
    id: number;
    name: string;
    email: string;
    role: 'operator';
    status: 'active' | 'suspended';
    lastActive: string;
}

const initialOperators: Operator[] = [
    { id: 1, name: 'Sarah Wilson', email: 'sarah.w@sldj.edu.lk', role: 'operator', status: 'active', lastActive: '2 mins ago' },
    { id: 2, name: 'Michael Chen', email: 'm.chen@sldj.edu.lk', role: 'operator', status: 'active', lastActive: '1 hour ago' },
    { id: 3, name: 'Emma Davis', email: 'emma.d@sldj.edu.lk', role: 'operator', status: 'suspended', lastActive: '2 days ago' },
];

export const UserManagement = () => {
    const [operators, setOperators] = useState<Operator[]>(initialOperators);
    const [searchTerm, setSearchTerm] = useState('');

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this operator?')) {
            setOperators(operators.filter(op => op.id !== id));
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">Manage operator accounts and permissions</p>
                </div>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors">
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
                            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
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
                                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
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
                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
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
        </div>
    );
};

export default UserManagement;
