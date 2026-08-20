import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/backups/[id]/restore — restore from a backup (overwrites current state)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const backup = await db.backup.findUnique({ where: { id } });
    if (!backup) return NextResponse.json({ error: "Backup not found" }, { status: 404 });

    const snapshot = JSON.parse(backup.snapshotJson) as {
      species: any[];
      moves: any[];
      types: any[];
      abilities: any[];
      items: any[];
      statuses: any[];
    };

    const projectId = backup.projectId;

    // Create a pre-restore backup so the user can undo the restore
    const [species, moves, types, abilities, items, statuses] = await Promise.all([
      db.species.findMany({ where: { projectId }, include: { learnsetMoves: true, evolutions: true } }),
      db.move.findMany({ where: { projectId } }),
      db.type.findMany({ where: { projectId } }),
      db.ability.findMany({ where: { projectId } }),
      db.item.findMany({ where: { projectId } }),
      db.statusCondition.findMany({ where: { projectId } }),
    ]);
    await db.backup.create({
      data: {
        projectId,
        label: `Auto-backup before restoring "${backup.label}"`,
        snapshotJson: JSON.stringify({ species, moves, types, abilities, items, statuses }),
        sizeBytes: 0,
      },
    });

    // Wipe current state (cascade deletes nested learnsets/evolutions)
    await Promise.all([
      db.species.deleteMany({ where: { projectId } }),
      db.move.deleteMany({ where: { projectId } }),
      db.type.deleteMany({ where: { projectId } }),
      db.ability.deleteMany({ where: { projectId } }),
      db.item.deleteMany({ where: { projectId } }),
      db.statusCondition.deleteMany({ where: { projectId } }),
    ]);

    // Re-create from snapshot
    for (const s of snapshot.species) {
      await db.species.create({
        data: {
          projectId,
          constantName: s.constantName,
          speciesId: s.speciesId,
          speciesName: s.speciesName,
          nationalDexNum: s.nationalDexNum,
          hoennDexNum: s.hoennDexNum,
          categoryName: s.categoryName,
          description: s.description,
          baseHP: s.baseHP, baseAttack: s.baseAttack, baseDefense: s.baseDefense,
          baseSpeed: s.baseSpeed, baseSpAttack: s.baseSpAttack, baseSpDefense: s.baseSpDefense,
          evYieldHP: s.evYieldHP, evYieldAttack: s.evYieldAttack, evYieldDefense: s.evYieldDefense,
          evYieldSpeed: s.evYieldSpeed, evYieldSpAttack: s.evYieldSpAttack, evYieldSpDefense: s.evYieldSpDefense,
          types: s.types, catchRate: s.catchRate, expYield: s.expYield, genderRatio: s.genderRatio,
          eggCycles: s.eggCycles, friendship: s.friendship, growthRate: s.growthRate, eggGroups: s.eggGroups,
          abilities: s.abilities, bodyColor: s.bodyColor, noFlip: s.noFlip, height: s.height, weight: s.weight,
          frontPicSymbol: s.frontPicSymbol, backPicSymbol: s.backPicSymbol, iconSymbol: s.iconSymbol,
          footprintSymbol: s.footprintSymbol, paletteSymbol: s.paletteSymbol, shinyPaletteSymbol: s.shinyPaletteSymbol,
          frontAnimId: s.frontAnimId, backAnimId: s.backAnimId,
          frontPicWidth: s.frontPicWidth, frontPicHeight: s.frontPicHeight,
          backPicWidth: s.backPicWidth, backPicHeight: s.backPicHeight,
          cryId: s.cryId, spriteFrontDataUrl: s.spriteFrontDataUrl, flags: s.flags,
          learnsetMoves: { create: (s.learnsetMoves || []).map((m: any) => ({ level: m.level, moveConstant: m.moveConstant })) },
          evolutions: { create: (s.evolutions || []).map((e: any) => ({ method: e.method, param: e.param, targetSpecies: e.targetSpecies })) },
        },
      });
    }
    for (const m of snapshot.moves) {
      await db.move.create({ data: { ...m, id: undefined, projectId, createdAt: undefined, updatedAt: undefined } as any });
    }
    for (const t of snapshot.types) {
      await db.type.create({ data: { ...t, id: undefined, projectId, createdAt: undefined, updatedAt: undefined } as any });
    }
    for (const a of snapshot.abilities) {
      await db.ability.create({ data: { ...a, id: undefined, projectId, createdAt: undefined, updatedAt: undefined } as any });
    }
    for (const i of snapshot.items) {
      await db.item.create({ data: { ...i, id: undefined, projectId, createdAt: undefined, updatedAt: undefined } as any });
    }
    for (const st of snapshot.statuses) {
      await db.statusCondition.create({ data: { ...st, id: undefined, projectId, createdAt: undefined, updatedAt: undefined } as any });
    }

    return NextResponse.json({ ok: true, restoredFrom: backup.label });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await db.backup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
