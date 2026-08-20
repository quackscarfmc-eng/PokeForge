"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Users,
  Calculator,
  GitBranch,
  GitCompare,
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
  { id: "trainers", label: "Go to Trainers", icon: Users, hint: "9" },
  { id: "evolutions", label: "Go to Evolution Chains", icon: GitBranch, hint: "e" },
  { id: "comparer", label: "Go to Comparer", icon: GitCompare, hint: "m" },
  { id: "calculator", label: "Go to Type Calculator", icon: Calculator, hint: "c" },
  { id: "safety", label: "Go to Safety Center", icon: ShieldCheck, hint: "s" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { setView, currentProjectId } = useAppStore();

  // Fetch all entities for global search
  const { data: allEntities } = useQuery({
    queryKey: ["all-entities", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return null;
      const [species, moves, types, abilities, items, statuses, trainers] = await Promise.all([
        fetch(`/api/species?projectId=${currentProjectId}`).then((r) => r.json()),
        fetch(`/api/moves?projectId=${currentProjectId}`).then((r) => r.json()),
        fetch(`/api/types?projectId=${currentProjectId}`).then((r) => r.json()),
        fetch(`/api/abilities?projectId=${currentProjectId}`).then((r) => r.json()),
        fetch(`/api/items?projectId=${currentProjectId}`).then((r) => r.json()),
        fetch(`/api/statuses?projectId=${currentProjectId}`).then((r) => r.json()),
        fetch(`/api/trainers?projectId=${currentProjectId}`).then((r) => r.json()),
      ]);
      return {
        species: species.species ?? [],
        moves: moves.moves ?? [],
        types: types.types ?? [],
        abilities: abilities.abilities ?? [],
        items: items.items ?? [],
        statuses: statuses.statuses ?? [],
        trainers: trainers.trainers ?? [],
      };
    },
    enabled: !!currentProjectId && open,
  });

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

            {/* Global search results */}
            {allEntities && (
              <>
                <CommandSeparator />
                {allEntities.species.length > 0 && (
                  <CommandGroup heading={`Pokémon (${allEntities.species.length})`}>
                    {allEntities.species.slice(0, 5).map((s: any) => (
                      <CommandItem
                        key={s.id}
                        value={`${s.speciesName} ${s.constantName} pokemon species`}
                        onSelect={() => { setView("species"); setOpen(false); }}
                      >
                        <Flame className="mr-2 h-4 w-4 text-orange-500" />
                        <span className="flex-1">{s.speciesName}</span>
                        <code className="text-[10px] text-muted-foreground">{s.constantName}</code>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {allEntities.moves.length > 0 && (
                  <CommandGroup heading={`Moves (${allEntities.moves.length})`}>
                    {allEntities.moves.slice(0, 5).map((m: any) => (
                      <CommandItem
                        key={m.id}
                        value={`${m.name} ${m.constantName} move attack`}
                        onSelect={() => { setView("moves"); setOpen(false); }}
                      >
                        <Swords className="mr-2 h-4 w-4 text-red-500" />
                        <span className="flex-1">{m.name}</span>
                        <code className="text-[10px] text-muted-foreground">{m.constantName}</code>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {allEntities.types.length > 0 && (
                  <CommandGroup heading={`Types (${allEntities.types.length})`}>
                    {allEntities.types.map((t: any) => (
                      <CommandItem
                        key={t.id}
                        value={`${t.name} ${t.constantName} type elemental`}
                        onSelect={() => { setView("types"); setOpen(false); }}
                      >
                        <Shapes className="mr-2 h-4 w-4 text-purple-500" />
                        <span className="flex-1">{t.name}</span>
                        <code className="text-[10px] text-muted-foreground">{t.constantName}</code>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {allEntities.abilities.length > 0 && (
                  <CommandGroup heading={`Abilities (${allEntities.abilities.length})`}>
                    {allEntities.abilities.slice(0, 5).map((a: any) => (
                      <CommandItem
                        key={a.id}
                        value={`${a.name} ${a.constantName} ability`}
                        onSelect={() => { setView("abilities"); setOpen(false); }}
                      >
                        <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />
                        <span className="flex-1">{a.name}</span>
                        <code className="text-[10px] text-muted-foreground">{a.constantName}</code>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {allEntities.items.length > 0 && (
                  <CommandGroup heading={`Items (${allEntities.items.length})`}>
                    {allEntities.items.slice(0, 5).map((i: any) => (
                      <CommandItem
                        key={i.id}
                        value={`${i.name} ${i.constantName} item`}
                        onSelect={() => { setView("items"); setOpen(false); }}
                      >
                        <Backpack className="mr-2 h-4 w-4 text-green-500" />
                        <span className="flex-1">{i.name}</span>
                        <code className="text-[10px] text-muted-foreground">{i.constantName}</code>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {allEntities.trainers.length > 0 && (
                  <CommandGroup heading={`Trainers (${allEntities.trainers.length})`}>
                    {allEntities.trainers.slice(0, 5).map((t: any) => (
                      <CommandItem
                        key={t.id}
                        value={`${t.trainerName} ${t.trainerClass} trainer npc`}
                        onSelect={() => { setView("trainers"); setOpen(false); }}
                      >
                        <Users className="mr-2 h-4 w-4 text-pink-500" />
                        <span className="flex-1">{t.trainerName}</span>
                        <code className="text-[10px] text-muted-foreground">{t.trainerClass.replace("TRAINER_CLASS_", "").replace(/_/g, " ")}</code>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}

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
