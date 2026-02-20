import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { Users, GraduationCap, CreditCard, TrendingUp } from 'lucide-react';

export function Dashboard() {
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
                    value="LKR 4.2M"
                    description="+12% from last month"
                    icon={CreditCard}
                    variant="premium"
                    trend="up"
                    trendValue="12%"
                />
                <StatCard
                    title="Active Students"
                    value="1,240"
                    description="+40 new this week"
                    icon={Users}
                    variant="default"
                    trend="up"
                    trendValue="3.2%"
                />
                <StatCard
                    title="Course Enrollments"
                    value="856"
                    description="Across 12 batches"
                    icon={GraduationCap}
                    variant="default"
                    trend="neutral"
                    trendValue="0%"
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

                {/* Activity Feed */}
                <div className="col-span-1">
                    <ActivityFeed />
                </div>
            </div>
        </div>
    );
}
