import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/projects — list all projects
export async function GET() {
  const projects = await db.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          species: true,
          moves: true,
          types: true,
          abilities: true,
          items: true,
          statuses: true,
          encounters: true,
          trainers: true,
          changePlans: true,
          backups: true,
        },
      },
    },
  });
  return NextResponse.json({ projects });
}

// POST /api/projects — create a project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, basePath, expansionVersion } = body as {
      name: string;
      description?: string;
      basePath?: string;
      expansionVersion?: string;
    };
    if (!name || name.trim().length === 0)
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        basePath: basePath?.trim() || null,
        expansionVersion: expansionVersion?.trim() || null,
      },
    });

    await db.backup.create({
      data: {
        projectId: project.id,
        label: "Initial project creation",
        snapshotJson: JSON.stringify({ project }),
        entityType: "project",
        entityConstant: null,
        sizeBytes: JSON.stringify(project).length,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
