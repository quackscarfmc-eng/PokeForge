"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { PlanViewer, usePlanWorkflow, type PlanData } from "@/components/shared/plan-viewer";
import { useAppStore } from "@/lib/store";

/**
 * Reusable Dry-Run Plan button + viewer for any entity editor.
 * Drops into any editor footer — generates a plan, shows the viewer, and handles apply.
 */
export function DryRunButton({
  entityType,
  entityId,
  isEdit,
  data,
  onApplied,
}: {
  entityType: string;
  entityId?: string;
  isEdit: boolean;
  data: Record<string, unknown>;
  onApplied?: () => void;
}) {
  const { currentProjectId } = useAppStore();
  const qc = useQueryClient();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const planWorkflow = usePlanWorkflow(currentProjectId!);

  const handleGenerate = () => {
    planWorkflow.generatePlan.mutate(
      {
        mode: isEdit ? "edit" : "add",
        entityType,
        entityId,
        data,
      },
      {
        onSuccess: (res) => {
          setPlan(res.plan);
          setPlanOpen(true);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const handleApply = () => {
    if (plan?.planId) {
      planWorkflow.applyPlan.mutate(plan.planId, {
        onSuccess: () => {
          toast.success("Plan applied — backup created");
          setPlanOpen(false);
          qc.invalidateQueries({ queryKey: [entityType] });
          qc.invalidateQueries({ queryKey: ["project"] });
          onApplied?.();
        },
        onError: (e: Error) => toast.error(e.message),
      });
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={planWorkflow.generatePlan.isPending}
        className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
      >
        {planWorkflow.generatePlan.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5" />
        )}
        Dry-Run Plan
      </Button>
      <PlanViewer
        open={planOpen}
        onOpenChange={setPlanOpen}
        plan={plan}
        applying={planWorkflow.applyPlan.isPending}
        onApply={handleApply}
      />
    </>
  );
}
