"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

// This hook integrates the Next.js app with the Electron desktop shell.
// It listens for menu events sent from the Electron main process via IPC
// and maps them to app actions (navigation, build checks, etc.)

interface PokeForgeDesktop {
  isElectron: boolean;
  onMenuNavigate?: (callback: (view: string) => void) => void;
  onMenuImportProject?: (callback: () => void) => void;
  onMenuBuildCheck?: (callback: () => void) => void;
  onMenuBackup?: (callback: () => void) => void;
  onMenuNewProject?: (callback: () => void) => void;
}

export function useDesktopIntegration() {
  const { setView, currentProjectId } = useAppStore();

  useEffect(() => {
    // Check if running in Electron
    const pokeforge = (typeof window !== "undefined"
      ? (window as unknown as { pokeforge?: PokeForgeDesktop }).pokeforge
      : undefined);

    if (!pokeforge?.isElectron) return;

    // Listen for menu navigation events
    pokeforge.onMenuNavigate?.((view: string) => {
      const validViews = [
        "dashboard", "species", "moves", "types", "abilities", "items",
        "statuses", "encounters", "trainers", "evolutions", "comparer",
        "calculator", "safety", "export", "settings",
      ];
      if (validViews.includes(view) && currentProjectId) {
        setView(view as never);
      }
    });

    // Listen for import project menu
    pokeforge.onMenuImportProject?.(() => {
      if (currentProjectId) {
        setView("dashboard");
        // The dashboard's ImportProjectButton is visible there
      }
    });

    // Listen for build check menu
    pokeforge.onMenuBuildCheck?.(() => {
      if (currentProjectId) {
        setView("safety");
      }
    });

    // Listen for backup menu
    pokeforge.onMenuBackup?.(() => {
      if (currentProjectId) {
        setView("safety");
      }
    });
  }, [setView, currentProjectId]);
}

export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as { pokeforge?: PokeForgeDesktop }).pokeforge?.isElectron;
}
