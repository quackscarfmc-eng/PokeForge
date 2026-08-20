import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/moves?projectId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const moves = await db.move.findMany({
    where: { projectId },
    orderBy: { moveId: "asc" },
  });
  return NextResponse.json({ moves });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, ...fields } = body;
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const existing = await db.move.findUnique({ where: { constantName: fields.constantName } });
    if (existing)
      return NextResponse.json({ error: `Constant ${fields.constantName} already exists` }, { status: 400 });

    const move = await db.move.create({
      data: {
        projectId,
        constantName: fields.constantName,
        moveId: fields.moveId ?? project.nextMoveId,
        name: fields.name,
        description: fields.description ?? null,
        effect: fields.effect ?? "EFFECT_HIT",
        power: fields.power ?? 40,
        type: fields.type ?? "TYPE_NORMAL",
        category: fields.category ?? "CATEGORY_PHYSICAL",
        target: fields.target ?? "MOVE_TARGET_SELECTED",
        pp: fields.pp ?? 35,
        accuracy: fields.accuracy ?? 100,
        priority: fields.priority ?? 0,
        critStage: fields.critStage ?? 0,
        flags: JSON.stringify(fields.flags ?? []),
        battleScript: fields.battleScript ?? null,
        contestType: fields.contestType ?? null,
      },
    });

    if (!fields.moveId) {
      await db.project.update({
        where: { id: projectId },
        data: { nextMoveId: move.moveId + 1 },
      });
    }
    return NextResponse.json({ move }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
