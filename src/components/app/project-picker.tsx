"use client";

import { useAppStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PokeballIcon } from "@/components/app/pokeball-icon";
import { Plus, FolderGit2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function ProjectPicker() {
  const { setProject } = useAppStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePath: "",
    expansionVersion: "1.15.2",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const r = await fetch("/api/projects");
      return r.json();
    },
  });
  const projects = data?.projects ?? [];

  const createMut = useMutation({
    mutationFn: async (body: typeof form) => {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || "Failed");
      }
      return r.json();
    },
    onSuccess: (d) => {
      toast.success(`Project "${d.project.name}" created`);
      qc.invalidateQueries({ queryKey: ["projects"] });
      setProject(d.project.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="poke-grid-bg min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-20">
        <div className="mb-12 flex flex-col items-center text-center">
          <PokeballIcon className="mb-4 h-20 w-20 drop-shadow-lg" />
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Poké<span className="text-primary">Forge</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
            Add fully custom Pokémon, moves, types, abilities, items & status
            conditions to your <span className="font-semibold text-foreground">pokeemerald-expansion</span> ROM hack —
            with validation, dry-run plans, backups & build checks.
          </p>
        </div>

        {projects.length === 0 && !showForm ? (
          <Card className="mx-auto max-w-md border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FolderGit2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>No projects yet</CardTitle>
              <CardDescription>
                Create your first project to start designing custom Pokémon.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" /> New project
              </Button>
            </CardContent>
          </Card>
        ) : showForm ? (
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <CardTitle>New project</CardTitle>
              <CardDescription>
                A project holds all your custom content for one pokeemerald-expansion checkout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Project name *</Label>
                <Input
                  id="name"
                  placeholder="My Awesome Hack"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  rows={2}
                  placeholder="What's this hack about?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ver">Expansion version</Label>
                  <Input
                    id="ver"
                    placeholder="1.15.2"
                    value={form.expansionVersion}
                    onChange={(e) => setForm({ ...form, expansionVersion: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="path">Local checkout path</Label>
                  <Input
                    id="path"
                    placeholder="/home/me/pokeemerald-expansion"
                    value={form.basePath}
                    onChange={(e) => setForm({ ...form, basePath: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => createMut.mutate(form)}
                  disabled={!form.name.trim() || createMut.isPending}
                  className="flex-1"
                >
                  {createMut.isPending ? "Creating…" : "Create project"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your projects</h2>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="mr-1 h-4 w-4" /> New
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setProject(p.id)}
                  className="group relative overflow-hidden rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <FolderGit2 className="h-5 w-5 text-primary" />
                    <ArrowRight className="h-4 w-4 -translate-x-2 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <div className="mb-1 truncate font-semibold">{p.name}</div>
                  <div className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                    {p.description || "No description"}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {p._count?.species ?? 0} Pokémon
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {p._count?.moves ?? 0} moves
                    </Badge>
                    {p.expansionVersion && (
                      <Badge variant="outline" className="text-[10px]">
                        v{p.expansionVersion}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
