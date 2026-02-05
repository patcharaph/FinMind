import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useSnapshotStore } from "../store/useSnapshotStore";
import { safeNumber } from "../utils/format";
import { saveSnapshot } from "../api/finmind";

const steps = [
  {
    key: "cash",
    title: "Cash on hand",
    description: "Total liquid cash or checking balances right now.",
    placeholder: "1200"
  },
  {
    key: "debt",
    title: "Debt balance",
    description: "Credit cards, loans, and other outstanding balances.",
    placeholder: "5400"
  },
  {
    key: "investment",
    title: "Investments",
    description: "Retirement, brokerage, and other long-term holdings.",
    placeholder: "9800"
  },
  {
    key: "income",
    title: "Monthly income",
    description: "Average monthly income after tax.",
    placeholder: "4200"
  },
  {
    key: "expense",
    title: "Monthly expense",
    description: "Average monthly expenses and obligations.",
    placeholder: "3100"
  }
];

export default function Onboarding() {
  const { snapshot, setField, addToHistory } = useSnapshotStore();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const step = steps[index];
  const progress = useMemo(() => ((index + 1) / steps.length) * 100, [index]);

  const handleNext = () => setIndex((prev) => Math.min(prev + 1, steps.length - 1));
  const handleBack = () => setIndex((prev) => Math.max(prev - 1, 0));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const result = await saveSnapshot(snapshot);
      addToHistory({ ...result.latest, date: result.latest?.date || new Date().toISOString() });
      setSaved(true);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="fade-in">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-haze/70">60-second setup</p>
          <h1 className="mt-2 text-2xl font-display">Build your snapshot</h1>
        </div>
        <span className="text-sm text-haze/70">{index + 1}/{steps.length}</span>
      </header>

      <div className="mt-4 h-2 w-full rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-aqua" style={{ width: `${progress}%` }} />
      </div>

      <div className="glass-panel mt-6 rounded-3xl p-6">
        <h2 className="text-xl font-display">{step.title}</h2>
        <p className="mt-2 text-sm text-haze/70">{step.description}</p>
        <div className="mt-6">
          <label className="text-xs uppercase tracking-[0.2em] text-haze/60">Amount (USD)</label>
          <input
            type="number"
            inputMode="decimal"
            value={snapshot[step.key]}
            onChange={(event) => setField(step.key, safeNumber(event.target.value))}
            placeholder={step.placeholder}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none focus:border-aqua"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={index === 0}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-haze/80 disabled:opacity-40"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {index < steps.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 rounded-full bg-aqua px-5 py-2 text-sm font-semibold text-night"
          >
            Next
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-full bg-ember px-5 py-2 text-sm font-semibold text-white"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save snapshot"}
            <CheckCircle2 size={16} />
          </button>
        )}
      </div>

      {saved ? (
        <p className="mt-4 text-sm text-lime">Snapshot saved. Jump to Dashboard for insights.</p>
      ) : null}
    </section>
  );
}
