import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Save, DollarSign, Wallet, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';

const InputField = ({ label, value, onChange, icon: Icon }) => (
    <div className="mb-4">
        <label className="block text-sm font-semibold text-finmind-muted mb-2 uppercase tracking-wide">
            {label}
        </label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-finmind-muted">
                {Icon ? <Icon size={18} /> : <DollarSign size={18} />}
            </div>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="block w-full pl-10 pr-3 py-4 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-finmind-primary focus:border-transparent text-white text-lg placeholder-slate-500 transition-all outline-none"
                placeholder="0"
            />
        </div>
    </div>
);

const Wizard = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        cash: '',
        savings: '', // Optional separation, we might merge in UI or keep distinct
        income: '',
        expenses: '',
        debt: '',
        investments: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalSteps = 4;

    const handleChange = (field) => (value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        if (step < totalSteps) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Calculate Savings vs Cash appropriately or just send as is
            // Current API expects: cash, savings, investments, debt, income, expenses
            // We'll treat "Cash & Savings" in UI as just Cash for simplicity, or sum them if user splits.
            // Let's assume UI asks for Total Liquid Cash (Cash + Savings)

            const payload = {
                user_id: 1,
                market_date: new Date().toISOString().slice(0, 7), // YYYY-MM
                cash: Number(formData.cash) + Number(formData.savings || 0), // Sum if both exist
                investment: Number(formData.investments),
                debt: Number(formData.debt),
                income: Number(formData.income),
                expense: Number(formData.expenses)
                // Note: API expects 'investment' singular based on index.js, checking...
                // index.js: "const { cash, debt, investment, income, expense } = req.body;"
                // wait, my db.js uses 'investments' (plural) and index.js uses 'investment' (singular) or 'investments'?
                // Let's check index.js ... 
                // It extracts: const { user_id, market_date, cash, savings, investments, debt, income, expenses } = req.body;
                // and db.createSnapshot arguments match.
                // Good.
            };

            const response = await fetch('http://localhost:3000/api/snapshots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    investments: Number(formData.investments),
                    expenses: Number(formData.expenses)
                })
            });

            const data = await response.json();
            if (data.success) {
                if (onComplete) onComplete();
            } else {
                alert('Error saving data: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to connect to server');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full justify-between py-6">
            <div className="flex-1">
                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-1 mb-8 rounded-full overflow-hidden">
                    <div
                        className="bg-finmind-primary h-full transition-all duration-300 ease-out"
                        style={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                </div>

                {/* Steps */}
                <div className="space-y-6">
                    {step === 1 && (
                        <div className="animate-fade-in-up">
                            <h2 className="text-2xl font-bold mb-2">Liquid Assets</h2>
                            <p className="text-finmind-muted mb-6">Cash on hand, checking accounts, and emergency funds.</p>
                            <InputField
                                label="Cash & Savings"
                                icon={Wallet}
                                value={formData.cash}
                                onChange={handleChange('cash')}
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-fade-in-up">
                            <h2 className="text-2xl font-bold mb-2">Monthly Flow</h2>
                            <p className="text-finmind-muted mb-6">Your average monthly money in vs. money out.</p>
                            <InputField
                                label="Monthly Income"
                                icon={TrendingUp}
                                value={formData.income}
                                onChange={handleChange('income')}
                            />
                            <InputField
                                label="Monthly Expenses"
                                icon={TrendingDown}
                                value={formData.expenses}
                                onChange={handleChange('expenses')}
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-fade-in-up">
                            <h2 className="text-2xl font-bold mb-2">Liabilities</h2>
                            <p className="text-finmind-muted mb-6">Total outstanding debt (Credit cards, loans, etc).</p>
                            <InputField
                                label="Total Outstanding Debt"
                                icon={CreditCard}
                                value={formData.debt}
                                onChange={handleChange('debt')}
                            />
                        </div>
                    )}

                    {step === 4 && (
                        <div className="animate-fade-in-up">
                            <h2 className="text-2xl font-bold mb-2">Assets</h2>
                            <p className="text-finmind-muted mb-6">Investments, crypto, retirement accounts.</p>
                            <InputField
                                label="Investment Portfolio Value"
                                icon={TrendingUp}
                                value={formData.investments}
                                onChange={handleChange('investments')}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
                {step > 1 ? (
                    <button
                        onClick={handleBack}
                        className="flex items-center text-finmind-muted hover:text-white px-4 py-2"
                    >
                        <ArrowLeft className="mr-2" size={20} /> Back
                    </button>
                ) : <div />}

                {step < totalSteps ? (
                    <button
                        onClick={handleNext}
                        className="flex items-center justify-center bg-white text-slate-900 font-bold rounded-xl px-6 py-3 hover:bg-slate-200 transition-colors"
                    >
                        Next <ArrowRight className="ml-2" size={20} />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center justify-center bg-finmind-primary text-slate-900 font-bold rounded-xl px-8 py-3 hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : 'Complete Snapshot'}
                        {!isSubmitting && <Save className="ml-2" size={20} />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Wizard;
