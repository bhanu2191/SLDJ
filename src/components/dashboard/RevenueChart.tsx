import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg dark:bg-slate-900 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{label}</p>
                <p className="text-sm text-primary font-medium dark:text-primary-400">
                    LKR {payload[0].value.toLocaleString()}
                </p>
            </div>
        );
    }
    return null;
};

export function RevenueChart() {
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        const loadChartData = async () => {
            if (window.electronAPI) {
                try {
                    const data = await window.electronAPI.getRevenueChart();
                    // data comes back as [{date: 'YYYY-MM-DD', value: total_amount}]

                    const formattedData = data.map((item: any) => ({
                        name: format(parseISO(item.date), 'MMM dd'),
                        revenue: item.value
                    }));

                    setChartData(formattedData.reverse()); // Ensure chronological order L->R
                } catch (error) {
                    console.error("Failed to load revenue chart", error);
                }
            }
        };
        loadChartData();
    }, []);

    return (
        <Card className="col-span-4 lg:col-span-3 shadow-md border-slate-100 dark:border-slate-800">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Revenue Overview</CardTitle>
            </CardHeader>
            <div className="h-[350px] w-full p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#053452" stopOpacity={0.3} className="dark:stop-color-blue-500" />
                                <stop offset="95%" stopColor="#053452" stopOpacity={0} className="dark:stop-color-blue-500" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="opacity-50 dark:opacity-20" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickFormatter={(value) => `LKR ${value}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#053452"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
