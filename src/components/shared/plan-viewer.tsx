"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  FileWarning,
  FilePlus,
  FileText,
  FolderPlus,
  Trash2,
  Loader2,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface PlanStep {
  targetFile: string;
  action: "insert" | "replace" | "delete" | "create_folder";
  reason: string;
  riskLevel: "low" | "medium" | "high";
  warnings: string[];
}

export interface PlanData {
  mode: "add" | "edit" | "delete";
  entityType: string;
  entityConstant: string;
  steps: PlanStep[];
  warnings: string[];
  errors: string[];
  generatedCode: string;
  isBlocked: boolean;
  planId?: string;
}

export function PlanViewer({
  open,
  onOpenChange,
  plan,
  onApply,
  applying,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: PlanData | null;
  onApply: () => void;
  applying: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!plan) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(plan.generatedCode);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  const actionIcon = (action: PlanStep["action"]) => {
    switch (action) {
      case "insert": return <FilePlus className="h-3.5 w-3.5" />;
      case "replace": return <FileText className="h-3.5 w-3.5" />;
      case "delete": return <Trash2 className="h-3.5 w-3.5" />;
      case "create_folder": return <FolderPlus className="h-3.5 w-3.5" />;
    }
  };

  const riskColor = (risk: PlanStep["riskLevel"]) =>
    risk === "high" ? "text-red-500 bg-red-500/10 border-red-500/30"
    : risk === "medium" ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
    : "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg">
                {plan.isBlocked ? (
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                )}
                Dry-Run Plan: {plan.mode} {plan.entityType}
              </DialogTitle>
              <DialogDescription className="mt-1 font-mono text-xs">
                {plan.entityConstant}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {plan.isBlocked ? (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> Blocked
                </Badge>
              ) : (
                <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Ready to apply
                </Badge>
              )}
              <Badge variant="outline">{plan.steps.length} steps</Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scroll px-6 py-4">
          {/* Errors */}
          {plan.errors.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/5 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                <XCircle className="h-4 w-4" /> Errors — apply is blocked
              </h4>
              <ul className="space-y-1">
                {plan.errors.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                    <span className="mt-0.5">•</span>
                    <span className="font-mono">{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {plan.warnings.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" /> Warnings ({plan.warnings.length})
              </h4>
              <ul className="space-y-1">
                {plan.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <span className="mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Tabs defaultValue="steps">
            <TabsList className="mb-3">
              <TabsTrigger value="steps">
                <FileWarning className="mr-1.5 h-3.5 w-3.5" /> Steps ({plan.steps.length})
              </TabsTrigger>
              <TabsTrigger value="code">
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Generated code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="mt-0">
              <div className="space-y-2">
                {plan.steps.map((step, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      riskColor(step.riskLevel),
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase">
                            {actionIcon(step.action)}
                            {step.action.replace("_", " ")}
                          </span>
                          <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-[11px] break-all">
                            {step.targetFile}
                          </code>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] uppercase", riskColor(step.riskLevel))}
                          >
                            {step.riskLevel} risk
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{step.reason}</p>
                        {step.warnings.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {step.warnings.map((w, j) => (
                              <li key={j} className="flex items-start gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                {w}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {plan.steps.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No file changes required.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="code" className="mt-0">
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyCode}
                  className="absolute right-2 top-2 z-10 h-7 gap-1.5 bg-background/80 backdrop-blur"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </Button>
                <pre className="max-h-[50vh] overflow-y-auto custom-scroll rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed">
{plan.generatedCode || "(no code generated)"}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {plan.isBlocked
              ? "Fix the errors above, then re-run the plan."
              : "An automatic backup will be created before applying."}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={onApply}
              disabled={plan.isBlocked || applying}
              className={cn(
                "gap-1.5",
                !plan.isBlocked && "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
            >
              {applying ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Applying…</>
              ) : (
                <><ShieldCheck className="h-4 w-4" /> Apply changes</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to generate + apply a plan
export function usePlanWorkflow(projectId: string) {
  const generatePlan = useMutation({
    mutationFn: async (body: {
      mode: "add" | "edit" | "delete";
      entityType: string;
      entityId?: string;
      data?: Record<string, unknown>;
    }) => {
      const r = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, projectId }),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || "Failed to generate plan");
      }
      return r.json() as Promise<{ plan: PlanData; planId: string }>;
    },
  });

  const applyPlan = useMutation({
    mutationFn: async (planId: string) => {
      const r = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, projectId }),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || "Failed to apply");
      }
      return r.json();
    },
  });

  return { generatePlan, applyPlan };
}
