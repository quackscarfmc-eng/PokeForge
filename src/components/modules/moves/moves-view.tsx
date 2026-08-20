"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, Swords, Sword, Zap, Sparkles } from "lucide-react";
import { useEntities, useDeleteEntity } from "@/components/shared/entity-hooks";
import { PageHeader, EmptyState, StatPill } from "@/components/shared/page-header";
import { TypeBadge } from "@/components/shared/type-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import {
  POKEMON_TYPES,
  MOVE_CATEGORIES,
  TYPE_COLOR,
} from "@/lib/poke-constants";
import { MoveEditor, type Move } from "./move-editor";

function parseFlags(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function categoryIcon(category: string) {
  if (category === "CATEGORY_PHYSICAL") return Sword;
  if (category === "CATEGORY_SPECIAL") return Zap;
  return Sparkles;
}

const CATEGORY_NAMES = MOVE_CATEGORIES.reduce<Record<string, string>>((acc, c) => {
  acc[c.constant] = c.name;
  return acc;
}, {});

const TYPE_NAMES = POKEMON_TYPES.reduce<Record<string, string>>((acc, t) => {
  acc[t.constant] = t.name;
  return acc;
}, {});

function typeName(constant: string): string {
  return TYPE_NAMES[constant] ?? constant.replace("TYPE_", "");
}

export function MovesView() {
  const { data, isLoading } = useEntities<Move>("moves");
  const moves = data?.moves ?? [];

  const deleteMove = useDeleteEntity("moves");

  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [current, setCurrent] = useState<Move | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Move | null>(null);
  const [editorSession, setEditorSession] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return moves;
    return moves.filter((m) => {
      const hay = [
        m.name,
        m.constantName,
        typeName(m.type),
        m.type,
        m.effect,
        m.category,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [moves, search]);

  const openCreate = () => {
    setCurrent(null);
    setEditorSession((n) => n + 1);
    setEditorOpen(true);
  };

  const openEdit = (move: Move) => {
    setCurrent(move);
    setEditorSession((n) => n + 1);
    setEditorOpen(true);
  };

  const confirmDelete = (mode?: "safe" | "force") => {
    if (!deleteTarget) return;
    deleteMove.mutate(
      { id: deleteTarget.id, mode: mode ?? "safe" },
      {
        onSuccess: () => setDeleteTarget(null),
        onError: () => {
          // Toast handled by hook; keep dialog open so user can switch to force.
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        title="Moves"
        description="Design custom battle moves for your pokeemerald-expansion project."
        icon={Swords}
        actions={
          <Button onClick={openCreate} size="sm" className="bg-primary">
            <Plus className="h-4 w-4" /> New move
          </Button>
        }
      />

      {/* Stats row */}
      <div className="mb-4 flex flex-wrap gap-2">
        <StatPill label="Total" value={moves.length} />
        <StatPill
          label="Physical"
          value={moves.filter((m) => m.category === "CATEGORY_PHYSICAL").length}
          color="#C22E28"
        />
        <StatPill
          label="Special"
          value={moves.filter((m) => m.category === "CATEGORY_SPECIAL").length}
          color="#EE8130"
        />
        <StatPill
          label="Status"
          value={moves.filter((m) => m.category === "CATEGORY_STATUS").length}
          color="#735797"
        />
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, constant, type…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-md border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Swords}
          title={moves.length === 0 ? "No moves yet" : "No matches"}
          description={
            moves.length === 0
              ? "Create your first custom move — Flame Wheel, Frost Punch, anything you can dream up."
              : "Try a different search term."
          }
          action={
            moves.length === 0 ? (
              <Button onClick={openCreate} size="sm" className="bg-primary">
                <Plus className="h-4 w-4" /> New move
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Power</TableHead>
                  <TableHead className="text-right">Acc</TableHead>
                  <TableHead className="text-right">PP</TableHead>
                  <TableHead className="font-mono text-[11px] uppercase">Constant</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const Icon = categoryIcon(m.category);
                  const typeColor = TYPE_COLOR(m.type);
                  const flags = parseFlags(m.flags);
                  return (
                    <TableRow key={m.id} className="group">
                      <TableCell className="pl-4">
                        <button
                          onClick={() => openEdit(m)}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {m.name}
                        </button>
                        {m.description && (
                          <p className="line-clamp-1 text-[11px] text-muted-foreground">
                            {m.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <TypeBadge constant={m.type} size="xs" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-md text-white"
                            style={{ backgroundColor: typeColor }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {CATEGORY_NAMES[m.category] ?? m.category}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {m.power > 0 ? (
                          <span className={powerColor(m.power)}>{m.power}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {m.accuracy > 0 ? (
                          <span>{m.accuracy}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{m.pp}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <code className="font-mono text-[11px] text-muted-foreground">
                            {m.constantName}
                          </code>
                          <span className="font-mono text-[10px] text-muted-foreground/70">
                            #{m.moveId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(m)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit move</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                                onClick={() => setDeleteTarget(m)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete move</TooltipContent>
                          </Tooltip>
                        </div>
                        {flags.length > 0 && (
                          <div className="mt-1 flex flex-wrap justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Badge variant="outline" className="text-[9px] font-normal">
                              {flags.length} flag{flags.length === 1 ? "" : "s"}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-2 md:hidden">
            {filtered.map((m) => {
              const Icon = categoryIcon(m.category);
              const typeColor = TYPE_COLOR(m.type);
              const flags = parseFlags(m.flags);
              return (
                <Card key={m.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(m)}
                            className="truncate font-semibold hover:text-primary hover:underline"
                          >
                            {m.name}
                          </button>
                          <TypeBadge constant={m.type} size="xs" />
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div
                            className="flex h-5 w-5 items-center justify-center rounded text-white"
                            style={{ backgroundColor: typeColor }}
                          >
                            <Icon className="h-3 w-3" />
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {CATEGORY_NAMES[m.category] ?? m.category}
                          </span>
                        </div>
                        <code className="mt-2 block font-mono text-[10px] text-muted-foreground">
                          {m.constantName} · #{m.moveId}
                        </code>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <StatPill
                        label="PWR"
                        value={m.power > 0 ? m.power : "—"}
                        color={m.power > 0 ? powerColor(m.power) : undefined}
                      />
                      <StatPill
                        label="ACC"
                        value={m.accuracy > 0 ? `${m.accuracy}%` : "—"}
                      />
                      <StatPill label="PP" value={m.pp} />
                    </div>
                    {flags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {flags.slice(0, 3).map((f) => (
                          <Badge
                            key={f}
                            variant="outline"
                            className="font-mono text-[9px] font-normal"
                          >
                            {f.replace("MOVE_FLAG_", "")}
                          </Badge>
                        ))}
                        {flags.length > 3 && (
                          <Badge variant="outline" className="text-[9px] font-normal">
                            +{flags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <MoveEditor
        key={`${current?.id ?? "new"}-${editorSession}`}
        move={current}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "move"}?`}
        description={
          deleteTarget
            ? `This will permanently remove ${deleteTarget.constantName} from your project. Safe mode blocks delete if the move is referenced in any learnset.`
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

function powerColor(power: number): string {
  if (power >= 120) return "text-red-600 dark:text-red-400";
  if (power >= 80) return "text-amber-600 dark:text-amber-400";
  if (power >= 40) return "text-emerald-600 dark:text-emerald-400";
  return "text-muted-foreground";
}
