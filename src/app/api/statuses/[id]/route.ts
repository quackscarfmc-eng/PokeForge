import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) data[k] = v;
    }
    const status = await db.statusCondition.update({ where: { id }, data });
    return NextResponse.json({ status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await db.statusCondition.delete({ where: { id } });
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
    const orig = await db.statusCondition.findUnique({ where: { id } });
    if (!orig) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const project = await db.project.findUnique({ where: { id: orig.projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const dup = await db.statusCondition.create({
      data: {
        projectId: orig.projectId,
        constantName: `${orig.constantName}_COPY`,
        statusId: project.nextStatusId,
        name: `${orig.name} Copy`,
        description: orig.description,
        category: orig.category,
        isVolatile: orig.isVolatile,
        battleScript: orig.battleScript,
        iconEmoji: orig.iconEmoji,
        colorHex: orig.colorHex,
      },
    });
    await db.project.update({ where: { id: orig.projectId }, data: { nextStatusId: project.nextStatusId + 1 } });
    return NextResponse.json({ status: dup }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
