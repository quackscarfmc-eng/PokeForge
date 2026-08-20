import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { party, ...fields } = body;

    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (k === "aiFlags" || k === "itemsJson") data[k] = JSON.stringify(v);
      else if (v !== undefined) data[k] = v;
    }

    // Replace party if provided
    if (Array.isArray(party)) {
      await db.trainerPartyMember.deleteMany({ where: { trainerId: id } });
      if (party.length) {
        await db.trainerPartyMember.createMany({
          data: party.map((p: any, i: number) => ({
            trainerId: id,
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
        });
      }
      data.partySize = party.length;
    }

    const trainer = await db.trainer.update({
      where: { id },
      data,
      include: { party: { orderBy: { position: "asc" } } },
    });
    return NextResponse.json({ trainer });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await db.trainer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
