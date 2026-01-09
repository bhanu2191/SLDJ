import { Users, CreditCard, Wallet, Calendar } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';

export function Dashboard() {
    return (
        <div className="space-y-6">
            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Active Students"
                    value="1,245"
                    icon={Users}
                    iconColorClass="bg-primary/10 text-primary"
                />
                <StatCard
                    title="Payments Pending"
                    value="34"
                    icon={CreditCard}
                    iconColorClass="bg-status-warning/10 text-status-warning"
                    subtext="Current Month"
                />
                <StatCard
                    title="Month's Revenue"
                    value="Rs. 4.2M"
                    icon={Wallet}
                    iconColorClass="bg-status-success/10 text-status-success"
                />
                <StatCard
                    title="Upcoming Exam"
                    value="45 Days"
                    icon={Calendar}
                    iconColorClass="bg-accent/10 text-accent"
                    subtext="JLPT July Exam"
                />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RevenueChart />
                </div>
                <div className="lg:col-span-1">
                    <ActivityFeed />
                </div>
            </div>
        </div>
    );
}
