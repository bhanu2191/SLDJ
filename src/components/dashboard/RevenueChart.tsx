import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';



interface RevenueChartProps {
    data: any[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
            <div className="mb-6">
                <h3 className="font-semibold text-slate-800 text-lg">Revenue Overview</h3>
                <p className="text-sm text-slate-500">Payment collection over the last 30 days</p>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.length > 0 ? data : []}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1a237e" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#1a237e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            dy={10}
                            tickFormatter={(value) => new Date(value).getDate().toString()}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 12 }}
                            tickFormatter={(value) => `LKR ${value / 1000}k`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: unknown) => [`LKR ${Number(value).toLocaleString()}`, 'Revenue']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#1a237e"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
