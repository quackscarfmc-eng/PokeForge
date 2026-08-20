"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MapPin, Plus, Pencil, Trash2, TreePine, Droplets, Pickaxe, Fish, FileJson, Copy } from "lucide-react";
import { toast } from "sonner";
import { useEntities } from "@/components/shared/entity-hooks";
import { generateEncountersCode } from "@/lib/poke-codegen";
import { cn } from "@/lib/utils";

const METHODS = [
  { value: "grass", label: "Grass / Cave", icon: TreePine, color: "#7AC74C" },
  { value: "water", label: "Surfing", icon: Droplets, color: "#6390F0" },
  { value: "rock_smash", label: "Rock Smash", icon: Pickaxe, color: "#B6A136" },
  { value: "fishing_old", label: "Old Rod", icon: Fish, color: "#96D9D6" },
  { value: "fishing_good", label: "Good Rod", icon: Fish, color: "#6390F0" },
  { value: "fishing_super", label: "Super Rod", icon: Fish, color: "#A98FF3" },
];

interface Encounter {
  id: string;
  mapLabel: string;
  location: string;
  method: string;
  speciesConstant: string;
  minLevel: number;
  maxLevel: number;
  encounterRate: number;
  heldItemConstant: string | null;
  formId: number | null;
}

export function EncountersView() {
  const { currentProjectId } = useAppStore();
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Encounter | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Encounter | null>(null);
  const [search, setSearch] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["encounters", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/encounters?projectId=${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const encounters: Encounter[] = data?.encounters ?? [];

  const { data: speciesData } = useEntities<any>("species");
  const speciesConstants = (speciesData?.species ?? []).map((s: any) => s.constantName);

  const filtered = encounters.filter(
    (e) =>
      e.location.toLowerCase().includes(search.toLowerCase()) ||
      e.mapLabel.toLowerCase().includes(search.toLowerCase()) ||
      e.speciesConstant.toLowerCase().includes(search.toLowerCase()),
  );

  // group by mapLabel
  const byMap = new Map<string, Encounter[]>();
  for (const e of filtered) {
    if (!byMap.has(e.mapLabel)) byMap.set(e.mapLabel, []);
    byMap.get(e.mapLabel)!.push(e);
  }

  const createMut = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch("/api/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId, ...body }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Encounter added");
      qc.invalidateQueries({ queryKey: ["encounters"] });
      setEditorOpen(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const r = await fetch(`/api/encounters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Encounter updated");
      qc.invalidateQueries({ queryKey: ["encounters"] });
      setEditorOpen(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/encounters/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Encounter deleted");
      qc.invalidateQueries({ queryKey: ["encounters"] });
    },
  });

  const generatedCode = generateEncountersCode(
    encounters.map((e) => ({
      mapLabel: e.mapLabel,
      location: e.location,
      method: e.method,
      speciesConstant: e.speciesConstant,
      minLevel: e.minLevel,
      maxLevel: e.maxLevel,
      encounterRate: e.encounterRate,
      heldItemConstant: e.heldItemConstant,
      formId: e.formId,
    })),
  );

  return (
    <div>
      <PageHeader
        title="Wild Encounters"
        description="Design where your custom Pokémon appear in the wild. Exports to wild_encounters.json."
        icon={MapPin}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCodeOpen(true)} disabled={encounters.length === 0}>
              <FileJson className="mr-2 h-4 w-4" /> Preview JSON
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setEditorSession((s) => s + 1);
                setEditorOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add encounter
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by location, map, or species…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Badge variant="secondary">{encounters.length} encounters</Badge>
        <Badge variant="secondary">{byMap.size} maps</Badge>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : encounters.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No wild encounters yet"
          description="Add encounters to place your custom Pokémon on routes, in caves, or in water."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setEditorSession((s) => s + 1);
                setEditorOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add first encounter
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {Array.from(byMap.entries()).map(([mapLabel, encs]) => (
            <Card key={mapLabel}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="h-4 w-4 text-primary" />
                      {encs[0].location}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">{mapLabel}</CardDescription>
                  </div>
                  <Badge variant="outline">{encs.length} entries</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {encs.map((e) => {
                    const method = METHODS.find((m) => m.value === e.method);
                    const MIcon = method?.icon ?? TreePine;
                    return (
                      <div
                        key={e.id}
                        className="group flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40"
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: (method?.color ?? "#999") + "22", color: method?.color }}
                        >
                          <MIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-medium">{e.speciesConstant}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {method?.label ?? e.method}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Lv. {e.minLevel}–{e.maxLevel}
                            </span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{e.encounterRate}% rate</span>
                            {e.heldItemConstant && (
                              <Badge variant="secondary" className="text-[10px]">
                                {e.heldItemConstant}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(e);
                              setEditorSession((s) => s + 1);
                              setEditorOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(e)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EncounterEditor
        key={`enc-${editorSession}`}
        encounter={editing}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        speciesConstants={speciesConstants}
        onSave={(data) => {
          if (editing) updateMut.mutate({ id: editing.id, data });
          else createMut.mutate(data);
        }}
        saving={createMut.isPending || updateMut.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete encounter?"
        description={`Remove ${deleteTarget?.speciesConstant} from ${deleteTarget?.location}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      {/* JSON preview dialog */}
      {codeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setCodeOpen(false)}
        >
          <Card
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">wild_encounters.json preview</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(generatedCode);
                  toast.success("Copied to clipboard");
                }}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="max-h-[65vh] overflow-y-auto custom-scroll bg-muted/30 p-4 font-mono text-xs leading-relaxed">
{generatedCode}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function EncounterEditor({
  encounter,
  open,
  onOpenChange,
  speciesConstants,
  onSave,
  saving,
}: {
  encounter: Encounter | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  speciesConstants: string[];
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    mapLabel: encounter?.mapLabel ?? "MAP_R101_ROUTE101",
    location: encounter?.location ?? "Route 101",
    method: encounter?.method ?? "grass",
    speciesConstant: encounter?.speciesConstant ?? speciesConstants[0] ?? "SPECIES_STELLUXE",
    minLevel: encounter?.minLevel ?? 2,
    maxLevel: encounter?.maxLevel ?? 5,
    encounterRate: encounter?.encounterRate ?? 20,
    heldItemConstant: encounter?.heldItemConstant ?? "",
    formId: encounter?.formId ?? "",
  });

  const submit = () => {
    onSave({
      ...form,
      heldItemConstant: form.heldItemConstant || null,
      formId: form.formId === "" ? null : parseInt(form.formId as any),
      minLevel: parseInt(form.minLevel as any),
      maxLevel: parseInt(form.maxLevel as any),
      encounterRate: parseInt(form.encounterRate as any),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto custom-scroll">
        <SheetHeader>
          <SheetTitle>{encounter ? "Edit encounter" : "Add encounter"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loc">Location</Label>
              <Input
                id="loc"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Route 101"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="map">Map label</Label>
              <Input
                id="map"
                value={form.mapLabel}
                onChange={(e) => setForm({ ...form, mapLabel: e.target.value })}
                placeholder="MAP_R101_ROUTE101"
                className="font-mono text-xs"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                        {m.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Species</Label>
            <Select value={form.speciesConstant} onValueChange={(v) => setForm({ ...form, speciesConstant: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {speciesConstants.map((s) => (
                  <SelectItem key={s} value={s} className="font-mono text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="min">Min level</Label>
              <Input id="min" type="number" min={1} max={100} value={form.minLevel}
                onChange={(e) => setForm({ ...form, minLevel: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max">Max level</Label>
              <Input id="max" type="number" min={1} max={100} value={form.maxLevel}
                onChange={(e) => setForm({ ...form, maxLevel: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rate">Rate %</Label>
              <Input id="rate" type="number" min={0} max={100} value={form.encounterRate}
                onChange={(e) => setForm({ ...form, encounterRate: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="held">Held item (optional)</Label>
              <Input id="held" value={form.heldItemConstant} onChange={(e) => setForm({ ...form, heldItemConstant: e.target.value })}
                placeholder="ITEM_ORAN_BERRY" className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="form">Form ID (optional)</Label>
              <Input id="form" type="number" min={0} value={form.formId}
                onChange={(e) => setForm({ ...form, formId: e.target.value })} />
            </div>
          </div>
        </div>
        <SheetFooter className="sticky bottom-0 bg-background/80 backdrop-blur border-t border-border mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
