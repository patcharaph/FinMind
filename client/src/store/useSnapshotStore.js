import { create } from "zustand";

const emptySnapshot = {
  cash: 0,
  debt: 0,
  investment: 0,
  income: 0,
  expense: 0
};

export const useSnapshotStore = create((set) => ({
  snapshot: { ...emptySnapshot },
  history: [],
  setField: (field, value) =>
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        [field]: value
      }
    })),
  setSnapshot: (snapshot) => set({ snapshot: { ...snapshot } }),
  addToHistory: (entry) =>
    set((state) => ({ history: [entry, ...state.history].slice(0, 5) })),
  reset: () => set({ snapshot: { ...emptySnapshot } })
}));
