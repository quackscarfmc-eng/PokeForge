"use client";

import { useAppStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function SettingsView() {
  const { currentProjectId, setProject } = useAppStore();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${currentProjectId}`);
      return r.json();
    },
    enabled: !!currentProjectId,
  });

  const project = form || data?.project;

  const updateMut = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch(`/api/projects/${currentProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Project updated");
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setForm(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/projects/${currentProjectId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Project deleted");
      setProject(null);
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  if (!project) return null;
  const f = form ?? project;

  return (
    <div>
      <PageHeader
        title="Project settings"
        description="Edit project metadata and manage the project."
      />

      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
            <CardDescription>Project name, description and expansion version.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={f.name ?? ""}
                onChange={(e) => setForm({ ...f, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                rows={2}
                value={f.description ?? ""}
                onChange={(e) => setForm({ ...f, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ver">Expansion version</Label>
                <Input
                  id="ver"
                  value={f.expansionVersion ?? ""}
                  onChange={(e) => setForm({ ...f, expansionVersion: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="path">Local checkout path</Label>
                <Input
                  id="path"
                  value={f.basePath ?? ""}
                  onChange={(e) => setForm({ ...f, basePath: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => updateMut.mutate(form)} disabled={!form || updateMut.isPending}>
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next IDs</CardTitle>
            <CardDescription>
              Auto-incremented when creating new entities. Adjust if you need to align with an existing project.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {[
              ["nextSpeciesId", "Species"],
              ["nextMoveId", "Move"],
              ["nextTypeId", "Type"],
              ["nextAbilityId", "Ability"],
              ["nextItemId", "Item"],
              ["nextStatusId", "Status"],
            ].map(([k, l]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-xs">{l}</Label>
                <Input
                  type="number"
                  value={f[k] ?? 0}
                  onChange={(e) => setForm({ ...f, [k]: parseInt(e.target.value) || 0 })}
                />
              </div>
            ))}
            <div className="col-span-2 flex justify-end md:col-span-3">
              <Button onClick={() => updateMut.mutate(form)} disabled={!form || updateMut.isPending}>
                <Save className="mr-2 h-4 w-4" /> Save IDs
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-600">
              <AlertTriangle className="h-4 w-4" /> Danger zone
            </CardTitle>
            <CardDescription>
              Permanently delete this project and all its custom content. Backups are also removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete project
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project?"
        description={`This permanently deletes "${project.name}" and ALL its custom content. This cannot be undone.`}
        confirmLabel="Delete forever"
        destructive
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
