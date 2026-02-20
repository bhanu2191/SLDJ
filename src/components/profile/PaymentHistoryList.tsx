import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

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
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Payment History
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                            <TableHead className="w-[100px]">Invoice</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Month / Year</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Paid Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                    No payment history found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            payments.map((payment) => (
                                <TableRow key={payment.id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-mono text-xs text-slate-500">#{payment.id}</TableCell>
                                    <TableCell className="font-medium text-slate-800">{payment.class || 'N/A'}</TableCell>
                                    <TableCell className="text-slate-600">{payment.month}</TableCell>
                                    <TableCell className="font-medium text-slate-900">LKR {payment.amount.toLocaleString()}</TableCell>
                                    <TableCell className="text-slate-500 text-xs">{payment.date || '-'}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={payment.status === 'paid' ? 'success' : 'destructive'}
                                            className="uppercase text-[10px] tracking-wider"
                                        >
                                            {payment.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/10">
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
