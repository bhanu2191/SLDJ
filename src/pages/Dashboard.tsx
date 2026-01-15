import { Users, CreditCard, Wallet, Calendar, Loader2 } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { useEffect, useState } from 'react';

export function Dashboard() {
    const [stats, setStats] = useState({ totalStudents: 0, monthlyRevenue: 0, pendingPayments: 0 });
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [dashboardStats, chartData, recentActivity] = await Promise.all([
                    window.electronAPI.getDashboardStats(),
                    window.electronAPI.getRevenueChart(),
                    window.electronAPI.getRecentActivity()
                ]);

                setStats(dashboardStats);
                setRevenueData(chartData);
                setActivities(recentActivity);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Active Students"
                    value={stats.totalStudents.toLocaleString()}
                    icon={Users}
                    iconColorClass="bg-primary/10 text-primary"
                />
                <StatCard
                    title="Payments Pending"
                    value={stats.pendingPayments.toLocaleString()}
                    icon={CreditCard}
                    iconColorClass="bg-status-warning/10 text-status-warning"
                    subtext="Current Month"
                />
                <StatCard
                    title="Month's Revenue"
                    value={`Rs. ${(stats.monthlyRevenue / 1000000).toFixed(1)}M`}
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
                    <RevenueChart data={revenueData} />
                </div>
                <div className="lg:col-span-1">
                    <ActivityFeed activities={activities} />
                </div>
            </div>
        </div>
    );
}
