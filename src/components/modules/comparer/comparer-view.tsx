"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, EmptyState } from "@/components/shared/page-header";
import { TypeBadge } from "@/components/shared/type-badge";
import { StatRadar } from "@/components/shared/stat-radar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitCompare, ArrowLeftRight, Trophy, Minus, Plus, Star } from "lucide-react";
import { STAT_META, GROWTH_RATES, BUILTIN_ABILITIES } from "@/lib/poke-constants";
import { cn } from "@/lib/utils";

interface LevelUpMove { level: number; moveConstant: string; }
interface Evolution { method: string; param: string; targetSpecies: string; }

interface Species {
  id: string;
  constantName: string;
  speciesId: number;
  speciesName: string;
  baseHP: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseSpAttack: number;
  baseSpDefense: number;
  evYieldHP: number;
  evYieldAttack: number;
  evYieldDefense: number;
  evYieldSpeed: number;
  evYieldSpAttack: number;
  evYieldSpDefense: number;
  types: string;
  abilities: string;
  catchRate: number;
  expYield: number;
  genderRatio: number;
  eggCycles: number;
  friendship: number;
  growthRate: string;
  eggGroups: string;
  bodyColor: string;
  height: number;
  weight: number;
  flags: string;
  learnsetMoves: LevelUpMove[];
  evolutions: Evolution[];
}

export function ComparerView() {
  const { currentProjectId } = useAppStore();
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["species", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/species?projectId=${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const allSpecies: Species[] = data?.species ?? [];

  // Auto-select first two species
  const left = allSpecies.find((s) => s.id === leftId) ?? allSpecies[0];
  const right = allSpecies.find((s) => s.id === rightId) ?? allSpecies[1];

  const abilityName = (constant: string) =>
    BUILTIN_ABILITIES.find((a) => a.constant === constant)?.name ?? constant.replace("ABILITY_", "").replace(/_/g, " ");

  const statDiff = (a: number, b: number) => a - b;
  const winner = (a: number, b: number) => (a > b ? "left" : a < b ? "right" : "tie");

  const bstA = left ? left.baseHP + left.baseAttack + left.baseDefense + left.baseSpeed + left.baseSpAttack + left.baseSpDefense : 0;
  const bstB = right ? right.baseHP + right.baseAttack + right.baseDefense + right.baseSpeed + right.baseSpAttack + right.baseSpDefense : 0;

  return (
    <div>
      <PageHeader
        title="Pokémon Comparer"
        description="Compare two custom Pokémon side-by-side: stats, types, abilities, learnsets and more. Perfect for balancing."
        icon={GitCompare}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : allSpecies.length < 2 ? (
        <EmptyState
          icon={GitCompare}
          title="Need at least 2 Pokémon"
          description="Create at least 2 custom Pokémon to compare them side by side."
        />
      ) : (
        <div className="space-y-4">
          {/* Selectors */}
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
            <Select value={left?.id} onValueChange={setLeftId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select first Pokémon" />
              </SelectTrigger>
              <SelectContent>
                {allSpecies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.speciesName} ({s.constantName})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
            </div>
            <Select value={right?.id} onValueChange={setRightId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select second Pokémon" />
              </SelectTrigger>
              <SelectContent>
                {allSpecies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.speciesName} ({s.constantName})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {left && right && (
            <>
              {/* Header comparison */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
                <SpeciesHeader species={left} />
                <div className="flex items-center justify-center">
                  <Badge variant="outline" className="font-mono text-xs">VS</Badge>
                </div>
                <SpeciesHeader species={right} />
              </div>

              {/* Base stats comparison */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Base Stats</CardTitle>
                  <CardDescription>Side-by-side stat comparison with difference</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-[1fr_60px_60px_60px_1fr] items-center gap-2">
                    {/* Left values */}
                    {STAT_META.map((stat) => {
                      const valA = left[stat.key as keyof Species] as number;
                      const valB = right[stat.key as keyof Species] as number;
                      const diff = statDiff(valA, valB);
                      const win = winner(valA, valB);
                      return (
                        <div key={stat.key} className="contents">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-medium" style={{ color: stat.color }}>{stat.label}</span>
                            <span className={cn("w-8 text-right text-sm font-bold", win === "left" && "text-emerald-500")}>{valA}</span>
                          </div>
                          {/* Left bar */}
                          <div className="h-2 rounded-full bg-muted overflow-hidden flex justify-end">
                            <div className="h-full rounded-l-full transition-all" style={{ width: `${(valA / 255) * 100}%`, backgroundColor: stat.color }} />
                          </div>
                          {/* Diff */}
                          <div className="flex items-center justify-center text-xs font-bold">
                            {diff > 0 ? <span className="text-emerald-500">+{diff}</span> :
                             diff < 0 ? <span className="text-red-500">{diff}</span> :
                             <Minus className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          {/* Right bar */}
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-r-full transition-all" style={{ width: `${(valB / 255) * 100}%`, backgroundColor: stat.color }} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn("w-8 text-left text-sm font-bold", win === "right" && "text-emerald-500")}>{valB}</span>
                            <span className="text-xs font-medium" style={{ color: stat.color }}>{stat.label}</span>
                          </div>
                        </div>
                      );
                    })}
                    {/* BST row */}
                    <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
                      <span className="text-xs font-semibold text-muted-foreground">BST</span>
                      <span className={cn("w-8 text-right text-sm font-black", bstA > bstB && "text-emerald-500")}>{bstA}</span>
                    </div>
                    <div className="border-t border-border pt-2" />
                    <div className="flex items-center justify-center border-t border-border pt-2 text-xs font-bold">
                      {bstA > bstB ? <span className="text-emerald-500">+{bstA - bstB}</span> :
                       bstB > bstA ? <span className="text-red-500">-{bstB - bstA}</span> :
                       <Minus className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="border-t border-border pt-2" />
                    <div className="flex items-center gap-2 border-t border-border pt-2">
                      <span className={cn("w-8 text-left text-sm font-black", bstB > bstA && "text-emerald-500")}>{bstB}</span>
                      <span className="text-xs font-semibold text-muted-foreground">BST</span>
                    </div>
                  </div>

                  {/* Radar charts */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border bg-card/50 p-3">
                      <div className="mb-1 text-center text-xs font-semibold">{left.speciesName}</div>
                      <StatRadar stats={{
                        baseHP: left.baseHP, baseAttack: left.baseAttack, baseDefense: left.baseDefense,
                        baseSpeed: left.baseSpeed, baseSpAttack: left.baseSpAttack, baseSpDefense: left.baseSpDefense,
                      }} compareStats={{
                        baseHP: right.baseHP, baseAttack: right.baseAttack, baseDefense: right.baseDefense,
                        baseSpeed: right.baseSpeed, baseSpAttack: right.baseSpAttack, baseSpDefense: right.baseSpDefense,
                      }} size={180} />
                    </div>
                    <div className="rounded-lg border border-border bg-card/50 p-3">
                      <div className="mb-1 text-center text-xs font-semibold">{right.speciesName}</div>
                      <StatRadar stats={{
                        baseHP: right.baseHP, baseAttack: right.baseAttack, baseDefense: right.baseDefense,
                        baseSpeed: right.baseSpeed, baseSpAttack: right.baseSpAttack, baseSpDefense: right.baseSpDefense,
                      }} compareStats={{
                        baseHP: left.baseHP, baseAttack: left.baseAttack, baseDefense: left.baseDefense,
                        baseSpeed: left.baseSpeed, baseSpAttack: left.baseSpAttack, baseSpDefense: left.baseSpDefense,
                      }} size={180} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attribute comparison */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Attributes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {[
                      { label: "Types", left: JSON.parse(left.types || "[]"), right: JSON.parse(right.types || "[]"), render: (v: string[]) => v.map((t) => <TypeBadge key={t} constant={t} size="xs" />) },
                      { label: "Abilities", left: JSON.parse(left.abilities || "[]"), right: JSON.parse(right.abilities || "[]"), render: (v: string[]) => v.filter((a) => a !== "ABILITY_NONE").map((a) => <Badge key={a} variant="secondary" className="text-[10px]">{abilityName(a)}</Badge>) },
                      { label: "Catch Rate", left: left.catchRate, right: right.catchRate, render: (v: number) => <span className="font-mono text-xs">{v}</span> },
                      { label: "EXP Yield", left: left.expYield, right: right.expYield, render: (v: number) => <span className="font-mono text-xs">{v}</span> },
                      { label: "Gender Ratio", left: left.genderRatio, right: right.genderRatio, render: (v: number) => <span className="font-mono text-xs">{v === 255 ? "Genderless" : v === 254 ? "100% F" : v === 0 ? "100% M" : `${Math.round(v/2.54)}% F`}</span> },
                      { label: "Egg Cycles", left: left.eggCycles, right: right.eggCycles, render: (v: number) => <span className="font-mono text-xs">{v}</span> },
                      { label: "Friendship", left: left.friendship, right: right.friendship, render: (v: number) => <span className="font-mono text-xs">{v}</span> },
                      { label: "Growth Rate", left: left.growthRate, right: right.growthRate, render: (v: string) => <span className="text-xs">{v.replace("GROWTH_", "").replace(/_/g, " ")}</span> },
                      { label: "Egg Groups", left: JSON.parse(left.eggGroups || "[]"), right: JSON.parse(right.eggGroups || "[]"), render: (v: string[]) => v.map((g) => <Badge key={g} variant="outline" className="text-[10px]">{g.replace("EGG_GROUP_", "").replace(/_/g, " ")}</Badge>) },
                      { label: "Height", left: left.height, right: right.height, render: (v: number) => <span className="font-mono text-xs">{(v / 10).toFixed(1)} m</span> },
                      { label: "Weight", left: left.weight, right: right.weight, render: (v: number) => <span className="font-mono text-xs">{(v / 10).toFixed(1)} kg</span> },
                    ].map((row) => (
                      <div key={row.label} className="grid grid-cols-3 items-center gap-2 px-4 py-2">
                        <div className="flex items-center gap-1.5">{row.render(row.left)}</div>
                        <div className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</div>
                        <div className="flex items-center justify-end gap-1.5">{row.render(row.right)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Learnset comparison */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Learnset Comparison</CardTitle>
                  <CardDescription>Level-up moves side by side</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="mb-2 text-xs font-semibold text-muted-foreground">{left.speciesName}</div>
                      <div className="space-y-1">
                        {left.learnsetMoves.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs">
                            <Badge variant="outline" className="text-[10px]">Lv.{m.level}</Badge>
                            <span className="font-mono">{m.moveConstant.replace("MOVE_", "").replace(/_/g, " ")}</span>
                          </div>
                        ))}
                        {left.learnsetMoves.length === 0 && <p className="text-xs text-muted-foreground">No level-up moves</p>}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold text-muted-foreground">{right.speciesName}</div>
                      <div className="space-y-1">
                        {right.learnsetMoves.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs">
                            <Badge variant="outline" className="text-[10px]">Lv.{m.level}</Badge>
                            <span className="font-mono">{m.moveConstant.replace("MOVE_", "").replace(/_/g, " ")}</span>
                          </div>
                        ))}
                        {right.learnsetMoves.length === 0 && <p className="text-xs text-muted-foreground">No level-up moves</p>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Winner summary */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="font-semibold">{left.speciesName}</div>
                      {STAT_META.map((s) => {
                        const valA = left[s.key as keyof Species] as number;
                        const valB = right[s.key as keyof Species] as number;
                        return valA > valB ? (
                          <div key={s.key} className="flex items-center gap-1 text-xs text-emerald-600">
                            <Plus className="h-3 w-3" /> Higher {s.label} (+{valA - valB})
                          </div>
                        ) : null;
                      })}
                      {bstA > bstB && <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Trophy className="h-3 w-3" /> Higher BST (+{bstA - bstB})</div>}
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold">{right.speciesName}</div>
                      {STAT_META.map((s) => {
                        const valA = left[s.key as keyof Species] as number;
                        const valB = right[s.key as keyof Species] as number;
                        return valB > valA ? (
                          <div key={s.key} className="flex items-center gap-1 text-xs text-emerald-600">
                            <Plus className="h-3 w-3" /> Higher {s.label} (+{valB - valA})
                          </div>
                        ) : null;
                      })}
                      {bstB > bstA && <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Trophy className="h-3 w-3" /> Higher BST (+{bstB - bstA})</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SpeciesHeader({ species }: { species: Species }) {
  const types = JSON.parse(species.types || "[]") as string[];
  const flags = JSON.parse(species.flags || "[]") as string[];
  const primaryColor = types[0] ? getTypeColor(types[0]) : "#68A090";
  const bst = species.baseHP + species.baseAttack + species.baseDefense + species.baseSpeed + species.baseSpAttack + species.baseSpDefense;

  return (
    <div className="rounded-xl border-2 p-4" style={{ borderColor: primaryColor + "60" }}>
      <div className="flex flex-col items-center gap-2">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-lg text-lg font-bold text-white"
          style={{ backgroundColor: primaryColor }}
        >
          {species.speciesName.slice(0, 3).toUpperCase()}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold">{species.speciesName}</span>
          {flags.includes("isMythical") && <Star className="h-3 w-3 text-amber-400" />}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">{species.constantName}</div>
        <div className="flex gap-1">
          {types.map((t) => <TypeBadge key={t} constant={t} size="xs" />)}
        </div>
        <Badge variant="outline" className="text-[10px]">BST {bst}</Badge>
      </div>
    </div>
  );
}

// Helper to get type color (imported indirectly via poke-constants)
function getTypeColor(constant: string): string {
  const colors: Record<string, string> = {
    TYPE_NORMAL: "#A8A77A", TYPE_FIRE: "#EE8130", TYPE_WATER: "#6390F0", TYPE_GRASS: "#7AC74C",
    TYPE_ELECTRIC: "#F7D02C", TYPE_ICE: "#96D9D6", TYPE_FIGHTING: "#C22E28", TYPE_POISON: "#A33EA1",
    TYPE_GROUND: "#E2BF65", TYPE_FLYING: "#A98FF3", TYPE_PSYCHIC: "#F95587", TYPE_BUG: "#A6B91A",
    TYPE_ROCK: "#B6A136", TYPE_GHOST: "#735797", TYPE_DRAGON: "#6F35FC", TYPE_DARK: "#705746",
    TYPE_STEEL: "#B7B7CE", TYPE_FAIRY: "#D685AD", TYPE_STELLAR: "#406580",
  };
  return colors[constant] ?? "#68A090";
}
