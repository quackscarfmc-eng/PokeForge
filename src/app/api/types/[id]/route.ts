import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (k === "offensiveMatrix" || k === "defensiveMatrix") data[k] = JSON.stringify(v);
      else if (v !== undefined) data[k] = v;
    }
    const type = await db.type.update({ where: { id }, data });
    return NextResponse.json({ type });
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
      const type = await db.type.findUnique({ where: { id } });
      if (type) {
        const speciesUsing = await db.species.findMany({
          where: { types: { contains: type.constantName } },
        });
        if (speciesUsing.length > 0) {
          return NextResponse.json(
            { error: "Cannot delete: type used by species", count: speciesUsing.length },
            { status: 409 },
          );
        }
      }
    }
    await db.type.delete({ where: { id } });
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
    const orig = await db.type.findUnique({ where: { id } });
    if (!orig) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const project = await db.project.findUnique({ where: { id: orig.projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const dup = await db.type.create({
      data: {
        projectId: orig.projectId,
        constantName: `${orig.constantName}_COPY`,
        typeId: project.nextTypeId,
        name: `${orig.name} Copy`,
        description: orig.description,
        colorHex: orig.colorHex,
        iconEmoji: orig.iconEmoji,
        offensiveMatrix: orig.offensiveMatrix,
        defensiveMatrix: orig.defensiveMatrix,
      },
    });
    await db.project.update({ where: { id: orig.projectId }, data: { nextTypeId: project.nextTypeId + 1 } });
    return NextResponse.json({ type: dup }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
