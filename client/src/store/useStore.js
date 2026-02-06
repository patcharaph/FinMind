import { create } from 'zustand';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const useStore = create((set, get) => ({
    // --- State ---
    snapshots: [],
    advice: null,
    loading: false,
    adviceLoading: false,
    error: null,

    // --- Derived (computed from snapshots) ---
    get currentSnapshot() {
        return get().snapshots[0] || null;
    },
    get previousSnapshot() {
        return get().snapshots[1] || null;
    },

    // --- Actions ---

    fetchSnapshots: async () => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`${API}/snapshots`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch');
            set({ snapshots: data.snapshots || [] });
        } catch (err) {
            set({ error: err.message });
        } finally {
            set({ loading: false });
        }
    },

    saveSnapshot: async ({ cash, investments, debt, income, expenses }) => {
        set({ loading: true, error: null });
        try {
            const market_date = new Date().toISOString().slice(0, 7); // YYYY-MM
            const res = await fetch(`${API}/snapshots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: 1,
                    market_date,
                    cash: Number(cash) || 0,
                    investments: Number(investments) || 0,
                    debt: Number(debt) || 0,
                    income: Number(income) || 0,
                    expenses: Number(expenses) || 0,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            // Refresh all snapshots after save
            await get().fetchSnapshots();
            return data.snapshot;
        } catch (err) {
            set({ error: err.message });
            return null;
        } finally {
            set({ loading: false });
        }
    },

    generateAdvice: async (snapshotId, force = false) => {
        set({ adviceLoading: true, error: null });
        try {
            const res = await fetch(`${API}/advisor/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snapshot_id: snapshotId, user_id: 1, force }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to get advice');
            set({ advice: data });
            return data;
        } catch (err) {
            set({ error: err.message });
            set({
                advice: {
                    financial_status: 'Error',
                    risk_level: 'Unknown',
                    liquidity_label: 'unknown',
                    summary: 'Could not reach the AI advisor. Please try again.',
                    key_insights: [],
                    actionable_steps: [],
                },
            });
            return null;
        } finally {
            set({ adviceLoading: false });
        }
    },

    clearError: () => set({ error: null }),
}));

export default useStore;
