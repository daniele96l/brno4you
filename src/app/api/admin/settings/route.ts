import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  getProjectSettings,
  saveProjectSettings,
} from "@/lib/documents/templates";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getProjectSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const settings = await saveProjectSettings(body);
  return NextResponse.json({ settings });
}
