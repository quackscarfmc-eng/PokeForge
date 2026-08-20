"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EFFECTIVENESS_OPTIONS,
  POKEMON_TYPES,
  TYPE_COLOR,
  TYPE_NAME,
} from "@/lib/poke-constants";
import {
  generateTypeCode,
  type TypeData,
  type ValidationIssue,
} from "@/lib/poke-codegen";
import {
  useCreateEntity,
  useEntities,
  useUpdateEntity,
  useValidate,
} from "@/components/shared/entity-hooks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  Code2,
  Save,
  Sparkles,
  XCircle,
  Copy,
} from "lucide-react";

interface TypeRow {
  id: string;
  constantName: string;
  typeId: number;
  name: string;
  colorHex: string;
  iconEmoji?: string | null;
  offensiveMatrix: string;
  defensiveMatrix: string;
}

interface TypeEditorProps {
  type: TypeRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextTypeId: number;
}

function safeParse<T>(s: string | undefined | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

const DEFAULT_COLOR = "#10b981";

export function TypeEditor({ type, open, onOpenChange, nextTypeId }: TypeEditorProps) {
  const createMut = useCreateEntity<TypeRow>("types");
  const updateMut = useUpdateEntity<TypeRow>("types");
  const validateMut = useValidate();

  const { data: typesData } = useEntities<TypeRow>("types");
  const existingCustomTypes = typesData?.types ?? [];

  // Initial state is seeded from props via useState initializer; the parent remounts
  // this component (key) whenever the target changes, so initial state stays in sync.
  const [constantName, setConstantName] = useState(type?.constantName ?? "TYPE_");
  const [typeId, setTypeId] = useState<number>(type?.typeId ?? nextTypeId);
  const [name, setName] = useState(type?.name ?? "");
  const [description, setDescription] = useState(type?.description ?? "");
  const [colorHex, setColorHex] = useState(type?.colorHex || DEFAULT_COLOR);
  const [iconEmoji, setIconEmoji] = useState(type?.iconEmoji ?? "");
  const [offensiveMatrix, setOffensiveMatrix] = useState<Record<string, number>>(
    type ? safeParse(type.offensiveMatrix, {}) : {},
  );
  const [defensiveMatrix, setDefensiveMatrix] = useState<Record<string, number>>(
    type ? safeParse(type.defensiveMatrix, {}) : {},
  );
  const [validation, setValidation] = useState<ValidationIssue[] | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // All attacker types: builtin + custom (excluding the one being edited)
  const allAttackerTypes = useMemo(() => {
    const customs = existingCustomTypes
      .filter((t) => t.id !== type?.id)
      .map((t) => t.constantName);
    return [...POKEMON_TYPES.map((p) => p.constant), ...customs];
  }, [existingCustomTypes, type?.id]);

  const buildData = (): TypeData => ({
    constantName,
    typeId,
    name,
    description: description || null,
    colorHex,
    offensiveMatrix,
    defensiveMatrix,
  });

  const handleValidate = async () => {
    try {
      const res = await validateMut.mutateAsync({
        entityType: "type",
        data: buildData() as unknown as Record<string, unknown>,
      });
      const issues: ValidationIssue[] = [
        ...(res.errors ?? []),
        ...(res.warnings ?? []),
      ];
      setValidation(issues);
      if (res.ok) {
        toast.success(`Validation passed (score ${res.safetyScore}/100)`);
      } else {
        toast.error(`${res.errors.length} error(s) found`);
      }
    } catch {
      toast.error("Validation failed");
    }
  };

  const handleSave = async () => {
    if (!constantName.startsWith("TYPE_") || constantName.length < 6) {
      toast.error("Constant must start with TYPE_ and be at least 6 chars");
      return;
    }
    if (!name.trim()) {
      toast.error("Type name is required");
      return;
    }
    const payload: Partial<TypeRow> = {
      constantName,
      typeId,
      name,
      description: description || null,
      colorHex,
      iconEmoji: iconEmoji || null,
      offensiveMatrix,
      defensiveMatrix,
    };
    try {
      if (type) {
        await updateMut.mutateAsync({ id: type.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // toast handled by mutation onError
    }
  };

  const setOffensive = (atk: string, v: number) =>
    setOffensiveMatrix((m) => ({ ...m, [atk]: v }));
  const setDefensive = (atk: string, v: number) =>
    setDefensiveMatrix((m) => ({ ...m, [atk]: v }));

  // Compute preview code inline; React Compiler auto-memoizes.
  const previewCode = open
    ? generateTypeCode(buildData(), [
        ...POKEMON_TYPES.map((p) => p.constant),
        ...existingCustomTypes.map((t) => t.constantName),
        constantName,
      ])
    : "";

  const errors = validation?.filter((v) => v.severity === "error") ?? [];
  const warnings = validation?.filter((v) => v.severity === "warning") ?? [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-screen flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl"
        >
          <SheetHeader className="border-b border-border pr-12">
            <SheetTitle className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: colorHex }}
              />
              {type ? "Edit Type" : "New Type"}
            </SheetTitle>
            <SheetDescription>
              Define a custom elemental type and its full effectiveness matrix.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto custom-scroll px-4 py-4">
            {/* Identity */}
            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Identity
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="t-const" className="text-xs">
                    Constant name
                  </Label>
                  <Input
                    id="t-const"
                    value={constantName}
                    onChange={(e) => setConstantName(e.target.value.toUpperCase())}
                    placeholder="TYPE_ASTRAL"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-id" className="text-xs">
                    Type ID
                    <span className="ml-1 text-muted-foreground/70">(suggested {nextTypeId})</span>
                  </Label>
                  <Input
                    id="t-id"
                    type="number"
                    value={typeId}
                    onChange={(e) => setTypeId(parseInt(e.target.value || "0", 10))}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-name" className="text-xs">
                    Display name
                  </Label>
                  <Input
                    id="t-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Astral"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-emoji" className="text-xs">
                    Icon emoji (optional)
                  </Label>
                  <Input
                    id="t-emoji"
                    value={iconEmoji}
                    onChange={(e) => setIconEmoji(e.target.value)}
                    placeholder="🌀"
                    maxLength={4}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="t-desc" className="text-xs">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="t-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A type tied to the cosmic realm…"
                    rows={2}
                  />
                </div>
              </div>
            </section>

            {/* Appearance */}
            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Appearance
              </h3>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-0"
                    aria-label="Pick color"
                  />
                  <Input
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="w-28 font-mono"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <span className="text-xs text-muted-foreground">Preview</span>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white shadow"
                    style={{ backgroundColor: colorHex }}
                  >
                    {iconEmoji && <span>{iconEmoji}</span>}
                    {name || "Custom Type"}
                  </span>
                </div>
              </div>
            </section>

            {/* Effectiveness matrix */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Effectiveness Matrix
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {allAttackerTypes.length} attacking types
                </span>
              </div>
              <div className="rounded-md border border-border">
                <div className="max-h-[420px] overflow-auto custom-scroll">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="sticky top-0 z-20 bg-card">
                        <th className="sticky left-0 z-30 min-w-[140px] border-b border-r border-border bg-card px-2 py-2 text-left font-semibold">
                          Attacking type
                        </th>
                        <th className="border-b border-border px-2 py-2 text-center font-semibold">
                          Offensive
                          <div className="text-[9px] font-normal text-muted-foreground">
                            this → X
                          </div>
                        </th>
                        <th className="border-b border-border px-2 py-2 text-center font-semibold">
                          Defensive
                          <div className="text-[9px] font-normal text-muted-foreground">
                            X → this
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAttackerTypes.map((atk) => {
                        const offVal = offensiveMatrix[atk] ?? 1;
                        const defVal = defensiveMatrix[atk] ?? 1;
                        const isCustom = !POKEMON_TYPES.some(
                          (p) => p.constant === atk,
                        );
                        const color = isCustom
                          ? existingCustomTypes.find((t) => t.constantName === atk)?.colorHex ?? "#68A090"
                          : TYPE_COLOR(atk);
                        return (
                          <tr
                            key={atk}
                            className="border-b border-border/60 last:border-b-0 hover:bg-accent/40"
                          >
                            <td className="sticky left-0 z-10 bg-card px-2 py-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="font-medium">{TYPE_NAME(atk)}</span>
                              </div>
                            </td>
                            <td className="px-1.5 py-1.5 text-center">
                              <EffectivenessSelect
                                value={offVal}
                                onChange={(v) => setOffensive(atk, v)}
                              />
                            </td>
                            <td className="px-1.5 py-1.5 text-center">
                              <EffectivenessSelect
                                value={defVal}
                                onChange={(v) => setDefensive(atk, v)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Defaults to 1×. Adjust each cell to set super-effective (2×/4×),
                not-very-effective (0.5×/0.25×), or no-effect (0×) matchups.
              </p>
            </section>

            {/* Validation panel */}
            {validation && (
              <section className="mt-5">
                <div
                  className={cn(
                    "rounded-md border p-3",
                    errors.length > 0
                      ? "border-red-500/40 bg-red-500/5"
                      : "border-emerald-500/40 bg-emerald-500/5",
                  )}
                >
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    {errors.length > 0 ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    {errors.length > 0
                      ? `${errors.length} error(s)`
                      : "Validation passed"}
                    {warnings.length > 0 && (
                      <Badge variant="outline" className="ml-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {warnings.length} warning(s)
                      </Badge>
                    )}
                  </div>
                  <ul className="space-y-1 text-xs">
                    {validation.map((v, i) => (
                      <li
                        key={i}
                        className={cn(
                          "flex items-start gap-1.5",
                          v.severity === "error"
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400",
                        )}
                      >
                        <span className="mt-px">
                          {v.severity === "error" ? "✕" : "⚠"}
                        </span>
                        <span>{v.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>

          <SheetFooter className="sticky bottom-0 flex-row items-center justify-end gap-2 border-t border-border bg-background/95 backdrop-blur">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
            >
              <Code2 className="mr-1.5 h-4 w-4" />
              Preview code
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleValidate}
              disabled={validateMut.isPending}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Validate
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Save className="mr-1.5 h-4 w-4" />
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Code preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Code2 className="h-4 w-4" />
              Generated C-header — {constantName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 border-b border-border bg-muted/30 px-4 py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(previewCode);
                toast.success("Code copied to clipboard");
              }}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
          <pre className="max-h-[60vh] overflow-auto custom-scroll bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
            <code>{previewCode}</code>
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EffectivenessSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(parseFloat(v))}>
      <SelectTrigger
        size="sm"
        className={cn(
          "h-7 w-[88px] border-border px-2 text-xs",
          value === 0 && "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
          value === 0.25 && "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400",
          value === 0.5 && "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
          value === 2 && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          value === 4 && "border-emerald-500/60 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {EFFECTIVENESS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={String(o.value)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
