import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureTemplatesSeeded } from "@/lib/documents/seed";
import {
  getDocTemplate,
  listDocTemplates,
  saveDocTemplate,
} from "@/lib/documents/templates";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const templates = await ensureTemplatesSeeded();
  return NextResponse.json({ templates: templates.length ? templates : await listDocTemplates() });
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    id?: string;
    label?: string;
    scope?: "student" | "general";
    body?: string;
    sort_order?: number;
  };
  if (!body.id || body.body == null || !body.label || !body.scope) {
    return NextResponse.json({ error: "id, label, scope, body required" }, { status: 400 });
  }
  const existing = await getDocTemplate(body.id);
  const template = await saveDocTemplate({
    id: body.id,
    label: body.label,
    scope: body.scope,
    body: body.body,
    sort_order: body.sort_order ?? existing?.sort_order ?? 0,
  });
  return NextResponse.json({ template });
}
