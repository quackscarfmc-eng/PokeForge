"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  destructive = false,
  showDeleteMode = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: (mode?: "safe" | "force") => void;
  destructive?: boolean;
  showDeleteMode?: boolean;
}) {
  const [mode, setMode] = useState<"safe" | "force">("safe");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {showDeleteMode && (
          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Delete mode
            </Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "safe" | "force")}
              className="gap-2"
            >
              <div className="flex items-start gap-2 rounded-md border border-border p-2">
                <RadioGroupItem value="safe" id="d-safe" className="mt-0.5" />
                <div>
                  <Label htmlFor="d-safe" className="text-sm font-medium">Safe</Label>
                  <p className="text-xs text-muted-foreground">
                    Blocks delete if other entities reference this one. Recommended.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 p-2">
                <RadioGroupItem value="force" id="d-force" className="mt-0.5" />
                <div>
                  <Label htmlFor="d-force" className="text-sm font-medium text-red-600 dark:text-red-400">
                    Force delete
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Delete even if referenced. High risk — may break the build.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(showDeleteMode ? mode : undefined)}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
