"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  X,
  Lightbulb,
  Keyboard,
  ShieldCheck,
  Zap,
} from "lucide-react";

const STORAGE_KEY = "pokeforge-onboarding-dismissed";

export function OnboardingBanner() {
  const { setView } = useAppStore();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem(STORAGE_KEY);
  });

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  const tips = [
    { icon: Keyboard, title: "⌘K Command Palette", desc: "Press Cmd+K anywhere to jump between views, search entities, and navigate instantly.", action: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true })) },
    { icon: Zap, title: "Number Keys 1-0", desc: "Quickly switch between views using number keys on your keyboard.", action: () => setView("dashboard") },
    { icon: ShieldCheck, title: "Safety Workflow", desc: "Every editor has Validate + Dry-Run Plan buttons. Always dry-run before applying changes.", action: () => setView("safety") },
  ];

  return (
    <Card className="mb-4 border-primary/30 bg-primary/5 animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Welcome to PokeForge!</CardTitle>
              <CardDescription>Here are some tips to get you started</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={dismiss} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {tips.map((tip) => {
            const Icon = tip.icon;
            return (
              <button
                key={tip.title}
                onClick={tip.action}
                className="group flex flex-col items-start gap-1.5 rounded-lg border border-border bg-card/50 p-3 text-left transition-all hover:border-primary/40 hover:bg-accent/40"
              >
                <Icon className="h-4 w-4 text-primary" />
                <div className="text-xs font-semibold">{tip.title}</div>
                <div className="text-[10px] text-muted-foreground">{tip.desc}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={dismiss} className="text-xs">
            Got it, dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
