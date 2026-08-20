"use client";

import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  BookOpen,
  Tag,
} from "lucide-react";
import {
  useEntities,
  useDeleteEntity,
  useDuplicateEntity,
  useProjectId,
} from "@/components/shared/entity-hooks";
import { BUILTIN_ABILITIES } from "@/lib/poke-constants";
import { cn } from "@/lib/utils";
import { AbilityEditor } from "./ability-editor";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface AbilityRow {
  id: string;
  constantName: string;
  abilityId: number;
  name: string;
  description?: string | null;
  effectFlags: string;
  battleScript?: string | null;
}

function safeParse<T>(s: string | undefined | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function AbilitiesView() {
  const projectId = useProjectId();
  const { data, isLoading } = useEntities<AbilityRow>("abilities");
  const deleteMut = useDeleteEntity("abilities");
  const duplicateMut = useDuplicateEntity("abilities");
  const abilities = data?.abilities ?? [];

  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}`);
      return r.json();
    },
    enabled: !!projectId,
  });
  const nextAbilityId = projectData?.project?.nextAbilityId ?? 300;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AbilityRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AbilityRow | null>(null);
  const [builtinSearch, setBuiltinSearch] = useState("");

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (a: AbilityRow) => {
    setEditing(a);
    setEditorOpen(true);
  };

  const confirmDelete = async (mode?: "safe" | "force") => {
    if (!pendingDelete) return;
    try {
      await deleteMut.mutateAsync({
        id: pendingDelete.id,
        mode: mode ?? "safe",
      });
      setPendingDelete(null);
    } catch {
      // handled by mutation
    }
  };

  const filteredBuiltins = useMemo(() => {
    const q = builtinSearch.trim().toLowerCase();
    if (!q) return BUILTIN_ABILITIES;
    return BUILTIN_ABILITIES.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.constant.toLowerCase().includes(q),
    );
  }, [builtinSearch]);

  return (
    <div>
      <PageHeader
        title="Abilities"
        description="Design custom abilities — set their constant, ID, description, effect flags, and battle-script reference. Builtin abilities are listed for reference."
        icon={Sparkles}
        actions={
          <Button
            onClick={openNew}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New ability
          </Button>
        }
      />

      {/* Custom abilities list */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : abilities.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No custom abilities yet"
          description="Create your first custom ability to add new battle mechanics to your ROM-hack."
          action={
            <Button
              onClick={openNew}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New ability
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {abilities.map((a) => {
            const flags = safeParse<string[]>(a.effectFlags, []);
            return (
              <Card
                key={a.id}
                className="group relative border-border transition-all hover:shadow-md"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-bold">{a.name}</h3>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        >
                          #{a.abilityId}
                        </Badge>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {a.constantName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEdit(a)}
                        aria-label="Edit ability"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-blue-500/10 hover:text-blue-500"
                        onClick={() => duplicateMut.mutate(a.id)}
                        aria-label="Duplicate ability"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-red-500/10 hover:text-red-500"
                        onClick={() => setPendingDelete(a)}
                        aria-label="Delete ability"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {a.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {a.description}
                    </p>
                  )}

                  {flags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {flags.slice(0, 4).map((f) => (
                        <Badge
                          key={f}
                          variant="secondary"
                          className="gap-1 font-mono text-[10px]"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {f}
                        </Badge>
                      ))}
                      {flags.length > 4 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{flags.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  {a.battleScript && (
                    <div className="mt-2 rounded border border-border/60 bg-muted/40 px-2 py-1">
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {a.battleScript.slice(0, 80)}
                        {a.battleScript.length > 80 ? "…" : ""}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Builtin abilities panel */}
      <Card className="mt-6 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-amber-600" />
            Built-in Abilities
            <Badge variant="outline" className="ml-1">
              {BUILTIN_ABILITIES.length} available
            </Badge>
          </CardTitle>
          <CardDescription>
            Reference list of abilities already defined in pokeemerald-expansion.
            Use these constants when assigning abilities to species.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={builtinSearch}
                onChange={(e) => setBuiltinSearch(e.target.value)}
                placeholder="Search by name or constant…"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {filteredBuiltins.length} match
              {filteredBuiltins.length === 1 ? "" : "es"}
            </span>
          </div>
          <div
            className={cn(
              "max-h-96 overflow-y-auto custom-scroll rounded-md border border-border/60",
            )}
          >
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] font-semibold text-muted-foreground">
                    Constant
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBuiltins.map((b) => (
                  <tr
                    key={b.constant}
                    className="border-b border-border/40 last:border-b-0 hover:bg-accent/40"
                  >
                    <td className="px-3 py-1.5 font-medium">{b.name}</td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                      {b.constant}
                    </td>
                  </tr>
                ))}
                {filteredBuiltins.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      No builtin abilities match “{builtinSearch}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AbilityEditor
        key={editing?.id ?? "new"}
        ability={editing}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        nextAbilityId={nextAbilityId}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name}?`}
        description={`This will permanently remove ${pendingDelete?.constantName} from your project. Choose a delete mode below.`}
        confirmLabel="Delete"
        destructive
        showDeleteMode
        onConfirm={(mode) => {
          if (mode === "force") {
            toast.info("Force-delete selected — bypassing safety checks");
          }
          confirmDelete(mode);
        }}
      />
    </div>
  );
}
