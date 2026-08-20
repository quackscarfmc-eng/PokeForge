"use client";

import { useAppStore, type ViewId } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Flame,
  Swords,
  Shapes,
  Sparkles,
  Backpack,
  HeartCrack,
  ShieldCheck,
  Package,
  Settings,
  MapPin,
  Users,
} from "lucide-react";
import { PokeballIcon } from "@/components/app/pokeball-icon";

const NAV: { id: ViewId; label: string; icon: typeof Flame; group: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { id: "species", label: "Pokémon", icon: Flame, group: "Content" },
  { id: "moves", label: "Moves", icon: Swords, group: "Content" },
  { id: "types", label: "Types", icon: Shapes, group: "Content" },
  { id: "abilities", label: "Abilities", icon: Sparkles, group: "Content" },
  { id: "items", label: "Items", icon: Backpack, group: "Content" },
  { id: "statuses", label: "Status", icon: HeartCrack, group: "Content" },
  { id: "encounters", label: "Encounters", icon: MapPin, group: "Content" },
  { id: "trainers", label: "Trainers", icon: Users, group: "Content" },
  { id: "safety", label: "Safety Center", icon: ShieldCheck, group: "Tools" },
  { id: "export", label: "Export", icon: Package, group: "Tools" },
  { id: "settings", label: "Settings", icon: Settings, group: "Tools" },
];

export function Sidebar({
  current,
  onNavigate,
}: {
  current: ViewId;
  onNavigate: (v: ViewId) => void;
}) {
  const { currentProjectId } = useAppStore();
  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:w-64">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
        <PokeballIcon className="h-8 w-8 shrink-0" />
        <div className="min-w-0">
          <div className="truncate text-base font-bold tracking-tight">PokéForge</div>
          <div className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
            Expansion Editor
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scroll px-2 py-3">
        {groups.map((g) => (
          <div key={g} className="mb-4">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {g}
            </div>
            {NAV.filter((n) => n.group === g).map((item) => {
              const Icon = item.icon;
              const active = current === item.id;
              const disabled = !currentProjectId && item.id !== "settings";
              return (
                <button
                  key={item.id}
                  onClick={() => !disabled && onNavigate(item.id)}
                  disabled={disabled}
                  className={cn(
                    "group mb-0.5 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 text-[10px] text-sidebar-foreground/50">
        <div>pokeemerald-expansion</div>
        <div className="font-mono">v1.7+ compatible</div>
      </div>
    </aside>
  );
}
