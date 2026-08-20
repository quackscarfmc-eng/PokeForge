import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const types = await db.type.findMany({
    where: { projectId },
    orderBy: { typeId: "asc" },
  });
  return NextResponse.json({ types });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, ...fields } = body;
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const existing = await db.type.findUnique({ where: { constantName: fields.constantName } });
    if (existing)
      return NextResponse.json({ error: `Constant ${fields.constantName} already exists` }, { status: 400 });

    const type = await db.type.create({
      data: {
        projectId,
        constantName: fields.constantName,
        typeId: fields.typeId ?? project.nextTypeId,
        name: fields.name,
        description: fields.description ?? null,
        colorHex: fields.colorHex ?? "#8B5CF6",
        iconEmoji: fields.iconEmoji ?? null,
        offensiveMatrix: JSON.stringify(fields.offensiveMatrix ?? {}),
        defensiveMatrix: JSON.stringify(fields.defensiveMatrix ?? {}),
      },
    });

    if (!fields.typeId) {
      await db.project.update({
        where: { id: projectId },
        data: { nextTypeId: type.typeId + 1 },
      });
    }
    return NextResponse.json({ type }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
