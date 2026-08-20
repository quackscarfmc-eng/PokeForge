"use client";

import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, FileCode, Download, Copy, Check, Files } from "lucide-react";
import { toast } from "sonner";

export function ExportView() {
  const { currentProjectId } = useAppStore();
  const [activeFile, setActiveFile] = useState(0);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["export", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/export?projectId=${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });

  const files = data?.files ?? [];
  const stats = data?.stats;
  const readme = data?.readme;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadFile = (path: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = path.split("/").pop() || "export.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    // Download a single combined file with all patches + README
    const combined =
      readme +
      "\n\n" +
      files
        .map((f: any) => `\n${"=".repeat(70)}\n# FILE: ${f.path}\n${"=".repeat(70)}\n\n${f.content}`)
        .join("\n");
    const blob = new Blob([combined], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pokeforge-export-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  };

  return (
    <div>
      <PageHeader
        title="Export Center"
        description="Generate the C-header snippets and JSON to paste into your pokeemerald-expansion project."
        icon={Package}
        actions={
          files.length > 0 && (
            <Button onClick={downloadAll}>
              <Download className="mr-2 h-4 w-4" /> Download all
            </Button>
          )
        }
      />

      {stats && (
        <div className="mb-4 grid grid-cols-3 gap-2 md:grid-cols-7">
          {[
            { k: "species", l: "Pokémon", c: "#EE8130" },
            { k: "moves", l: "Moves", c: "#C22E28" },
            { k: "types", l: "Types", c: "#6F35FC" },
            { k: "abilities", l: "Abilities", c: "#F7D02C" },
            { k: "items", l: "Items", c: "#7AC74C" },
            { k: "statuses", l: "Status", c: "#A33EA1" },
            { k: "encounters", l: "Encounters", c: "#3B82F6" },
          ].map((s) => (
            <div key={s.k} className="rounded-md border border-border bg-card p-3 text-center">
              <div className="text-2xl font-black" style={{ color: s.c }}>
                {(stats as any)[s.k]}
              </div>
              <div className="text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Generating…</p>
      ) : files.length === 0 ? (
        <EmptyState
          icon={Files}
          title="Nothing to export yet"
          description="Create some custom Pokémon, moves, types, abilities, items or status conditions — then come back here to export the code."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* File list */}
          <Card className="lg:max-h-[calc(100vh-220px)] lg:overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileCode className="h-4 w-4" /> Files ({files.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto custom-scroll lg:p-2">
              <div className="space-y-1">
                {files.map((f: any, i: number) => (
                  <button
                    key={f.path}
                    onClick={() => setActiveFile(i)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      i === activeFile ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >
                    <FileCode className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-mono">{f.path.split("/").pop()}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active file preview */}
          {files[activeFile] && (
            <Card className="lg:max-h-[calc(100vh-220px)] lg:flex lg:flex-col lg:overflow-hidden">
              <CardHeader className="flex-row items-center justify-between pb-2">
                <div className="min-w-0">
                  <CardTitle className="truncate font-mono text-sm">
                    {files[activeFile].path}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {files[activeFile].language.toUpperCase()} ·{" "}
                    {files[activeFile].content.split("\n").length} lines
                  </CardDescription>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" onClick={() => copy(files[activeFile].content)}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="ml-1.5">Copy</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadFile(files[activeFile].path, files[activeFile].content)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="lg:flex-1 lg:overflow-hidden lg:p-0">
                <pre className="h-full max-h-[calc(100vh-320px)] overflow-y-auto custom-scroll bg-muted/30 p-4 font-mono text-xs leading-relaxed">
{files[activeFile].content}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
