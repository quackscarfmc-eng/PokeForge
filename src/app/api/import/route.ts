import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/import — bulk import entities from JSON
// Body: { projectId, entityType, data: [...] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, entityType, data } = body as {
      projectId: string;
      entityType: string;
      data: any[];
    };

    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
    if (!entityType) return NextResponse.json({ error: "entityType required" }, { status: 400 });
    if (!Array.isArray(data)) return NextResponse.json({ error: "data must be an array" }, { status: 400 });

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    if (entityType === "species") {
      for (const item of data) {
        try {
          if (!item.constantName?.startsWith("SPECIES_")) {
            skipped++;
            errors.push(`Skipped: invalid constantName "${item.constantName}"`);
            continue;
          }
          const existing = await db.species.findUnique({ where: { constantName: item.constantName } });
          if (existing) {
            skipped++;
            errors.push(`Skipped: ${item.constantName} already exists`);
            continue;
          }
          const speciesId = item.speciesId ?? project.nextSpeciesId;
          await db.species.create({
            data: {
              projectId,
              constantName: item.constantName,
              speciesId,
              speciesName: item.speciesName || item.constantName.replace("SPECIES_", ""),
              nationalDexNum: item.nationalDexNum ?? null,
              hoennDexNum: item.hoennDexNum ?? null,
              categoryName: item.categoryName ?? null,
              description: item.description ?? null,
              baseHP: item.baseHP ?? 50,
              baseAttack: item.baseAttack ?? 50,
              baseDefense: item.baseDefense ?? 50,
              baseSpeed: item.baseSpeed ?? 50,
              baseSpAttack: item.baseSpAttack ?? 50,
              baseSpDefense: item.baseSpDefense ?? 50,
              evYieldHP: item.evYieldHP ?? 0,
              evYieldAttack: item.evYieldAttack ?? 0,
              evYieldDefense: item.evYieldDefense ?? 0,
              evYieldSpeed: item.evYieldSpeed ?? 0,
              evYieldSpAttack: item.evYieldSpAttack ?? 0,
              evYieldSpDefense: item.evYieldSpDefense ?? 0,
              types: JSON.stringify(item.types ?? ["TYPE_NORMAL"]),
              catchRate: item.catchRate ?? 45,
              expYield: item.expYield ?? 100,
              genderRatio: item.genderRatio ?? 127,
              eggCycles: item.eggCycles ?? 20,
              friendship: item.friendship ?? 70,
              growthRate: item.growthRate ?? "GROWTH_MEDIUM_FAST",
              eggGroups: JSON.stringify(item.eggGroups ?? ["EGG_GROUP_NONE"]),
              abilities: JSON.stringify(item.abilities ?? ["ABILITY_NONE"]),
              bodyColor: item.bodyColor ?? "BODY_COLOR_RED",
              noFlip: item.noFlip ?? false,
              height: item.height ?? 10,
              weight: item.weight ?? 250,
              frontAnimId: item.frontAnimId ?? "ANIM_V_JOLT",
              backAnimId: item.backAnimId ?? "BACK_ANIM_CONCAVE_ARC_SMALL",
              cryId: item.cryId ?? "CRY_BULBASAUR",
              flags: JSON.stringify(item.flags ?? []),
              learnsetMoves: {
                create: (item.learnsetMoves ?? []).map((m: any) => ({
                  level: m.level,
                  moveConstant: m.moveConstant,
                })),
              },
              evolutions: { create: [] },
            },
          });
          await db.project.update({
            where: { id: projectId },
            data: { nextSpeciesId: speciesId + 1 },
          });
          imported++;
        } catch (e) {
          skipped++;
          errors.push(`Error: ${item.constantName} — ${String(e).slice(0, 100)}`);
        }
      }
    } else if (entityType === "moves") {
      for (const item of data) {
        try {
          if (!item.constantName?.startsWith("MOVE_")) {
            skipped++;
            continue;
          }
          const existing = await db.move.findUnique({ where: { constantName: item.constantName } });
          if (existing) {
            skipped++;
            continue;
          }
          const moveId = item.moveId ?? project.nextMoveId;
          await db.move.create({
            data: {
              projectId,
              constantName: item.constantName,
              moveId,
              name: item.name || item.constantName.replace("MOVE_", ""),
              description: item.description ?? null,
              effect: item.effect ?? "EFFECT_HIT",
              power: item.power ?? 40,
              type: item.type ?? "TYPE_NORMAL",
              category: item.category ?? "CATEGORY_PHYSICAL",
              target: item.target ?? "MOVE_TARGET_SELECTED",
              pp: item.pp ?? 35,
              accuracy: item.accuracy ?? 100,
              priority: item.priority ?? 0,
              critStage: item.critStage ?? 0,
              flags: JSON.stringify(item.flags ?? []),
              battleScript: item.battleScript ?? null,
            },
          });
          await db.project.update({
            where: { id: projectId },
            data: { nextMoveId: moveId + 1 },
          });
          imported++;
        } catch (e) {
          skipped++;
          errors.push(`Error: ${item.constantName} — ${String(e).slice(0, 100)}`);
        }
      }
    } else {
      return NextResponse.json({ error: `Unsupported entityType: ${entityType}` }, { status: 400 });
    }

    return NextResponse.json({ imported, skipped, errors: errors.slice(0, 20) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
