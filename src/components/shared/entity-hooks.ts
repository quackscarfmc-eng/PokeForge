"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

export function useProjectId() {
  const { currentProjectId } = useAppStore();
  return currentProjectId!;
}

// Generic entity list fetcher
export function useEntities<T>(entity: string) {
  const projectId = useProjectId();
  return useQuery<{ [key: string]: T[] }>({
    queryKey: [entity, projectId],
    queryFn: async () => {
      const r = await fetch(`/api/${entity}?projectId=${projectId}`);
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    enabled: !!projectId,
  });
}

export function useCreateEntity<T>(entity: string) {
  const projectId = useProjectId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<T>) => {
      const r = await fetch(`/api/${entity}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...data }),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || "Failed");
      }
      return r.json();
    },
    onSuccess: () => {
      toast.success(`${entity} created`);
      qc.invalidateQueries({ queryKey: [entity] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateEntity<T>(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      const r = await fetch(`/api/${entity}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || "Failed");
      }
      return r.json();
    },
    onSuccess: () => {
      toast.success(`${entity} updated`);
      qc.invalidateQueries({ queryKey: [entity] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteEntity(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode = "safe" }: { id: string; mode?: "safe" | "force" }) => {
      const r = await fetch(`/api/${entity}/${id}?mode=${mode}`, { method: "DELETE" });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || "Failed");
      }
      return r.json();
    },
    onSuccess: () => {
      toast.success(`${entity} deleted`);
      qc.invalidateQueries({ queryKey: [entity] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useValidate() {
  return useMutation({
    mutationFn: async (body: { entityType: string; data: Record<string, unknown> }) => {
      const projectId = useAppStore.getState().currentProjectId;
      const r = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, projectId }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
}
