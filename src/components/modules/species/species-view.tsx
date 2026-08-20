"use client";

import { useMemo, useState } from "react";
import { useEntities, useDeleteEntity } from "@/components/shared/entity-hooks";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatPill } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TypeBadge } from "@/components/shared/type-badge";
import { PokeballIcon } from "@/components/app/pokeball-icon";
import {
  SpeciesEditor,
  type SpeciesWithNested,
} from "@/components/modules/species/species-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Flame,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Hash,
  Ruler,
  Weight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STAT_META,
  TYPE_COLOR,
  TYPE_NAME,
} from "@/lib/poke-constants";

export type { SpeciesWithNested } from "@/components/modules/species/species-editor";

export function SpeciesView() {
  const { currentProjectId } = useAppStore();
  const { data, isLoading } = useEntities<SpeciesWithNested>("species");
  const species = data?.species ?? [];

  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SpeciesWithNested | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpeciesWithNested | null>(null);
  // Session counter — bumped every time the editor opens, so reopening "New"
  // twice in a row produces a fresh form (component remounts via key).
  const [editorSession, setEditorSession] = useState(0);

  const deleteMut = useDeleteEntity("species");

  // Fetch project (for nextSpeciesId prefill)
  const { data: projectData } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${currentProjectId}`);
      if (!r.ok) throw new Error("Failed to fetch project");
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const nextSpeciesId = projectData?.project?.nextSpeciesId ?? 1524;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return species;
    return species.filter(
      (s) =>
        s.speciesName.toLowerCase().includes(q) ||
        s.constantName.toLowerCase().includes(q) ||
        String(s.speciesId).includes(q),
    );
  }, [species, search]);

  function openNew() {
    setEditing(null);
    setEditorSession((n) => n + 1);
    setEditorOpen(true);
  }
  function openEdit(s: SpeciesWithNested) {
    setEditing(s);
    setEditorSession((n) => n + 1);
    setEditorOpen(true);
  }
  function confirmDelete(mode?: "safe" | "force") {
    if (!deleteTarget) return;
    deleteMut.mutate(
      { id: deleteTarget.id, mode: mode ?? "safe" },
      {
        onSettled: () => setDeleteTarget(null),
        onError: (e: Error) => {
          // Safe delete can be blocked by other species evolving into this one
          if (e.message.includes("referenced by evolutions")) {
            toast.error("Safe delete blocked — try Force delete if you accept the risk.");
          }
        },
      },
    );
  }

  return (
    <div>
      <PageHeader
        title="Pokémon Species"
        description="Design custom Pokémon species for your pokeemerald-expansion project. Each species covers base stats, types, abilities, learnsets, evolutions, and graphics references."
        icon={Flame}
        actions={
          <Button onClick={openNew} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> New Pokémon
          </Button>
        }
      />

      {/* Quick stats + search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <StatPill label="Total" value={species.length} />
          <StatPill label="Next ID" value={nextSpeciesId} color="#059669" />
          <StatPill
            label="With evolutions"
            value={species.filter((s) => (s.evolutions ?? []).length > 0).length}
            color="#d97706"
          />
          <StatPill
            label="Mythical/Legendary"
            value={
              species.filter((s) => {
                try {
                  const f = JSON.parse(s.flags ?? "[]");
                  return (
                    Array.isArray(f) &&
                    (f.includes("isMythical") ||
                      f.includes("isSubLegendary") ||
                      f.includes("isRestrictedLegendary"))
                  );
                } catch {
                  return false;
                }
              }).length
            }
            color="#7c3aed"
          />
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, constant, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading species…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Flame}
          title={search ? "No species match your search" : "No species yet"}
          description={
            search
              ? "Try a different search term, or clear the box to see all Pokémon."
              : "Create your first custom Pokémon — a starter, a legendary, a regional rodent, anything!"
          }
          action={
            !search && (
              <Button onClick={openNew} className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Plus className="h-4 w-4" /> Create Pokémon
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s) => (
            <SpeciesCard
              key={s.id}
              species={s}
              onEdit={() => openEdit(s)}
              onDelete={() => setDeleteTarget(s)}
            />
          ))}
        </div>
      )}

      {/* Editor — remounts via key whenever the target species changes or the
          editor is reopened, so initial useState stays in sync with props */}
      <SpeciesEditor
        key={`${editing?.id ?? "new"}-${editorSession}`}
        species={editing}
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) setEditing(null);
        }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Pokémon?"
        description={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.speciesName}" (${deleteTarget.constantName}, ID #${deleteTarget.speciesId}). Its learnset and evolutions will be removed. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        showDeleteMode
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single species card with sprite + stat bars + hover actions
// ---------------------------------------------------------------------------
function SpeciesCard({
  species,
  onEdit,
  onDelete,
}: {
  species: SpeciesWithNested;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Parse JSON-string fields defensively
  let types: string[] = [];
  let flags: string[] = [];
  try {
    const t = JSON.parse(species.types ?? "[]");
    if (Array.isArray(t)) types = t as string[];
  } catch {
    /* ignore */
  }
  try {
    const f = JSON.parse(species.flags ?? "[]");
    if (Array.isArray(f)) flags = f as string[];
  } catch {
    /* ignore */
  }

  const primaryType = types[0] ?? "TYPE_NORMAL";
  const tint = TYPE_COLOR(primaryType);
  const isLegendary =
    flags.includes("isMythical") ||
    flags.includes("isSubLegendary") ||
    flags.includes("isRestrictedLegendary");

  // For the tiny stat bar summary
  const statValues = STAT_META.map((s) => ({
    ...s,
    value: species[s.key as keyof SpeciesWithNested] as number,
  }));
  const totalBase = statValues.reduce((acc, s) => acc + (s.value ?? 0), 0);

  return (
    <Card
      className="group relative overflow-hidden border-border transition-all hover:border-emerald-500/40 hover:shadow-md"
      style={{ borderTopColor: tint, borderTopWidth: 3 }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          {/* Sprite / placeholder */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
            {species.spriteFrontDataUrl ? (
              <img
                src={species.spriteFrontDataUrl}
                alt={species.speciesName}
                className="h-14 w-14 object-contain"
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: `${tint}15` }}
              >
                <PokeballIcon
                  className="h-10 w-10"
                  // Visual tint via CSS filter approximation of the primary type color
                  // (the icon itself is red by default — we overlay a soft tint background)
                />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-1.5 truncate text-base">
              <span className="truncate">{species.speciesName || "(unnamed)"}</span>
              {isLegendary && (
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                  title="Legendary/Mythical"
                />
              )}
            </CardTitle>
            <CardDescription className="mt-0.5 truncate font-mono text-[11px]">
              {species.constantName}
            </CardDescription>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="h-4 border-border bg-card px-1 text-[9px] font-mono">
                <Hash className="h-2.5 w-2.5" /> {species.speciesId}
              </Badge>
              {species.nationalDexNum != null && (
                <Badge variant="outline" className="h-4 border-border bg-card px-1 text-[9px] font-mono">
                  Nat #{species.nationalDexNum}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 pb-3">
        {/* Type badges */}
        <div className="flex flex-wrap gap-1.5">
          {types.filter(Boolean).length === 0 && (
            <span className="text-[10px] italic text-muted-foreground/60">no types</span>
          )}
          {types.filter(Boolean).map((t) => (
            <TypeBadge key={t} constant={t} size="xs" />
          ))}
        </div>

        {/* Stat bars */}
        <div className="space-y-1">
          {statValues.map((s) => {
            const pct = Math.max(0, Math.min(100, (s.value / 255) * 100));
            return (
              <div key={s.key} className="flex items-center gap-1.5">
                <span
                  className="w-8 shrink-0 text-[9px] font-semibold uppercase"
                  style={{ color: s.color }}
                >
                  {s.label === "Sp. Atk"
                    ? "SpA"
                    : s.label === "Sp. Def"
                      ? "SpD"
                      : s.label.slice(0, 3)}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: s.color }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-[9px] font-bold tabular-nums">
                  {s.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Total + physical stats */}
        <div className="flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{totalBase}</span> BST
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex items-center gap-0.5" title="Height (dm)">
              <Ruler className="h-2.5 w-2.5" /> {species.height}
            </span>
            <span className="flex items-center gap-0.5" title="Weight (hg)">
              <Weight className="h-2.5 w-2.5" /> {species.weight}
            </span>
          </span>
        </div>

        {/* Hover actions */}
        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="h-7 flex-1 gap-1 text-xs"
          >
            <Pencil className="h-3 w-3" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="h-7 gap-1 border-red-500/30 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SpeciesView;
