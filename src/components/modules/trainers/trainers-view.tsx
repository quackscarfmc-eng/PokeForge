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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Swords,
  Shield,
  Sparkles,
  Star,
  FileJson,
} from "lucide-react";
import { toast } from "sonner";
import { useEntities } from "@/components/shared/entity-hooks";
import { generateTrainerCode } from "@/lib/poke-codegen";
import { TRAINER_CLASSES, AI_FLAGS, NATURES, POKEBALLS } from "@/lib/poke-constants";
import { cn } from "@/lib/utils";

interface PartyMember {
  id?: string;
  speciesConstant: string;
  level: number;
  iv: number;
  abilityConstant?: string | null;
  heldItemConstant?: string | null;
  gender?: string | null;
  natureConstant?: string | null;
  isShiny: boolean;
  moves: string[];
  ballConstant?: string | null;
  formId?: number | null;
  position?: number;
}

interface Trainer {
  id: string;
  trainerClass: string;
  trainerName: string;
  introText: string | null;
  defeatText: string | null;
  rematchDefeatText: string | null;
  rematchNum: number;
  partySize: number;
  aiFlags: string;
  doubleBattle: boolean;
  itemsJson: string;
  party: PartyMember[];
}

export function TrainersView() {
  const { currentProjectId } = useAppStore();
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Trainer | null>(null);
  const [search, setSearch] = useState("");
  const [codePreview, setCodePreview] = useState<{ name: string; code: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["trainers", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/trainers?projectId=${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });
  const trainers: Trainer[] = data?.trainers ?? [];

  const { data: speciesData } = useEntities<any>("species");
  const speciesConstants = (speciesData?.species ?? []).map((s: any) => s.constantName);

  const filtered = trainers.filter(
    (t) =>
      t.trainerName.toLowerCase().includes(search.toLowerCase()) ||
      t.trainerClass.toLowerCase().includes(search.toLowerCase()),
  );

  const createMut = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch("/api/trainers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId, ...body }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Trainer created");
      qc.invalidateQueries({ queryKey: ["trainers"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      setEditorOpen(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const r = await fetch(`/api/trainers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Trainer updated");
      qc.invalidateQueries({ queryKey: ["trainers"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      setEditorOpen(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/trainers/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Trainer deleted");
      qc.invalidateQueries({ queryKey: ["trainers"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Trainer Parties"
        description="Design NPC trainers with custom Pokémon parties, AI flags, items and battle dialogue."
        icon={Users}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setEditorSession((s) => s + 1);
              setEditorOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New trainer
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name or class…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Badge variant="secondary">{trainers.length} trainers</Badge>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : trainers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No trainers yet"
          description="Create NPC trainers with custom Pokémon parties, AI behaviour and dialogue."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setEditorSession((s) => s + 1);
                setEditorOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Create trainer
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="group relative overflow-hidden transition-all hover:shadow-md">
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{
                  background: t.doubleBattle
                    ? "linear-gradient(90deg,#ee8130,#c22e28)"
                    : "linear-gradient(90deg,#7ac74c,#3b82f6)",
                }}
              />
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {t.doubleBattle ? <Swords className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    </div>
                    <div>
                      <CardTitle className="text-base leading-tight">{t.trainerName}</CardTitle>
                      <CardDescription className="font-mono text-[10px]">
                        {t.trainerClass.replace("TRAINER_CLASS_", "").replace(/_/g, " ")}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={() => {
                        setEditing(t);
                        setEditorSession((s) => s + 1);
                        setEditorOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(t)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {t.party.length} Pokémon
                  </Badge>
                  {t.doubleBattle && (
                    <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/20 text-[10px]">
                      <Swords className="mr-1 h-2.5 w-2.5" /> Double
                    </Badge>
                  )}
                  {t.rematchNum > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      Rematch {t.rematchNum}
                    </Badge>
                  )}
                  {JSON.parse(t.itemsJson || "[]").length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {JSON.parse(t.itemsJson).length} items
                    </Badge>
                  )}
                </div>

                {/* Party preview */}
                <div className="flex flex-wrap gap-1.5">
                  {t.party.slice(0, 6).map((p, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border text-[9px] font-bold",
                        p.isShiny ? "border-amber-400 bg-amber-400/10 text-amber-600" : "border-border bg-muted text-muted-foreground",
                      )}
                      title={`${p.speciesConstant} Lv.${p.level}`}
                    >
                      {p.speciesConstant.replace("SPECIES_", "").slice(0, 2)}
                    </div>
                  ))}
                </div>

                {/* AI flags */}
                <div className="flex flex-wrap gap-1">
                  {JSON.parse(t.aiFlags || "[]").slice(0, 2).map((f: string) => (
                    <Badge key={f} variant="outline" className="text-[9px] text-muted-foreground">
                      <Sparkles className="mr-1 h-2 w-2" />
                      {f.replace("AI_FLAG_", "").replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  ))}
                  {JSON.parse(t.aiFlags || "[]").length > 2 && (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground">
                      +{JSON.parse(t.aiFlags).length - 2}
                    </Badge>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-full text-[10px]"
                  onClick={() => {
                    const code = generateTrainerCode({
                      trainerClass: t.trainerClass,
                      trainerName: t.trainerName,
                      introText: t.introText,
                      defeatText: t.defeatText,
                      rematchDefeatText: t.rematchDefeatText,
                      rematchNum: t.rematchNum,
                      partySize: t.partySize,
                      aiFlags: JSON.parse(t.aiFlags || "[]"),
                      doubleBattle: t.doubleBattle,
                      items: JSON.parse(t.itemsJson || "[]"),
                      party: t.party.map((p) => ({
                        speciesConstant: p.speciesConstant,
                        level: p.level,
                        iv: p.iv,
                        abilityConstant: p.abilityConstant,
                        heldItemConstant: p.heldItemConstant,
                        gender: p.gender,
                        natureConstant: p.natureConstant,
                        isShiny: p.isShiny,
                        moves: JSON.parse(p.movesJson || "[]"),
                        ballConstant: p.ballConstant,
                        formId: p.formId,
                      })),
                    });
                    setCodePreview({ name: t.trainerName, code });
                  }}
                >
                  <FileJson className="mr-1 h-2.5 w-2.5" /> Preview JSON
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TrainerEditor
        key={`tr-${editorSession}`}
        trainer={editing}
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
        title="Delete trainer?"
        description={`Remove "${deleteTarget?.trainerName}" and their party? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      {codePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCodePreview(null)}>
          <Card className="max-h-[85vh] w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">trainers.json: {codePreview.name}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => {
                navigator.clipboard.writeText(codePreview.code);
                toast.success("Copied to clipboard");
              }}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="max-h-[65vh] overflow-y-auto custom-scroll bg-muted/30 p-4 font-mono text-xs leading-relaxed">
{codePreview.code}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TrainerEditor({
  trainer,
  open,
  onOpenChange,
  speciesConstants,
  onSave,
  saving,
}: {
  trainer: Trainer | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  speciesConstants: string[];
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(() => ({
    trainerClass: trainer?.trainerClass ?? "TRAINER_CLASS_YOUNGSTER",
    trainerName: trainer?.trainerName ?? "",
    introText: trainer?.introText ?? "",
    defeatText: trainer?.defeatText ?? "",
    rematchDefeatText: trainer?.rematchDefeatText ?? "",
    rematchNum: trainer?.rematchNum ?? 0,
    doubleBattle: trainer?.doubleBattle ?? false,
    aiFlags: trainer ? JSON.parse(trainer.aiFlags || "[]") : ["AI_FLAG_CHECK_BAD_MOVE"],
    items: trainer ? JSON.parse(trainer.itemsJson || "[]") : [],
    party: trainer?.party ?? [],
  }));
  const [newItem, setNewItem] = useState("");

  const addPartyMember = () => {
    setForm((f) => ({
      ...f,
      party: [
        ...f.party,
        {
          speciesConstant: speciesConstants[0] ?? "SPECIES_STELLUXE",
          level: 50,
          iv: 0,
          abilityConstant: null,
          heldItemConstant: null,
          gender: null,
          natureConstant: "NATURE_HARDY",
          isShiny: false,
          moves: [],
          ballConstant: null,
        },
      ],
    }));
  };

  const updatePartyMember = (idx: number, field: string, value: any) => {
    setForm((f) => ({
      ...f,
      party: f.party.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    }));
  };

  const removePartyMember = (idx: number) => {
    setForm((f) => ({ ...f, party: f.party.filter((_, i) => i !== idx) }));
  };

  const toggleAIFlag = (flag: string) => {
    setForm((f) => ({
      ...f,
      aiFlags: f.aiFlags.includes(flag)
        ? f.aiFlags.filter((x: string) => x !== flag)
        : [...f.aiFlags, flag],
    }));
  };

  const addItem = () => {
    if (newItem && !form.items.includes(newItem)) {
      setForm((f) => ({ ...f, items: [...f.items, newItem] }));
      setNewItem("");
    }
  };

  const submit = () => {
    onSave({
      ...form,
      party: form.party.map((p, i) => ({
        ...p,
        moves: p.moves || [],
        position: i,
      })),
    });
  };

  const previewCode = () => {
    const code = generateTrainerCode({
      ...form,
      party: form.party.map((p) => ({ ...p, moves: p.moves || [] })),
    } as any);
    navigator.clipboard.writeText(code);
    toast.success("Trainer JSON copied to clipboard");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto custom-scroll sm:max-w-2xl md:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {trainer ? "Edit trainer" : "New trainer"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-20">
          {/* Identity */}
          <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identity</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tname">Name</Label>
                <Input id="tname" value={form.trainerName}
                  onChange={(e) => setForm({ ...form, trainerName: e.target.value })}
                  placeholder="Joey" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tclass">Class</Label>
                <Select value={form.trainerClass} onValueChange={(v) => setForm({ ...form, trainerClass: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TRAINER_CLASSES.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c.replace("TRAINER_CLASS_", "").replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="double" checked={form.doubleBattle} onCheckedChange={(v) => setForm({ ...form, doubleBattle: v })} />
              <Label htmlFor="double" className="text-sm">Double battle</Label>
            </div>
          </div>

          {/* Dialogue */}
          <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dialogue</h3>
            <div className="space-y-1.5">
              <Label htmlFor="intro">Intro text</Label>
              <Textarea id="intro" rows={1} value={form.introText}
                onChange={(e) => setForm({ ...form, introText: e.target.value })}
                placeholder="Let's battle!" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defeat">Defeat text</Label>
              <Textarea id="defeat" rows={1} value={form.defeatText}
                onChange={(e) => setForm({ ...form, defeatText: e.target.value })}
                placeholder="How did I lose?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rdefeat">Rematch defeat</Label>
                <Textarea id="rdefeat" rows={1} value={form.rematchDefeatText}
                  onChange={(e) => setForm({ ...form, rematchDefeatText: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rnum">Rematch #</Label>
                <Input id="rnum" type="number" min={0} value={form.rematchNum}
                  onChange={(e) => setForm({ ...form, rematchNum: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>

          {/* AI flags */}
          <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3 w-3" /> AI Flags ({form.aiFlags.length})
            </h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {AI_FLAGS.map((f) => (
                <label key={f.constant} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 hover:bg-accent/40">
                  <Checkbox
                    checked={form.aiFlags.includes(f.constant)}
                    onCheckedChange={() => toggleAIFlag(f.constant)}
                  />
                  <span className="text-xs">{f.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items ({form.items.length})</h3>
            <div className="flex gap-2">
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)}
                placeholder="ITEM_FULL_RESTORE" className="font-mono text-xs"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} />
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
            {form.items.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.items.map((item: string, i: number) => (
                  <Badge key={i} variant="secondary" className="gap-1 font-mono text-[10px]">
                    {item}
                    <button onClick={() => setForm({ ...form, items: form.items.filter((_: string, j: number) => j !== i) })} className="text-muted-foreground hover:text-foreground">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Party */}
          <div className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Party ({form.party.length}/6)</h3>
              <Button size="sm" variant="outline" onClick={addPartyMember} disabled={form.party.length >= 6}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Pokémon
              </Button>
            </div>
            <div className="space-y-3">
              {form.party.map((p, idx) => (
                <div key={idx} className="rounded-md border border-border bg-background/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{idx + 1}</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removePartyMember(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Species</Label>
                      <Select value={p.speciesConstant} onValueChange={(v) => updatePartyMember(idx, "speciesConstant", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-48">
                          {speciesConstants.map((s) => (
                            <SelectItem key={s} value={s} className="font-mono text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Level</Label>
                      <Input type="number" min={1} max={100} value={p.level}
                        onChange={(e) => updatePartyMember(idx, "level", parseInt(e.target.value) || 1)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">IV (0-31)</Label>
                      <Input type="number" min={0} max={31} value={p.iv}
                        onChange={(e) => updatePartyMember(idx, "iv", parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Nature</Label>
                      <Select value={p.natureConstant || "NATURE_HARDY"} onValueChange={(v) => updatePartyMember(idx, "natureConstant", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-48">
                          {NATURES.map((n) => <SelectItem key={n} value={n} className="text-xs">{n.replace("NATURE_", "").replace(/_/g, " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Held item</Label>
                      <Input value={p.heldItemConstant || ""}
                        onChange={(e) => updatePartyMember(idx, "heldItemConstant", e.target.value || null)}
                        placeholder="ITEM_NONE" className="h-8 font-mono text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Ball</Label>
                      <Select value={p.ballConstant || ""} onValueChange={(v) => updatePartyMember(idx, "ballConstant", v || null)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                        <SelectContent className="max-h-48">
                          <SelectItem value="">Default</SelectItem>
                          {POKEBALLS.map((b) => <SelectItem key={b} value={b} className="text-xs">{b.replace("ITEM_", "").replace(/_/g, " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Switch id={`shiny-${idx}`} checked={p.isShiny} onCheckedChange={(v) => updatePartyMember(idx, "isShiny", v)} />
                    <Label htmlFor={`shiny-${idx}`} className="flex items-center gap-1 text-xs">
                      <Star className="h-3 w-3 text-amber-400" /> Shiny
                    </Label>
                  </div>
                  {/* Moves */}
                  <div className="mt-2">
                    <Label className="text-[10px]">Moves (max 4)</Label>
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      {[0, 1, 2, 3].map((mi) => (
                        <Input
                          key={mi}
                          value={p.moves[mi] || ""}
                          onChange={(e) => {
                            const moves = [...(p.moves || [])];
                            while (moves.length < 4) moves.push("");
                            moves[mi] = e.target.value;
                            updatePartyMember(idx, "moves", moves.filter((m) => m));
                          }}
                          placeholder={`MOVE_${mi === 0 ? "TACKLE" : "NONE"}`}
                          className="h-7 font-mono text-[10px]"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {form.party.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No Pokémon in party yet. Click "Add Pokémon" to start.
                </p>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="sticky bottom-0 bg-background/80 backdrop-blur">
          <Button variant="ghost" onClick={previewCode}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy JSON
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.trainerName.trim()}>
            {saving ? "Saving…" : trainer ? "Save changes" : "Create trainer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
