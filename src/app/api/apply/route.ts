import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/apply — mark a change plan as applied + create a backup snapshot
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, projectId } = body as { planId: string; projectId: string };

    const plan = await db.changePlan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (plan.isBlocked) return NextResponse.json({ error: "Plan is blocked by errors — fix and re-plan" }, { status: 400 });

    // Snapshot current state for backup
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
        label: `Before applying ${plan.mode} ${plan.entityType} ${plan.entityConstant}`,
        snapshotJson,
        entityType: plan.entityType,
        entityConstant: plan.entityConstant,
        sizeBytes: snapshotJson.length,
      },
    });

    // Mark plan as applied (the actual file-write to pokeemerald-expansion happens
    // when the user copies the generated code into their project; this records intent)
    const updated = await db.changePlan.update({
      where: { id: planId },
      data: { status: "applied", appliedAt: new Date() },
    });

    return NextResponse.json({ ok: true, backup, plan: updated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
