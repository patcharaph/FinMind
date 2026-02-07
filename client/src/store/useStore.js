import { create } from 'zustand';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Generate or retrieve device_id for user identification
const getDeviceId = () => {
    const STORAGE_KEY = 'finmind_device_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);
    if (!deviceId) {
        // Generate a unique device ID (UUID v4 format)
        deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem(STORAGE_KEY, deviceId);
    }
    return deviceId;
};

// Common headers for all API requests
const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Device-ID': getDeviceId(),
});

const useStore = create((set, get) => ({
    // --- State ---
    snapshots: [],
    advice: null,
    loading: false,
    adviceLoading: false,
    error: null,
    limitReached: false,
    usage: null,
    deviceId: getDeviceId(),

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
            const res = await fetch(`${API}/snapshots`, {
                headers: getHeaders(),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch');
            set({ snapshots: data.snapshots || [] });
        } catch (err) {
            set({ error: err.message });
        } finally {
            set({ loading: false });
        }
    },

    saveSnapshot: async ({ cash, investments, debt, debt_interest_rate, income, expenses, risk_level }) => {
        set({ loading: true, error: null });
        try {
            const market_date = new Date().toISOString().slice(0, 7); // YYYY-MM
            const res = await fetch(`${API}/snapshots`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    market_date,
                    cash: Number(cash) || 0,
                    investments: Number(investments) || 0,
                    debt: Number(debt) || 0,
                    debt_interest_rate: Number(debt_interest_rate) || 0,
                    income: Number(income) || 0,
                    expenses: Number(expenses) || 0,
                    risk_level: risk_level || 'moderate',
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
        set({ adviceLoading: true, error: null, limitReached: false });
        try {
            const res = await fetch(`${API}/advisor/generate`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ snapshot_id: snapshotId, force }),
            });
            const data = await res.json();
            
            // Handle limit reached (429)
            if (res.status === 429 && data.limit_reached) {
                set({ 
                    limitReached: true, 
                    usage: data.usage,
                    error: null,
                    advice: null,
                });
                return null;
            }
            
            if (!res.ok) throw new Error(data.error || 'Failed to get advice');
            set({ advice: data, usage: data.usage || null, limitReached: false });
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
