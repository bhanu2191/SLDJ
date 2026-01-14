import { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';

export const SystemSettings = () => {
    const [classCategories, _setClassCategories] = useState([
        { id: 1, name: 'JLPT N5', fee: 5000 },
        { id: 2, name: 'JLPT N4', fee: 6500 },
        { id: 3, name: 'JLPT N3', fee: 8000 },
    ]);

    const [smsSettings, _setSmsSettings] = useState({
        provider: 'DefaultGateway',
        apiKey: '********************',
        senderId: 'SLDJ'
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
                <p className="text-gray-500">Manage class fees, categories, and API settings</p>
            </div>

            {/* Class Categories & Fees */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">Class Categories & Fees</h2>
                    <button className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1">
                        <Plus size={16} /> Add Category
                    </button>
                </div>

                <div className="space-y-4">
                    {classCategories.map((category) => (
                        <div key={category.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Class Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-primary focus:border-primary"
                                    defaultValue={category.name}
                                />
                            </div>
                            <div className="w-48">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Monthly Fee (LKR)</label>
                                <input
                                    type="number"
                                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-primary focus:border-primary"
                                    defaultValue={category.fee}
                                />
                            </div>
                            <div className="pt-5">
                                <button className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end">
                    <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors">
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>
            </div>

            {/* SMS Gateway Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">SMS Gateway Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                            defaultValue={smsSettings.provider}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                            defaultValue={smsSettings.senderId}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary font-mono"
                            defaultValue={smsSettings.apiKey}
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors">
                        <Save size={18} />
                        Update Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
