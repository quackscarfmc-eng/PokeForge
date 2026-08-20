import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const abilities = await db.ability.findMany({
    where: { projectId },
    orderBy: { abilityId: "asc" },
  });
  return NextResponse.json({ abilities });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, ...fields } = body;
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const existing = await db.ability.findUnique({ where: { constantName: fields.constantName } });
    if (existing)
      return NextResponse.json({ error: `Constant ${fields.constantName} already exists` }, { status: 400 });

    const ability = await db.ability.create({
      data: {
        projectId,
        constantName: fields.constantName,
        abilityId: fields.abilityId ?? project.nextAbilityId,
        name: fields.name,
        description: fields.description ?? null,
        effectFlags: JSON.stringify(fields.effectFlags ?? []),
        battleScript: fields.battleScript ?? null,
      },
    });
    if (!fields.abilityId) {
      await db.project.update({
        where: { id: projectId },
        data: { nextAbilityId: ability.abilityId + 1 },
      });
    }
    return NextResponse.json({ ability }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
