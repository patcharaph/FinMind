import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const HistoryChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-64 bg-finmind-card rounded-2xl p-4 border border-slate-700/50 flex items-center justify-center">
                <span className="text-finmind-muted text-sm">No data to chart yet.</span>
            </div>
        );
    }

    const chartData = [...data]
        .reverse()
        .map((d) => ({
            name: d.market_date,
            value: d.metrics?.netWorth ?? (d.cash + d.investments - d.debt),
        }));

    return (
        <div className="w-full h-64 bg-finmind-card rounded-2xl p-4 border border-slate-700/50 relative">
            <h3 className="text-xs font-bold text-finmind-muted uppercase mb-4 tracking-wider">Net Worth Trend</h3>
            <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00f3ff" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#00f3ff' }}
                        formatter={(val) => [`$${val.toLocaleString()}`, 'Net Worth']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#00f3ff" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default HistoryChart;
