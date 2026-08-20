"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen,
  Scan,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  FileSearch,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScanResult {
  valid: boolean;
  counts?: { species: number; moves: number; types: number; abilities: number };
  missing?: string[];
  warnings?: string[];
  error?: string;
}

interface ImportResult {
  ok: boolean;
  stats: {
    species: { imported: number; skipped: number; total: number };
    moves: { imported: number; skipped: number; total: number };
    types: { imported: number; skipped: number; total: number };
    abilities: { imported: number; skipped: number; total: number };
  };
  warnings: string[];
}

export function ImportProjectButton() {
  const { currentProjectId } = useAppStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const scanMut = useMutation({
    mutationFn: async (path: string) => {
      const r = await fetch(`/api/import-project?path=${encodeURIComponent(path)}`);
      return r.json();
    },
    onSuccess: (data) => {
      setScanResult(data);
      if (data.valid) {
        toast.success(`Found ${data.counts.species} species, ${data.counts.moves} moves, ${data.counts.abilities} abilities`);
      } else {
        toast.error(data.error || "Invalid project path");
      }
    },
    onError: () => toast.error("Scan failed"),
  });

  const importMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/import-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: currentProjectId, basePath: path }),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || "Failed");
      }
      return r.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      toast.success(`Imported ${data.stats.species.imported} species, ${data.stats.moves.imported} moves`);
      qc.invalidateQueries({ queryKey: ["species"] });
      qc.invalidateQueries({ queryKey: ["moves"] });
      qc.invalidateQueries({ queryKey: ["types"] });
      qc.invalidateQueries({ queryKey: ["abilities"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleScan = () => {
    setScanResult(null);
    setImportResult(null);
    scanMut.mutate(path);
  };

  const handleImport = () => {
    importMut.mutate();
  };

  const reset = () => {
    setPath("");
    setScanResult(null);
    setImportResult(null);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FolderOpen className="mr-1.5 h-3.5 w-3.5" /> Import Project
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Import Existing pokeemerald-expansion Project
            </DialogTitle>
            <DialogDescription>
              Scan your existing pokeemerald-expansion checkout and import all species, moves, types, and abilities.
              This reads the C source files directly — no manual entry needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Path input */}
            <div className="space-y-2">
              <Label htmlFor="path">Project path (absolute)</Label>
              <div className="flex gap-2">
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => { setPath(e.target.value); setScanResult(null); setImportResult(null); }}
                  placeholder="/home/user/pokeemerald-expansion"
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="sm" onClick={handleScan} disabled={!path.trim() || scanMut.isPending}>
                  {scanMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scan className="h-3.5 w-3.5" />}
                  Scan
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Enter the path to your pokeemerald-expansion git checkout (the folder containing <code className="rounded bg-muted px-1">include/</code> and <code className="rounded bg-muted px-1">src/</code>).
              </p>
            </div>

            {/* Scan results */}
            {scanResult && !scanResult.valid && (
              <Card className="border-red-500/40 bg-red-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="h-4 w-4" /> Invalid Project
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-red-700 dark:text-red-300">{scanResult.error}</p>
                  {scanResult.missing && scanResult.missing.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Missing files:</p>
                      <ul className="mt-1 space-y-0.5">
                        {scanResult.missing.map((f) => (
                          <li key={f} className="font-mono text-[10px] text-red-600">{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {scanResult?.valid && (
              <Card className="border-emerald-500/40 bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Valid Project Found
                  </CardTitle>
                  <CardDescription>Ready to import the following:</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Species", count: scanResult.counts!.species, color: "#EE8130" },
                      { label: "Moves", count: scanResult.counts!.moves, color: "#C22E28" },
                      { label: "Types", count: scanResult.counts!.types, color: "#6F35FC" },
                      { label: "Abilities", count: scanResult.counts!.abilities, color: "#F7D02C" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
                        <div className="text-2xl font-black" style={{ color: s.color }}>{s.count}</div>
                        <div className="text-[10px] text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {scanResult.warnings && scanResult.warnings.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {scanResult.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {w}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Import results */}
            {importResult && (
              <Card className="border-primary/40 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Import Complete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { label: "Species", stats: importResult.stats.species },
                      { label: "Moves", stats: importResult.stats.moves },
                      { label: "Types", stats: importResult.stats.types },
                      { label: "Abilities", stats: importResult.stats.abilities },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-xs">
                        <span className="font-medium">{s.label}</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 text-[10px]">
                            {s.stats.imported} imported
                          </Badge>
                          {s.stats.skipped > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {s.stats.skipped} skipped
                            </Badge>
                          )}
                          <span className="text-muted-foreground">/ {s.stats.total} found</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {importResult.warnings.length > 0 && (
                    <div className="mt-3 max-h-32 overflow-y-auto custom-scroll rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                      {importResult.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {w}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            {scanResult?.valid && !importResult && (
              <Button onClick={handleImport} disabled={importMut.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {importMut.isPending ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Importing…</>
                ) : (
                  <><Download className="mr-1.5 h-3.5 w-3.5" /> Import {scanResult.counts!.species + scanResult.counts!.moves} entities</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
