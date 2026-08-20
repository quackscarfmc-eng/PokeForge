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
import {
  Shapes,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Grid3x3,
} from "lucide-react";
import {
  useEntities,
  useDeleteEntity,
  useDuplicateEntity,
  useProjectId,
} from "@/components/shared/entity-hooks";
import {
  POKEMON_TYPES,
  CANONICAL_TYPE_CHART,
} from "@/lib/poke-constants";
import { cn } from "@/lib/utils";
import { TypeEditor } from "./type-editor";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface TypeRow {
  id: string;
  constantName: string;
  typeId: number;
  name: string;
  description?: string | null;
  colorHex: string;
  iconEmoji?: string | null;
  offensiveMatrix: string;
  defensiveMatrix: string;
}

function safeParse<T>(s: string | undefined | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

/** Color a cell according to its multiplier. */
function cellClass(v: number): string {
  if (v === 0) return "bg-red-900 text-white border-red-950";
  if (v <= 0.25) return "bg-red-700 text-white border-red-800";
  if (v < 1) return "bg-amber-500 text-white border-amber-600";
  if (v > 2) return "bg-emerald-400 text-emerald-950 border-emerald-500 font-semibold";
  if (v > 1) return "bg-emerald-600 text-white border-emerald-700";
  return "bg-muted text-muted-foreground border-border";
}

function cellLabel(v: number): string {
  if (v === 0) return "0";
  if (v === 0.25) return "¼";
  if (v === 0.5) return "½";
  if (v === 1) return "";
  if (v === 2) return "2";
  if (v === 4) return "4";
  return String(v);
}

export function TypesView() {
  const projectId = useProjectId();
  const { data, isLoading } = useEntities<TypeRow>("types");
  const deleteMut = useDeleteEntity("types");
  const duplicateMut = useDuplicateEntity("types");
  const types = data?.types ?? [];

  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}`);
      return r.json();
    },
    enabled: !!projectId,
  });
  const nextTypeId = projectData?.project?.nextTypeId ?? 20;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TypeRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TypeRow | null>(null);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (t: TypeRow) => {
    setEditing(t);
    setEditorOpen(true);
  };

  const confirmDelete = async (mode?: "safe" | "force") => {
    if (!pendingDelete) return;
    try {
      await deleteMut.mutateAsync({ id: pendingDelete.id, mode: mode ?? "safe" });
      setPendingDelete(null);
    } catch {
      // toast handled by mutation
    }
  };

  // Build the unified type chart matrix
  const allTypes = useMemo(() => {
    const customs = types.map((t) => ({
      constant: t.constantName,
      name: t.name,
      color: t.colorHex,
      custom: true,
      row: t,
    }));
    return [
      ...POKEMON_TYPES.map((p) => ({
        constant: p.constant,
        name: p.name,
        color: p.color,
        custom: false,
        row: null as TypeRow | null,
      })),
      ...customs,
    ];
  }, [types]);

  /** Lookup effectiveness for attacking→defending. */
  const lookup = (atk: string, def: string): number => {
    // Custom attacker row?
    const atkCustom = types.find((t) => t.constantName === atk);
    if (atkCustom) {
      const off = safeParse<Record<string, number>>(atkCustom.offensiveMatrix, {});
      return off[def] ?? 1;
    }
    // Custom defender column?
    const defCustom = types.find((t) => t.constantName === def);
    if (defCustom) {
      const defMatrix = safeParse<Record<string, number>>(defCustom.defensiveMatrix, {});
      return defMatrix[atk] ?? 1;
    }
    // Builtin-vs-builtin from canonical chart
    return CANONICAL_TYPE_CHART[atk]?.[def] ?? 1;
  };

  const matrixCellSize = "h-9 w-9 md:h-10 md:w-10";

  return (
    <div>
      <PageHeader
        title="Types"
        description="Design custom elemental types with their own full effectiveness matrix. Builtin matchups are shown alongside your custom types in the chart below."
        icon={Shapes}
        actions={
          <Button
            onClick={openNew}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New type
          </Button>
        }
      />

      {/* Custom types grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : types.length === 0 ? (
        <EmptyState
          icon={Shapes}
          title="No custom types yet"
          description="Create your first custom elemental type to extend the type chart. Each type defines its own offensive and defensive matchup table."
          action={
            <Button
              onClick={openNew}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New type
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {types.map((t) => {
            const off = safeParse<Record<string, number>>(t.offensiveMatrix, {});
            const def = safeParse<Record<string, number>>(t.defensiveMatrix, {});
            const offEntries = Object.values(off).filter((v) => v !== 1).length;
            const defEntries = Object.values(def).filter((v) => v !== 1).length;
            return (
              <Card
                key={t.id}
                className="group relative overflow-hidden border-border transition-all hover:shadow-md"
              >
                {/* Color swatch header */}
                <div
                  className="relative h-20 w-full"
                  style={{ backgroundColor: t.colorHex }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur">
                      #{t.typeId}
                    </span>
                  </div>
                  <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 bg-white/20 text-white backdrop-blur hover:bg-white/30"
                      onClick={() => openEdit(t)}
                      aria-label="Edit type"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 bg-white/20 text-white backdrop-blur hover:bg-blue-500/80"
                      onClick={() => duplicateMut.mutate(t.id)}
                      aria-label="Duplicate type"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 bg-white/20 text-white backdrop-blur hover:bg-red-500/80"
                      onClick={() => setPendingDelete(t)}
                      aria-label="Delete type"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {t.iconEmoji && (
                    <span className="absolute bottom-2 right-3 text-2xl drop-shadow">
                      {t.iconEmoji}
                    </span>
                  )}
                </div>

                <CardContent className="p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate font-bold">{t.name}</h3>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {t.constantName}
                  </p>
                  {t.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                    <Badge variant="outline" className="gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {offEntries} off
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {defEntries} def
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Type Chart Matrix — the visual centerpiece */}
      <Card className="mt-6 overflow-hidden border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3x3 className="h-4 w-4 text-emerald-600" />
            Type Chart
            <Badge variant="outline" className="ml-1">
              {allTypes.length}×{allTypes.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Rows = attacking type. Columns = defending type. Cells show damage multiplier
            (blank = 1×). Scroll horizontally to see all columns.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-[10px]">
            <span className="text-muted-foreground">Legend:</span>
            <LegendCell v={4} label="4×" />
            <LegendCell v={2} label="2×" />
            <LegendCell v={1} label="1×" />
            <LegendCell v={0.5} label="½×" />
            <LegendCell v={0.25} label="¼×" />
            <LegendCell v={0} label="0×" />
          </div>

          <div className="max-h-[70vh] overflow-auto custom-scroll">
            <table className="border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 min-w-[110px] border-b border-r border-border bg-card px-2 py-1.5 text-left font-semibold">
                    Atk \ Def
                  </th>
                  {allTypes.map((d) => (
                    <th
                      key={d.constant}
                      className="sticky top-0 z-20 border-b border-l border-border bg-card px-0.5 py-1"
                    >
                      <div
                        className="mx-auto flex h-12 w-9 items-center justify-center rounded text-[9px] font-semibold leading-tight text-white md:w-10"
                        style={{ backgroundColor: d.color }}
                        title={`${d.name} (${d.constant}) — defending`}
                      >
                        <span className="line-clamp-2 text-center [writing-mode:vertical-rl]">
                          {d.name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTypes.map((a) => (
                  <tr key={a.constant} className="group">
                    <th
                      className="sticky left-0 z-10 border-b border-r border-border bg-card px-2 py-1 text-left font-medium"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: a.color }}
                        />
                        <span className="truncate text-[11px]">{a.name}</span>
                      </div>
                    </th>
                    {allTypes.map((d) => {
                      const v = lookup(a.constant, d.constant);
                      const isSelf = a.constant === d.constant;
                      return (
                        <td
                          key={d.constant}
                          className="border border-border/60 p-0"
                        >
                          <div
                            className={cn(
                              "flex items-center justify-center border",
                              matrixCellSize,
                              cellClass(v),
                              isSelf && "ring-1 ring-inset ring-foreground/20",
                            )}
                            title={`${a.name} → ${d.name} = ${v}×`}
                          >
                            <span className="text-[10px] font-semibold">
                              {cellLabel(v)}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <TypeEditor
        key={editing?.id ?? "new"}
        type={editing}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        nextTypeId={nextTypeId}
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

function LegendCell({ v, label }: { v: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "inline-block h-3 w-3 rounded-sm border",
          cellClass(v),
        )}
      />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
