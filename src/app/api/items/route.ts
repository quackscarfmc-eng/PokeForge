import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const items = await db.item.findMany({
    where: { projectId },
    orderBy: { itemId: "asc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, ...fields } = body;
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const existing = await db.item.findUnique({ where: { constantName: fields.constantName } });
    if (existing)
      return NextResponse.json({ error: `Constant ${fields.constantName} already exists` }, { status: 400 });

    const item = await db.item.create({
      data: {
        projectId,
        constantName: fields.constantName,
        itemId: fields.itemId ?? project.nextItemId,
        name: fields.name,
        description: fields.description ?? null,
        pocket: fields.pocket ?? "POCKET_ITEMS",
        price: fields.price ?? 0,
        effect: fields.effect ?? "ITEM_EFFECT_NONE",
        holdEffect: fields.holdEffect ?? "HOLD_EFFECT_NONE",
        flingPower: fields.flingPower ?? 0,
        importance: fields.importance ?? 0,
        category: fields.category ?? "ITEM_CATEGORY_ITEMS",
        isTM: fields.isTM ?? false,
        tmMoveConstant: fields.tmMoveConstant ?? null,
      },
    });
    if (!fields.itemId) {
      await db.project.update({
        where: { id: projectId },
        data: { nextItemId: item.itemId + 1 },
      });
    }
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
