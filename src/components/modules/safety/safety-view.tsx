"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, StatPill, EmptyState } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  ShieldCheck,
  ShieldAlert,
  PlayCircle,
  History,
  Download,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SafetyView() {
  const { currentProjectId } = useAppStore();
  const qc = useQueryClient();
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const { data: projData } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const counts = projData?.counts ?? {};

  const { data: buildData, isLoading: buildLoading } = useQuery({
    queryKey: ["build-checks", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/build-check?projectId=${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const checks = buildData?.checks ?? [];

  const { data: backupData } = useQuery({
    queryKey: ["backups", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/backups?projectId=${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const backups = backupData?.backups ?? [];

  const runBuildMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/build-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId, triggeredBy: "manual" }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (d) => {
      toast.success(d.ok ? "Build check passed" : `Build failed with ${d.errors.length} error(s)`);
      qc.invalidateQueries({ queryKey: ["build-checks"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
    onError: () => toast.error("Build check failed to run"),
  });

  const createBackupMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId, label: "Manual backup" }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Backup created");
      qc.invalidateQueries({ queryKey: ["backups"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
  });

  const restoreMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/backups/${id}/restore`, { method: "POST" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (d) => {
      toast.success(`Restored from "${d.restoredFrom}"`);
      qc.invalidateQueries({ queryKey: ["backups"] });
      qc.invalidateQueries({ queryKey: ["species"] });
      qc.invalidateQueries({ queryKey: ["moves"] });
      qc.invalidateQueries({ queryKey: ["types"] });
      qc.invalidateQueries({ queryKey: ["abilities"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["statuses"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
  });

  const deleteBackupMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/backups/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Backup deleted");
      qc.invalidateQueries({ queryKey: ["backups"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
  });

  const total =
    (counts.species ?? 0) + (counts.moves ?? 0) + (counts.types ?? 0) +
    (counts.abilities ?? 0) + (counts.items ?? 0) + (counts.statuses ?? 0);
  const safetyScore = Math.min(
    100,
    40 + (counts.backups ?? 0) * 5 + (counts.buildChecks ?? 0) * 3 + (total > 0 ? 20 : 0),
  );
  const lastBuild = checks[0];

  return (
    <div>
      <PageHeader
        title="Safety Center"
        description="Validation, dry-run plans, backups, rollback and build checks — your safety net."
        icon={ShieldCheck}
        actions={
          <Button onClick={() => createBackupMut.mutate()} disabled={createBackupMut.isPending}>
            <Download className="mr-2 h-4 w-4" /> Backup now
          </Button>
        }
      />

      {/* Score banner */}
      <Card className="mb-4 overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black",
                safetyScore >= 70
                  ? "bg-emerald-500/15 text-emerald-600"
                  : safetyScore >= 40
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-red-500/15 text-red-600",
              )}
            >
              {safetyScore}
            </div>
            <div>
              <div className="text-lg font-bold">
                {safetyScore >= 70 ? "Project is safe" : safetyScore >= 40 ? "Project needs attention" : "Project at risk"}
              </div>
              <div className="text-sm text-muted-foreground">
                {counts.backups ?? 0} backups · {counts.buildChecks ?? 0} build checks · {total} custom items
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill label="Backups" value={counts.backups ?? 0} />
            <StatPill label="Builds" value={counts.buildChecks ?? 0} />
            <StatPill label="Plans" value={counts.changePlans ?? 0} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="build">
        <TabsList>
          <TabsTrigger value="build"><PlayCircle className="mr-1.5 h-4 w-4" /> Build check</TabsTrigger>
          <TabsTrigger value="backups"><History className="mr-1.5 h-4 w-4" /> Backups ({backups.length})</TabsTrigger>
        </TabsList>

        {/* BUILD TAB */}
        <TabsContent value="build" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Build check</CardTitle>
              <CardDescription>
                Simulates a <code className="rounded bg-muted px-1 text-xs">make -jN</code> run: validates ID
                uniqueness, cross-references, and missing constants before you touch your project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runBuildMut.mutate()}
                disabled={runBuildMut.isPending}
                className="mb-4"
              >
                {runBuildMut.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…</>
                ) : (
                  <><PlayCircle className="mr-2 h-4 w-4" /> Run build check</>
                )}
              </Button>

              {buildLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

              {lastBuild ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <StatPill
                      label="Status"
                      value={lastBuild.ok ? "PASS" : "FAIL"}
                      color={lastBuild.ok ? "#10b981" : "#ef4444"}
                    />
                    <StatPill label="Errors" value={JSON.parse(lastBuild.errorsJson || "[]").length} />
                    <StatPill label="Warnings" value={JSON.parse(lastBuild.warningsJson || "[]").length} />
                    <StatPill label="Duration" value={`${lastBuild.durationMs}ms`} />
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold">stdout</h4>
                    <pre className="max-h-48 overflow-y-auto custom-scroll rounded-md border border-border bg-muted/50 p-3 text-xs">
{lastBuild.stdout || "(empty)"}
                    </pre>
                  </div>

                  {JSON.parse(lastBuild.errorsJson || "[]").length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-600">
                        <XCircle className="h-4 w-4" /> Errors
                      </h4>
                      <div className="space-y-1">
                        {JSON.parse(lastBuild.errorsJson).map((e: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                            <span className="font-mono">{e.file}</span>
                            <span className="text-muted-foreground">→</span>
                            <span>{e.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {JSON.parse(lastBuild.warningsJson || "[]").length > 0 && (
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                        <AlertTriangle className="h-4 w-4" /> Warnings
                      </h4>
                      <div className="space-y-1">
                        {JSON.parse(lastBuild.warningsJson).map((w: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="mb-2 text-sm font-semibold">stderr</h4>
                    <pre className="max-h-32 overflow-y-auto custom-scroll rounded-md border border-border bg-muted/50 p-3 text-xs text-red-600 dark:text-red-400">
{lastBuild.stderr || "(empty)"}
                    </pre>
                  </div>
                </div>
              ) : (
                !buildLoading && (
                  <EmptyState
                    icon={PlayCircle}
                    title="No build checks yet"
                    description="Run a build check to validate your custom content compiles cleanly before applying it to your pokeemerald-expansion project."
                  />
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BACKUPS TAB */}
        <TabsContent value="backups" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Backups & rollback</CardTitle>
              <CardDescription>
                Each backup is a full snapshot of all custom content. Restore to roll back any
                destructive change.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No backups yet"
                  description="Backups are created automatically before each apply, or manually with the button above."
                  action={
                    <Button onClick={() => createBackupMut.mutate()} disabled={createBackupMut.isPending}>
                      <Download className="mr-2 h-4 w-4" /> Create first backup
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {backups.map((b: any) => (
                    <div
                      key={b.id}
                      className="flex flex-col gap-3 rounded-md border border-border bg-card p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium">{b.label}</span>
                          {b.entityConstant && (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {b.entityConstant}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(b.createdAt).toLocaleString()}</span>
                          <span>·</span>
                          <span>{(b.sizeBytes / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRestoreId(b.id)}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteBackupMut.mutate(b.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!restoreId}
        onOpenChange={(o) => !o && setRestoreId(null)}
        title="Restore backup?"
        description="This will overwrite ALL custom content in this project with the snapshot. An auto-backup of the current state will be created first so you can undo this restore."
        confirmLabel="Restore"
        destructive
        onConfirm={() => {
          if (restoreId) restoreMut.mutate(restoreId);
          setRestoreId(null);
        }}
      />
    </div>
  );
}
