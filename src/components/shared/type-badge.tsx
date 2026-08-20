"use client";

import { POKEMON_TYPES, TYPE_COLOR, TYPE_NAME } from "@/lib/poke-constants";
import { cn } from "@/lib/utils";

export function TypeBadge({ constant, size = "sm" }: { constant: string; size?: "sm" | "xs" }) {
  const name = TYPE_NAME(constant);
  const color = TYPE_COLOR(constant);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold text-white shadow-sm",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-1.5 py-0 text-[9px]",
      )}
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}
