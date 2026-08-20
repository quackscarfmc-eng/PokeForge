"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sword,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  FileCode2,
  Save,
  Wand2,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  useCreateEntity,
  useUpdateEntity,
  useValidate,
} from "@/components/shared/entity-hooks";
import { TypeBadge } from "@/components/shared/type-badge";
import {
  POKEMON_TYPES,
  MOVE_EFFECTS,
  MOVE_CATEGORIES,
  MOVE_TARGETS,
  MOVE_FLAGS,
  TYPE_COLOR,
} from "@/lib/poke-constants";
import {
  generateMoveCode,
  type MoveData,
  type ValidationIssue,
} from "@/lib/poke-codegen";

// Move shape returned from the API. `flags` is stored as JSON string in DB.
export interface Move {
  id: string;
  projectId: string;
  constantName: string;
  moveId: number;
  name: string;
  description?: string | null;
  effect: string;
  power: number;
  type: string;
  category: string;
  target: string;
  pp: number;
  accuracy: number;
  priority: number;
  critStage: number;
  flags: string; // JSON string
  battleScript?: string | null;
  contestType?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface MoveFormState {
  constantName: string;
  moveId: number;
  name: string;
  description: string;
  effect: string;
  power: number;
  type: string;
  category: string;
  target: string;
  pp: number;
  accuracy: number;
  priority: number;
  critStage: number;
  flags: string[];
  battleScript: string;
}

interface MoveEditorProps {
  move: Move | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_FORM: MoveFormState = {
  constantName: "MOVE_",
  moveId: 0,
  name: "",
  description: "",
  effect: "EFFECT_HIT",
  power: 40,
  type: "TYPE_NORMAL",
  category: "CATEGORY_PHYSICAL",
  target: "MOVE_TARGET_SELECTED",
  pp: 35,
  accuracy: 100,
  priority: 0,
  critStage: 0,
  flags: [],
  battleScript: "",
};

// Build a MOVE_* constant from a display name. e.g. "Flame Wheel" → "MOVE_FLAME_WHEEL"
function constantFromName(name: string): string {
  if (!name) return "MOVE_";
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `MOVE_${cleaned}`;
}

function defaultBattleScript(constantName: string): string {
  const pascal = constantName
    .replace(/^MOVE_/, "")
    .split("_")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
  return `BattleScript_${pascal}`;
}

function categoryBg(category: string) {
  if (category === "CATEGORY_PHYSICAL") return "bg-red-500/15 text-red-600 dark:text-red-400";
  if (category === "CATEGORY_SPECIAL") return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
}

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

export function MoveEditor({ move, open, onOpenChange }: MoveEditorProps) {
  const projectId = useAppStore((s) => s.currentProjectId);
  const isEdit = !!move;

  const createMove = useCreateEntity<Move>("moves");
  const updateMove = useUpdateEntity<Move>("moves");
  const validateMut = useValidate();

  // Pull project for nextMoveId (create mode default).
  const { data: projectData } = useQuery<{ project?: { nextMoveId: number } }>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}`);
      if (!r.ok) throw new Error("Failed to fetch project");
      return r.json();
    },
    enabled: !!projectId,
  });

  // NOTE: This component is remounted by the parent (via `key`) whenever the
  // target move changes or the editor is reopened. We therefore seed the
  // initial state from props directly in useState, instead of syncing via
  // useEffect (which would trigger cascading renders — see React 19 guidance).
  const [form, setForm] = useState<MoveFormState>(() =>
    move
      ? {
          constantName: move.constantName,
          moveId: move.moveId,
          name: move.name,
          description: move.description ?? "",
          effect: move.effect,
          power: move.power,
          type: move.type,
          category: move.category,
          target: move.target,
          pp: move.pp,
          accuracy: move.accuracy,
          priority: move.priority,
          critStage: move.critStage,
          flags: parseFlags(move.flags),
          battleScript: move.battleScript ?? "",
        }
      : {
          ...DEFAULT_FORM,
          moveId: projectData?.project?.nextMoveId ?? 920,
          constantName: "MOVE_",
        },
  );
  const [constEdited, setConstEdited] = useState(!!move);
  const [validation, setValidation] = useState<{
    ok: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    safetyScore: number;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState("");

  // When the user types the name and hasn't manually edited the constant,
  // auto-suggest the constant name and battle script.
  const handleNameChange = (value: string) => {
    setForm((f) => {
      const next: MoveFormState = { ...f, name: value };
      if (!constEdited) {
        next.constantName = constantFromName(value);
      }
      if (!f.battleScript || f.battleScript.startsWith("BattleScript_")) {
        next.battleScript = defaultBattleScript(next.constantName);
      }
      return next;
    });
  };

  const setField = <K extends keyof MoveFormState>(key: K, value: MoveFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleFlag = (flag: string, checked: boolean) => {
    setForm((f) => {
      const set = new Set(f.flags);
      if (checked) set.add(flag);
      else set.delete(flag);
      return { ...f, flags: Array.from(set) };
    });
  };

  const onValidate = async () => {
    try {
      const result = await validateMut.mutateAsync({
        entityType: "move",
        data: { ...form } as unknown as Record<string, unknown>,
      });
      setValidation({
        ok: !!result.ok,
        errors: (result.errors ?? []) as ValidationIssue[],
        warnings: (result.warnings ?? []) as ValidationIssue[],
        safetyScore: result.safetyScore ?? 0,
      });
      if (result.ok) toast.success("Move is valid");
      else toast.error(`Validation: ${result.errors?.length ?? 0} error(s)`);
    } catch (e) {
      toast.error("Validation failed", { description: (e as Error).message });
    }
  };

  const onPreview = () => {
    const code = generateMoveCode(form as unknown as MoveData);
    setPreviewCode(code);
    setPreviewOpen(true);
  };

  const onSave = async () => {
    if (!form.constantName.startsWith("MOVE_")) {
      toast.error("Constant name must start with MOVE_");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Move name is required");
      return;
    }
    const payload: Partial<MoveData> = {
      constantName: form.constantName,
      moveId: form.moveId,
      name: form.name,
      description: form.description || null,
      effect: form.effect,
      power: form.power,
      type: form.type,
      category: form.category,
      target: form.target,
      pp: form.pp,
      accuracy: form.accuracy,
      priority: form.priority,
      critStage: form.critStage,
      flags: form.flags,
      battleScript: form.battleScript || null,
    };
    try {
      if (isEdit && move) {
        await updateMove.mutateAsync({ id: move.id, data: payload });
      } else {
        await createMove.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // Toast handled by hook
    }
  };

  const saving = createMove.isPending || updateMove.isPending;
  const validating = validateMut.isPending;

  const builtinTypes = useMemo(
    () =>
      POKEMON_TYPES.map((t) => ({
        constant: t.constant,
        name: t.name,
      })),
    [],
  );

  const categoryName = MOVE_CATEGORIES.find((c) => c.constant === form.category)?.name ?? "—";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-lg md:max-w-xl"
        >
          <SheetHeader className="border-b bg-card/50 px-6 py-4">
            <SheetTitle className="flex items-center gap-2">
              {isEdit ? "Edit move" : "New move"}
              <Badge variant="secondary" className="font-mono text-[10px]">
                {form.constantName || "—"}
              </Badge>
            </SheetTitle>
            <SheetDescription>
              {isEdit
                ? "Edit move data and the generated code will update automatically."
                : "Define a custom move. Constant name auto-derives from the move name."}
            </SheetDescription>
          </SheetHeader>

          {/* Body — scrollable form */}
          <div className="custom-scroll flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {/* Identity */}
              <section className="space-y-3">
                <SectionLabel icon={Hash} title="Identity" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mv-name">Move name</Label>
                    <Input
                      id="mv-name"
                      value={form.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Flame Wheel"
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mv-moveid">Move ID</Label>
                    <Input
                      id="mv-moveid"
                      type="number"
                      value={form.moveId}
                      min={0}
                      max={65535}
                      onChange={(e) => setField("moveId", Number(e.target.value))}
                    />
                    {!isEdit && projectData?.project?.nextMoveId != null && (
                      <p className="text-[10px] text-muted-foreground">
                        Prefilled from project&apos;s nextMoveId ({projectData.project.nextMoveId})
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mv-const" className="flex items-center justify-between">
                    <span>Constant name</span>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, constantName: constantFromName(f.name) }));
                        setConstEdited(true);
                        toast.success("Constant name regenerated from move name");
                      }}
                      className="flex items-center gap-1 text-[10px] font-normal text-primary hover:underline"
                    >
                      <Wand2 className="h-3 w-3" /> Regenerate
                    </button>
                  </Label>
                  <Input
                    id="mv-const"
                    value={form.constantName}
                    onChange={(e) => {
                      setField("constantName", e.target.value.toUpperCase());
                      setConstEdited(true);
                    }}
                    className="font-mono text-sm"
                    placeholder="MOVE_FLAME_WHEEL"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mv-desc">Description</Label>
                  <Textarea
                    id="mv-desc"
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="In-game move description (shown in summary)."
                    className="min-h-[70px]"
                    maxLength={240}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {form.description.length}/240 chars
                  </p>
                </div>
              </section>

              <Separator />

              {/* Battle data */}
              <section className="space-y-3">
                <SectionLabel icon={Sword} title="Battle data" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Effect</Label>
                    <Select value={form.effect} onValueChange={(v) => setField("effect", v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select effect" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-72">
                          {MOVE_EFFECTS.map((e) => (
                            <SelectItem key={e.constant} value={e.constant}>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {e.constant}
                              </span>
                              <span className="ml-1">{e.name}</span>
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Target</Label>
                    <Select value={form.target} onValueChange={(v) => setField("target", v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select target" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOVE_TARGETS.map((t) => (
                          <SelectItem key={t.constant} value={t.constant}>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {t.constant.replace("MOVE_TARGET_", "")}
                            </span>
                            <span className="ml-1">{t.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <div className="flex gap-2">
                      <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Built-in types</SelectLabel>
                            {builtinTypes.map((t) => (
                              <SelectItem key={t.constant} value={t.constant}>
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: TYPE_COLOR(t.constant) }}
                                />
                                <span className="ml-1">{t.name}</span>
                              </SelectItem>
                            ))}
                            <CustomTypesGroup />
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center">
                        <TypeBadge constant={form.type} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setField("category", v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOVE_CATEGORIES.map((c) => (
                          <SelectItem key={c.constant} value={c.constant}>
                            <CategoryIconRenderer category={c.constant} className="h-3.5 w-3.5" />
                            <span className="ml-1">{c.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md",
                          categoryBg(form.category),
                        )}
                      >
                        <CategoryIconRenderer category={form.category} className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs text-muted-foreground">{categoryName}</span>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Stats */}
              <section className="space-y-3">
                <SectionLabel icon={Zap} title="Stats" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatField
                    label="Power"
                    value={form.power}
                    min={0}
                    max={255}
                    onChange={(v) => setField("power", v)}
                  />
                  <StatField
                    label="Accuracy"
                    value={form.accuracy}
                    min={0}
                    max={100}
                    suffix="%"
                    onChange={(v) => setField("accuracy", v)}
                  />
                  <StatField
                    label="PP"
                    value={form.pp}
                    min={1}
                    max={40}
                    onChange={(v) => setField("pp", v)}
                  />
                  <StatField
                    label="Priority"
                    value={form.priority}
                    min={-7}
                    max={5}
                    onChange={(v) => setField("priority", v)}
                  />
                  <StatField
                    label="Crit Stage"
                    value={form.critStage}
                    min={0}
                    max={24}
                    onChange={(v) => setField("critStage", v)}
                  />
                </div>
              </section>

              <Separator />

              {/* Flags */}
              <section className="space-y-3">
                <SectionLabel
                  icon={Sparkles}
                  title="Flags"
                  right={
                    <Badge variant="outline" className="text-[10px]">
                      {form.flags.length} selected
                    </Badge>
                  }
                />
                <div className="max-h-64 overflow-y-auto custom-scroll rounded-md border border-border bg-card/40 p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {MOVE_FLAGS.map((f) => {
                      const checked = form.flags.includes(f.constant);
                      return (
                        <label
                          key={f.constant}
                          htmlFor={`flag-${f.constant}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-2 rounded-md border p-2 transition-colors",
                            checked
                              ? "border-primary/40 bg-primary/5"
                              : "border-transparent hover:bg-accent/50",
                          )}
                        >
                          <Checkbox
                            id={`flag-${f.constant}`}
                            checked={checked}
                            onCheckedChange={(c) => toggleFlag(f.constant, !!c)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium">{f.name}</div>
                            <div className="truncate font-mono text-[10px] text-muted-foreground">
                              {f.constant}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </section>

              <Separator />

              {/* Battle script */}
              <section className="space-y-3">
                <SectionLabel icon={FileCode2} title="Battle script" />
                <div className="space-y-1.5">
                  <Label htmlFor="mv-bscript">Battle script label</Label>
                  <Input
                    id="mv-bscript"
                    value={form.battleScript}
                    onChange={(e) => setField("battleScript", e.target.value)}
                    placeholder="BattleScript_FlameWheel"
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Defaults to <code className="font-mono">BattleScript_&lt;Name&gt;</code>. Leave empty to use the
                    auto-generated default.
                  </p>
                </div>
              </section>

              {/* Validation results */}
              {validation && (
                <div className="rounded-md border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {validation.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-semibold">
                        Validation {validation.ok ? "passed" : "failed"}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Safety: {validation.safetyScore}/100
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {validation.errors.map((issue, i) => (
                      <ValidationRow key={`e-${i}`} severity="error" message={issue.message} />
                    ))}
                    {validation.warnings.map((issue, i) => (
                      <ValidationRow key={`w-${i}`} severity="warning" message={issue.message} />
                    ))}
                    {validation.errors.length === 0 && validation.warnings.length === 0 && (
                      <p className="text-xs text-muted-foreground">No issues found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer — sticky */}
          <SheetFooter className="sticky bottom-0 flex-row flex-wrap items-center justify-between gap-2 border-t bg-card/80 px-6 py-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onValidate} disabled={validating}>
                {validating ? (
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    Validating…
                  </span>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5" /> Validate
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={onPreview}>
                <FileCode2 className="h-3.5 w-3.5" /> Preview code
              </Button>
            </div>
            <Button size="sm" onClick={onSave} disabled={saving} className="bg-primary">
              {saving ? (
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Saving…
                </span>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" /> {isEdit ? "Save changes" : "Create move"}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Code preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4" /> Generated code
            </DialogTitle>
            <DialogDescription>
              Copy this snippet into your <code className="font-mono">pokeemerald-expansion</code> project.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {form.constantName}.h / .s
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(previewCode);
                  toast.success("Copied code to clipboard");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </div>
          <div className="custom-scroll max-h-[55vh] overflow-auto px-6 pb-6">
            <pre className="rounded-md bg-muted/60 p-4 font-mono text-xs leading-relaxed text-foreground">
              <code>{previewCode}</code>
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Small helper that renders the right lucide icon for a move category.
function CategoryIconRenderer({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  if (category === "CATEGORY_PHYSICAL") return <Sword className={className} />;
  if (category === "CATEGORY_SPECIAL") return <Zap className={className} />;
  return <Sparkles className={className} />;
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function SectionLabel({
  icon: Icon,
  title,
  right,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </div>
      {right}
    </div>
  );
}

function StatField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isNaN(n)) return;
            onChange(Math.max(min, Math.min(max, n)));
          }}
          className="pr-7"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ValidationRow({
  severity,
  message,
}: {
  severity: "error" | "warning";
  message: string;
}) {
  const Icon = severity === "error" ? XCircle : AlertTriangle;
  const color =
    severity === "error"
      ? "text-red-600 dark:text-red-400"
      : "text-amber-600 dark:text-amber-400";
  return (
    <div className="flex items-start gap-1.5 text-xs">
      <Icon className={cn("mt-0.5 h-3 w-3 shrink-0", color)} />
      <span className="text-foreground/90">{message}</span>
    </div>
  );
}

// Pulls custom types from the same project so users can attach a custom type.
function CustomTypesGroup() {
  const projectId = useAppStore((s) => s.currentProjectId);
  const { data } = useQuery<{ types: { constantName: string; name: string; colorHex: string }[] }>({
    queryKey: ["types", projectId],
    queryFn: async () => {
      if (!projectId) return { types: [] };
      const r = await fetch(`/api/types?projectId=${projectId}`);
      if (!r.ok) return { types: [] };
      return r.json();
    },
    enabled: !!projectId,
  });
  const customTypes = data?.types ?? [];
  if (customTypes.length === 0) return null;
  return (
    <>
      <SelectSeparator />
      <SelectLabel>Custom types in project</SelectLabel>
      {customTypes.map((t) => (
        <SelectItem key={t.constantName} value={t.constantName}>
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: t.colorHex }}
          />
          <span className="ml-1">{t.name}</span>
          <span className="ml-1 font-mono text-[10px] text-muted-foreground">
            {t.constantName}
          </span>
        </SelectItem>
      ))}
    </>
  );
}
