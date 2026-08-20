"use client";

import { useMemo, useState } from "react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  useCreateEntity,
  useUpdateEntity,
  useValidate,
} from "@/components/shared/entity-hooks";
import { STATUS_CATEGORIES } from "@/lib/poke-constants";
import { generateStatusCode, type StatusData } from "@/lib/poke-codegen";
import { toast } from "sonner";
import {
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Code2,
  Loader2,
  HeartCrack,
  FileCode,
  FileWarning,
} from "lucide-react";
import { DryRunButton } from "@/components/shared/dry-run-button";
import { cn } from "@/lib/utils";
import type { StatusCondition } from "@/components/modules/statuses/statuses-view";

interface FormState {
  constantName: string;
  statusId: number;
  name: string;
  description: string;
  category: string;
  isVolatile: boolean;
  colorHex: string;
  iconEmoji: string;
  battleScript: string;
}

const DEFAULT_COLOR = "#A855F7";

function emptyForm(nextStatusId: number): FormState {
  return {
    constantName: "STATUS_",
    statusId: nextStatusId,
    name: "",
    description: "",
    category: "volatile",
    isVolatile: true,
    colorHex: DEFAULT_COLOR,
    iconEmoji: "",
    battleScript: "",
  };
}

function statusToForm(s: StatusCondition): FormState {
  return {
    constantName: s.constantName,
    statusId: s.statusId,
    name: s.name,
    description: s.description ?? "",
    category: s.category,
    isVolatile: s.isVolatile,
    colorHex: s.colorHex,
    iconEmoji: s.iconEmoji ?? "",
    battleScript: s.battleScript ?? "",
  };
}

function toData(f: FormState): StatusData {
  return {
    constantName: f.constantName,
    statusId: f.statusId,
    name: f.name,
    description: f.description || null,
    category: f.category,
    isVolatile: f.isVolatile,
    colorHex: f.colorHex,
    iconEmoji: f.iconEmoji || null,
    battleScript: f.battleScript || null,
  };
}

const IMPLEMENTATION_STEPS = [
  {
    file: "include/constants/battle.h",
    task: "Add the new STATUS_* constant (the #define you set above). For non-volatile statuses, also extend the STATUS1_* or STATUS2_* bitmask enum so the engine recognizes the new bit.",
    risk: "high",
  },
  {
    file: "data/battle_scripts_1.s",
    task: "Add the BattleScript_<Name>Apply label and write the tick-down / application logic (call SetMonData, manipulate status bits, play animation, etc.).",
    risk: "high",
  },
  {
    file: "src/battle_util.c",
    task: "Hook the new status into the per-turn processing — e.g. end-of-turn damage for poison/burn-like effects, cure-on-switch for volatile statuses.",
    risk: "high",
  },
  {
    file: "src/battle_script_commands.c",
    task: "If your status triggers from a move effect, extend the relevant battle script command handler to set the status bit on the target.",
    risk: "medium",
  },
  {
    file: "data/battle_anim_scripts.s",
    task: "(Optional) Add a battle animation for the status being applied or ticking each turn.",
    risk: "low",
  },
  {
    file: "src/data/text/ (item/move descriptions)",
    task: "If your status is referenced by an item or move description, add the corresponding in-game text strings.",
    risk: "low",
  },
];

const RISK_COLOR: Record<string, string> = {
  high: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

export function StatusEditor({
  status,
  open,
  onOpenChange,
  nextStatusId,
}: {
  status: StatusCondition | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextStatusId: number;
}) {
  // Initial form derived from `status` (edit) or fresh (new). The parent remounts
  // this component via `key` on each open, so the initializer runs fresh.
  const [form, setForm] = useState<FormState>(() =>
    status ? statusToForm(status) : emptyForm(nextStatusId),
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [validation, setValidation] = useState<
    null | { ok: boolean; errors: any[]; warnings: any[]; safetyScore: number }
  >(null);

  const createStatus = useCreateEntity<StatusCondition>("statuses");
  const updateStatus = useUpdateEntity<StatusCondition>("statuses");
  const validate = useValidate();

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // When the user types the name (and we're creating new), auto-suggest a
  // constant name in the form STATUS_<UPPER_SNAKE> and a default battle script.
  function handleNameChange(newName: string) {
    setForm((f) => {
      const next: FormState = { ...f, name: newName };
      if (!status && newName) {
        if (f.constantName === "STATUS_") {
          next.constantName =
            "STATUS_" +
            newName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
        }
        if (!f.battleScript) {
          const c = next.constantName;
          next.battleScript = `BattleScript_${c}Apply`;
        }
      }
      return next;
    });
  }

  // When category changes, auto-set isVolatile (user can still override later).
  function handleCategoryChange(cat: string) {
    setForm((f) => {
      const next: FormState = { ...f, category: cat };
      if (cat === "non_volatile" && f.isVolatile) next.isVolatile = false;
      else if (cat === "volatile" && !f.isVolatile) next.isVolatile = true;
      else if (cat === "field" && !f.isVolatile) next.isVolatile = true;
      return next;
    });
  }

  const data = useMemo(() => toData(form), [form]);
  const codePreview = useMemo(() => generateStatusCode(data), [data]);

  const isEdit = !!status;
  const saving = createStatus.isPending || updateStatus.isPending;

  async function handleValidate() {
    try {
      const res = await validate.mutateAsync({ entityType: "status", data });
      setValidation(res);
      if (res.ok) toast.success(`Validation passed · safety ${res.safetyScore}/100`);
      else toast.error(`Validation failed: ${res.errors?.length ?? 0} error(s)`);
    } catch {
      toast.error("Validation request failed");
    }
  }

  function handleSave() {
    if (!form.constantName.startsWith("STATUS_")) {
      toast.error("Constant name must start with STATUS_");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Status name is required");
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(form.colorHex)) {
      toast.error("Color must be in #RRGGBB format");
      return;
    }
    const payload: Partial<StatusCondition> = {
      constantName: form.constantName,
      statusId: Number(form.statusId),
      name: form.name,
      description: form.description || null,
      category: form.category,
      isVolatile: form.isVolatile,
      colorHex: form.colorHex,
      iconEmoji: form.iconEmoji || null,
      battleScript: form.battleScript || null,
    };
    if (isEdit && status) {
      updateStatus.mutate(
        { id: status.id, data: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createStatus.mutate(payload as Partial<StatusCondition>, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(codePreview).then(
      () => toast.success("Code copied to clipboard"),
      () => toast.error("Failed to copy"),
    );
  }

  const isFieldStatus = form.category === "field";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full flex-col gap-0 p-0 sm:max-w-2xl md:max-w-3xl"
        >
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle className="flex items-center gap-2">
              <HeartCrack className="h-4 w-4 text-purple-500" />
              {isEdit ? "Edit status" : "New status"}
            </SheetTitle>
            <SheetDescription>
              {isEdit
                ? `Editing ${status?.constantName}`
                : "Design a custom non-volatile, volatile or field status condition."}
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto custom-scroll px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Constant name */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="st-const">Constant name</Label>
                <Input
                  id="st-const"
                  value={form.constantName}
                  onChange={(e) => update("constantName", e.target.value.toUpperCase())}
                  placeholder="STATUS_MYSTATUS"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="font-mono">STATUS_*</code> for battle statuses, or{" "}
                  <code className="font-mono">STATUS_FIELD_*</code> for field conditions (weather,
                  terrain, etc.).
                </p>
              </div>

              {/* Status ID */}
              <div className="space-y-1.5">
                <Label htmlFor="st-id">Status ID</Label>
                <Input
                  id="st-id"
                  type="number"
                  value={form.statusId}
                  onChange={(e) => update("statusId", Number(e.target.value))}
                  min={0}
                  max={65535}
                />
                <p className="text-xs text-muted-foreground">
                  Prefilled from project nextStatusId ({nextStatusId}). Built-ins use IDs ≤ 7.
                </p>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="st-name">Display name</Label>
                <Input
                  id="st-name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Curse"
                  maxLength={32}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="st-desc">Description</Label>
                <Textarea
                  id="st-desc"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Afflicts the target with a creeping curse that drains HP each turn…"
                  rows={3}
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => handleCategoryChange(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_CATEGORIES.map((c) => (
                      <SelectItem key={c.constant} value={c.constant}>
                        {c.name} <span className="text-muted-foreground">({c.constant})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Auto-toggles the <em>volatile</em> switch below.
                </p>
              </div>

              {/* isVolatile */}
              <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <div>
                  <Label htmlFor="st-vol" className="cursor-pointer">
                    Volatile
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cleared on switch-out. Non-volatile persists.
                  </p>
                </div>
                <Switch
                  id="st-vol"
                  checked={form.isVolatile}
                  onCheckedChange={(v) => update("isVolatile", v)}
                />
              </div>

              {/* Color + Emoji */}
              <div className="space-y-1.5">
                <Label htmlFor="st-color">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="st-color"
                    type="color"
                    value={form.colorHex}
                    onChange={(e) => update("colorHex", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent p-1"
                  />
                  <Input
                    value={form.colorHex}
                    onChange={(e) => update("colorHex", e.target.value)}
                    className="font-mono"
                  />
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg shadow-sm"
                    style={{ backgroundColor: form.colorHex + "22", color: form.colorHex }}
                  >
                    {form.iconEmoji || <HeartCrack className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="st-emoji">Icon emoji</Label>
                <Input
                  id="st-emoji"
                  value={form.iconEmoji}
                  onChange={(e) => update("iconEmoji", e.target.value)}
                  placeholder="🟣"
                  maxLength={4}
                />
                <p className="text-xs text-muted-foreground">
                  Used as the card / list icon. Falls back to{" "}
                  <HeartCrack className="inline h-3 w-3" /> if empty.
                </p>
              </div>

              {/* Battle script */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="st-bs">Battle script label</Label>
                <Input
                  id="st-bs"
                  value={form.battleScript}
                  onChange={(e) => update("battleScript", e.target.value)}
                  placeholder={`BattleScript_${form.constantName}Apply`}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to <code className="font-mono">BattleScript_&lt;Name&gt;Apply</code>. This
                  is the label you will define in <code className="font-mono">data/battle_scripts_1.s</code>.
                </p>
              </div>
            </div>

            {/* Live preview */}
            <Card className="mt-5 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-emerald-500" />
                    Live preview · generated code
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    auto-updates
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="max-h-64 overflow-auto custom-scroll rounded-md border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-foreground">
                  <code>{codePreview}</code>
                </pre>
              </CardContent>
            </Card>

            {/* Implementation checklist */}
            <Card className="mt-4 border-amber-500/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileWarning className="h-4 w-4 text-amber-500" />
                  Implementation checklist
                </CardTitle>
                <CardDescription>
                  PokeForge stores your status definition, but the pokeemerald-expansion codebase still
                  needs manual edits. Tick each file as you complete it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {IMPLEMENTATION_STEPS.map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-md border border-border bg-card/50 p-2.5"
                    >
                      <input
                        type="checkbox"
                        id={`st-step-${i}`}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                      />
                      <label htmlFor={`st-step-${i}`} className="min-w-0 flex-1 cursor-pointer">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                          <code className="font-mono text-xs font-semibold">{step.file}</code>
                          <Badge
                            variant="outline"
                            className={cn("border text-[10px]", RISK_COLOR[step.risk])}
                          >
                            {step.risk}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{step.task}</p>
                      </label>
                    </li>
                  ))}
                </ul>
                {isFieldStatus && (
                  <div className="mt-3 rounded-md border border-purple-500/30 bg-purple-500/5 p-2.5 text-xs text-purple-700 dark:text-purple-300">
                    <strong>Field condition note:</strong> field statuses (weather, terrain, gravity
                    etc.) also need entries in <code className="font-mono">gFieldStatuses[]</code> and
                    hooks in <code className="font-mono">src/field_weather.c</code> /
                    <code className="font-mono"> src/battle_main.c</code>.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Validation panel */}
            {validation && (
              <div
                className={cn(
                  "mt-4 rounded-md border p-3 text-sm",
                  validation.ok
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-red-500/40 bg-red-500/5",
                )}
              >
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  {validation.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {validation.ok
                    ? `Validation passed · safety ${validation.safetyScore}/100`
                    : `${validation.errors?.length ?? 0} error(s), ${validation.warnings?.length ?? 0} warning(s)`}
                </div>
                <ul className="ml-6 list-disc space-y-0.5 text-xs">
                  {validation.errors?.map((e: any, i: number) => (
                    <li key={`e${i}`} className="text-red-600 dark:text-red-400">
                      {e.message}
                    </li>
                  ))}
                  {validation.warnings?.map((w: any, i: number) => (
                    <li key={`w${i}`} className="text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="mr-1 inline h-3 w-3" />
                      {w.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <SheetFooter className="sticky bottom-0 flex-row items-center gap-2 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={validate.isPending}
              className="gap-1.5"
            >
              {validate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
              Validate
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPreviewOpen(true)}
              className="gap-1.5"
            >
              <Code2 className="h-4 w-4" /> Preview code
            </Button>
            <DryRunButton
              entityType="status"
              entityId={status?.id}
              isEdit={isEdit}
              data={data as unknown as Record<string, unknown>}
              onApplied={() => onOpenChange(false)}
            />
            <Button
              onClick={handleSave}
              disabled={saving}
              className="ml-auto gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? "Save changes" : "Create status"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-emerald-500" />
              Generated C code — {form.constantName}
            </DialogTitle>
            <DialogDescription>
              Copy this into your pokeemerald-expansion project files. See the implementation
              checklist in the editor for the full list of manual edits.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto custom-scroll rounded-md border border-border bg-muted/30 p-4 text-[11px] leading-relaxed">
            <code>{codePreview}</code>
          </pre>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button onClick={copyCode} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <Copy className="h-4 w-4" /> Copy to clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default StatusEditor;
