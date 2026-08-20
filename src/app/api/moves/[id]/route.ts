import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (k === "flags") data[k] = JSON.stringify(v);
      else if (v !== undefined) data[k] = v;
    }
    const move = await db.move.update({ where: { id }, data });
    return NextResponse.json({ move });
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
      const move = await db.move.findUnique({ where: { id } });
      if (move) {
        const referrers = await db.levelUpMove.findMany({
          where: { moveConstant: move.constantName },
        });
        if (referrers.length > 0) {
          return NextResponse.json(
            { error: "Cannot delete: move is in learnsets", referrerCount: referrers.length },
            { status: 409 },
          );
        }
      }
    }
    await db.move.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/moves/[id]?action=duplicate
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    if (searchParams.get("action") !== "duplicate") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const orig = await db.move.findUnique({ where: { id } });
    if (!orig) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const project = await db.project.findUnique({ where: { id: orig.projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const dup = await db.move.create({
      data: {
        projectId: orig.projectId,
        constantName: `${orig.constantName}_COPY`,
        moveId: project.nextMoveId,
        name: `${orig.name} Copy`,
        description: orig.description,
        effect: orig.effect,
        power: orig.power,
        type: orig.type,
        category: orig.category,
        target: orig.target,
        pp: orig.pp,
        accuracy: orig.accuracy,
        priority: orig.priority,
        critStage: orig.critStage,
        flags: orig.flags,
        battleScript: orig.battleScript,
        contestType: orig.contestType,
      },
    });
    await db.project.update({ where: { id: orig.projectId }, data: { nextMoveId: project.nextMoveId + 1 } });
    return NextResponse.json({ move: dup }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
