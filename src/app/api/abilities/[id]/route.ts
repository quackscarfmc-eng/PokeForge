import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (k === "effectFlags") data[k] = JSON.stringify(v);
      else if (v !== undefined) data[k] = v;
    }
    const ability = await db.ability.update({ where: { id }, data });
    return NextResponse.json({ ability });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "safe") as "safe" | "force";

    if (mode === "safe") {
      const ability = await db.ability.findUnique({ where: { id } });
      if (ability) {
        const speciesUsing = await db.species.findMany({
          where: { abilities: { contains: ability.constantName } },
        });
        if (speciesUsing.length > 0) {
          return NextResponse.json(
            { error: "Cannot delete: ability used by species", count: speciesUsing.length },
            { status: 409 },
          );
        }
      }
    }
    await db.ability.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    if (searchParams.get("action") !== "duplicate") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const orig = await db.ability.findUnique({ where: { id } });
    if (!orig) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const project = await db.project.findUnique({ where: { id: orig.projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const dup = await db.ability.create({
      data: {
        projectId: orig.projectId,
        constantName: `${orig.constantName}_COPY`,
        abilityId: project.nextAbilityId,
        name: `${orig.name} Copy`,
        description: orig.description,
        effectFlags: orig.effectFlags,
        battleScript: orig.battleScript,
      },
    });
    await db.project.update({ where: { id: orig.projectId }, data: { nextAbilityId: project.nextAbilityId + 1 } });
    return NextResponse.json({ ability: dup }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
