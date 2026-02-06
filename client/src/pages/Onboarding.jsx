import React, { useState } from 'react';
import useStore from '../store/useStore';
import { ArrowRight, DollarSign, Briefcase, TrendingUp } from 'lucide-react';

const Onboarding = ({ onComplete }) => {
    const { financials, updateFinancial, saveSnapshot, getAdvice } = useStore();
    const [step, setStep] = useState(0);

    const steps = [
        { key: 'cash', label: 'Cash on Hand', icon: DollarSign, placeholder: 'e.g. 5000' },
        { key: 'debt', label: 'Total Debt', icon: Briefcase, placeholder: 'e.g. 2000' },
        { key: 'investment', label: 'Investments', icon: TrendingUp, placeholder: 'e.g. 10000' },
        { key: 'income', label: 'Monthly Income', icon: DollarSign, placeholder: 'e.g. 4000' },
        { key: 'expense', label: 'Monthly Expenses', icon: DollarSign, placeholder: 'e.g. 3000' },
    ];

    const currentStep = steps[step];

    const handleNext = async (e) => {
        e.preventDefault();
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            // Finish
            const id = await saveSnapshot();
            if (id) {
                // Trigger advice generation in background
                getAdvice(id);
                onComplete();
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold mb-2 text-finmind-accent">FinMind</h1>
                    <p className="text-gray-400">Step {step + 1} of {steps.length}</p>
                </div>

                <form onSubmit={handleNext} className="card">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        {currentStep.label}
                    </label>
                    <div className="relative mb-6">
                        <currentStep.icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            type="number"
                            value={financials[currentStep.key]}
                            onChange={(e) => updateFinancial(currentStep.key, e.target.value)}
                            placeholder={currentStep.placeholder}
                            className="input-field pl-10 text-xl"
                            autoFocus
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary flex items-center justify-center gap-2">
                        {step === steps.length - 1 ? 'Get Insights' : 'Next'}
                        <ArrowRight size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Onboarding;
