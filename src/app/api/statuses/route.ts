import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const statuses = await db.statusCondition.findMany({
    where: { projectId },
    orderBy: { statusId: "asc" },
  });
  return NextResponse.json({ statuses });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, ...fields } = body;
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const existing = await db.statusCondition.findUnique({
      where: { constantName: fields.constantName },
    });
    if (existing)
      return NextResponse.json({ error: `Constant ${fields.constantName} already exists` }, { status: 400 });

    const status = await db.statusCondition.create({
      data: {
        projectId,
        constantName: fields.constantName,
        statusId: fields.statusId ?? project.nextStatusId,
        name: fields.name,
        description: fields.description ?? null,
        category: fields.category ?? "volatile",
        isVolatile: fields.isVolatile ?? true,
        battleScript: fields.battleScript ?? null,
        iconEmoji: fields.iconEmoji ?? null,
        colorHex: fields.colorHex ?? "#A855F7",
      },
    });
    if (!fields.statusId) {
      await db.project.update({
        where: { id: projectId },
        data: { nextStatusId: status.statusId + 1 },
      });
    }
    return NextResponse.json({ status }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
