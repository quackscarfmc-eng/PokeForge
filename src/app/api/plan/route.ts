import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateSpeciesCode,
  generateMoveCode,
  generateTypeCode,
  generateAbilityCode,
  generateItemCode,
  generateStatusCode,
  validateSpecies,
  validateMove,
  validateType,
  validateAbility,
  validateItem,
  validateStatus,
  type ChangePlan,
  type ChangeStep,
} from "@/lib/poke-codegen";
import { POKEMON_TYPES, BUILTIN_ABILITIES } from "@/lib/poke-constants";

// POST /api/plan — generate a dry-run change plan (no writes)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, entityType, entityId, projectId } = body as {
      mode: "add" | "edit" | "delete";
      entityType: string;
      entityId?: string;
      projectId: string;
    };

    const [types, abilities, moves] = await Promise.all([
      db.type.findMany({ where: { projectId }, select: { constantName: true } }),
      db.ability.findMany({ where: { projectId }, select: { constantName: true } }),
      db.move.findMany({ where: { projectId }, select: { constantName: true } }),
    ]);
    const knownTypes = [...POKEMON_TYPES.map((t) => t.constant), ...types.map((t) => t.constantName)];
    const knownAbilities = [...BUILTIN_ABILITIES.map((a) => a.constant), ...abilities.map((a) => a.constantName)];
    const knownMoves = moves.map((m) => m.constantName);

    let entityConstant = "";
    let generatedCode = "";
    let errors: string[] = [];
    let warnings: string[] = [];
    const steps: ChangeStep[] = [];

    if (mode === "delete" && entityId) {
      // For delete, gather references
      if (entityType === "species") {
        const s = await db.species.findUnique({ where: { id: entityId }, include: { learnsetMoves: true, evolutions: true } });
        if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
        entityConstant = s.constantName;
        const referrers = await db.evolution.findMany({ where: { targetSpecies: s.constantName } });
        if (referrers.length > 0) {
          errors.push(`Cannot delete: ${referrers.length} species evolve into ${s.constantName}`);
        }
        steps.push(
          { targetFile: "include/constants/species.h", action: "delete", reason: `Remove #define ${s.constantName}`, riskLevel: "medium", warnings: [] },
          { targetFile: "src/data/pokemon/species_info.h", action: "delete", reason: `Remove gSpeciesInfo[${s.constantName}] entry`, riskLevel: "medium", warnings: [] },
          { targetFile: "src/data/graphics/pokemon.h", action: "delete", reason: "Remove INCGFX_* entries", riskLevel: "medium", warnings: [] },
          { targetFile: `graphics/pokemon/${s.constantName.replace("SPECIES_", "").toLowerCase()}/`, action: "delete", reason: "Remove asset folder", riskLevel: "high", warnings: ["Backup recommended"] },
        );
      } else {
        // Generic delete steps
        const files = fileMapForEntity(entityType, "");
        for (const f of files) {
          steps.push({ targetFile: f, action: "delete", reason: `Remove ${entityType} definition`, riskLevel: "medium", warnings: [] });
        }
      }
    } else {
      // add or edit — generate code + validate
      const data = body.data as Record<string, unknown>;
      if (entityType === "species") {
        entityConstant = String(data.constantName ?? "");
        generatedCode = generateSpeciesCode(data as never, (data.learnsetMoves as never[]) ?? [], (data.evolutions as never[]) ?? []);
        const v = validateSpecies(data as never, knownTypes, knownAbilities, knownMoves);
        errors = v.filter((i) => i.severity === "error").map((i) => i.message);
        warnings = v.filter((i) => i.severity === "warning").map((i) => i.message);
        steps.push(
          { targetFile: "include/constants/species.h", action: "insert", reason: `#define ${entityConstant}`, riskLevel: "low", warnings: [] },
          { targetFile: "src/data/pokemon/species_info.h", action: "insert", reason: "gSpeciesInfo[] entry", riskLevel: "medium", warnings: [] },
          { targetFile: "src/data/graphics/pokemon.h", action: "insert", reason: "INCGFX_* macros", riskLevel: "low", warnings: [] },
          { targetFile: "src/data/pokemon/level_up_learnsets/gen_9.h", action: "insert", reason: "LevelUpMove array", riskLevel: "medium", warnings: [] },
          { targetFile: "src/data/pokemon/teachable_learnsets.h", action: "insert", reason: "Teachable list", riskLevel: "low", warnings: [] },
          { targetFile: "src/data/pokemon/evolution.h", action: "insert", reason: "EVOLUTION() macro", riskLevel: "low", warnings: [] },
          { targetFile: "src/data/pokemon/pokedex_orders.h", action: "insert", reason: "Dex sort arrays", riskLevel: "low", warnings: [] },
          { targetFile: `graphics/pokemon/${entityConstant.replace("SPECIES_", "").toLowerCase()}/`, action: "create_folder", reason: "Asset folder (PNGs/palettes)", riskLevel: "low", warnings: ["Add: anim_front.png, back.png, normal.pal, shiny.pal, icon.png, footprint.png"] },
        );
      } else if (entityType === "move") {
        entityConstant = String(data.constantName ?? "");
        generatedCode = generateMoveCode(data as never);
        const v = validateMove(data as never, knownTypes);
        errors = v.filter((i) => i.severity === "error").map((i) => i.message);
        warnings = v.filter((i) => i.severity === "warning").map((i) => i.message);
        steps.push(
          { targetFile: "include/constants/moves.h", action: "insert", reason: `#define ${entityConstant}`, riskLevel: "low", warnings: [] },
          { targetFile: "src/data/battle_moves.h", action: "insert", reason: "gBattleMoves[] entry", riskLevel: "medium", warnings: [] },
          { targetFile: "data/battle_scripts_1.s", action: "insert", reason: "BattleScript label", riskLevel: "medium", warnings: [] },
          { targetFile: "include/battle_scripts.h", action: "insert", reason: "extern declaration", riskLevel: "low", warnings: [] },
        );
      } else if (entityType === "type") {
        entityConstant = String(data.constantName ?? "");
        generatedCode = generateTypeCode(data as never, knownTypes);
        const v = validateType(data as never, knownTypes);
        errors = v.filter((i) => i.severity === "error").map((i) => i.message);
        warnings = v.filter((i) => i.severity === "warning").map((i) => i.message);
        steps.push(
          { targetFile: "include/constants/types.h", action: "insert", reason: `#define ${entityConstant}`, riskLevel: "low", warnings: [] },
          { targetFile: "src/data/type_effectiveness.h", action: "insert", reason: "Extend type chart", riskLevel: "high", warnings: ["Affects all type matchups"] },
        );
      } else if (entityType === "ability") {
        entityConstant = String(data.constantName ?? "");
        generatedCode = generateAbilityCode(data as never);
        const v = validateAbility(data as never, knownAbilities);
        errors = v.filter((i) => i.severity === "error").map((i) => i.message);
        warnings = v.filter((i) => i.severity === "warning").map((i) => i.message);
        steps.push(
          { targetFile: "include/constants/abilities.h", action: "insert", reason: `#define ${entityConstant}`, riskLevel: "low", warnings: [] },
          { targetFile: "src/data/text/abilities.h", action: "insert", reason: "Name/description text", riskLevel: "low", warnings: [] },
          { targetFile: "battle logic (battle_*.c)", action: "insert", reason: "Ability behavior", riskLevel: "high", warnings: ["Manual C code required"] },
        );
      } else if (entityType === "item") {
        entityConstant = String(data.constantName ?? "");
        generatedCode = generateItemCode(data as never);
        const v = validateItem(data as never);
        errors = v.filter((i) => i.severity === "error").map((i) => i.message);
        warnings = v.filter((i) => i.severity === "warning").map((i) => i.message);
        steps.push(
          { targetFile: "include/constants/items.h", action: "insert", reason: `#define ${entityConstant}`, riskLevel: "low", warnings: [] },
          { targetFile: "src/data/items.h", action: "insert", reason: "gItems[] entry", riskLevel: "medium", warnings: [] },
          { targetFile: "graphics/items/", action: "create_folder", reason: "Icon PNG", riskLevel: "low", warnings: [] },
        );
      } else if (entityType === "status") {
        entityConstant = String(data.constantName ?? "");
        generatedCode = generateStatusCode(data as never);
        const v = validateStatus(data as never);
        errors = v.filter((i) => i.severity === "error").map((i) => i.message);
        warnings = v.filter((i) => i.severity === "warning").map((i) => i.message);
        steps.push(
          { targetFile: "include/constants/battle.h", action: "insert", reason: `#define ${entityConstant}`, riskLevel: "medium", warnings: [] },
          { targetFile: "data/battle_scripts_1.s", action: "insert", reason: "Status tick-down script", riskLevel: "high", warnings: [] },
          { targetFile: "battle_util.c / battle_script_commands.c", action: "insert", reason: "Status logic", riskLevel: "high", warnings: ["Manual C code required"] },
        );
      }
    }

    const plan: ChangePlan = {
      mode,
      entityType,
      entityConstant,
      steps,
      warnings,
      errors,
      generatedCode,
      isBlocked: errors.length > 0,
    };

    // Persist as draft change plan
    const saved = await db.changePlan.create({
      data: {
        projectId,
        mode,
        entityType,
        entityConstant,
        status: plan.isBlocked ? "failed" : "validated",
        stepsJson: JSON.stringify(plan.steps),
        warningsJson: JSON.stringify(plan.warnings),
        errorsJson: JSON.stringify(plan.errors),
        generatedCode: plan.generatedCode,
        summary: `${mode} ${entityType} ${entityConstant}`,
        isBlocked: plan.isBlocked,
      },
    });

    return NextResponse.json({ plan, planId: saved.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function fileMapForEntity(entityType: string, _constant: string): string[] {
  switch (entityType) {
    case "move":
      return ["include/constants/moves.h", "src/data/battle_moves.h", "data/battle_scripts_1.s"];
    case "type":
      return ["include/constants/types.h", "src/data/type_effectiveness.h"];
    case "ability":
      return ["include/constants/abilities.h", "src/data/text/abilities.h"];
    case "item":
      return ["include/constants/items.h", "src/data/items.h", "graphics/items/"];
    case "status":
      return ["include/constants/battle.h", "data/battle_scripts_1.s"];
    default:
      return [];
  }
}
