"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("shimmer-bg rounded-md", className)} />
  );
}

export function SpeciesCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-start gap-3">
        <Skeleton className="h-14 w-14 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
          <div className="flex gap-1">
            <Skeleton className="h-4 w-12 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-2 w-8" />
            <Skeleton className="h-2 flex-1" />
            <Skeleton className="h-2 w-6" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-3 h-3 w-full" />
    </div>
  );
}

export function EntityListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SpeciesCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md border border-border p-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
