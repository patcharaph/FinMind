import React from 'react';
import { Wallet } from 'lucide-react';

const NetWorthCard = ({ cash, investments, debt }) => {
    const netWorth = (cash + investments) - debt;
    const isPositive = netWorth >= 0;

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(val);
    };

    return (
        <div className="relative p-6 rounded-2xl bg-finmind-card border border-slate-700/50 shadow-lg overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-finmind-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold tracking-wider text-finmind-muted uppercase">
                        Net Worth
                    </h2>
                    <div className="p-2 rounded-full bg-slate-800/50 text-finmind-primary">
                        <Wallet size={18} />
                    </div>
                </div>

                <div className="flex items-baseline space-x-2">
                    <span className={`text-4xl font-bold tracking-tight drop-shadow-[0_0_15px_rgba(0,243,255,0.3)] ${isPositive ? 'text-finmind-primary' : 'text-finmind-secondary'
                        }`}>
                        {formatCurrency(netWorth)}
                    </span>
                </div>

                <div className="mt-4 flex items-center space-x-2 text-xs text-finmind-muted">
                    <span className={`${isPositive ? 'text-finmind-success' : 'text-finmind-secondary'}`}>
                        {isPositive ? '↑' : '↓'} 0.0%
                    </span>
                    <span>vs last month</span>
                </div>
            </div>
        </div>
    );
};

export default NetWorthCard;
