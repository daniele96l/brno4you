import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  createProject,
  listProjects,
  saveProject,
  type ProjectInput,
} from "@/lib/projects";
import { ensureSampleDataSeeded } from "@/lib/partners";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSampleDataSeeded();
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as ProjectInput;
  if (!body.name?.trim() || !body.type) {
    return NextResponse.json(
      { error: "name and type required" },
      { status: 400 },
    );
  }
  if (body.type !== "youth_exchange" && body.type !== "training_course") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  const project = createProject(body);
  const saved = await saveProject(project);
  return NextResponse.json({ project: saved });
}
