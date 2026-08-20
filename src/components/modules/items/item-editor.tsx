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
} from "@/components/ui/card";
import {
  useCreateEntity,
  useUpdateEntity,
  useValidate,
  useEntities,
} from "@/components/shared/entity-hooks";
import {
  ITEM_POCKETS,
  ITEM_EFFECTS,
  HOLD_EFFECTS,
  ITEM_CATEGORIES,
} from "@/lib/poke-constants";
import { generateItemCode, type ItemData } from "@/lib/poke-codegen";
import { toast } from "sonner";
import {
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Code2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Item } from "@/components/modules/items/items-view";

interface Move {
  id: string;
  constantName: string;
  name: string;
  moveId: number;
}

interface FormState {
  constantName: string;
  itemId: number;
  name: string;
  description: string;
  pocket: string;
  category: string;
  price: number;
  flingPower: number;
  importance: number;
  effect: string;
  holdEffect: string;
  isTM: boolean;
  tmMoveConstant: string;
}

function emptyForm(nextItemId: number): FormState {
  return {
    constantName: "ITEM_",
    itemId: nextItemId,
    name: "",
    description: "",
    pocket: "POCKET_ITEMS",
    category: "ITEM_CATEGORY_ITEMS",
    price: 0,
    flingPower: 0,
    importance: 0,
    effect: "ITEM_EFFECT_NONE",
    holdEffect: "HOLD_EFFECT_NONE",
    isTM: false,
    tmMoveConstant: "",
  };
}

function itemToForm(item: Item): FormState {
  return {
    constantName: item.constantName,
    itemId: item.itemId,
    name: item.name,
    description: item.description ?? "",
    pocket: item.pocket,
    category: item.category,
    price: item.price,
    flingPower: item.flingPower,
    importance: item.importance,
    effect: item.effect,
    holdEffect: item.holdEffect,
    isTM: item.isTM,
    tmMoveConstant: item.tmMoveConstant ?? "",
  };
}

function toData(f: FormState): ItemData {
  return {
    constantName: f.constantName,
    itemId: f.itemId,
    name: f.name,
    description: f.description || null,
    pocket: f.pocket,
    price: f.price,
    effect: f.effect,
    holdEffect: f.holdEffect,
    flingPower: f.flingPower,
    importance: f.importance,
    category: f.category,
    isTM: f.isTM,
    tmMoveConstant: f.isTM ? f.tmMoveConstant || null : null,
  };
}

export function ItemEditor({
  item,
  open,
  onOpenChange,
  nextItemId,
}: {
  item: Item | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextItemId: number;
}) {
  // Initial form derived from `item` (edit) or fresh (new). The parent remounts
  // this component via `key` on each open, so the initializer runs fresh.
  const [form, setForm] = useState<FormState>(() =>
    item ? itemToForm(item) : emptyForm(nextItemId),
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [validation, setValidation] = useState<
    null | { ok: boolean; errors: any[]; warnings: any[]; safetyScore: number }
  >(null);

  const createItem = useCreateEntity<Item>("items");
  const updateItem = useUpdateEntity<Item>("items");
  const validate = useValidate();

  // Fetch moves for TM linkage
  const { data: movesData } = useEntities<Move>("moves");
  const moves = movesData?.moves ?? [];

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // When the user types the name (and we're creating new), auto-suggest a constant
  // name in the form ITEM_<UPPER_SNAKE>.
  function handleNameChange(newName: string) {
    setForm((f) => {
      const next: FormState = { ...f, name: newName };
      if (!item && newName && f.constantName === "ITEM_") {
        next.constantName =
          "ITEM_" +
          newName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      }
      return next;
    });
  }

  const data = useMemo(() => toData(form), [form]);
  const codePreview = useMemo(() => generateItemCode(data), [data]);

  const isEdit = !!item;
  const saving = createItem.isPending || updateItem.isPending;

  async function handleValidate() {
    try {
      const res = await validate.mutateAsync({ entityType: "item", data });
      setValidation(res);
      if (res.ok) toast.success(`Validation passed · safety ${res.safetyScore}/100`);
      else toast.error(`Validation failed: ${res.errors?.length ?? 0} error(s)`);
    } catch {
      toast.error("Validation request failed");
    }
  }

  function handleSave() {
    // Basic client-side guard
    if (!form.constantName.startsWith("ITEM_")) {
      toast.error("Constant name must start with ITEM_");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (form.isTM && !form.tmMoveConstant) {
      toast.error("TM items must specify a move constant");
      return;
    }
    const payload: Partial<Item> = {
      constantName: form.constantName,
      itemId: Number(form.itemId),
      name: form.name,
      description: form.description || null,
      pocket: form.pocket,
      category: form.category,
      price: Number(form.price),
      flingPower: Number(form.flingPower),
      importance: Number(form.importance),
      effect: form.effect,
      holdEffect: form.holdEffect,
      isTM: form.isTM,
      tmMoveConstant: form.isTM ? form.tmMoveConstant || null : null,
    };
    if (isEdit && item) {
      updateItem.mutate(
        { id: item.id, data: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createItem.mutate(payload as Partial<Item>, {
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full flex-col gap-0 p-0 sm:max-w-2xl md:max-w-3xl"
        >
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {isEdit ? "Edit item" : "New item"}
            </SheetTitle>
            <SheetDescription>
              {isEdit
                ? `Editing ${item?.constantName}`
                : "Design a custom item, Poké Ball, berry, TM or key item."}
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto custom-scroll px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Constant name */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="it-const">Constant name</Label>
                <Input
                  id="it-const"
                  value={form.constantName}
                  onChange={(e) => update("constantName", e.target.value.toUpperCase())}
                  placeholder="ITEM_MYITEM"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Must start with <code className="font-mono">ITEM_</code> and be UPPER_SNAKE_CASE.
                </p>
              </div>

              {/* Item ID */}
              <div className="space-y-1.5">
                <Label htmlFor="it-id">Item ID</Label>
                <Input
                  id="it-id"
                  type="number"
                  value={form.itemId}
                  onChange={(e) => update("itemId", Number(e.target.value))}
                  min={0}
                  max={65535}
                />
                <p className="text-xs text-muted-foreground">
                  Prefilled from project nextItemId ({nextItemId}).
                </p>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="it-name">Display name</Label>
                <Input
                  id="it-name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Mystic Orb"
                  maxLength={32}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="it-desc">Description</Label>
                <Textarea
                  id="it-desc"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="A mysterious orb that boosts Sp. Atk in a pinch…"
                  rows={3}
                />
              </div>

              {/* Pocket */}
              <div className="space-y-1.5">
                <Label>Pocket</Label>
                <Select value={form.pocket} onValueChange={(v) => update("pocket", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select pocket" />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_POCKETS.map((p) => (
                      <SelectItem key={p.constant} value={p.constant}>
                        {p.name} <span className="text-muted-foreground">({p.constant})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => update("category", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <Label htmlFor="it-price">Price (Poké)</Label>
                <Input
                  id="it-price"
                  type="number"
                  value={form.price}
                  onChange={(e) => update("price", Number(e.target.value))}
                  min={0}
                />
              </div>

              {/* Fling power */}
              <div className="space-y-1.5">
                <Label htmlFor="it-fling">Fling power (0–255)</Label>
                <Input
                  id="it-fling"
                  type="number"
                  value={form.flingPower}
                  onChange={(e) => update("flingPower", Number(e.target.value))}
                  min={0}
                  max={255}
                />
              </div>

              {/* Importance */}
              <div className="space-y-1.5">
                <Label htmlFor="it-imp">Importance (0–255)</Label>
                <Input
                  id="it-imp"
                  type="number"
                  value={form.importance}
                  onChange={(e) => update("importance", Number(e.target.value))}
                  min={0}
                  max={255}
                />
                <p className="text-xs text-muted-foreground">
                  Higher = harder to discard / trade.
                </p>
              </div>

              {/* Effect */}
              <div className="space-y-1.5">
                <Label>Item effect</Label>
                <Select value={form.effect} onValueChange={(v) => update("effect", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select effect" />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_EFFECTS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hold effect */}
              <div className="space-y-1.5">
                <Label>Hold effect</Label>
                <Select value={form.holdEffect} onValueChange={(v) => update("holdEffect", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select hold effect" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOLD_EFFECTS.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TM switch */}
              <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/5 p-3 md:col-span-2">
                <div>
                  <Label htmlFor="it-tm" className="cursor-pointer">
                    This item is a TM / HM
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, link this item to a move constant for teachable learnsets.
                  </p>
                </div>
                <Switch
                  id="it-tm"
                  checked={form.isTM}
                  onCheckedChange={(v) => update("isTM", v)}
                />
              </div>

              {/* TM move constant */}
              {form.isTM && (
                <div className="space-y-1.5 md:col-span-2">
                  <Label>TM move constant</Label>
                  {moves.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground">
                      No moves in this project yet. Create a move first, then link it here.
                    </div>
                  ) : (
                    <Select
                      value={form.tmMoveConstant || undefined}
                      onValueChange={(v) => update("tmMoveConstant", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a move" />
                      </SelectTrigger>
                      <SelectContent>
                        {moves.map((m) => (
                          <SelectItem key={m.id} value={m.constantName}>
                            <span className="font-mono">{m.constantName}</span>
                            <span className="text-muted-foreground"> — {m.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            {/* Validation panel */}
            {validation && (
              <div
                className={cn(
                  "mt-5 rounded-md border p-3 text-sm",
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

            {/* Live code preview */}
            <Card className="mt-5 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-emerald-500" />
                    Live preview · gItems[] entry
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    auto-updates
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <pre className="max-h-72 overflow-auto custom-scroll rounded-md border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-foreground">
                  <code>{codePreview}</code>
                </pre>
              </CardContent>
            </Card>
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
              {isEdit ? "Save changes" : "Create item"}
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
              Copy this into your pokeemerald-expansion project files. Sections are commented with the
              target file path.
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

export default ItemEditor;
