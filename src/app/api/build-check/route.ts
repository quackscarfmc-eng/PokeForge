import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/build-check?projectId=... (list recent)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const checks = await db.buildCheck.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ checks });
}

// POST /api/build-check — simulate a build check
// (Since the web app may not have a pokeemerald checkout on the server,
// we provide a *simulated* build that validates internal consistency.)
export async function POST(req: NextRequest) {
  try {
    const start = Date.now();
    const body = await req.json();
    const { projectId, triggeredBy = "manual" } = body as { projectId: string; triggeredBy?: string };

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const [species, moves, types, abilities, items, statuses, recentPlan] = await Promise.all([
      db.species.findMany({ where: { projectId } }),
      db.move.findMany({ where: { projectId } }),
      db.type.findMany({ where: { projectId } }),
      db.ability.findMany({ where: { projectId } }),
      db.item.findMany({ where: { projectId } }),
      db.statusCondition.findMany({ where: { projectId } }),
      db.changePlan.findFirst({ where: { projectId, status: "validated" }, orderBy: { createdAt: "desc" } }),
    ]);

    const errors: { file: string; line: number | null; message: string }[] = [];
    const warnings: string[] = [];

    // Simulated compile checks: ID collisions, dangling refs
    const allSpeciesIds = new Map<number, string>();
    for (const s of species) {
      if (allSpeciesIds.has(s.speciesId))
        errors.push({ file: "include/constants/species.h", line: null, message: `Duplicate species id ${s.speciesId} (${s.constantName} & ${allSpeciesIds.get(s.speciesId)})` });
      else allSpeciesIds.set(s.speciesId, s.constantName);
    }
    const moveIds = new Map<number, string>();
    for (const m of moves) {
      if (moveIds.has(m.moveId))
        errors.push({ file: "include/constants/moves.h", line: null, message: `Duplicate move id ${m.moveId} (${m.constantName} & ${moveIds.get(m.moveId)})` });
      else moveIds.set(m.moveId, m.constantName);
    }
    for (const t of types) {
      if (types.filter((x) => x.typeId === t.typeId).length > 1)
        errors.push({ file: "include/constants/types.h", line: null, message: `Duplicate type id ${t.typeId}` });
    }

    // Cross-reference: species abilities/types reference existing constants
    const knownTypeConsts = new Set([
      "TYPE_NORMAL","TYPE_FIRE","TYPE_WATER","TYPE_GRASS","TYPE_ELECTRIC","TYPE_ICE","TYPE_FIGHTING","TYPE_POISON",
      "TYPE_GROUND","TYPE_FLYING","TYPE_PSYCHIC","TYPE_BUG","TYPE_ROCK","TYPE_GHOST","TYPE_DRAGON","TYPE_DARK","TYPE_STEEL","TYPE_FAIRY","TYPE_STELLAR","TYPE_NONE",
      ...types.map((t) => t.constantName),
    ]);
    for (const s of species) {
      const tArr = JSON.parse(s.types) as string[];
      for (const t of tArr) if (!knownTypeConsts.has(t))
        errors.push({ file: "src/data/pokemon/species_info.h", line: null, message: `${s.constantName} references unknown type ${t}` });
    }

    if (species.length === 0 && moves.length === 0 && types.length === 0)
      warnings.push("Project has no custom content yet — build is trivially clean.");

    if (recentPlan && !recentPlan.isBlocked)
      warnings.push(`Last plan "${recentPlan.summary}" was validated but not marked applied.`);

    // Check expansionVersion
    if (!project.expansionVersion)
      warnings.push("Expansion version not set — file paths may differ between versions.");

    const ok = errors.length === 0;
    const stdout = `make -j${process.env.NPROC || 4}\n[build simulation]\n${ok ? "Build succeeded" : "Build failed with " + errors.length + " error(s)"}`;
    const stderr = errors.map((e) => `${e.file}: error: ${e.message}`).join("\n");

    const check = await db.buildCheck.create({
      data: {
        projectId,
        ok,
        returncode: ok ? 0 : 2,
        stdout,
        stderr,
        errorsJson: JSON.stringify(errors),
        warningsJson: JSON.stringify(warnings),
        durationMs: Date.now() - start,
        triggeredBy,
      },
    });

    return NextResponse.json({ check, errors, warnings, ok });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
