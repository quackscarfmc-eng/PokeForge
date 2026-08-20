import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const counts = {
    species: await db.species.count({ where: { projectId: id } }),
    moves: await db.move.count({ where: { projectId: id } }),
    types: await db.type.count({ where: { projectId: id } }),
    abilities: await db.ability.count({ where: { projectId: id } }),
    items: await db.item.count({ where: { projectId: id } }),
    statuses: await db.statusCondition.count({ where: { projectId: id } }),
    encounters: await db.wildEncounter.count({ where: { projectId: id } }),
    trainers: await db.trainer.count({ where: { projectId: id } }),
    changePlans: await db.changePlan.count({ where: { projectId: id } }),
    backups: await db.backup.count({ where: { projectId: id } }),
    buildChecks: await db.buildCheck.count({ where: { projectId: id } }),
  };
  return NextResponse.json({ project, counts });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.description === "string") data.description = body.description || null;
  if (typeof body.basePath === "string") data.basePath = body.basePath || null;
  if (typeof body.expansionVersion === "string") data.expansionVersion = body.expansionVersion || null;
  for (const k of [
    "nextSpeciesId", "nextMoveId", "nextTypeId", "nextAbilityId", "nextItemId", "nextStatusId",
  ] as const) {
    if (typeof body[k] === "number") data[k] = body[k];
  }
  const project = await db.project.update({ where: { id }, data });
  return NextResponse.json({ project });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await db.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
