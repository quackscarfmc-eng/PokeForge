"use client";

import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, StatPill } from "@/components/shared/page-header";
import { PokeballIcon } from "@/components/app/pokeball-icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Flame,
  Swords,
  Shapes,
  Sparkles,
  Backpack,
  HeartCrack,
  ShieldCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore as useStore } from "@/lib/store";

const CARDS = [
  { id: "species", label: "Pokémon", icon: Flame, color: "#EE8130" },
  { id: "moves", label: "Moves", icon: Swords, color: "#C22E28" },
  { id: "types", label: "Types", icon: Shapes, color: "#6F35FC" },
  { id: "abilities", label: "Abilities", icon: Sparkles, color: "#F7D02C" },
  { id: "items", label: "Items", icon: Backpack, color: "#7AC74C" },
  { id: "statuses", label: "Status", icon: HeartCrack, color: "#A33EA1" },
  { id: "encounters", label: "Encounters", icon: MapPin, color: "#3B82F6" },
] as const;

export function DashboardView() {
  const { currentProjectId, setView } = useAppStore();

  const { data } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
    refetchInterval: 15000,
  });

  const project = data?.project;
  const counts = data?.counts ?? {};

  const { data: buildData } = useQuery({
    queryKey: ["build-checks", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/build-check?projectId=${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const lastBuild = buildData?.checks?.[0];

  const { data: planData } = useQuery({
    queryKey: ["recent-plans", currentProjectId],
    queryFn: async () => {
      // We don't have a plans list endpoint, but build-check serves as activity proxy
      return { plans: [] };
    },
    enabled: !!currentProjectId,
  });

  const totalCustom =
    (counts.species ?? 0) +
    (counts.moves ?? 0) +
    (counts.types ?? 0) +
    (counts.abilities ?? 0) +
    (counts.items ?? 0) +
    (counts.statuses ?? 0) +
    (counts.encounters ?? 0);

  const safetyScore = Math.min(
    100,
    40 + (counts.backups ?? 0) * 5 + (counts.buildChecks ?? 0) * 3 + (totalCustom > 0 ? 20 : 0),
  );

  return (
    <div>
      <PageHeader
        title={project?.name ?? "Dashboard"}
        description={
          project?.description ||
          "Overview of your custom Pokémon content and project safety."
        }
        icon={undefined}
      />

      {/* Hero stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {CARDS.map((c) => {
          const Icon = c.icon;
          const n = counts[c.id] ?? 0;
          return (
            <button
              key={c.id}
              onClick={() => setView(c.id as any)}
              className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5" style={{ color: c.color }} />
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <div>
                <div className="text-2xl font-black leading-none">{n}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{c.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Safety score */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Safety Score
            </CardTitle>
            <CardDescription>Backups + build checks + content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black">{safetyScore}</span>
              <span className="pb-1 text-sm text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  safetyScore >= 70 ? "bg-emerald-500" : safetyScore >= 40 ? "bg-amber-500" : "bg-red-500",
                )}
                style={{ width: `${safetyScore}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <StatPill label="Backups" value={counts.backups ?? 0} />
              <StatPill label="Build checks" value={counts.buildChecks ?? 0} />
            </div>
            <button
              onClick={() => setView("safety")}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-2 text-xs font-medium hover:bg-accent"
            >
              Open Safety Center <ArrowRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Last build check */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {lastBuild?.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : lastBuild ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              Last build check
            </CardTitle>
            <CardDescription>
              {lastBuild
                ? new Date(lastBuild.createdAt).toLocaleString()
                : "No build checks run yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastBuild ? (
              <div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <StatPill label="Status" value={lastBuild.ok ? "PASS" : "FAIL"} color={lastBuild.ok ? "#10b981" : "#ef4444"} />
                  <StatPill label="Errors" value={JSON.parse(lastBuild.errorsJson || "[]").length} />
                  <StatPill label="Warnings" value={JSON.parse(lastBuild.warningsJson || "[]").length} />
                  <StatPill label="Duration" value={`${lastBuild.durationMs}ms`} />
                </div>
                {JSON.parse(lastBuild.errorsJson || "[]").length > 0 && (
                  <div className="mt-3 max-h-32 overflow-y-auto custom-scroll rounded border border-red-500/30 bg-red-500/5 p-2 font-mono text-xs">
                    {JSON.parse(lastBuild.errorsJson).slice(0, 5).map((e: any, i: number) => (
                      <div key={i} className="text-red-600 dark:text-red-400">
                        {e.file}: {e.message}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setView("safety")}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  View full report <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <PokeballIcon className="h-10 w-10 opacity-40" />
                <p className="text-sm text-muted-foreground">
                  Run a build check to validate your custom content compiles cleanly.
                </p>
                <button
                  onClick={() => setView("safety")}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Run build check
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick start guide */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">How PokeForge works</CardTitle>
          <CardDescription>
            The safe workflow (mirrors AxoloteDex): Validate → Dry-Run → Review → Apply → Build
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              { n: 1, t: "Create", d: "Design your Pokémon, move, type, etc. with a structured form." },
              { n: 2, t: "Validate", d: "Run validation to catch errors (bad IDs, unknown types)." },
              { n: 3, t: "Dry-Run", d: "Generate a change plan: which files change & risk level." },
              { n: 4, t: "Apply", d: "Auto-backup, then mark applied. Copy generated code into your project." },
              { n: 5, t: "Build", d: "Run the build check to confirm nothing breaks." },
            ].map((s) => (
              <div key={s.n} className="rounded-md border border-border bg-card/50 p-3">
                <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {s.n}
                </div>
                <div className="text-sm font-semibold">{s.t}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
