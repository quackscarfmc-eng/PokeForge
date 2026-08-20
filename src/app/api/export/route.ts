import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateSpeciesCode,
  generateMoveCode,
  generateTypeCode,
  generateAbilityCode,
  generateItemCode,
  generateStatusCode,
  generateEncountersCode,
  generateTrainerCode,
} from "@/lib/poke-codegen";

// GET /api/export?projectId=... — produce a downloadable JSON bundle of all generated code
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const [species, moves, types, abilities, items, statuses, encounters, trainers] = await Promise.all([
    db.species.findMany({ where: { projectId }, include: { learnsetMoves: { orderBy: { level: "asc" } }, evolutions: true } }),
    db.move.findMany({ where: { projectId } }),
    db.type.findMany({ where: { projectId } }),
    db.ability.findMany({ where: { projectId } }),
    db.item.findMany({ where: { projectId } }),
    db.statusCondition.findMany({ where: { projectId } }),
    db.wildEncounter.findMany({ where: { projectId }, orderBy: [{ mapLabel: "asc" }, { method: "asc" }] }),
    db.trainer.findMany({ where: { projectId }, include: { party: { orderBy: { position: "asc" } } } }),
  ]);

  const knownTypeConsts = [
    "TYPE_NORMAL","TYPE_FIRE","TYPE_WATER","TYPE_GRASS","TYPE_ELECTRIC","TYPE_ICE","TYPE_FIGHTING","TYPE_POISON",
    "TYPE_GROUND","TYPE_FLYING","TYPE_PSYCHIC","TYPE_BUG","TYPE_ROCK","TYPE_GHOST","TYPE_DRAGON","TYPE_DARK",
    "TYPE_STEEL","TYPE_FAIRY","TYPE_STELLAR","TYPE_NONE",
    ...types.map((t) => t.constantName),
  ];

  const files: { path: string; content: string; language: string }[] = [];

  // Per-entity code files
  for (const s of species) {
    const sData = {
      constantName: s.constantName, speciesId: s.speciesId, speciesName: s.speciesName,
      nationalDexNum: s.nationalDexNum, hoennDexNum: s.hoennDexNum, categoryName: s.categoryName,
      description: s.description, baseHP: s.baseHP, baseAttack: s.baseAttack, baseDefense: s.baseDefense,
      baseSpeed: s.baseSpeed, baseSpAttack: s.baseSpAttack, baseSpDefense: s.baseSpDefense,
      evYieldHP: s.evYieldHP, evYieldAttack: s.evYieldAttack, evYieldDefense: s.evYieldDefense,
      evYieldSpeed: s.evYieldSpeed, evYieldSpAttack: s.evYieldSpAttack, evYieldSpDefense: s.evYieldSpDefense,
      types: JSON.parse(s.types), catchRate: s.catchRate, expYield: s.expYield, genderRatio: s.genderRatio,
      eggCycles: s.eggCycles, friendship: s.friendship, growthRate: s.growthRate, eggGroups: JSON.parse(s.eggGroups),
      abilities: JSON.parse(s.abilities), bodyColor: s.bodyColor, noFlip: s.noFlip, height: s.height, weight: s.weight,
      frontPicSymbol: s.frontPicSymbol, backPicSymbol: s.backPicSymbol, iconSymbol: s.iconSymbol,
      footprintSymbol: s.footprintSymbol, paletteSymbol: s.paletteSymbol, shinyPaletteSymbol: s.shinyPaletteSymbol,
      frontAnimId: s.frontAnimId, backAnimId: s.backAnimId, frontPicWidth: s.frontPicWidth, frontPicHeight: s.frontPicHeight,
      backPicWidth: s.backPicWidth, backPicHeight: s.backPicHeight, cryId: s.cryId, flags: JSON.parse(s.flags),
    };
    const learnset = s.learnsetMoves.map((m) => ({ level: m.level, moveConstant: m.moveConstant }));
    const evos = s.evolutions.map((e) => ({ method: e.method, param: e.param, targetSpecies: e.targetSpecies }));
    files.push({
      path: `patch/species/${s.constantName}.c.patch`,
      content: generateSpeciesCode(sData as never, learnset, evos),
      language: "c",
    });
  }
  for (const m of moves) {
    files.push({
      path: `patch/moves/${m.constantName}.c.patch`,
      content: generateMoveCode({
        constantName: m.constantName, moveId: m.moveId, name: m.name, description: m.description,
        effect: m.effect, power: m.power, type: m.type, category: m.category, target: m.target,
        pp: m.pp, accuracy: m.accuracy, priority: m.priority, critStage: m.critStage,
        flags: JSON.parse(m.flags), battleScript: m.battleScript,
      } as never),
      language: "c",
    });
  }
  for (const t of types) {
    files.push({
      path: `patch/types/${t.constantName}.c.patch`,
      content: generateTypeCode({
        constantName: t.constantName, typeId: t.typeId, name: t.name, description: t.description,
        colorHex: t.colorHex, offensiveMatrix: JSON.parse(t.offensiveMatrix),
        defensiveMatrix: JSON.parse(t.defensiveMatrix),
      } as never, knownTypeConsts),
      language: "c",
    });
  }
  for (const a of abilities) {
    files.push({
      path: `patch/abilities/${a.constantName}.c.patch`,
      content: generateAbilityCode({
        constantName: a.constantName, abilityId: a.abilityId, name: a.name, description: a.description,
        effectFlags: JSON.parse(a.effectFlags), battleScript: a.battleScript,
      } as never),
      language: "c",
    });
  }
  for (const i of items) {
    files.push({
      path: `patch/items/${i.constantName}.c.patch`,
      content: generateItemCode({
        constantName: i.constantName, itemId: i.itemId, name: i.name, description: i.description,
        pocket: i.pocket, price: i.price, effect: i.effect, holdEffect: i.holdEffect,
        flingPower: i.flingPower, importance: i.importance, category: i.category, isTM: i.isTM,
        tmMoveConstant: i.tmMoveConstant,
      } as never),
      language: "c",
    });
  }
  for (const s of statuses) {
    files.push({
      path: `patch/statuses/${s.constantName}.c.patch`,
      content: generateStatusCode({
        constantName: s.constantName, statusId: s.statusId, name: s.name, description: s.description,
        category: s.category, isVolatile: s.isVolatile, battleScript: s.battleScript,
        colorHex: s.colorHex, iconEmoji: s.iconEmoji,
      } as never),
      language: "c",
    });
  }

  // Wild encounters JSON
  if (encounters.length > 0) {
    files.push({
      path: "patch/wild_encounters.json",
      content: generateEncountersCode(
        encounters.map((e) => ({
          mapLabel: e.mapLabel,
          location: e.location,
          method: e.method,
          speciesConstant: e.speciesConstant,
          minLevel: e.minLevel,
          maxLevel: e.maxLevel,
          encounterRate: e.encounterRate,
          heldItemConstant: e.heldItemConstant,
          formId: e.formId,
        })),
      ),
      language: "json",
    });
  }

  // Trainers JSON
  if (trainers.length > 0) {
    files.push({
      path: "patch/trainers.json",
      content: "[\n" + trainers.map((t) => generateTrainerCode({
        trainerClass: t.trainerClass,
        trainerName: t.trainerName,
        introText: t.introText,
        defeatText: t.defeatText,
        rematchDefeatText: t.rematchDefeatText,
        rematchNum: t.rematchNum,
        partySize: t.partySize,
        aiFlags: JSON.parse(t.aiFlags || "[]"),
        doubleBattle: t.doubleBattle,
        items: JSON.parse(t.itemsJson || "[]"),
        party: t.party.map((p) => ({
          speciesConstant: p.speciesConstant,
          level: p.level,
          iv: p.iv,
          abilityConstant: p.abilityConstant,
          heldItemConstant: p.heldItemConstant,
          gender: p.gender,
          natureConstant: p.natureConstant,
          isShiny: p.isShiny,
          moves: JSON.parse(p.movesJson || "[]"),
          ballConstant: p.ballConstant,
          formId: p.formId,
        })),
      })).join(",\n") + "\n]",
      language: "json",
    });
  }

  // README
  const readme = `# PokeForge export — ${project.name}

Generated: ${new Date().toISOString()}
Expansion version: ${project.expansionVersion || "(unspecified)"}

## Contents
- ${species.length} custom species
- ${moves.length} custom moves
- ${types.length} custom types
- ${abilities.length} custom abilities
- ${items.length} custom items
- ${statuses.length} custom status conditions

## How to apply
1. Copy each \`.c.patch\` snippet into the file noted in the comment header.
2. Add the asset PNGs/palettes to \`graphics/pokemon/<mon>/\` (species).
3. Run \`make -j$(nproc)\` to build \`pokeemerald.gba\`.

## Safety
A backup snapshot of all custom content is stored in the PokeForge app under
Safety Center → Backups. Roll back there if a build breaks.
`;

  return NextResponse.json({
    project: { name: project.name, expansionVersion: project.expansionVersion },
    readme,
    files,
    stats: { species: species.length, moves: moves.length, types: types.length, abilities: abilities.length, items: items.length, statuses: statuses.length, encounters: encounters.length, trainers: trainers.length },
  });
}
