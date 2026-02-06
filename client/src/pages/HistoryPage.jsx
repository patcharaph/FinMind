import React from 'react';
import useStore from '../store/useStore';
import HistoryChart from '../components/HistoryChart';

const fmt = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

const HistoryPage = () => {
    const snapshots = useStore((s) => s.snapshots);

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            <div>
                <h1 className="text-3xl font-bold text-white">Snapshot History</h1>
                <p className="text-finmind-muted text-sm mt-1">{snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} recorded</p>
            </div>

            <HistoryChart data={snapshots} />

            <div className="space-y-4">
                {snapshots.map((snap) => {
                    const m = snap.metrics;
                    return (
                        <div key={snap.id} className="bg-finmind-card p-4 rounded-xl border border-slate-700/50 group hover:border-finmind-primary/30 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div className="font-bold text-white text-lg">{snap.market_date}</div>
                                <div className="font-bold text-xl text-white">— {fmt(m.netWorth)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                                <div>
                                    <span className="text-finmind-muted">CASH</span>
                                    <div className="text-finmind-primary font-bold">{fmt(snap.cash)}</div>
                                </div>
                                <div>
                                    <span className="text-finmind-muted">DEBT</span>
                                    <div className="text-finmind-secondary font-bold">{fmt(snap.debt)}</div>
                                </div>
                                <div>
                                    <span className="text-finmind-muted">INVESTMENTS</span>
                                    <div className="text-finmind-warning font-bold">{fmt(snap.investments)}</div>
                                </div>
                                <div>
                                    <span className="text-finmind-muted">SURPLUS</span>
                                    <div className={`font-bold ${m.surplus >= 0 ? 'text-finmind-success' : 'text-finmind-secondary'}`}>{fmt(m.surplus)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {snapshots.length === 0 && (
                    <div className="text-center text-finmind-muted p-8">No history yet.</div>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;
