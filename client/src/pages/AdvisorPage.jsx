import React, { useEffect } from 'react';
import useStore from '../store/useStore';
import { Sparkles, AlertTriangle, RefreshCw, Lightbulb, CheckCircle, Brain, ArrowRight, Shield, Droplets, Lock, Zap } from 'lucide-react';

const statusColor = (level) => {
    if (!level) return 'text-finmind-warning';
    const l = level.toLowerCase();
    if (['strong', 'low', 'wealth building', 'accumulating'].includes(l)) return 'text-finmind-success';
    if (['weak', 'high', 'liquidity crisis', 'debt danger'].includes(l)) return 'text-finmind-secondary';
    return 'text-finmind-warning';
};

const statusBg = (level) => {
    if (!level) return 'bg-finmind-warning/10 border-finmind-warning/30';
    const l = level.toLowerCase();
    if (['strong', 'low', 'wealth building', 'accumulating'].includes(l)) return 'bg-finmind-success/10 border-finmind-success/30';
    if (['weak', 'high', 'liquidity crisis', 'debt danger'].includes(l)) return 'bg-finmind-secondary/10 border-finmind-secondary/30';
    return 'bg-finmind-warning/10 border-finmind-warning/30';
};

const AdvisorPage = ({ onNavigate }) => {
    const snapshots = useStore((s) => s.snapshots);
    const advice = useStore((s) => s.advice);
    const adviceLoading = useStore((s) => s.adviceLoading);
    const error = useStore((s) => s.error);
    const limitReached = useStore((s) => s.limitReached);
    const usage = useStore((s) => s.usage);
    const generateAdvice = useStore((s) => s.generateAdvice);
    const fetchUsage = useStore((s) => s.fetchUsage);

    const current = snapshots[0];

    useEffect(() => {
        // Fetch usage on mount
        fetchUsage();
    }, []);

    useEffect(() => {
        if (current && !advice && !adviceLoading && !limitReached) {
            generateAdvice(current.id);
        }
    }, [current?.id]);

    const handleRefresh = () => {
        if (current) generateAdvice(current.id, true);
    };

    // Limit Reached UI
    if (limitReached) {
        return (
            <div className="flex flex-col items-center justify-center text-center space-y-6 animate-fade-in pt-12 pb-24">
                <div className="w-20 h-20 bg-gradient-to-br from-finmind-warning/20 to-finmind-secondary/20 rounded-2xl flex items-center justify-center">
                    <Lock size={36} className="text-finmind-warning" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">You've reached this month's AI advice limit.</h2>
                    <p className="text-finmind-muted text-sm">Upgrade to unlock unlimited insights.</p>
                </div>
                {usage && (
                    <div className="flex items-center space-x-2 text-xs text-finmind-muted">
                        <span className="px-3 py-1.5 bg-slate-800 rounded-full">
                            {usage.used}/{usage.limit} requests used today
                        </span>
                    </div>
                )}
                <button
                    className="flex items-center bg-gradient-to-r from-finmind-warning to-finmind-secondary text-slate-900 font-bold px-8 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(255,59,154,0.4)] transition-all"
                >
                    <Zap size={18} className="mr-2" /> Upgrade to Pro
                </button>
                <p className="text-finmind-muted text-xs opacity-50">
                    Your previous advice is still available in history.
                </p>
            </div>
        );
    }

    if (!current) {
        return (
            <div className="flex flex-col items-center justify-center text-center space-y-6 animate-fade-in pt-16 pb-24">
                <div className="w-20 h-20 bg-gradient-to-br from-finmind-secondary/20 to-finmind-primary/20 rounded-2xl flex items-center justify-center">
                    <Brain size={36} className="text-finmind-secondary" />
                </div>
                <h2 className="text-2xl font-bold text-white">No Data Yet</h2>
                <p className="text-finmind-muted max-w-xs text-sm">
                    Add your financial snapshot first, then the AI advisor can analyze your position.
                </p>
                <button
                    onClick={() => onNavigate('input')}
                    className="flex items-center bg-gradient-to-r from-finmind-primary to-finmind-secondary text-slate-900 font-bold px-8 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] transition-all"
                >
                    Add Data <ArrowRight className="ml-2" size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-in pb-24">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">AI Financial Advisor</h1>
                    <p className="text-sm text-finmind-muted mt-1">Powered by AI · Summarized data only</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={adviceLoading}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-finmind-primary hover:border-finmind-primary transition text-sm disabled:opacity-50"
                >
                    <RefreshCw size={16} className={adviceLoading ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* AI Usage Display */}
            {usage && (
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center space-x-2">
                        <Sparkles size={14} className="text-finmind-primary" />
                        <span className="text-xs text-finmind-muted">Daily AI Usage</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                            {[...Array(usage.limit)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${i < usage.used ? 'bg-finmind-primary' : 'bg-slate-600'}`}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-finmind-muted">
                            {usage.remaining}/{usage.limit} remaining
                        </span>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-start text-sm">
                    <AlertTriangle className="mr-3 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="font-semibold">Could not reach AI advisor</p>
                        <p className="text-red-400/70 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading */}
            {adviceLoading && (
                <div className="p-10 border border-finmind-primary/20 rounded-2xl bg-finmind-card/50 flex flex-col items-center justify-center space-y-5">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-finmind-primary/20 border-t-finmind-primary animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto text-finmind-primary" size={24} />
                    </div>
                    <div className="text-center">
                        <p className="text-finmind-primary font-semibold">Analyzing your finances...</p>
                        <p className="text-finmind-muted text-xs mt-1">This may take a few seconds</p>
                    </div>
                </div>
            )}

            {/* Advice Content */}
            {!adviceLoading && advice && (
                <div className="space-y-5">
                    {/* Financial Status Badge */}
                    {advice.financial_status && (
                        <div className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-semibold ${statusBg(advice.financial_status)} ${statusColor(advice.financial_status)}`}>
                            <Shield size={14} className="mr-2" />
                            {advice.financial_status}
                        </div>
                    )}

                    {/* Status Card */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-finmind-secondary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                        {/* Status Badges */}
                        <div className="flex space-x-3 mb-5">
                            <div className={`flex-1 px-4 py-3 rounded-xl border ${statusBg(advice.liquidity_label)}`}>
                                <div className="flex items-center space-x-1.5 mb-1">
                                    <Droplets size={12} className="text-finmind-muted" />
                                    <span className="text-[10px] text-finmind-muted font-bold uppercase tracking-wider">Liquidity</span>
                                </div>
                                <span className={`text-lg font-bold capitalize ${statusColor(advice.liquidity_label)}`}>
                                    {advice.liquidity_label || 'moderate'}
                                </span>
                            </div>
                            <div className={`flex-1 px-4 py-3 rounded-xl border ${statusBg(advice.risk_level)}`}>
                                <div className="flex items-center space-x-1.5 mb-1">
                                    <Shield size={12} className="text-finmind-muted" />
                                    <span className="text-[10px] text-finmind-muted font-bold uppercase tracking-wider">Risk</span>
                                </div>
                                <span className={`text-lg font-bold capitalize ${statusColor(advice.risk_level)}`}>
                                    {advice.risk_level || 'moderate'}
                                </span>
                            </div>
                        </div>

                        {/* Summary */}
                        <p className="text-slate-300 leading-relaxed text-sm relative z-10">
                            {advice.summary || 'No summary available.'}
                        </p>
                    </div>

                    {/* Key Insights */}
                    {advice.key_insights && advice.key_insights.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2 text-finmind-warning">
                                <Lightbulb size={16} />
                                <span className="text-xs font-bold tracking-widest uppercase">Key Insights</span>
                            </div>
                            {advice.key_insights.map((insight, i) => (
                                <div key={i} className="p-4 bg-finmind-card rounded-xl border border-slate-700/50 flex items-start space-x-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-finmind-warning/10 text-finmind-warning text-xs font-bold flex items-center justify-center">
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
                                <CheckCircle size={16} />
                                <span className="text-xs font-bold tracking-widest uppercase">Action Plan</span>
                            </div>
                            {advice.actionable_steps.map((step, i) => (
                                <div key={i} className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-finmind-primary/40 to-finmind-secondary/40 rounded-xl opacity-0 group-hover:opacity-100 transition duration-500 blur" />
                                    <div className="relative p-4 bg-finmind-card rounded-xl border border-slate-700/50 flex items-start space-x-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-finmind-success/10 text-finmind-success text-xs font-bold flex items-center justify-center">
                                            ✓
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
