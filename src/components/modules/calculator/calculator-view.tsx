"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, EmptyState } from "@/components/shared/page-header";
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
import {
  Sword,
  Shield,
  Zap,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Star,
  Calculator,
} from "lucide-react";
import {
  POKEMON_TYPES,
  TYPE_COLOR,
  TYPE_NAME,
  CANONICAL_TYPE_CHART,
  EFFECTIVENESS_OPTIONS,
} from "@/lib/poke-constants";
import { cn } from "@/lib/utils";

export function CalculatorView() {
  const { currentProjectId } = useAppStore();
  const [attackType, setAttackType] = useState("TYPE_FIRE");
  const [defendTypes, setDefendTypes] = useState<string[]>(["TYPE_GRASS"]);

  // Fetch custom types to include in the calculator
  const { data: customTypesData } = useQuery({
    queryKey: ["types", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/types?projectId=${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const customTypes = customTypesData?.types ?? [];

  // Build the full type chart: builtin + custom
  const fullChart = useMemo(() => {
    const chart: Record<string, Record<string, number>> = { ...CANONICAL_TYPE_CHART };
    for (const t of customTypes) {
      const off = JSON.parse(t.offensiveMatrix || "{}");
      const def = JSON.parse(t.defensiveMatrix || "{}");
      chart[t.constantName] = off;
      // Add defensive entries: for each attacking type, what does it do to this custom type?
      for (const [atkType, mult] of Object.entries(def)) {
        if (!chart[atkType]) chart[atkType] = {};
        chart[atkType][t.constantName] = mult;
      }
    }
    return chart;
  }, [customTypes]);

  const allTypes = useMemo(() => {
    const builtin = POKEMON_TYPES.map((t) => ({ constant: t.constant, name: t.name, color: t.color, isCustom: false }));
    const custom = customTypes.map((t: any) => ({
      constant: t.constantName,
      name: t.name,
      color: t.colorHex,
      isCustom: true,
    }));
    return [...builtin, ...custom];
  }, [customTypes]);

  // Calculate effectiveness against each defending type
  const results = useMemo(() => {
    return allTypes.map((defType) => {
      let mult = 1;
      for (const def of defendTypes) {
        if (def === defType.constant) {
          // Get the multiplier from the chart
          const atkChart = fullChart[attackType] || {};
          const m = atkChart[defType.constant];
          if (m !== undefined) mult *= m;
        }
      }
      return { ...defType, mult };
    });
  }, [attackType, defendTypes, allTypes, fullChart]);

  // The single defending combo effectiveness
  const comboMult = useMemo(() => {
    let m = 1;
    for (const def of defendTypes) {
      const atkChart = fullChart[attackType] || {};
      const v = atkChart[def];
      if (v !== undefined) m *= v;
    }
    return m;
  }, [attackType, defendTypes, fullChart]);

  const toggleDefendType = (t: string) => {
    setDefendTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 2 ? [...prev, t] : [prev[1], t],
    );
  };

  const multColor = (m: number) => {
    if (m === 0) return "bg-slate-800 text-white border-slate-600";
    if (m >= 4) return "bg-emerald-600 text-white border-emerald-400";
    if (m >= 2) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40";
    if (m >= 0.5) return "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40";
    if (m < 0.5 && m > 0) return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40";
    return "bg-muted text-muted-foreground border-border";
  };

  const multLabel = (m: number) => {
    if (m === 0) return "0×";
    if (m === 0.25) return "¼×";
    if (m === 0.5) return "½×";
    if (m === 1) return "1×";
    return `${m}×`;
  };

  const multIcon = (m: number) => {
    if (m === 0) return <X className="h-4 w-4" />;
    if (m > 1) return <TrendingUp className="h-4 w-4" />;
    if (m < 1) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  // Sort results by effectiveness descending
  const sortedResults = [...results].sort((a, b) => b.mult - a.mult);

  return (
    <div>
      <PageHeader
        title="Type Calculator"
        description="Calculate type effectiveness for any attack vs defense combination. Includes your custom types."
        icon={Calculator}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAttackType("TYPE_FIRE");
              setDefendTypes(["TYPE_GRASS"]);
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Attacking type selector */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sword className="h-4 w-4 text-red-500" /> Attacking Type
            </CardTitle>
            <CardDescription>Choose the move's elemental type</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={attackType} onValueChange={setAttackType}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: TYPE_COLOR(attackType) }}
                  />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {allTypes.map((t) => (
                  <SelectItem key={t.constant} value={t.constant}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <span>{t.name}</span>
                      {t.isCustom && <Star className="h-2.5 w-2.5 text-amber-400" />}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Selected:</span>
              <Badge
                className="gap-1.5 text-white"
                style={{ backgroundColor: TYPE_COLOR(attackType) }}
              >
                <Sword className="h-3 w-3" />
                {TYPE_NAME(attackType)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Defending type(s) selector */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-blue-500" /> Defending Type(s)
            </CardTitle>
            <CardDescription>Click to select 1–2 types (dual-type combo)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scroll">
              {allTypes.map((t) => {
                const selected = defendTypes.includes(t.constant);
                return (
                  <button
                    key={t.constant}
                    onClick={() => toggleDefendType(t.constant)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all",
                      selected ? "border-foreground text-white shadow-sm scale-105" : "border-border hover:border-foreground/40",
                    )}
                    style={selected ? { backgroundColor: t.color } : undefined}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selected ? "rgba(255,255,255,0.6)" : t.color }} />
                    {t.name}
                    {t.isCustom && <Star className="h-2 w-2 text-amber-400" />}
                  </button>
                );
              })}
            </div>
            {defendTypes.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Defense:</span>
                {defendTypes.map((t) => (
                  <Badge
                    key={t}
                    className="gap-1.5 text-white"
                    style={{ backgroundColor: TYPE_COLOR(t) }}
                  >
                    <Shield className="h-3 w-3" />
                    {TYPE_NAME(t)}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-500" /> Result
            </CardTitle>
            <CardDescription>Combined effectiveness</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex items-center gap-2">
                <Badge className="gap-1.5 text-white" style={{ backgroundColor: TYPE_COLOR(attackType) }}>
                  <Sword className="h-3 w-3" />
                  {TYPE_NAME(attackType)}
                </Badge>
                <span className="text-2xl font-bold text-muted-foreground">→</span>
                {defendTypes.map((t) => (
                  <Badge key={t} className="gap-1.5 text-white" style={{ backgroundColor: TYPE_COLOR(t) }}>
                    <Shield className="h-3 w-3" />
                    {TYPE_NAME(t)}
                  </Badge>
                ))}
              </div>
              <div className={cn("flex flex-col items-center rounded-xl border-2 px-8 py-4", multColor(comboMult))}>
                <div className="flex items-center gap-2 text-3xl font-black">
                  {multIcon(comboMult)}
                  {multLabel(comboMult)}
                </div>
                <div className="text-xs font-medium opacity-80">
                  {comboMult === 0 ? "No effect" :
                   comboMult >= 4 ? "Devastating!" :
                   comboMult >= 2 ? "Super effective" :
                   comboMult >= 1 ? "Normal damage" :
                   comboMult >= 0.5 ? "Not very effective" :
                   comboMult > 0 ? "Barely scratches" : "No effect"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full type chart grid */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Effectiveness vs All Defending Types</CardTitle>
          <CardDescription>
            How <span className="font-semibold" style={{ color: TYPE_COLOR(attackType) }}>{TYPE_NAME(attackType)}</span> performs against every single type. Sorted by effectiveness.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {sortedResults.map((r) => (
              <div
                key={r.constant}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-2 transition-all hover:scale-105",
                  multColor(r.mult),
                )}
              >
                <div className="h-3 w-full rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-[10px] font-semibold">{r.name}</span>
                <span className="flex items-center gap-0.5 text-sm font-black">
                  {multIcon(r.mult)}
                  {multLabel(r.mult)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <span>Legend:</span>
            {EFFECTIVENESS_OPTIONS.map((o) => (
              <span key={o.value} className="flex items-center gap-1">
                <span className={cn("rounded border px-1 py-0.5 font-bold", multColor(o.value))}>
                  {multLabel(o.value)}
                </span>
                {o.label.split(" ")[0]}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
