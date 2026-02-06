import React from 'react';
import useStore from '../store/useStore';
import { Wallet, ArrowUpDown, TrendingUp, TrendingDown, Activity, BarChart3, Shield } from 'lucide-react';

const fmt = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const fmtK = (val) => {
    if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return fmt(val);
};
const pctChange = (curr, prev) => {
    if (!prev || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
};
const PctBadge = ({ value }) => {
    if (value === null || value === undefined) return <span className="text-xs text-finmind-muted">— vs last</span>;
    const positive = value >= 0;
    return (
        <span className={`text-xs font-medium ${positive ? 'text-finmind-success' : 'text-finmind-secondary'}`}>
            {positive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}% <span className="text-finmind-muted font-normal">vs last</span>
        </span>
    );
};

const DashboardPage = ({ onNavigate }) => {
    const snapshots = useStore((s) => s.snapshots);
    const current = snapshots[0];
    const previous = snapshots[1];

    if (!current) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in pt-20">
                <div className="w-24 h-24 bg-finmind-card rounded-full flex items-center justify-center animate-pulse">
                    <Activity size={40} className="text-finmind-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white">Welcome to FinMind</h2>
                <p className="text-finmind-muted max-w-xs">
                    Your personal AI wealth architect. Add your first financial snapshot to get started.
                </p>
                <button
                    onClick={() => onNavigate('input')}
                    className="bg-finmind-primary text-slate-900 font-bold px-8 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] transition-all"
                >
                    Create First Snapshot
                </button>
            </div>
        );
    }

    const m = current.metrics;
    const pm = previous?.metrics;

    const exposureLabel = m.investmentRatio > 0.6 ? 'High' : m.investmentRatio > 0.3 ? 'Medium' : 'Low';
    const runwayLabel = m.runwayMonths >= 6 ? 'Strong' : m.runwayMonths >= 3 ? 'Adequate' : 'Danger';
    const runwayColor = m.runwayMonths >= 6 ? 'text-finmind-success' : m.runwayMonths >= 3 ? 'text-finmind-warning' : 'text-finmind-secondary';

    return (
        <div className="space-y-4 animate-fade-in pb-24">
            {/* Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Financial Snapshot</h1>
                    <p className="text-finmind-muted text-sm uppercase tracking-wider">{current.market_date}</p>
                </div>
                <button onClick={() => onNavigate('input')}
                    className="flex items-center space-x-1 text-finmind-muted hover:text-finmind-primary transition-colors px-3 py-2 rounded-lg hover:bg-slate-800">
                    <span className="text-sm font-medium">← Back</span>
                </button>
            </header>

            {/* Net Worth Card */}
            <div className="relative p-6 rounded-2xl bg-finmind-card border border-slate-700/50 shadow-lg overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-finmind-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold tracking-wider text-finmind-muted uppercase">Net Worth</h2>
                        <div className="p-2 rounded-full bg-slate-800/50 text-finmind-primary"><Wallet size={18} /></div>
                    </div>
                    <div className="text-4xl font-bold tracking-tight text-finmind-primary drop-shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                        {fmtK(m.netWorth)}
                    </div>
                    <div className="mt-3">
                        <PctBadge value={pctChange(m.netWorth, pm?.netWorth)} />
                    </div>
                </div>
            </div>

            {/* KPI Grid — 2 cols */}
            <div className="grid grid-cols-2 gap-4">
                {/* Cash/Debt Ratio */}
                <div className="bg-finmind-card p-4 rounded-2xl border border-slate-700/50">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-finmind-muted uppercase">Cash / Debt Ratio</span>
                        <ArrowUpDown size={16} className="text-slate-600" />
                    </div>
                    <div className="text-3xl font-bold text-finmind-secondary">
                        {m.cashDebtRatio === -1 ? '∞' : m.cashDebtRatio.toFixed(2)}
                    </div>
                    <div className="mt-1">
                        <PctBadge value={pm ? pctChange(m.cashDebtRatio === -1 ? 999 : m.cashDebtRatio, pm.cashDebtRatio === -1 ? 999 : pm.cashDebtRatio) : null} />
                    </div>
                </div>

                {/* Monthly Surplus */}
                <div className="bg-finmind-card p-4 rounded-2xl border border-slate-700/50">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-finmind-muted uppercase">Monthly Surplus</span>
                        {m.surplus >= 0 ? <TrendingUp size={16} className="text-finmind-success" /> : <TrendingDown size={16} className="text-finmind-secondary" />}
                    </div>
                    <div className={`text-3xl font-bold ${m.surplus >= 0 ? 'text-finmind-success' : 'text-finmind-secondary'}`}>
                        {fmt(m.surplus)}
                    </div>
                    <div className="text-xs text-finmind-muted mt-1">
                        Save {(m.savingsRate * 100).toFixed(0)}% of income
                    </div>
                </div>
            </div>

            {/* Investment Exposure */}
            <div className="bg-finmind-card p-4 rounded-2xl border border-slate-700/50">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-finmind-muted uppercase">Investment Exposure</span>
                    <BarChart3 size={16} className="text-finmind-secondary" />
                </div>
                <div className="flex items-baseline space-x-3">
                    <span className="text-sm text-finmind-muted">$</span>
                    <span className={`text-2xl font-bold ${exposureLabel === 'High' ? 'text-finmind-secondary' : exposureLabel === 'Medium' ? 'text-finmind-warning' : 'text-finmind-muted'}`}>
                        {exposureLabel}
                    </span>
                </div>
                <div className="text-xs text-finmind-muted mt-1">
                    {(m.investmentRatio * 100).toFixed(0)}% of total assets in investments ({fmtK(current.investments)})
                </div>
            </div>

            {/* Runway */}
            <div className="bg-finmind-card p-4 rounded-2xl border border-slate-700/50">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-finmind-muted uppercase">Emergency Runway</span>
                    <Shield size={16} className={runwayColor} />
                </div>
                <div className={`text-2xl font-bold ${runwayColor}`}>
                    {m.runwayMonths} months
                </div>
                <div className="text-xs text-finmind-muted mt-1">
                    {runwayLabel} — {m.runwayMonths >= 6 ? 'exceeds' : m.runwayMonths >= 3 ? 'meets' : 'below'} 3-6 month benchmark
                </div>
            </div>

        </div>
    );
};

export default DashboardPage;
