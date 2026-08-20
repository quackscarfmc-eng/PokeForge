"use client";

import { useMemo, useState } from "react";
import { useEntities, useDeleteEntity, useDuplicateEntity } from "@/components/shared/entity-hooks";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, EmptyState, StatPill } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ItemEditor } from "@/components/modules/items/item-editor";
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
  Backpack,
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  Coins,
  Hash,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Item {
  id: string;
  projectId: string;
  constantName: string;
  itemId: number;
  name: string;
  description?: string | null;
  pocket: string;
  price: number;
  effect: string;
  holdEffect: string;
  flingPower: number;
  importance: number;
  category: string;
  isTM: boolean;
  tmMoveConstant?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Pocket → badge color (emerald/amber palette, no blue/indigo)
const POCKET_COLORS: Record<string, string> = {
  POCKET_BALLS: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  POCKET_TM_HM: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  POCKET_BERRIES: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  POCKET_KEY_ITEMS: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  POCKET_ITEMS: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  POCKET_MAIL: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
  POCKET_BATTLE_ITEMS: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  POCKET_FUEL: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
};

const POCKET_NAMES: Record<string, string> = {
  POCKET_BALLS: "Poké Balls",
  POCKET_TM_HM: "TMs / HMs",
  POCKET_BERRIES: "Berries",
  POCKET_KEY_ITEMS: "Key Items",
  POCKET_ITEMS: "Items",
  POCKET_MAIL: "Mail",
  POCKET_BATTLE_ITEMS: "Battle Items",
  POCKET_FUEL: "Fuel",
};

function pocketClass(pocket: string) {
  return POCKET_COLORS[pocket] ?? "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
}

export function ItemsView() {
  const { currentProjectId } = useAppStore();
  const { data, isLoading } = useEntities<Item>("items");
  const items = data?.items ?? [];

  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  const deleteItem = useDeleteEntity("items");
  const duplicateItem = useDuplicateEntity("items");

  // Fetch project (for nextItemId prefill)
  const { data: projectData } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${currentProjectId}`);
      if (!r.ok) throw new Error("Failed to fetch project");
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const nextItemId = projectData?.project?.nextItemId ?? 5001;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.constantName.toLowerCase().includes(q) ||
        String(it.itemId).includes(q) ||
        (it.description ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const tmCount = items.filter((i) => i.isTM).length;

  function openNew() {
    setEditing(null);
    setEditorSession((s) => s + 1);
    setEditorOpen(true);
  }
  function openEdit(item: Item) {
    setEditing(item);
    setEditorSession((s) => s + 1);
    setEditorOpen(true);
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    deleteItem.mutate(
      { id: deleteTarget.id, mode: "force" },
      { onSettled: () => setDeleteTarget(null) },
    );
  }

  return (
    <div>
      <PageHeader
        title="Items"
        description="Custom items, Poké Balls, berries, TMs and key items for your pokeemerald-expansion project."
        icon={Backpack}
        actions={
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> New item
          </Button>
        }
      />

      {/* Quick stats + search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <StatPill label="Total" value={items.length} />
          <StatPill label="TMs / HMs" value={tmCount} color="#d97706" />
          <StatPill label="Next ID" value={nextItemId} color="#059669" />
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items by name, constant, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading items…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Backpack}
          title={search ? "No items match your search" : "No items yet"}
          description={
            search
              ? "Try a different search term, or clear the box to see all items."
              : "Create your first custom item — a Poké Ball, a berry, a TM, or a key item."
          }
          action={
            !search && (
              <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4" /> Create item
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="group relative overflow-hidden border-border transition-all hover:border-emerald-500/40 hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{item.name}</CardTitle>
                    <CardDescription className="mt-0.5 truncate font-mono text-[11px]">
                      {item.constantName}
                    </CardDescription>
                  </div>
                  {item.isTM && (
                    <Badge className="shrink-0 border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      <Sparkles className="h-3 w-3" /> TM
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={cn("border", pocketClass(item.pocket))}>
                    {POCKET_NAMES[item.pocket] ?? item.pocket}
                  </Badge>
                  <Badge variant="outline" className="border-border bg-card text-muted-foreground">
                    <Hash className="h-3 w-3" /> {item.itemId}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold">{item.price.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">Poké</span>
                </div>
                {item.description ? (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                ) : (
                  <p className="mt-2 text-xs italic text-muted-foreground/60">No description</p>
                )}

                {/* Hover actions */}
                <div className="mt-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(item)}
                    className="h-7 flex-1 gap-1 text-xs"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => duplicateItem.mutate(item.id)}
                    className="h-7 gap-1 border-blue-500/30 text-xs text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                    aria-label="Duplicate item"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(item)}
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

      {/* Editor — keyed by session so the form re-initializes on each open */}
      <ItemEditor
        key={`item-editor-${editorSession}`}
        item={editing}
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) setEditing(null);
        }}
        nextItemId={nextItemId}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete item?"
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

export default ItemsView;
