export default function MetricCard({ label, value, tone = "default", subtitle }) {
  const toneMap = {
    default: "border-white/10",
    positive: "border-lime/50",
    negative: "border-ember/60",
    info: "border-aqua/60"
  };

  return (
    <div className={`glass-panel rounded-2xl p-4 border ${toneMap[tone]}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-haze/70">{label}</p>
      <p className="mt-2 text-2xl font-display text-white">{value}</p>
      {subtitle ? <p className="mt-1 text-sm text-haze/70">{subtitle}</p> : null}
    </div>
  );
}
