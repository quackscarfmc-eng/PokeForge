"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileJson } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ImportButton({ entityType }: { entityType: string }) {
  const { currentProjectId } = useAppStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importMut = useMutation({
    mutationFn: async (data: any[]) => {
      const r = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId, entityType, data }),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || "Failed to import");
      }
      return r.json();
    },
    onSuccess: (res) => {
      setResult(res);
      toast.success(`Imported ${res.imported} ${entityType}${res.imported === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: [entityType] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setJsonText(reader.result as string);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      importMut.mutate(arr);
    } catch {
      toast.error("Invalid JSON — please check your syntax");
    }
  };

  const loadExample = () => {
    if (entityType === "species") {
      setJsonText(JSON.stringify([
        {
          constantName: "SPECIES_EXAMPLE",
          speciesName: "Example",
          baseHP: 60, baseAttack: 70, baseDefense: 60, baseSpeed: 80,
          baseSpAttack: 90, baseSpDefense: 70,
          types: ["TYPE_NORMAL"],
          abilities: ["ABILITY_NONE"],
          catchRate: 45, expYield: 100, growthRate: "GROWTH_MEDIUM_FAST",
          eggGroups: ["EGG_GROUP_FIELD"],
          description: "An example imported Pokémon.",
          learnsetMoves: [{ level: 1, moveConstant: "MOVE_TACKLE" }],
        },
      ], null, 2));
    } else if (entityType === "moves") {
      setJsonText(JSON.stringify([
        {
          constantName: "MOVE_EXAMPLE",
          name: "Example",
          effect: "EFFECT_HIT",
          power: 80, type: "TYPE_NORMAL", category: "CATEGORY_PHYSICAL",
          target: "MOVE_TARGET_SELECTED", pp: 15, accuracy: 100,
          flags: ["MOVE_FLAG_MAKES_CONTACT"],
          description: "An example imported move.",
        },
      ], null, 2));
    }
    setResult(null);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="mr-1.5 h-3.5 w-3.5" /> Import
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setResult(null); setJsonText(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-primary" />
              Import {entityType}
            </DialogTitle>
            <DialogDescription>
              Paste JSON or upload a .json file. Each item must have a <code className="rounded bg-muted px-1 font-mono text-xs">constantName</code> field.
              Items with duplicate constants will be skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload .json
              </Button>
              <Button variant="ghost" size="sm" onClick={loadExample}>
                Load example
              </Button>
            </div>

            <Textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setResult(null); }}
              placeholder='[{ "constantName": "SPECIES_...", "speciesName": "...", ... }]'
              className="min-h-[200px] font-mono text-xs"
            />

            {result && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", result.imported > 0 ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground")}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-sm">
                    <span className="font-semibold text-emerald-600">{result.imported} imported</span>
                    {result.skipped > 0 && <span className="ml-2 text-muted-foreground">{result.skipped} skipped</span>}
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto custom-scroll rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                    {result.errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        {e}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={handleImport} disabled={!jsonText.trim() || importMut.isPending}>
              {importMut.isPending ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Importing…</>
              ) : (
                <><Upload className="mr-1.5 h-3.5 w-3.5" /> Import {entityType}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
