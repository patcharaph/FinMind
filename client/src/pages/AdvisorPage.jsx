import React, { useEffect } from 'react';
import useStore from '../store/useStore';
import { Sparkles, AlertTriangle, RefreshCw, Lightbulb, CheckCircle } from 'lucide-react';

const AdvisorPage = () => {
    const snapshots = useStore((s) => s.snapshots);
    const advice = useStore((s) => s.advice);
    const adviceLoading = useStore((s) => s.adviceLoading);
    const error = useStore((s) => s.error);
    const generateAdvice = useStore((s) => s.generateAdvice);

    const current = snapshots[0];

    useEffect(() => {
        if (current && !advice && !adviceLoading) {
            generateAdvice(current.id);
        }
    }, [current?.id]);

    const handleRefresh = () => {
        if (current) generateAdvice(current.id, true);
    };

    if (!current) {
        return (
            <div className="text-center p-8 text-finmind-muted animate-fade-in">
                No snapshot data found. Please add data first.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">AI Financial Advisor</h1>
                    <p className="text-sm text-finmind-muted mt-1">Powered by AI · Summarized data only</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={adviceLoading}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 text-finmind-primary hover:bg-slate-700 transition text-sm"
                >
                    <RefreshCw size={16} className={adviceLoading ? 'animate-spin' : ''} />
                    <span>Refresh Advice</span>
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-finmind-secondary/50 rounded-xl text-finmind-secondary flex items-center text-sm">
                    <AlertTriangle className="mr-3 flex-shrink-0" size={18} />
                    {error}
                </div>
            )}

            {/* Loading */}
            {adviceLoading && (
                <div className="p-8 border border-finmind-primary/30 rounded-2xl bg-finmind-card/50 flex flex-col items-center justify-center space-y-4 animate-pulse">
                    <Sparkles className="text-finmind-primary w-12 h-12 animate-bounce" />
                    <p className="text-finmind-primary font-medium">Analyzing wealth structures...</p>
                </div>
            )}

            {/* Advice Content */}
            {!adviceLoading && advice && (
                <div className="space-y-4">
                    {/* Financial Status Card */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-finmind-secondary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <div className="flex items-center space-x-2 text-finmind-secondary mb-4">
                            <AlertTriangle size={18} />
                            <span className="text-xs font-bold tracking-widest uppercase">Financial Status</span>
                        </div>

                        {/* Status Badges */}
                        <div className="flex space-x-3 mb-5">
                            <div className="px-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700">
                                <span className="text-xs text-finmind-muted block">LIQUIDITY</span>
                                <span className="text-lg font-bold text-finmind-warning capitalize">
                                    {advice.liquidity_label || 'moderate'}
                                </span>
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700">
                                <span className="text-xs text-finmind-muted block">RISK</span>
                                <span className="text-lg font-bold text-finmind-warning capitalize">
                                    {advice.risk_level || 'moderate'}
                                </span>
                            </div>
                        </div>

                        {/* Summary */}
                        <p className="text-slate-300 leading-relaxed text-sm">
                            {advice.summary || 'No summary available.'}
                        </p>
                    </div>

                    {/* Key Insights */}
                    {advice.key_insights && advice.key_insights.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2 text-finmind-warning">
                                <Lightbulb size={18} />
                                <span className="text-xs font-bold tracking-widest uppercase">Key Insights</span>
                            </div>
                            {advice.key_insights.map((insight, i) => (
                                <div key={i} className="p-4 bg-finmind-card rounded-xl border border-slate-700/50 flex items-start space-x-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-md bg-finmind-primary/10 text-finmind-primary text-xs font-bold flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                    <p className="text-slate-300 text-sm leading-relaxed">{insight}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actionable Steps */}
                    {advice.actionable_steps && advice.actionable_steps.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2 text-finmind-success">
                                <CheckCircle size={18} />
                                <span className="text-xs font-bold tracking-widest uppercase">Actionable Steps</span>
                            </div>
                            {advice.actionable_steps.map((step, i) => (
                                <div key={i} className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-finmind-primary to-finmind-secondary rounded-xl opacity-30 group-hover:opacity-60 transition duration-500 blur" />
                                    <div className="relative p-4 bg-slate-900 rounded-xl ring-1 ring-white/10 flex items-start space-x-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-md bg-finmind-success/10 text-finmind-success text-xs font-bold flex items-center justify-center">
                                            {i + 1}
                                        </span>
                                        <p className="text-slate-300 text-sm leading-relaxed">{step}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdvisorPage;
