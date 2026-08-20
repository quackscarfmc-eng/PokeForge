"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewId =
  | "dashboard"
  | "species"
  | "moves"
  | "types"
  | "abilities"
  | "items"
  | "statuses"
  | "encounters"
  | "trainers"
  | "evolutions"
  | "comparer"
  | "calculator"
  | "safety"
  | "export"
  | "settings";

interface AppState {
  currentProjectId: string | null;
  view: ViewId;
  _hasHydrated: boolean;
  setProject: (id: string | null) => void;
  setView: (v: ViewId) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentProjectId: null,
      view: "dashboard",
      _hasHydrated: false,
      setProject: (id) => set({ currentProjectId: id, view: "dashboard" }),
      setView: (v) => set({ view: v }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "pokeforge-state",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
