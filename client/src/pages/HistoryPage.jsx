import React from 'react';
import useStore from '../store/useStore';
import HistoryChart from '../components/HistoryChart';
import { Clock, TrendingUp } from 'lucide-react';

const fmt = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

const riskBadge = (level) => {
    if (!level || level === 'moderate') return { label: 'Balanced', color: 'text-finmind-warning bg-finmind-warning/10' };
    if (level === 'conservative') return { label: 'Conservative', color: 'text-finmind-success bg-finmind-success/10' };
    if (level === 'aggressive') return { label: 'Aggressive', color: 'text-finmind-secondary bg-finmind-secondary/10' };
    return { label: level, color: 'text-finmind-muted bg-slate-800' };
};

const HistoryPage = () => {
    const snapshots = useStore((s) => s.snapshots);

    return (
        <div className="space-y-5 animate-fade-in pb-24">
            <div>
                <h1 className="text-3xl font-bold text-white">Snapshot History</h1>
                <p className="text-finmind-muted text-sm mt-1">
                    {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} recorded
                </p>
            </div>

            <HistoryChart data={snapshots} />

            <div className="space-y-3">
                {snapshots.map((snap, idx) => {
                    const m = snap.metrics;
                    const risk = riskBadge(snap.risk_level);
                    const prevSnap = snapshots[idx + 1];
                    const prevNW = prevSnap?.metrics?.netWorth;
                    const nwChange = prevNW != null ? m.netWorth - prevNW : null;

                    return (
                        <div key={snap.id} className="bg-finmind-card rounded-2xl border border-slate-700/50 overflow-hidden group hover:border-finmind-primary/30 transition-colors">
                            {/* Header */}
                            <div className="flex justify-between items-center px-5 py-3 bg-slate-800/50 border-b border-slate-700/30">
                                <div className="flex items-center space-x-2">
                                    <Clock size={14} className="text-finmind-muted" />
                                    <span className="font-bold text-white">{snap.market_date}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {nwChange !== null && (
                                        <span className={`text-xs font-medium ${nwChange >= 0 ? 'text-finmind-success' : 'text-finmind-secondary'}`}>
                                            {nwChange >= 0 ? '↑' : '↓'} {fmt(Math.abs(nwChange))}
                                        </span>
                                    )}
                                    <span className="font-bold text-lg text-finmind-primary">{fmt(m.netWorth)}</span>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="px-5 py-4">
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                    <div>
                                        <span className="text-finmind-muted block mb-0.5">CASH</span>
                                        <span className="text-finmind-primary font-bold text-sm">{fmt(snap.cash)}</span>
                                    </div>
                                    <div>
                                        <span className="text-finmind-muted block mb-0.5">DEBT</span>
                                        <span className="text-finmind-secondary font-bold text-sm">{fmt(snap.debt)}</span>
                                    </div>
                                    <div>
                                        <span className="text-finmind-muted block mb-0.5">INVEST</span>
                                        <span className="text-finmind-warning font-bold text-sm">{fmt(snap.investments)}</span>
                                    </div>
                                    <div>
                                        <span className="text-finmind-muted block mb-0.5">INCOME</span>
                                        <span className="text-white font-bold text-sm">{fmt(snap.income)}</span>
                                    </div>
                                    <div>
                                        <span className="text-finmind-muted block mb-0.5">EXPENSES</span>
                                        <span className="text-white font-bold text-sm">{fmt(snap.expenses)}</span>
                                    </div>
                                    <div>
                                        <span className="text-finmind-muted block mb-0.5">SURPLUS</span>
                                        <span className={`font-bold text-sm ${m.surplus >= 0 ? 'text-finmind-success' : 'text-finmind-secondary'}`}>{fmt(m.surplus)}</span>
                                    </div>
                                </div>

                                {/* Extra info row */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/30">
                                    <div className="flex items-center space-x-3 text-xs">
                                        {snap.debt_interest_rate > 0 && (
                                            <span className="text-finmind-muted">
                                                Interest: <span className="text-finmind-secondary font-semibold">{snap.debt_interest_rate}%</span>
                                            </span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${risk.color}`}>
                                            {risk.label}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-finmind-muted">
                                        Runway: {m.runwayMonths}mo · Save {(m.savingsRate * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {snapshots.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 pt-8 pb-8">
                        <TrendingUp size={40} className="text-finmind-muted opacity-30" />
                        <p className="text-finmind-muted text-sm">No history yet. Save your first snapshot to start tracking.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;
