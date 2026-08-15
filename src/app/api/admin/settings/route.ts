import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getProject, listProjects, saveProject } from "@/lib/projects";
import { settingsFromProject } from "@/lib/documents/templates";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const projects = await listProjects();
  const settings = projects[0]
    ? settingsFromProject(projects[0])
    : null;
  return NextResponse.json({ settings, projects });
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const id = body.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: "project id required" }, { status: 400 });
  }
  const existing = await getProject(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const project = await saveProject({
    ...existing,
    ...body,
    id: existing.id,
    updated_at: new Date().toISOString(),
  });
  return NextResponse.json({ settings: settingsFromProject(project) });
}
