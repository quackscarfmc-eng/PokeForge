"use client";

import { useMemo, useState } from "react";
import { useEntities, useDeleteEntity } from "@/components/shared/entity-hooks";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, EmptyState, StatPill } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusEditor } from "@/components/modules/statuses/status-editor";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  HeartCrack,
  Plus,
  Search,
  Pencil,
  Trash2,
  Hash,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BUILTIN_STATUSES } from "@/lib/poke-constants";

export interface StatusCondition {
  id: string;
  projectId: string;
  constantName: string;
  statusId: number;
  name: string;
  description?: string | null;
  category: string; // volatile | non_volatile | field
  isVolatile: boolean;
  battleScript?: string | null;
  iconEmoji?: string | null;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_BADGE: Record<string, string> = {
  non_volatile: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  volatile: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  field: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
};

const CATEGORY_LABEL: Record<string, string> = {
  non_volatile: "Non-Volatile",
  volatile: "Volatile",
  field: "Field Condition",
};

// Builtin status icons for the reference panel
const BUILTIN_ICON: Record<string, string> = {
  STATUS_SLEEP: "😴",
  STATUS_POISON: "☠️",
  STATUS_BURN: "🔥",
  STATUS_FREEZE: "❄️",
  STATUS_PARALYSIS: "⚡",
  STATUS_TOXIC_POISON: "🟢",
  STATUS_FROZEN: "🧊",
};

export function StatusesView() {
  const { currentProjectId } = useAppStore();
  const { data, isLoading } = useEntities<StatusCondition>("statuses");
  const statuses = data?.statuses ?? [];

  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<StatusCondition | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<StatusCondition | null>(null);

  const deleteStatus = useDeleteEntity("statuses");

  // Fetch project (for nextStatusId prefill)
  const { data: projectData } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${currentProjectId}`);
      if (!r.ok) throw new Error("Failed to fetch project");
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const nextStatusId = projectData?.project?.nextStatusId ?? 8;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return statuses;
    return statuses.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.constantName.toLowerCase().includes(q) ||
        String(s.statusId).includes(q) ||
        (s.description ?? "").toLowerCase().includes(q),
    );
  }, [statuses, search]);

  const nonVolatileCount = statuses.filter((s) => s.category === "non_volatile").length;
  const volatileCount = statuses.filter((s) => s.category === "volatile").length;

  function openNew() {
    setEditing(null);
    setEditorSession((s) => s + 1);
    setEditorOpen(true);
  }
  function openEdit(s: StatusCondition) {
    setEditing(s);
    setEditorSession((s2) => s2 + 1);
    setEditorOpen(true);
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    deleteStatus.mutate(
      { id: deleteTarget.id, mode: "force" },
      { onSettled: () => setDeleteTarget(null) },
    );
  }

  return (
    <div>
      <PageHeader
        title="Status Conditions"
        description="Custom non-volatile, volatile and field status conditions for your pokeemerald-expansion project."
        icon={HeartCrack}
        actions={
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> New status
          </Button>
        }
      />

      {/* Quick stats + search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <StatPill label="Total" value={statuses.length} />
          <StatPill label="Non-volatile" value={nonVolatileCount} color="#ef4444" />
          <StatPill label="Volatile" value={volatileCount} color="#d97706" />
          <StatPill label="Next ID" value={nextStatusId} color="#059669" />
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search statuses by name, constant, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Status grid */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading statuses…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={HeartCrack}
              title={search ? "No statuses match your search" : "No custom statuses yet"}
              description={
                search
                  ? "Try a different search term, or clear the box to see all statuses."
                  : "Create your first custom status — a new non-volatile ailment, a volatile battle effect, or a field condition."
              }
              action={
                !search && (
                  <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Create status
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((s) => (
                <Card
                  key={s.id}
                  className="group relative overflow-hidden border-border transition-all hover:border-emerald-500/40 hover:shadow-md"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg shadow-sm"
                        style={{ backgroundColor: s.colorHex + "22", color: s.colorHex }}
                      >
                        {s.iconEmoji ? (
                          <span>{s.iconEmoji}</span>
                        ) : (
                          <HeartCrack className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base">{s.name}</CardTitle>
                        <CardDescription className="mt-0.5 truncate font-mono text-[11px]">
                          {s.constantName}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn("border", CATEGORY_BADGE[s.category] ?? CATEGORY_BADGE.volatile)}
                      >
                        {CATEGORY_LABEL[s.category] ?? s.category}
                      </Badge>
                      <Badge variant="outline" className="border-border bg-card text-muted-foreground">
                        <Hash className="h-3 w-3" /> {s.statusId}
                      </Badge>
                    </div>
                    {s.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground/60">No description</p>
                    )}

                    {/* Hover actions */}
                    <div className="mt-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(s)}
                        className="h-7 flex-1 gap-1 text-xs"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget(s)}
                        className="h-7 gap-1 border-red-500/30 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Built-in statuses reference */}
        <div className="lg:col-span-1">
          <Card className="sticky top-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-purple-500" />
                Built-in statuses
              </CardTitle>
              <CardDescription>
                Already shipped with pokeemerald-expansion — don&apos;t redefine these.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="max-h-80 space-y-1 overflow-y-auto custom-scroll pr-1">
                {BUILTIN_STATUSES.map((b) => (
                  <li
                    key={b.constant}
                    className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-2.5 py-1.5"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm">
                      {BUILTIN_ICON[b.constant] ?? "❓"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{b.name}</div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground">
                        {b.constant}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Use ID values ≥ 8 for custom statuses to avoid collisions with built-ins.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Editor — keyed by session so the form re-initializes on each open */}
      <StatusEditor
        key={`status-editor-${editorSession}`}
        status={editing}
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) setEditing(null);
        }}
        nextStatusId={nextStatusId}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete status?"
        description={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.name}" (${deleteTarget.constantName}). This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default StatusesView;
