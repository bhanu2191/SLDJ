import { PaymentStatusBadge } from "../students/PaymentStatusBadge";

interface Payment {
    id: string;
    month: string;
    amount: number;
    date?: string;
    class?: string;
    status: 'paid' | 'pending' | 'overdue';
}

interface PaymentHistoryListProps {
    payments: Payment[];
}

export function PaymentHistoryList({ payments }: PaymentHistoryListProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Payment History</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Class</th>
                            <th className="px-6 py-3">Month / Year</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Paid Date</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Invoice</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {payments.map(payment => (
                            <tr key={payment.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-800">{payment.class || 'N/A'}</td>
                                <td className="px-6 py-4 font-medium text-slate-700">{payment.month}</td>
                                <td className="px-6 py-4">LKR {payment.amount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-slate-500">{payment.date || '-'}</td>
                                <td className="px-6 py-4">
                                    <PaymentStatusBadge status={payment.status} />
                                </td>
                                <td className="px-6 py-4">
                                    {payment.status === 'paid' && (
                                        <button className="text-primary hover:underline text-xs">View #INV-{payment.id}</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
