import { useEffect, useState } from "react";
import { TrendingUp, Wallet, Flame, ShieldCheck } from "lucide-react";
import MetricCard from "../components/MetricCard";
import { useSnapshotStore } from "../store/useSnapshotStore";
import { formatCurrency } from "../utils/format";
import { fetchLatestSnapshot } from "../api/finmind";

export default function Dashboard() {
  const { snapshot, setSnapshot } = useSnapshotStore();
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const load = async () => {
      setStatus("loading");
      try {
        const data = await fetchLatestSnapshot();
        if (data?.latest) {
          setSnapshot(data.latest);
        }
        setStatus("ready");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    };
    load();
  }, [setSnapshot]);

  const netWorth = snapshot.cash + snapshot.investment - snapshot.debt;
  const runway = snapshot.expense > 0 ? snapshot.cash / snapshot.expense : 0;
  const savingsRate = snapshot.income > 0 ? ((snapshot.income - snapshot.expense) / snapshot.income) * 100 : 0;

  return (
    <section className="fade-in">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-haze/70">Financial source of truth</p>
          <h1 className="mt-2 text-2xl font-display">Snapshot</h1>
        </div>
        <span className="text-xs text-haze/70">{status === "loading" ? "Syncing" : "Live"}</span>
      </header>

      <div className="mt-6 grid gap-4">
        <MetricCard
          label="Net worth"
          value={formatCurrency(netWorth)}
          tone={netWorth >= 0 ? "positive" : "negative"}
          subtitle="Cash + Investments - Debt"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            label="Liquidity"
            value={`${runway.toFixed(1)} months`}
            tone="info"
            subtitle="Cash runway vs. monthly expense"
          />
          <MetricCard
            label="Savings rate"
            value={`${Math.max(0, savingsRate).toFixed(0)}%`}
            tone={savingsRate >= 20 ? "positive" : "default"}
            subtitle="Income minus expense"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <div className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Wallet className="text-aqua" size={20} />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-haze/60">Cash</p>
              <p className="font-display text-lg">{formatCurrency(snapshot.cash)}</p>
            </div>
          </div>
          <TrendingUp className="text-lime" size={18} />
        </div>
        <div className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Flame className="text-ember" size={20} />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-haze/60">Debt</p>
              <p className="font-display text-lg">{formatCurrency(snapshot.debt)}</p>
            </div>
          </div>
          <ShieldCheck className="text-haze/60" size={18} />
        </div>
      </div>
    </section>
  );
}
