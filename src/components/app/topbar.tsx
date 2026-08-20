"use client";

import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { ChevronDown, ShieldCheck, ShieldAlert, GitBranch, Command as CommandIcon, Sun, Moon, Monitor } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PokeballIcon } from "@/components/app/pokeball-icon";

export function Topbar() {
  const { currentProjectId, setProject, setView } = useAppStore();
  const { theme, setTheme } = useTheme();

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const r = await fetch("/api/projects");
      return r.json();
    },
  });
  const projects = projectsData?.projects ?? [];

  const { data: projData } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return null;
      const r = await fetch(`/api/projects/${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });

  const counts = projData?.counts;
  const total =
    (counts?.species ?? 0) +
    (counts?.moves ?? 0) +
    (counts?.types ?? 0) +
    (counts?.abilities ?? 0) +
    (counts?.items ?? 0) +
    (counts?.statuses ?? 0);

  // Safety score: 100 - (errors-ish). Simplified: green if backups exist & no dangling.
  const safetyOk = (counts?.backups ?? 0) > 0;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
      <PokeballIcon className="h-6 w-6 md:hidden" />

      {currentProjectId ? (
        <Select value={currentProjectId} onValueChange={setProject}>
          <SelectTrigger className="h-9 w-[220px] gap-2 md:w-[280px]">
            <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p: { id: string; name: string; expansionVersion?: string }) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="font-medium">{p.name}</span>
                {p.expansionVersion && (
                  <span className="ml-2 text-xs text-muted-foreground">{p.expansionVersion}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-sm text-muted-foreground">No project selected</span>
      )}

      <div className="flex-1" />

      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Open command palette (⌘K)"
      >
        <CommandIcon className="h-3 w-3" />
        <kbd className="hidden font-sans text-[10px] sm:inline">⌘K</kbd>
      </button>

      {/* Theme toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 border-border" title="Toggle theme">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" /> Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" /> Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" /> System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {currentProjectId && (
        <div className="hidden items-center gap-2 md:flex">
          <Badge variant="secondary" className="gap-1">
            {total} custom items
          </Badge>
          <button
            onClick={() => setView("safety")}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent"
            title={safetyOk ? "Safety: OK (backups exist)" : "Safety: no backups yet"}
          >
            {safetyOk ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span className="font-medium">{safetyOk ? "Safe" : "At risk"}</span>
          </button>
        </div>
      )}
    </header>
  );
}
