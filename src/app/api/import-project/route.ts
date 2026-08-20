import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parsePokeemeraldProject,
  validatePokeemeraldProject,
} from "@/lib/pokeemerald-parser";
import * as fs from "fs";

// POST /api/import-project — scan a pokeemerald-expansion checkout and import
// all species, moves, types, and abilities into the database.
// Body: { projectId, basePath }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, basePath } = body as { projectId: string; basePath: string };

    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
    if (!basePath) return NextResponse.json({ error: "basePath required" }, { status: 400 });

    // Validate the path exists and is a directory
    if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory()) {
      return NextResponse.json(
        { error: `Path does not exist or is not a directory: ${basePath}` },
        { status: 400 },
      );
    }

    // Validate it's a pokeemerald-expansion project
    const validation = validatePokeemeraldProject(basePath);
    if (!validation.valid) {
      return NextResponse.json({
        error: `Not a valid pokeemerald-expansion project. Missing: ${validation.missing.join(", ")}`,
        missing: validation.missing,
      }, { status: 400 });
    }

    // Parse all source files
    const result = parsePokeemeraldProject(basePath);

    if (result.errors.length > 0) {
      return NextResponse.json({ error: result.errors[0], warnings: result.warnings }, { status: 400 });
    }

    // Import species
    let speciesImported = 0;
    let speciesSkipped = 0;
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    let nextSpeciesId = Math.max(project.nextSpeciesId, ...result.species.map((s) => s.speciesId + 1).concat([project.nextSpeciesId]));

    for (const s of result.species) {
      const existing = await db.species.findUnique({ where: { constantName: s.constantName } });
      if (existing) {
        speciesSkipped++;
        continue;
      }
      await db.species.create({
        data: {
          projectId,
          constantName: s.constantName,
          speciesId: s.speciesId,
          speciesName: s.speciesName,
          types: JSON.stringify(s.types),
          abilities: JSON.stringify(s.abilities),
          baseHP: s.baseHP,
          baseAttack: s.baseAttack,
          baseDefense: s.baseDefense,
          baseSpeed: s.baseSpeed,
          baseSpAttack: s.baseSpAttack,
          baseSpDefense: s.baseSpDefense,
          catchRate: s.catchRate,
          expYield: s.expYield,
          growthRate: s.growthRate,
          eggGroups: JSON.stringify(s.eggGroups),
          genderRatio: s.genderRatio,
          bodyColor: s.bodyColor,
          // Defaults for fields we don't parse yet
          evYieldHP: 0, evYieldAttack: 0, evYieldDefense: 0,
          evYieldSpeed: 0, evYieldSpAttack: 0, evYieldSpDefense: 0,
          eggCycles: 20, friendship: 70,
          height: 10, weight: 250,
          frontAnimId: "ANIM_V_JOLT", backAnimId: "BACK_ANIM_CONCAVE_ARC_SMALL",
          cryId: "CRY_BULBASAUR", flags: "[]",
          nationalDexNum: null, hoennDexNum: null,
          categoryName: null, description: null,
        },
      });
      speciesImported++;
    }

    if (speciesImported > 0) {
      await db.project.update({
        where: { id: projectId },
        data: { nextSpeciesId },
      });
    }

    // Import moves
    let movesImported = 0;
    let movesSkipped = 0;
    let nextMoveId = Math.max(project.nextMoveId, ...result.moves.map((m) => m.moveId + 1).concat([project.nextMoveId]));

    for (const m of result.moves) {
      const existing = await db.move.findUnique({ where: { constantName: m.constantName } });
      if (existing) {
        movesSkipped++;
        continue;
      }
      await db.move.create({
        data: {
          projectId,
          constantName: m.constantName,
          moveId: m.moveId,
          name: m.name,
          effect: m.effect,
          power: m.power,
          type: m.type,
          category: m.category,
          target: m.target,
          pp: m.pp,
          accuracy: m.accuracy,
          priority: 0,
          critStage: 0,
          flags: "[]",
          battleScript: null,
        },
      });
      movesImported++;
    }

    if (movesImported > 0) {
      await db.project.update({
        where: { id: projectId },
        data: { nextMoveId },
      });
    }

    // Import types
    let typesImported = 0;
    let typesSkipped = 0;
    let nextTypeId = Math.max(project.nextTypeId, ...result.types.map((t, i) => i + 1).concat([project.nextTypeId]));

    for (const t of result.types) {
      const existing = await db.type.findUnique({ where: { constantName: t.constantName } });
      if (existing) {
        typesSkipped++;
        continue;
      }
      await db.type.create({
        data: {
          projectId,
          constantName: t.constantName,
          typeId: nextTypeId++,
          name: t.name,
          colorHex: "#68A090",
          offensiveMatrix: "{}",
          defensiveMatrix: "{}",
        },
      });
      typesImported++;
    }

    if (typesImported > 0) {
      await db.project.update({
        where: { id: projectId },
        data: { nextTypeId },
      });
    }

    // Import abilities
    let abilitiesImported = 0;
    let abilitiesSkipped = 0;
    let nextAbilityId = Math.max(project.nextAbilityId, ...result.abilities.map((a, i) => i + 1).concat([project.nextAbilityId]));

    for (const a of result.abilities) {
      const existing = await db.ability.findUnique({ where: { constantName: a.constantName } });
      if (existing) {
        abilitiesSkipped++;
        continue;
      }
      await db.ability.create({
        data: {
          projectId,
          constantName: a.constantName,
          abilityId: nextAbilityId++,
          name: a.name,
          effectFlags: "[]",
          battleScript: null,
        },
      });
      abilitiesImported++;
    }

    if (abilitiesImported > 0) {
      await db.project.update({
        where: { id: projectId },
        data: { nextAbilityId },
      });
    }

    // Create a backup of the import
    const [allSpecies, allMoves, allTypes, allAbilities, allItems, allStatuses] = await Promise.all([
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
        label: `Before importing pokeemerald-expansion project from ${basePath}`,
        snapshotJson: JSON.stringify({ species: allSpecies, moves: allMoves, types: allTypes, abilities: allAbilities, items: allItems, statuses: allStatuses }),
        entityType: "project",
        entityConstant: "import",
        sizeBytes: 0,
      },
    });

    return NextResponse.json({
      ok: true,
      stats: {
        species: { imported: speciesImported, skipped: speciesSkipped, total: result.species.length },
        moves: { imported: movesImported, skipped: movesSkipped, total: result.moves.length },
        types: { imported: typesImported, skipped: typesSkipped, total: result.types.length },
        abilities: { imported: abilitiesImported, skipped: abilitiesSkipped, total: result.abilities.length },
      },
      warnings: result.warnings,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/import-project?path=... — validate a path without importing
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const basePath = searchParams.get("path");
  if (!basePath) return NextResponse.json({ error: "path required" }, { status: 400 });

  if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory()) {
    return NextResponse.json({ valid: false, error: "Path does not exist" });
  }

  const validation = validatePokeemeraldProject(basePath);
  if (!validation.valid) {
    return NextResponse.json({ valid: false, missing: validation.missing });
  }

  // Quick scan to count entities
  const result = parsePokeemeraldProject(basePath);
  return NextResponse.json({
    valid: true,
    counts: {
      species: result.species.length,
      moves: result.moves.length,
      types: result.types.length,
      abilities: result.abilities.length,
    },
    warnings: result.warnings,
  });
}
