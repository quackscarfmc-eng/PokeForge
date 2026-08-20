import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/species?projectId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId)
    return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const species = await db.species.findMany({
    where: { projectId },
    orderBy: { speciesId: "asc" },
    include: {
      learnsetMoves: { orderBy: { level: "asc" } },
      evolutions: { orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json({ species });
}

// POST /api/species — create
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, learnsetMoves = [], evolutions = [], ...fields } = body;

    if (!projectId)
      return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Validate constant name uniqueness
    const existing = await db.species.findUnique({
      where: { constantName: fields.constantName },
    });
    if (existing)
      return NextResponse.json(
        { error: `Constant ${fields.constantName} already exists` },
        { status: 400 },
      );

    const species = await db.species.create({
      data: {
        projectId,
        constantName: fields.constantName,
        speciesId: fields.speciesId ?? project.nextSpeciesId,
        speciesName: fields.speciesName,
        nationalDexNum: fields.nationalDexNum ?? null,
        hoennDexNum: fields.hoennDexNum ?? null,
        categoryName: fields.categoryName ?? null,
        description: fields.description ?? null,
        baseHP: fields.baseHP ?? 50,
        baseAttack: fields.baseAttack ?? 50,
        baseDefense: fields.baseDefense ?? 50,
        baseSpeed: fields.baseSpeed ?? 50,
        baseSpAttack: fields.baseSpAttack ?? 50,
        baseSpDefense: fields.baseSpDefense ?? 50,
        evYieldHP: fields.evYieldHP ?? 0,
        evYieldAttack: fields.evYieldAttack ?? 0,
        evYieldDefense: fields.evYieldDefense ?? 0,
        evYieldSpeed: fields.evYieldSpeed ?? 0,
        evYieldSpAttack: fields.evYieldSpAttack ?? 0,
        evYieldSpDefense: fields.evYieldSpDefense ?? 0,
        types: JSON.stringify(fields.types ?? []),
        catchRate: fields.catchRate ?? 45,
        expYield: fields.expYield ?? 100,
        genderRatio: fields.genderRatio ?? 127,
        eggCycles: fields.eggCycles ?? 20,
        friendship: fields.friendship ?? 70,
        growthRate: fields.growthRate ?? "GROWTH_MEDIUM_FAST",
        eggGroups: JSON.stringify(fields.eggGroups ?? []),
        abilities: JSON.stringify(fields.abilities ?? []),
        bodyColor: fields.bodyColor ?? "BODY_COLOR_RED",
        noFlip: fields.noFlip ?? false,
        height: fields.height ?? 10,
        weight: fields.weight ?? 250,
        frontPicSymbol: fields.frontPicSymbol ?? null,
        backPicSymbol: fields.backPicSymbol ?? null,
        iconSymbol: fields.iconSymbol ?? null,
        footprintSymbol: fields.footprintSymbol ?? null,
        paletteSymbol: fields.paletteSymbol ?? null,
        shinyPaletteSymbol: fields.shinyPaletteSymbol ?? null,
        frontAnimId: fields.frontAnimId ?? "ANIM_V_JOLT",
        backAnimId: fields.backAnimId ?? "BACK_ANIM_CONCAVE_ARC_SMALL",
        frontPicWidth: fields.frontPicWidth ?? 64,
        frontPicHeight: fields.frontPicHeight ?? 64,
        backPicWidth: fields.backPicWidth ?? 64,
        backPicHeight: fields.backPicHeight ?? 64,
        cryId: fields.cryId ?? "CRY_BULBASAUR",
        spriteFrontDataUrl: fields.spriteFrontDataUrl ?? null,
        flags: JSON.stringify(fields.flags ?? []),
        learnsetMoves: {
          create: learnsetMoves.map((m: { level: number; moveConstant: string }) => ({
            level: m.level,
            moveConstant: m.moveConstant,
          })),
        },
        evolutions: {
          create: evolutions.map((e: { method: string; param: string; targetSpecies: string }) => ({
            method: e.method,
            param: e.param,
            targetSpecies: e.targetSpecies,
          })),
        },
      },
      include: { learnsetMoves: true, evolutions: true },
    });

    // Bump next id
    if (!fields.speciesId) {
      await db.project.update({
        where: { id: projectId },
        data: { nextSpeciesId: species.speciesId + 1 },
      });
    }

    return NextResponse.json({ species }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
