import React, { useState } from 'react';
import useStore from '../store/useStore';
import { Wallet, TrendingUp, TrendingDown, CreditCard, BarChart3, Save, ShieldCheck, Eraser, Percent, ChevronDown, Home, Package, Clock, Calendar } from 'lucide-react';

const CurrencyInput = ({ label, icon: Icon, value, onChange }) => (
    <div className="bg-finmind-card rounded-2xl border border-slate-700/50 p-4">
        <div className="flex items-center space-x-2 mb-3">
            <Icon size={16} className="text-finmind-muted" />
            <span className="text-xs font-bold text-finmind-muted uppercase tracking-wide">{label}</span>
        </div>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-finmind-muted">
                <span className="text-lg">$</span>
            </div>
            <input
                type="number"
                inputMode="numeric"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="block w-full pl-8 pr-3 py-4 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-finmind-primary focus:border-transparent text-white text-xl placeholder-slate-500 transition-all outline-none"
                placeholder="0"
            />
        </div>
    </div>
);

const PercentInput = ({ label, icon: Icon, value, onChange }) => (
    <div className="bg-finmind-card rounded-2xl border border-slate-700/50 p-4">
        <div className="flex items-center space-x-2 mb-3">
            <Icon size={16} className="text-finmind-muted" />
            <span className="text-xs font-bold text-finmind-muted uppercase tracking-wide">{label}</span>
        </div>
        <div className="relative">
            <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="block w-full pl-4 pr-10 py-4 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-finmind-primary focus:border-transparent text-white text-xl placeholder-slate-500 transition-all outline-none"
                placeholder="0"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-finmind-muted">
                <span className="text-lg">%</span>
            </div>
        </div>
    </div>
);

const RISK_OPTIONS = [
    { value: 'conservative', label: 'Conservative — Low Risk' },
    { value: 'moderate', label: 'Medium — Balanced Mix' },
    { value: 'aggressive', label: 'Aggressive — High Growth' },
];

const RiskSelect = ({ value, onChange }) => (
    <div className="bg-finmind-card rounded-2xl border border-slate-700/50 p-4">
        <div className="flex items-center space-x-2 mb-3">
            <TrendingUp size={16} className="text-finmind-muted" />
            <span className="text-xs font-bold text-finmind-muted uppercase tracking-wide">Investment Risk Level</span>
        </div>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="block w-full appearance-none pl-4 pr-10 py-4 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-finmind-primary focus:border-transparent text-white text-base transition-all outline-none cursor-pointer"
            >
                {RISK_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-finmind-muted">
                <ChevronDown size={18} />
            </div>
        </div>
    </div>
);

const InputPage = ({ onNavigate }) => {
    const saveSnapshot = useStore((s) => s.saveSnapshot);
    const loading = useStore((s) => s.loading);
    const snapshots = useStore((s) => s.snapshots);
    const current = snapshots[0];

    const [form, setForm] = useState({
        // Assets
        cash_savings: current?.cash_savings?.toString() || current?.cash?.toString() || '',
        investments: current?.investments?.toString() || '',
        personal_assets: current?.personal_assets?.toString() || '',
        other_assets: current?.other_assets?.toString() || '',
        // Liabilities
        short_term_debt: current?.short_term_debt?.toString() || current?.debt?.toString() || '',
        long_term_debt: current?.long_term_debt?.toString() || '',
        debt_interest_rate: current?.debt_interest_rate?.toString() || '',
        // Cash flow
        income: current?.income?.toString() || '',
        expenses: current?.expenses?.toString() || '',
        // Settings
        risk_level: current?.risk_level || 'moderate',
        age: current?.age?.toString() || '',
    });
    const [saved, setSaved] = useState(false);

    const update = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleClear = () => {
        setForm({
            cash_savings: '', investments: '', personal_assets: '', other_assets: '',
            short_term_debt: '', long_term_debt: '', debt_interest_rate: '',
            income: '', expenses: '', risk_level: 'moderate', age: ''
        });
        setSaved(false);
    };

    const handleSubmit = async () => {
        setSaved(false);
        const result = await saveSnapshot(form);
        if (result) {
            setSaved(true);
            setTimeout(() => onNavigate('dashboard'), 800);
        }
    };

    return (
        <div className="space-y-4 animate-fade-in pb-24">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Financial Data</h1>
                <p className="text-finmind-muted text-sm">Enter your current financial position. All data stays private.</p>
            </div>

            {/* Privacy Badge */}
            <div className="flex items-center space-x-3 bg-finmind-card/50 rounded-xl p-3 border border-slate-700/30">
                <ShieldCheck size={18} className="text-finmind-success flex-shrink-0" />
                <span className="text-xs text-finmind-muted">No login · No email · No tracking · AI only sees summarized data</span>
            </div>

            {/* Personal Section */}
            <div className="pt-2">
                <CurrencyInput label="Age" icon={Clock} value={form.age} onChange={update('age')} />
            </div>

            {/* Assets Section */}
            <div className="pt-2">
                <h2 className="text-sm font-bold text-finmind-primary uppercase tracking-wider mb-3">Assets</h2>
                <div className="space-y-3">
                    <CurrencyInput label="Cash & Savings" icon={Wallet} value={form.cash_savings} onChange={update('cash_savings')} />
                    <CurrencyInput label="Investments" icon={BarChart3} value={form.investments} onChange={update('investments')} />
                    <CurrencyInput label="Personal Assets (Home, Car)" icon={Home} value={form.personal_assets} onChange={update('personal_assets')} />
                    <CurrencyInput label="Other Assets" icon={Package} value={form.other_assets} onChange={update('other_assets')} />
                </div>
            </div>

            {/* Liabilities Section */}
            <div className="pt-2">
                <h2 className="text-sm font-bold text-finmind-secondary uppercase tracking-wider mb-3">Liabilities</h2>
                <div className="space-y-3">
                    <CurrencyInput label="Short-term Debt" icon={Clock} value={form.short_term_debt} onChange={update('short_term_debt')} />
                    <CurrencyInput label="Long-term Debt" icon={Calendar} value={form.long_term_debt} onChange={update('long_term_debt')} />
                    <PercentInput label="Avg Debt Interest Rate" icon={Percent} value={form.debt_interest_rate} onChange={update('debt_interest_rate')} />
                </div>
            </div>

            {/* Cash Flow Section */}
            <div className="pt-2">
                <h2 className="text-sm font-bold text-finmind-success uppercase tracking-wider mb-3">Monthly Cash Flow</h2>
                <div className="space-y-3">
                    <CurrencyInput label="Monthly Income" icon={TrendingUp} value={form.income} onChange={update('income')} />
                    <CurrencyInput label="Monthly Expenses" icon={TrendingDown} value={form.expenses} onChange={update('expenses')} />
                </div>
            </div>

            {/* Settings Section */}
            <div className="pt-2">
                <RiskSelect value={form.risk_level} onChange={update('risk_level')} />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={handleClear}
                    className="flex-1 flex items-center justify-center bg-slate-800 text-finmind-muted font-semibold rounded-xl px-6 py-4 text-base border border-slate-700 hover:border-finmind-danger hover:text-finmind-danger transition-all"
                >
                    <Eraser className="mr-2" size={18} /> Clear
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-[2] flex items-center justify-center bg-gradient-to-r from-finmind-primary to-finmind-secondary text-slate-900 font-bold rounded-xl px-8 py-4 text-lg shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                    {loading ? 'Saving...' : saved ? '✓ Saved!' : <><Save className="mr-2" size={20} /> Save Financial Snapshot</>}
                </button>
            </div>
        </div>
    );
};

export default InputPage;
