import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const trainers = await db.trainer.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { party: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json({ trainers });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, party = [], ...fields } = body;
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const trainer = await db.trainer.create({
      data: {
        projectId,
        trainerClass: fields.trainerClass || "TRAINER_CLASS_YOUNGSTER",
        trainerName: fields.trainerName || "Trainer",
        introText: fields.introText ?? null,
        defeatText: fields.defeatText ?? null,
        rematchDefeatText: fields.rematchDefeatText ?? null,
        rematchNum: fields.rematchNum ?? 0,
        partySize: fields.partySize ?? party.length ?? 1,
        aiFlags: JSON.stringify(fields.aiFlags ?? ["AI_FLAG_CHECK_BAD_MOVE"]),
        doubleBattle: fields.doubleBattle ?? false,
        itemsJson: JSON.stringify(fields.items ?? []),
        party: {
          create: party.map((p: any, i: number) => ({
            speciesConstant: p.speciesConstant,
            level: p.level ?? 50,
            iv: p.iv ?? 0,
            abilityConstant: p.abilityConstant ?? null,
            heldItemConstant: p.heldItemConstant ?? null,
            gender: p.gender ?? null,
            natureConstant: p.natureConstant ?? null,
            isShiny: p.isShiny ?? false,
            movesJson: JSON.stringify(p.moves ?? []),
            ballConstant: p.ballConstant ?? null,
            formId: p.formId ?? null,
            position: i,
          })),
        },
      },
      include: { party: { orderBy: { position: "asc" } } },
    });
    return NextResponse.json({ trainer }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
