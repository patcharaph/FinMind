import { useState } from "react";
import { Home, Sparkles, ClipboardList } from "lucide-react";
import Onboarding from "./pages/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Advisor from "./pages/Advisor.jsx";

const tabs = [
  { key: "onboarding", label: "Setup", icon: ClipboardList },
  { key: "dashboard", label: "Snapshot", icon: Home },
  { key: "advisor", label: "Advisor", icon: Sparkles }
];

export default function App() {
  const [active, setActive] = useState("onboarding");

  return (
    <div className="app-shell text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-24 pt-8">
        {active === "onboarding" ? <Onboarding /> : null}
        {active === "dashboard" ? <Dashboard /> : null}
        {active === "advisor" ? <Advisor /> : null}
      </div>

      <nav className="bottom-nav fixed bottom-0 left-0 right-0 mx-auto flex max-w-md items-center justify-around px-6 py-4 text-xs uppercase tracking-[0.2em]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`flex flex-col items-center gap-1 ${isActive ? "text-aqua" : "text-haze/60"}`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
