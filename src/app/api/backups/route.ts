import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/backups?projectId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const backups = await db.backup.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ backups });
}

// POST /api/backups — create a manual backup
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, label } = body as { projectId: string; label?: string };
    const [species, moves, types, abilities, items, statuses] = await Promise.all([
      db.species.findMany({ where: { projectId }, include: { learnsetMoves: true, evolutions: true } }),
      db.move.findMany({ where: { projectId } }),
      db.type.findMany({ where: { projectId } }),
      db.ability.findMany({ where: { projectId } }),
      db.item.findMany({ where: { projectId } }),
      db.statusCondition.findMany({ where: { projectId } }),
    ]);
    const snapshot = { species, moves, types, abilities, items, statuses };
    const snapshotJson = JSON.stringify(snapshot);
    const backup = await db.backup.create({
      data: {
        projectId,
        label: label || "Manual backup",
        snapshotJson,
        sizeBytes: snapshotJson.length,
      },
    });
    return NextResponse.json({ backup }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
