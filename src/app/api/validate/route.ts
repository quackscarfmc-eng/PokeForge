import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  validateSpecies,
  validateMove,
  validateType,
  validateAbility,
  validateItem,
  validateStatus,
} from "@/lib/poke-codegen";
import { POKEMON_TYPES, BUILTIN_ABILITIES } from "@/lib/poke-constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityType, projectId, data } = body as {
      entityType: string;
      projectId: string;
      data: Record<string, unknown>;
    };

    // Gather known custom tokens for this project
    const [types, abilities] = await Promise.all([
      db.type.findMany({ where: { projectId }, select: { constantName: true } }),
      db.ability.findMany({ where: { projectId }, select: { constantName: true } }),
    ]);
    const knownTypes = [...POKEMON_TYPES.map((t) => t.constant), ...types.map((t) => t.constantName)];
    const knownAbilities = [...BUILTIN_ABILITIES.map((a) => a.constant), ...abilities.map((a) => a.constantName)];
    const knownMoves: string[] = (await db.move.findMany({ where: { projectId }, select: { constantName: true } })).map(
      (m) => m.constantName,
    );

    let issues: { severity: string; message: string }[] = [];
    switch (entityType) {
      case "species":
        issues = validateSpecies(data as never, knownTypes, knownAbilities, knownMoves);
        break;
      case "move":
        issues = validateMove(data as never, knownTypes);
        break;
      case "type":
        issues = validateType(data as never, knownTypes);
        break;
      case "ability":
        issues = validateAbility(data as never, knownAbilities);
        break;
      case "item":
        issues = validateItem(data as never);
        break;
      case "status":
        issues = validateStatus(data as never);
        break;
      default:
        return NextResponse.json({ error: `Unknown entityType: ${entityType}` }, { status: 400 });
    }

    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");
    const ok = errors.length === 0;
    const safetyScore = Math.max(
      0,
      100 - errors.length * 25 - warnings.length * 8,
    );

    return NextResponse.json({
      ok,
      errors,
      warnings,
      safetyScore,
      totalIssues: issues.length,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
