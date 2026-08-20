"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  generateAbilityCode,
  type AbilityData,
  type ValidationIssue,
} from "@/lib/poke-codegen";
import {
  useCreateEntity,
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
  X,
  Plus,
} from "lucide-react";

interface AbilityRow {
  id: string;
  constantName: string;
  abilityId: number;
  name: string;
  description?: string | null;
  effectFlags: string;
  battleScript?: string | null;
}

interface AbilityEditorProps {
  ability: AbilityRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextAbilityId: number;
}

function safeParse<T>(s: string | undefined | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function AbilityEditor({ ability, open, onOpenChange, nextAbilityId }: AbilityEditorProps) {
  const createMut = useCreateEntity<AbilityRow>("abilities");
  const updateMut = useUpdateEntity<AbilityRow>("abilities");
  const validateMut = useValidate();

  // Initial state is seeded from props; parent remounts via key when target changes.
  const [constantName, setConstantName] = useState(ability?.constantName ?? "ABILITY_");
  const [abilityId, setAbilityId] = useState<number>(ability?.abilityId ?? nextAbilityId);
  const [name, setName] = useState(ability?.name ?? "");
  const [description, setDescription] = useState(ability?.description ?? "");
  const [effectFlags, setEffectFlags] = useState<string[]>(
    ability ? safeParse<string[]>(ability.effectFlags, []) : [],
  );
  const [battleScript, setBattleScript] = useState(ability?.battleScript ?? "");
  const [flagInput, setFlagInput] = useState("");
  const [validation, setValidation] = useState<ValidationIssue[] | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const buildData = (): AbilityData => ({
    constantName,
    abilityId,
    name,
    description: description || null,
    effectFlags,
    battleScript: battleScript || null,
  });

  const addFlag = () => {
    const v = flagInput.trim();
    if (!v) return;
    if (effectFlags.includes(v)) {
      toast.error("Flag already added");
      return;
    }
    setEffectFlags((f) => [...f, v]);
    setFlagInput("");
  };
  const removeFlag = (f: string) =>
    setEffectFlags((cur) => cur.filter((x) => x !== f));

  const handleValidate = async () => {
    try {
      const res = await validateMut.mutateAsync({
        entityType: "ability",
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
    if (!constantName.startsWith("ABILITY_") || constantName.length < 8) {
      toast.error("Constant must start with ABILITY_ and be at least 8 chars");
      return;
    }
    if (!name.trim()) {
      toast.error("Ability name is required");
      return;
    }
    const payload: Partial<AbilityRow> = {
      constantName,
      abilityId,
      name,
      description: description || null,
      effectFlags,
      battleScript: battleScript || null,
    };
    try {
      if (ability) {
        await updateMut.mutateAsync({ id: ability.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // handled by mutation
    }
  };

  // Compute preview code inline; React Compiler auto-memoizes.
  const previewCode = open ? generateAbilityCode(buildData()) : "";

  const errors = validation?.filter((v) => v.severity === "error") ?? [];
  const warnings = validation?.filter((v) => v.severity === "warning") ?? [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-screen flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl"
        >
          <SheetHeader className="border-b border-border pr-12">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {ability ? "Edit Ability" : "New Ability"}
            </SheetTitle>
            <SheetDescription>
              Define a custom ability — its constant, ID, description, effect flags,
              and battle script reference.
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
                  <Label htmlFor="a-const" className="text-xs">
                    Constant name
                  </Label>
                  <Input
                    id="a-const"
                    value={constantName}
                    onChange={(e) =>
                      setConstantName(e.target.value.toUpperCase())
                    }
                    placeholder="ABILITY_ASTRAL_AURA"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a-id" className="text-xs">
                    Ability ID
                    <span className="ml-1 text-muted-foreground/70">
                      (suggested {nextAbilityId})
                    </span>
                  </Label>
                  <Input
                    id="a-id"
                    type="number"
                    value={abilityId}
                    onChange={(e) =>
                      setAbilityId(parseInt(e.target.value || "0", 10))
                    }
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="a-name" className="text-xs">
                    Display name
                  </Label>
                  <Input
                    id="a-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Astral Aura"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="a-desc" className="text-xs">
                    Description
                  </Label>
                  <Textarea
                    id="a-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Boosts Cosmic-type moves by 1.5×."
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* Effect flags */}
            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Effect Flags
              </h3>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="flex gap-2">
                  <Input
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFlag();
                      }
                    }}
                    placeholder="ABILITY_FLAG_CANNOT_BE_SUPPRESSED"
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addFlag}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {effectFlags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {effectFlags.map((f) => (
                      <Badge
                        key={f}
                        variant="secondary"
                        className="gap-1 font-mono text-[10px]"
                      >
                        {f}
                        <button
                          type="button"
                          onClick={() => removeFlag(f)}
                          className="rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                          aria-label={`Remove ${f}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    No flags. Press Enter or click + to add. Free-form strings.
                  </p>
                )}
              </div>
            </section>

            {/* Battle script */}
            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Battle Script (optional)
              </h3>
              <Textarea
                value={battleScript}
                onChange={(e) => setBattleScript(e.target.value)}
                placeholder="// BattleScript_AstralAura&#10;// seteffectprimary=TRUE&#10;// ... call your battle script label"
                rows={4}
                className="font-mono text-xs"
              />
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
                      <Badge
                        variant="outline"
                        className="ml-1 border-amber-500/40 text-amber-600 dark:text-amber-400"
                      >
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
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              <Save className="mr-1.5 h-4 w-4" />
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
