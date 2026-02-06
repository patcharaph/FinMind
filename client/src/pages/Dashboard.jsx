import React from 'react';
import useStore from '../store/useStore';
import { Shield, AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react';

const Dashboard = () => {
    const { financials, advice, isLoading } = useStore();

    const netWorth = (parseFloat(financials.cash) + parseFloat(financials.investment)) - parseFloat(financials.debt);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Healthy': return 'text-finmind-success';
            case 'At Risk': return 'text-finmind-warning';
            case 'Critical': return 'text-finmind-danger';
            default: return 'text-gray-400';
        }
    };

    const StatusIcon = {
        'Healthy': CheckCircle,
        'At Risk': AlertTriangle,
        'Critical': Shield, // Or skull?
        'Unknown': RefreshCcw
    }[advice.status] || RefreshCcw;

    return (
        <div className="min-h-screen p-4 pb-20 fade-in">
            {/* Header */}
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold">Your Snapshot</h1>
                <div className={`text-sm font-bold ${getStatusColor(advice.status)} flex items-center gap-1`}>
                    <StatusIcon size={16} />
                    {advice.status}
                </div>
            </header>

            {/* Net Worth Card */}
            <div className="card mb-6 bg-gradient-to-br from-finmind-card to-slate-800">
                <p className="text-gray-400 text-sm mb-1">Net Worth</p>
                <div className="text-4xl font-bold text-white">
                    ${netWorth.toLocaleString()}
                </div>
            </div>

            {/* AI Insight */}
            <div className="card mb-6 border-l-4 border-finmind-accent">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <span className="text-2xl">🤖</span> Advisor Insight
                </h2>
                {isLoading ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    </div>
                ) : (
                    <p className="text-gray-300 italic">"{advice.insight}"</p>
                )}
            </div>

            {/* Action Plan */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4 text-finmind-success">Recommended Action</h2>
                {isLoading ? (
                    <div className="animate-pulse h-10 bg-gray-700 rounded"></div>
                ) : (
                    <div className="bg-green-900/20 p-4 rounded-lg border border-green-900/50">
                        <p className="text-green-100 font-medium">{advice.action}</p>
                    </div>
                )}
            </div>

            {/* Navigation (Simple) */}
            <nav className="fixed bottom-0 left-0 w-full bg-finmind-card border-t border-gray-800 p-4 flex justify-around">
                <button className="text-finmind-accent font-medium">Dashboard</button>
                <button className="text-gray-500" onClick={() => window.location.reload()}>Reset</button>
            </nav>
        </div>
    );
};

export default Dashboard;
