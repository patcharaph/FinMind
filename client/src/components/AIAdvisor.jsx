import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const AIAdvisor = ({ snapshotId }) => {
    const [advice, setAdvice] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchAdvice = async () => {
        if (!snapshotId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('http://localhost:3000/api/advisor/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snapshot_id: snapshotId })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setAdvice(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch if no advice exists?? Maybe manual is better to save tokens.
    // User requested "AI Advisor Engine", let's make it manual or auto? 
    // Let's make it manual trigger or auto on mount if we want immediate value.
    // Let's do manual trigger if null, or auto if snapshotId changed.

    // For now, let's just show a "Generate Advice" button if no advice, or auto fetch.
    // Let's auto fetch for smooth UX.
    useEffect(() => {
        if (snapshotId && !advice) {
            // fetchAdvice(); // Uncomment to auto-fetch
        }
    }, [snapshotId]);

    if (!snapshotId) {
        return (
            <div className="text-center p-8 text-finmind-muted">
                No snapshot data found. Please add data first.
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-finmind-primary to-finmind-secondary bg-clip-text text-transparent">
                    AI Financial Advisor
                </h2>
                <button
                    onClick={fetchAdvice}
                    disabled={loading}
                    className="p-2 rounded-lg bg-slate-800 text-finmind-primary hover:bg-slate-700 transition"
                >
                    {loading ? <RefreshCw className="animate-spin" /> : "Refresh Advice"}
                </button>
            </div>

            <p className="text-sm text-finmind-muted">
                Powered by AI · Summarized data only
            </p>

            {error && (
                <div className="p-4 bg-red-500/10 border border-finmind-danger rounded-xl text-finmind-danger flex items-center">
                    <AlertTriangle className="mr-3" />
                    {error}
                </div>
            )}

            {loading && (
                <div className="p-8 border border-finmind-primary/30 rounded-2xl bg-finmind-card/50 flex flex-col items-center justify-center space-y-4 animate-pulse">
                    <Sparkles className="text-finmind-primary w-12 h-12 animate-bounce" />
                    <p className="text-finmind-primary font-medium">Analyzing wealth structures...</p>
                </div>
            )}

            {!loading && advice && (
                <div className="space-y-4">
                    {/* Financial Status Card */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-finmind-secondary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <div className="flex items-center space-x-2 text-finmind-secondary mb-4">
                            <AlertTriangle size={20} />
                            <span className="text-xs font-bold tracking-widest uppercase">Financial Status</span>
                        </div>

                        <div className="flex space-x-4 mb-6">
                            <div className="px-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700">
                                <span className="text-xs text-finmind-muted block">LIQUIDITY</span>
                                <span className="text-lg font-bold text-finmind-warning capitalize">{advice.financial_status || 'Analyzing...'}</span>
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700">
                                <span className="text-xs text-finmind-muted block">RISK</span>
                                <span className="text-lg font-bold text-finmind-warning capitalize">{advice.risk_score || 'Medium'}</span>
                            </div>
                        </div>

                        <p className="text-slate-300 leading-relaxed">
                            {advice.insight || "Your financials look good, but there is room for optimization."}
                        </p>
                    </div>

                    {/* Actionable Step */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-finmind-primary to-finmind-secondary rounded-2xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 blur"></div>
                        <div className="relative p-6 bg-slate-900 rounded-2xl ring-1 ring-white/10">
                            <div className="flex items-start space-x-4">
                                <div className="p-2 bg-finmind-primary/10 rounded-lg text-finmind-primary mt-1">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-finmind-primary mb-1">Recommended Action</h3>
                                    <p className="text-slate-300">
                                        {advice.actionable_step}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIAdvisor;
