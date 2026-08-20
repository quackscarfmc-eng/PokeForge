"use client";

import { useAppStore, type ViewId } from "@/lib/store";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { DashboardView } from "@/components/modules/dashboard";
import { SpeciesView } from "@/components/modules/species/species-view";
import { MovesView } from "@/components/modules/moves/moves-view";
import { TypesView } from "@/components/modules/types/types-view";
import { AbilitiesView } from "@/components/modules/abilities/abilities-view";
import { ItemsView } from "@/components/modules/items/items-view";
import { StatusesView } from "@/components/modules/statuses/statuses-view";
import { EncountersView } from "@/components/modules/encounters/encounters-view";
import { TrainersView } from "@/components/modules/trainers/trainers-view";
import { EvolutionsView } from "@/components/modules/evolutions/evolutions-view";
import { CalculatorView } from "@/components/modules/calculator/calculator-view";
import { SafetyView } from "@/components/modules/safety/safety-view";
import { ExportView } from "@/components/modules/export/export-view";
import { SettingsView } from "@/components/modules/settings/settings-view";
import { ProjectPicker } from "@/components/app/project-picker";
import { CommandPalette } from "@/components/app/command-palette";

export default function Home() {
  const { currentProjectId, view, setView, _hasHydrated } = useAppStore();

  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 rounded-full border-t-4 border-primary pokeball-spin" />
            <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-background" />
          </div>
          <p className="text-sm text-muted-foreground">Loading PokéForge…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar current={view} onNavigate={setView} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto custom-scroll">
          {!currentProjectId ? (
            <ProjectPicker />
          ) : (
            <div key={view} className="animate-fade-in mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
              {view === "dashboard" && <DashboardView />}
              {view === "species" && <SpeciesView />}
              {view === "moves" && <MovesView />}
              {view === "types" && <TypesView />}
              {view === "abilities" && <AbilitiesView />}
              {view === "items" && <ItemsView />}
              {view === "statuses" && <StatusesView />}
              {view === "encounters" && <EncountersView />}
              {view === "trainers" && <TrainersView />}
              {view === "evolutions" && <EvolutionsView />}
              {view === "calculator" && <CalculatorView />}
              {view === "safety" && <SafetyView />}
              {view === "export" && <ExportView />}
              {view === "settings" && <SettingsView />}
            </div>
          )}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
