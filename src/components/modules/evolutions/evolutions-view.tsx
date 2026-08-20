"use client";

import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, EmptyState } from "@/components/shared/page-header";
import { TypeBadge } from "@/components/shared/type-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, ArrowRight, Sparkles, Star, Zap } from "lucide-react";
import { POKEMON_TYPES, TYPE_COLOR, TYPE_NAME, EVO_METHODS } from "@/lib/poke-constants";
import { cn } from "@/lib/utils";

interface LevelUpMove {
  level: number;
  moveConstant: string;
}

interface Evolution {
  method: string;
  param: string;
  targetSpecies: string;
}

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
  types: string;
  abilities: string;
  flags: string;
  spriteFrontDataUrl: string | null;
  learnsetMoves: LevelUpMove[];
  evolutions: Evolution[];
}

interface ChainNode {
  species: Species;
  children: ChainNode[];
  evolutionMethod?: string;
  evolutionParam?: string;
}

export function EvolutionsView() {
  const { currentProjectId, setView } = useAppStore();

  const { data, isLoading } = useQuery({
    queryKey: ["species", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/species?projectId=${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const allSpecies: Species[] = data?.species ?? [];

  // Build evolution chains: find root species (not targeted by any evolution)
  const targetedSpecies = new Set<string>();
  for (const s of allSpecies) {
    for (const evo of s.evolutions || []) {
      if (evo.targetSpecies && evo.method !== "EVO_NONE") {
        targetedSpecies.add(evo.targetSpecies);
      }
    }
  }

  // Roots = species that are NOT targeted by any evolution
  const roots = allSpecies.filter((s) => !targetedSpecies.has(s.constantName));

  // Build tree recursively
  const buildTree = (species: Species, visited = new Set<string>()): ChainNode => {
    if (visited.has(species.constantName)) {
      return { species, children: [] };
    }
    visited.add(species.constantName);
    const children: ChainNode[] = [];
    for (const evo of species.evolutions || []) {
      if (evo.method === "EVO_NONE" || !evo.targetSpecies) continue;
      const child = allSpecies.find((s) => s.constantName === evo.targetSpecies);
      if (child) {
        children.push({
          species: child,
          evolutionMethod: evo.method,
          evolutionParam: evo.param,
          children: buildTree(child, new Set(visited)).children,
        });
      }
    }
    return { species, children };
  };

  const chains = roots.map((r) => buildTree(r));

  // Species with no evolutions at all (standalone)
  const standalone = allSpecies.filter(
    (s) => (s.evolutions || []).every((e) => e.method === "EVO_NONE") && !targetedSpecies.has(s.constantName),
  );
  const chainsWithEvolution = chains.filter((c) => c.children.length > 0);
  const standaloneNoChain = chains.filter((c) => c.children.length === 0);

  const evoMethodLabel = (method: string, param: string) => {
    const m = EVO_METHODS.find((e) => e.constant === method);
    const label = m?.name ?? method.replace("EVO_", "").replace(/_/g, " ");
    if (method === "EVO_LEVEL") return `Lv. ${param}`;
    if (method === "EVO_ITEM" || method === "EVO_ITEM_HOLD_DAY" || method === "EVO_ITEM_HOLD_NIGHT") return param;
    if (method === "EVO_FRIENDSHIP") return "Friendship";
    if (method === "EVO_TRADE") return "Trade";
    return label;
  };

  const evoIcon = (method: string) => {
    if (method === "EVO_LEVEL") return <Zap className="h-3 w-3" />;
    if (method === "EVO_ITEM" || method.includes("ITEM")) return <Star className="h-3 w-3" />;
    if (method === "EVO_TRADE") return <ArrowRight className="h-3 w-3" />;
    return <Sparkles className="h-3 w-3" />;
  };

  const bst = (s: Species) =>
    s.baseHP + s.baseAttack + s.baseDefense + s.baseSpeed + s.baseSpAttack + s.baseSpDefense;

  return (
    <div>
      <PageHeader
        title="Evolution Chains"
        description="Visual tree of how your custom Pokémon evolve. Roots are base species; branches show evolution paths."
        icon={GitBranch}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{chainsWithEvolution.length} chains</Badge>
        <Badge variant="outline">{standaloneNoChain.length} standalone</Badge>
        <Badge variant="outline">{allSpecies.length} total species</Badge>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : allSpecies.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No species yet"
          description="Create custom Pokémon with evolutions to see them visualized here as a tree."
          action={<Button onClick={() => setView("species")}>Go to Pokémon</Button>}
        />
      ) : (
        <div className="space-y-6">
          {/* Chains with evolutions */}
          {chainsWithEvolution.map((chain, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  Chain: {chain.species.speciesName}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto custom-scroll p-6">
                  <ChainTreeView node={chain} evoMethodLabel={evoMethodLabel} evoIcon={evoIcon} bst={bst} depth={0} />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Standalone species (no evolutions) */}
          {standaloneNoChain.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Standalone Species (no evolutions)</CardTitle>
                <CardDescription>These Pokémon don't evolve from or into anything.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {standaloneNoChain.map((node) => {
                    const s = node.species;
                    const types = JSON.parse(s.types || "[]") as string[];
                    const flags = JSON.parse(s.flags || "[]") as string[];
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3"
                      >
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: TYPE_COLOR(types[0] || "TYPE_NORMAL") }}
                        >
                          {s.speciesName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold">{s.speciesName}</span>
                            {flags.includes("isMythical") && <Star className="h-3 w-3 text-amber-400" />}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">{s.constantName}</div>
                          <div className="mt-0.5 flex gap-1">
                            {types.map((t) => <TypeBadge key={t} constant={t} size="xs" />)}
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          BST {bst(s)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Recursive tree renderer
function ChainTreeView({
  node,
  evoMethodLabel,
  evoIcon,
  bst,
  depth,
}: {
  node: ChainNode;
  evoMethodLabel: (m: string, p: string) => string;
  evoIcon: (m: string) => React.ReactNode;
  bst: (s: Species) => number;
  depth: number;
}) {
  const s = node.species;
  const types = JSON.parse(s.types || "[]") as string[];
  const flags = JSON.parse(s.flags || "[]") as string[];
  const primaryColor = TYPE_COLOR(types[0] || "TYPE_NORMAL");

  return (
    <div className={cn("flex flex-col items-center", depth === 0 ? "" : "mt-4")}>
      {/* Species node */}
      <div
        className="relative flex flex-col items-center rounded-xl border-2 bg-card p-4 shadow-sm transition-all hover:shadow-md"
        style={{ borderColor: primaryColor + "60" }}
      >
        {/* Sprite or colored circle */}
        <div
          className="mb-2 flex h-16 w-16 items-center justify-center rounded-lg text-lg font-bold text-white"
          style={{ backgroundColor: primaryColor }}
        >
          {s.speciesName.slice(0, 3).toUpperCase()}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold">{s.speciesName}</span>
          {flags.includes("isMythical") && <Star className="h-3 w-3 text-amber-400" />}
          {flags.includes("isRestrictedLegendary") && <Sparkles className="h-3 w-3 text-purple-400" />}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">{s.constantName}</div>
        <div className="mt-1.5 flex gap-1">
          {types.map((t) => <TypeBadge key={t} constant={t} size="xs" />)}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>BST <span className="font-bold text-foreground">{bst(s)}</span></span>
          <span>·</span>
          <span>#{s.speciesId}</span>
        </div>
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <div className="flex flex-row gap-6 pt-4">
          {node.children.map((child, i) => (
            <div key={i} className="flex flex-col items-center">
              {/* Connector with evolution method */}
              <div className="flex flex-col items-center pb-2">
                <div className="h-6 w-0.5 bg-border" />
                <div className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {evoIcon(child.evolutionMethod || "EVO_LEVEL")}
                  {evoMethodLabel(child.evolutionMethod || "EVO_LEVEL", child.evolutionParam || "")}
                </div>
                <div className="h-4 w-0.5 bg-border" />
              </div>
              <ChainTreeView
                node={child}
                evoMethodLabel={evoMethodLabel}
                evoIcon={evoIcon}
                bst={bst}
                depth={depth + 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
