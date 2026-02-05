import { useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { useSnapshotStore } from "../store/useSnapshotStore";
import { requestInsight } from "../api/finmind";

export default function Advisor() {
  const { snapshot, history } = useSnapshotStore();
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState(null);

  const handleInsight = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestInsight(snapshot);
      setInsight(data);
    } catch (err) {
      setError("Unable to fetch insight right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="fade-in">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-haze/70">Financial mirror</p>
          <h1 className="mt-2 text-2xl font-display">Advisor</h1>
        </div>
        <button
          type="button"
          onClick={handleInsight}
          className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-haze/80"
        >
          <Sparkles size={14} />
          {loading ? "Thinking" : "New insight"}
        </button>
      </header>

      <div className="mt-6 space-y-4">
        <div className="glass-panel rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <Bot className="text-aqua" size={18} />
            <p className="text-sm uppercase tracking-[0.2em] text-haze/70">Latest insight</p>
          </div>
          {insight ? (
            <div className="mt-4 space-y-3 text-sm text-haze/80">
              <p><span className="text-white">Status:</span> {insight.status}</p>
              <p><span className="text-white">Insight:</span> {insight.insight}</p>
              <p><span className="text-white">Action:</span> {insight.action}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-haze/70">Generate an insight to see your next move.</p>
          )}
          {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
        </div>

        <div className="glass-panel rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-haze/60">Recent snapshots</p>
          <div className="mt-3 space-y-2 text-sm text-haze/70">
            {history.length === 0 ? (
              <p>No saved snapshots yet.</p>
            ) : (
              history.map((entry) => (
                <div key={entry.id || entry.date} className="flex items-center justify-between">
                  <span>{new Date(entry.date).toLocaleDateString()}</span>
                  <span className="text-white">${Math.round(entry.cash + entry.investment - entry.debt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
