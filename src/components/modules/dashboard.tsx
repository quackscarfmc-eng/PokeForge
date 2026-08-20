"use client";

import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { PageHeader, StatPill } from "@/components/shared/page-header";
import { OnboardingBanner } from "@/components/shared/onboarding-banner";
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
  Users,
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
  { id: "trainers", label: "Trainers", icon: Users, color: "#EC4899" },
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

  const { data: backupData } = useQuery({
    queryKey: ["backups", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/backups?projectId=${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const recentBackups = backupData?.backups ?? [];

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
    (counts.encounters ?? 0) +
    (counts.trainers ?? 0);

  const safetyScore = Math.min(
    100,
    40 + (counts.backups ?? 0) * 5 + (counts.buildChecks ?? 0) * 3 + (totalCustom > 0 ? 20 : 0),
  );

  return (
    <div>
      <OnboardingBanner />
      <PageHeader
        title={project?.name ?? "Dashboard"}
        description={
          project?.description ||
          "Overview of your custom Pokémon content and project safety."
        }
        icon={undefined}
      />

      {/* Hero stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
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

      {/* Content distribution charts */}
      {(counts.species ?? 0) + (counts.moves ?? 0) + (counts.types ?? 0) > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Content Distribution</CardTitle>
              <CardDescription>Breakdown of custom content by type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Pokémon", value: counts.species ?? 0, color: "#EE8130" },
                      { name: "Moves", value: counts.moves ?? 0, color: "#C22E28" },
                      { name: "Types", value: counts.types ?? 0, color: "#6F35FC" },
                      { name: "Abilities", value: counts.abilities ?? 0, color: "#F7D02C" },
                      { name: "Items", value: counts.items ?? 0, color: "#7AC74C" },
                      { name: "Status", value: counts.statuses ?? 0, color: "#A33EA1" },
                      { name: "Encounters", value: counts.encounters ?? 0, color: "#3B82F6" },
                      { name: "Trainers", value: counts.trainers ?? 0, color: "#EC4899" },
                    ].filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {[
                      "#EE8130", "#C22E28", "#6F35FC", "#F7D02C",
                      "#7AC74C", "#A33EA1", "#3B82F6", "#EC4899",
                    ].map((c, i) => (
                      <Cell key={i} fill={c} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Content by Category</CardTitle>
              <CardDescription>Bar chart comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { name: "Pokémon", count: counts.species ?? 0, fill: "#EE8130" },
                  { name: "Moves", count: counts.moves ?? 0, fill: "#C22E28" },
                  { name: "Types", count: counts.types ?? 0, fill: "#6F35FC" },
                  { name: "Abilities", count: counts.abilities ?? 0, fill: "#F7D02C" },
                  { name: "Items", count: counts.items ?? 0, fill: "#7AC74C" },
                  { name: "Status", count: counts.statuses ?? 0, fill: "#A33EA1" },
                  { name: "Enc.", count: counts.encounters ?? 0, fill: "#3B82F6" },
                  { name: "Trainers", count: counts.trainers ?? 0, fill: "#EC4899" },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "var(--muted)" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity timeline */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Latest backups and build checks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll">
            {[...recentBackups.slice(0, 5).map((b: any) => ({
              type: "backup",
              label: b.label,
              time: b.createdAt,
              detail: b.entityConstant ? `${b.entityType} ${b.entityConstant}` : "Manual snapshot",
            })), ...buildData?.checks?.slice(0, 5).map((c: any) => ({
              type: "build",
              label: c.ok ? "Build passed" : "Build failed",
              time: c.createdAt,
              detail: `${JSON.parse(c.errorsJson || "[]").length} errors · ${c.durationMs}ms`,
            })) ?? []]
              .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
              .slice(0, 8)
              .map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-md border border-border bg-card/50 px-3 py-2">
                  <div className={
                    item.type === "backup"
                      ? "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-500"
                      : item.label.includes("passed")
                        ? "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500"
                        : "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-500"
                  }>
                    {item.type === "backup" ? <Clock className="h-3.5 w-3.5" /> :
                     item.label.includes("passed") ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground">{item.detail}</div>
                  </div>
                  <div className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(item.time).toLocaleDateString()} {new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            {recentBackups.length === 0 && (!buildData?.checks || buildData.checks.length === 0) && (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity yet. Run a build check or create a backup.</p>
            )}
          </div>
        </CardContent>
      </Card>

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
