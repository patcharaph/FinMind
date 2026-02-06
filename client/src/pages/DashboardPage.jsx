import React from 'react';
import useStore from '../store/useStore';
import { Wallet, ArrowUpDown, TrendingUp, TrendingDown, BarChart3, Shield, ShieldCheck, Zap, Brain, ArrowRight, Sparkles, LineChart, Lock, Clock } from 'lucide-react';

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
            <div className="flex flex-col items-center text-center animate-fade-in pb-24 -mt-2">
                {/* Logo */}
                <div className="relative w-full flex flex-col items-center pt-6 pb-6">
                    <div className="absolute inset-0 bg-gradient-to-b from-finmind-primary/8 via-finmind-secondary/3 to-transparent rounded-3xl" />
                    <div className="relative z-10 flex flex-col items-center">
                        {/* SVG Logo */}
                        <div className="w-24 h-24 mb-5 relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-finmind-primary/30 to-finmind-secondary/30 rounded-3xl blur-xl" />
                            <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700/50 flex items-center justify-center shadow-[0_0_50px_rgba(0,243,255,0.12)]">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                    <path d="M24 4L28 16H40L30 24L34 36L24 28L14 36L18 24L8 16H20L24 4Z" fill="url(#logoGrad)" />
                                    <path d="M24 12L26.5 20H34L28 25L30.5 33L24 28L17.5 33L20 25L14 20H21.5L24 12Z" fill="#0f172a" fillOpacity="0.5" />
                                    <defs>
                                        <linearGradient id="logoGrad" x1="8" y1="4" x2="40" y2="36" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#00f3ff" />
                                            <stop offset="1" stopColor="#ff3b9a" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                        </div>

                        <h1 className="text-5xl font-black tracking-tight mb-3">
                            <span className="bg-gradient-to-r from-finmind-primary to-cyan-300 bg-clip-text text-transparent">Fin</span><span className="text-white">Mind</span>
                        </h1>
                        <p className="text-finmind-muted text-base max-w-[280px] leading-relaxed">
                            Your AI wealth architect.<br />
                            <span className="text-slate-400">Know your numbers. Master your money.</span>
                        </p>
                    </div>
                </div>

                {/* Feature Cards — 2 column grid + full-width cards */}
                <div className="w-full mt-5 space-y-3">
                    {/* Row 1: 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-finmind-card/60 backdrop-blur border border-slate-700/40 rounded-2xl p-4 text-left">
                            <div className="w-10 h-10 rounded-xl bg-finmind-primary/10 flex items-center justify-center mb-3">
                                <Lock size={18} className="text-finmind-primary" />
                            </div>
                            <h3 className="text-white font-semibold text-sm mb-1">100% Private</h3>
                            <p className="text-finmind-muted text-[11px] leading-relaxed">No login · No email · No tracking · Your data stays on device</p>
                        </div>
                        <div className="bg-finmind-card/60 backdrop-blur border border-slate-700/40 rounded-2xl p-4 text-left">
                            <div className="w-10 h-10 rounded-xl bg-finmind-success/10 flex items-center justify-center mb-3">
                                <Zap size={18} className="text-finmind-success" />
                            </div>
                            <h3 className="text-white font-semibold text-sm mb-1">30-Second Setup</h3>
                            <p className="text-finmind-muted text-[11px] leading-relaxed">Enter 5 numbers and get a complete financial snapshot instantly</p>
                        </div>
                    </div>

                    {/* Row 2: 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-finmind-card/60 backdrop-blur border border-slate-700/40 rounded-2xl p-4 text-left">
                            <div className="w-10 h-10 rounded-xl bg-finmind-secondary/10 flex items-center justify-center mb-3">
                                <Brain size={18} className="text-finmind-secondary" />
                            </div>
                            <h3 className="text-white font-semibold text-sm mb-1">AI Advisor</h3>
                            <p className="text-finmind-muted text-[11px] leading-relaxed">MBA-level insights powered by AI — specific to your situation</p>
                        </div>
                        <div className="bg-finmind-card/60 backdrop-blur border border-slate-700/40 rounded-2xl p-4 text-left">
                            <div className="w-10 h-10 rounded-xl bg-finmind-warning/10 flex items-center justify-center mb-3">
                                <LineChart size={18} className="text-finmind-warning" />
                            </div>
                            <h3 className="text-white font-semibold text-sm mb-1">Track Progress</h3>
                            <p className="text-finmind-muted text-[11px] leading-relaxed">Monthly snapshots with charts to visualize your wealth journey</p>
                        </div>
                    </div>

                    {/* Row 3: Full-width highlight */}
                    <div className="bg-gradient-to-r from-finmind-primary/5 to-finmind-secondary/5 backdrop-blur border border-slate-700/40 rounded-2xl p-5 flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-finmind-primary/20 to-finmind-secondary/20 flex items-center justify-center flex-shrink-0">
                            <Shield size={22} className="text-finmind-primary" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-white font-semibold text-sm">Risk Assessment Built-In</h3>
                            <p className="text-finmind-muted text-xs">Emergency runway · Debt-to-asset ratio · Savings rate · Investment exposure</p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <button
                    onClick={() => onNavigate('input')}
                    className="w-full mt-7 flex items-center justify-center bg-gradient-to-r from-finmind-primary via-cyan-400 to-finmind-secondary text-slate-900 font-bold rounded-2xl px-8 py-4 text-lg shadow-[0_0_30px_rgba(0,243,255,0.25)] hover:shadow-[0_0_50px_rgba(0,243,255,0.4)] transition-all active:scale-[0.98]"
                >
                    Get Started <ArrowRight className="ml-2" size={20} />
                </button>

                <p className="text-finmind-muted text-xs mt-4 opacity-50">
                    Free forever · No credit card · Works offline
                </p>
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
                <div className="flex space-x-2">
                    <button onClick={() => onNavigate('input')}
                        className="px-4 py-2 bg-finmind-card border border-slate-700 rounded-lg text-sm hover:border-finmind-primary transition-colors">
                        ← Back
                    </button>
                    <button onClick={() => onNavigate('advisor')}
                        className="px-4 py-2 bg-finmind-secondary/10 border border-finmind-secondary/50 text-finmind-secondary rounded-lg text-sm hover:bg-finmind-secondary/20 transition-colors">
                        ◉ AI Advice
                    </button>
                </div>
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
