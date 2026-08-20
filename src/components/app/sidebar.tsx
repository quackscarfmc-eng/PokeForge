"use client";

import { useState } from "react";
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
  Menu,
  X,
  Calculator,
} from "lucide-react";
import { PokeballIcon } from "@/components/app/pokeball-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  { id: "calculator", label: "Type Calculator", icon: Calculator, group: "Tools" },
  { id: "safety", label: "Safety Center", icon: ShieldCheck, group: "Tools" },
  { id: "export", label: "Export", icon: Package, group: "Tools" },
  { id: "settings", label: "Settings", icon: Settings, group: "Tools" },
];

function NavContent({
  current,
  onNavigate,
  currentProjectId,
}: {
  current: ViewId;
  onNavigate: (v: ViewId) => void;
  currentProjectId: string | null;
}) {
  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  return (
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
                  "group mb-0.5 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-all",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0 transition-transform", active && "scale-110")} />
                <span className="truncate">{item.label}</span>
                {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/60" />}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({
  current,
  onNavigate,
}: {
  current: ViewId;
  onNavigate: (v: ViewId) => void;
}) {
  const { currentProjectId } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-3 top-2.5 z-50 h-9 w-9 bg-sidebar text-sidebar-foreground shadow-md md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="flex-row items-center justify-between border-b border-sidebar-border px-4 py-4">
            <div className="flex items-center gap-2">
              <PokeballIcon className="h-8 w-8 shrink-0" />
              <div>
                <SheetTitle className="text-base text-sidebar-foreground">PokéForge</SheetTitle>
                <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                  Expansion Editor
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>
          <NavContent current={current} onNavigate={(v) => { onNavigate(v); setMobileOpen(false); }} currentProjectId={currentProjectId} />
          <div className="border-t border-sidebar-border px-4 py-3 text-[10px] text-sidebar-foreground/50">
            <div>pokeemerald-expansion</div>
            <div className="font-mono">v1.7+ compatible</div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
          <PokeballIcon className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-base font-bold tracking-tight">PokéForge</div>
            <div className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              Expansion Editor
            </div>
          </div>
        </div>
        <NavContent current={current} onNavigate={onNavigate} currentProjectId={currentProjectId} />
        <div className="border-t border-sidebar-border px-4 py-3 text-[10px] text-sidebar-foreground/50">
          <div>pokeemerald-expansion</div>
          <div className="font-mono">v1.7+ compatible</div>
        </div>
      </aside>
    </>
  );
}
