"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { useAppStore, type ViewId } from "@/lib/store";
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
  Search,
  MapPin,
} from "lucide-react";

const COMMANDS: { id: ViewId; label: string; icon: typeof Flame; hint: string }[] = [
  { id: "dashboard", label: "Go to Dashboard", icon: LayoutDashboard, hint: "1" },
  { id: "species", label: "Go to Pokémon", icon: Flame, hint: "2" },
  { id: "moves", label: "Go to Moves", icon: Swords, hint: "3" },
  { id: "types", label: "Go to Types", icon: Shapes, hint: "4" },
  { id: "abilities", label: "Go to Abilities", icon: Sparkles, hint: "5" },
  { id: "items", label: "Go to Items", icon: Backpack, hint: "6" },
  { id: "statuses", label: "Go to Status", icon: HeartCrack, hint: "7" },
  { id: "encounters", label: "Go to Encounters", icon: MapPin, hint: "8" },
  { id: "safety", label: "Go to Safety Center", icon: ShieldCheck, hint: "9" },
  { id: "export", label: "Go to Export", icon: Package, hint: "0" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { setView, currentProjectId } = useAppStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K opens the palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      // Esc closes
      if (e.key === "Escape") setOpen(false);
      // Number keys 1-9 + 0 navigate views (only when not typing in an input)
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (!isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const num = parseInt(e.key);
        if (!isNaN(num) && currentProjectId) {
          const idx = num === 0 ? 9 : num - 1;
          if (COMMANDS[idx]) {
            e.preventDefault();
            setView(COMMANDS[idx].id);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setView, currentProjectId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl sm:max-w-[560px]" >
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
        </DialogHeader>
        <Command className="flex flex-col">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandInput
              placeholder="Type a command or search…"
              className="h-11 border-0 bg-transparent focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[400px] overflow-y-auto custom-scroll">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {COMMANDS.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <CommandItem
                    key={cmd.id}
                    value={`${cmd.label} ${cmd.hint}`}
                    onSelect={() => {
                      if (currentProjectId || cmd.id === "settings") {
                        setView(cmd.id);
                      }
                      setOpen(false);
                    }}
                    disabled={!currentProjectId && cmd.id !== "settings"}
                  >
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{cmd.label}</span>
                    <kbd className="ml-auto text-[10px] text-muted-foreground">{cmd.hint}</kbd>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Shortcuts">
              <CommandItem disabled>
                <kbd className="mr-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
                <span>Open this palette</span>
              </CommandItem>
              <CommandItem disabled>
                <kbd className="mr-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">1-0</kbd>
                <span>Jump to a view</span>
              </CommandItem>
              <CommandItem disabled>
                <kbd className="mr-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">Esc</kbd>
                <span>Close dialogs</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
