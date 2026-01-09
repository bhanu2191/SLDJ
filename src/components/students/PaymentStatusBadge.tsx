import { cn } from '../../lib/utils';
import { Check, Clock, AlertCircle } from 'lucide-react';

type PaymentStatus = 'paid' | 'pending' | 'overdue';

interface PaymentStatusBadgeProps {
    status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
    const styles = {
        paid: 'bg-status-success/10 text-status-success border-status-success/20',
        pending: 'bg-status-warning/10 text-status-warning border-status-warning/20',
        overdue: 'bg-status-danger/10 text-status-danger border-status-danger/20'
    };

    const icons = {
        paid: Check,
        pending: Clock,
        overdue: AlertCircle
    };

    const labels = {
        paid: 'Paid',
        pending: 'Pending',
        overdue: 'Overdue'
    };

    const Icon = icons[status];

    return (
        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border", styles[status])}>
            <Icon className="h-3 w-3" />
            {labels[status]}
        </span>
    );
}
