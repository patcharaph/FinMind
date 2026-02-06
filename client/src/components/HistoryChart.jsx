import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const fmtK = (val) => {
    if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
};

const HistoryChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-72 bg-finmind-card rounded-2xl p-5 border border-slate-700/50 flex items-center justify-center">
                <span className="text-finmind-muted text-sm">No data to chart yet.</span>
            </div>
        );
    }

    const chartData = [...data]
        .reverse()
        .map((d, i) => ({
            name: d.market_date,
            netWorth: d.metrics?.netWorth ?? (d.cash + d.investments - d.debt),
            cash: d.cash,
            debt: d.debt,
            investments: d.investments,
        }));

    return (
        <div className="w-full h-72 bg-finmind-card rounded-2xl p-5 border border-slate-700/50 relative">
            <h3 className="text-xs font-bold text-finmind-muted uppercase mb-4 tracking-wider">Net Worth Trend</h3>
            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#00f3ff" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        allowDuplicatedCategory={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={fmtK}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}
                        formatter={(val, name) => {
                            const labels = { netWorth: 'Net Worth', cash: 'Cash', debt: 'Debt', investments: 'Investments' };
                            const colors = { netWorth: '#00f3ff', cash: '#22c55e', debt: '#ff3b9a', investments: '#f59e0b' };
                            return [`$${val.toLocaleString()}`, labels[name] || name];
                        }}
                    />
                    <Area type="monotone" dataKey="netWorth" stroke="#00f3ff" strokeWidth={2.5} fillOpacity={1} fill="url(#gradNet)" name="netWorth" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default HistoryChart;
