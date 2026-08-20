import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { learnsetMoves, evolutions, ...fields } = body;

    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (k === "types" || k === "eggGroups" || k === "abilities" || k === "flags") {
        data[k] = JSON.stringify(v);
      } else if (v !== undefined) {
        data[k] = v;
      }
    }

    // Replace nested learnset/evolutions if provided
    if (Array.isArray(learnsetMoves)) {
      await db.levelUpMove.deleteMany({ where: { speciesId: id } });
      if (learnsetMoves.length) {
        await db.levelUpMove.createMany({
          data: learnsetMoves.map((m: { level: number; moveConstant: string }) => ({
            speciesId: id,
            level: m.level,
            moveConstant: m.moveConstant,
          })),
        });
      }
    }
    if (Array.isArray(evolutions)) {
      await db.evolution.deleteMany({ where: { speciesId: id } });
      if (evolutions.length) {
        await db.evolution.createMany({
          data: evolutions.map((e: { method: string; param: string; targetSpecies: string }) => ({
            speciesId: id,
            method: e.method,
            param: e.param,
            targetSpecies: e.targetSpecies,
          })),
        });
      }
    }

    const species = await db.species.update({
      where: { id },
      data,
      include: { learnsetMoves: { orderBy: { level: "asc" } }, evolutions: true },
    });
    return NextResponse.json({ species });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "safe") as "safe" | "force";

    // Check for references (other species evolving into this one)
    const species = await db.species.findUnique({ where: { id }, include: { project: true } });
    if (!species) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (mode === "safe") {
      const referrers = await db.evolution.findMany({
        where: { targetSpecies: species.constantName },
      });
      if (referrers.length > 0) {
        return NextResponse.json(
          {
            error: "Cannot delete: referenced by evolutions",
            referrers: referrers.map((r) => r.targetSpecies),
          },
          { status: 409 },
        );
      }
    }

    await db.species.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/species/[id]?action=duplicate — duplicate a species
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action !== "duplicate") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const original = await db.species.findUnique({
      where: { id },
      include: { learnsetMoves: { orderBy: { level: "asc" } }, evolutions: true },
    });
    if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const project = await db.project.findUnique({ where: { id: original.projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const newId = project.nextSpeciesId;
    const newName = `${original.speciesName} Copy`;
    const newConstant = `${original.constantName}_COPY`;

    const dup = await db.species.create({
      data: {
        projectId: original.projectId,
        constantName: newConstant,
        speciesId: newId,
        speciesName: newName,
        nationalDexNum: null,
        hoennDexNum: null,
        categoryName: original.categoryName,
        description: original.description,
        baseHP: original.baseHP,
        baseAttack: original.baseAttack,
        baseDefense: original.baseDefense,
        baseSpeed: original.baseSpeed,
        baseSpAttack: original.baseSpAttack,
        baseSpDefense: original.baseSpDefense,
        evYieldHP: original.evYieldHP,
        evYieldAttack: original.evYieldAttack,
        evYieldDefense: original.evYieldDefense,
        evYieldSpeed: original.evYieldSpeed,
        evYieldSpAttack: original.evYieldSpAttack,
        evYieldSpDefense: original.evYieldSpDefense,
        types: original.types,
        catchRate: original.catchRate,
        expYield: original.expYield,
        genderRatio: original.genderRatio,
        eggCycles: original.eggCycles,
        friendship: original.friendship,
        growthRate: original.growthRate,
        eggGroups: original.eggGroups,
        abilities: original.abilities,
        bodyColor: original.bodyColor,
        noFlip: original.noFlip,
        height: original.height,
        weight: original.weight,
        frontPicSymbol: original.frontPicSymbol,
        backPicSymbol: original.backPicSymbol,
        iconSymbol: original.iconSymbol,
        footprintSymbol: original.footprintSymbol,
        paletteSymbol: original.paletteSymbol,
        shinyPaletteSymbol: original.shinyPaletteSymbol,
        frontAnimId: original.frontAnimId,
        backAnimId: original.backAnimId,
        frontPicWidth: original.frontPicWidth,
        frontPicHeight: original.frontPicHeight,
        backPicWidth: original.backPicWidth,
        backPicHeight: original.backPicHeight,
        cryId: original.cryId,
        spriteFrontDataUrl: original.spriteFrontDataUrl,
        flags: original.flags,
        learnsetMoves: {
          create: original.learnsetMoves.map((m) => ({
            level: m.level,
            moveConstant: m.moveConstant,
          })),
        },
        evolutions: { create: [] },
      },
      include: { learnsetMoves: true, evolutions: true },
    });

    await db.project.update({
      where: { id: original.projectId },
      data: { nextSpeciesId: newId + 1 },
    });

    return NextResponse.json({ species: dup }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
