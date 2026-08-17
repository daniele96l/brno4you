import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getProject, saveProject, type MobilityProject } from "@/lib/projects";
import { regenerateUnsignedForProject } from "@/lib/documents/ensure";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PUT(req: Request, { params }: Props) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getProject(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await req.json()) as Partial<MobilityProject>;
  const updated: MobilityProject = {
    ...existing,
    ...body,
    id: existing.id,
    updated_at: new Date().toISOString(),
  };
  const project = await saveProject(updated);
  const regenerated = await regenerateUnsignedForProject(project.id);
  return NextResponse.json({ project, regenerated });
}
