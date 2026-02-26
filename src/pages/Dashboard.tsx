import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { UpcomingBirthdays } from '@/components/dashboard/UpcomingBirthdays';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { Users, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Dashboard() {
    const [stats, setStats] = useState({
        totalStudents: 0,
        monthlyRevenue: 0,
        pendingPayments: 0
    });

    useEffect(() => {
        const loadStats = async () => {
            if (window.electronAPI) {
                try {
                    const data = await window.electronAPI.getDashboardStats();
                    setStats(data);
                } catch (error) {
                    console.error("Failed to load dashboard stats", error);
                }
            }
        };
        loadStats();
    }, []);
    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white">Dashboard</h2>
                <p className="text-slate-500 mt-1 dark:text-slate-400">Overview of your institute's performance.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`LKR ${stats.monthlyRevenue.toLocaleString()}`}
                    description="This Month"
                    icon={CreditCard}
                    variant="premium"
                />
                <StatCard
                    title="Active Students"
                    value={stats.totalStudents.toString()}
                    description="Total Enrolled"
                    icon={Users}
                    variant="default"
                />
                <StatCard
                    title="Pending Payments"
                    value={stats.pendingPayments.toString()}
                    description="Students Unpaid"
                    icon={AlertCircle}
                    variant={stats.pendingPayments > 0 ? "warning" : "default"}
                />
                <StatCard
                    title="Pass Rate"
                    value="94%"
                    description="JLPT & NAT Exams"
                    icon={TrendingUp}
                    variant="default"
                    trend="up"
                    trendValue="5%"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Chart Section */}
                <RevenueChart />

                {/* Activity Feed and Birthdays */}
                <div className="col-span-1 flex flex-col gap-6">
                    <UpcomingBirthdays />
                    <ActivityFeed />
                </div>
            </div>
        </div>
    );
}
