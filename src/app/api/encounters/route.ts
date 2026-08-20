import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const encounters = await db.wildEncounter.findMany({
    where: { projectId },
    orderBy: [{ mapLabel: "asc" }, { method: "asc" }, { minLevel: "asc" }],
  });
  return NextResponse.json({ encounters });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, ...fields } = body;
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const enc = await db.wildEncounter.create({
      data: {
        projectId,
        mapLabel: fields.mapLabel || "MAP_NEW",
        location: fields.location || "Unknown",
        method: fields.method || "grass",
        speciesConstant: fields.speciesConstant,
        minLevel: fields.minLevel ?? 2,
        maxLevel: fields.maxLevel ?? 5,
        encounterRate: fields.encounterRate ?? 20,
        heldItemConstant: fields.heldItemConstant ?? null,
        formId: fields.formId ?? null,
      },
    });
    return NextResponse.json({ encounter: enc }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
