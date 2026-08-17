import { NextResponse } from "next/server";
import { canAccessStudent, randomId } from "@/lib/auth";
import { getStudent, saveStudent } from "@/lib/students";
import { saveUpload } from "@/lib/storage";
import type { TravelPlanFile } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await canAccessStudent(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const student = await getStudent(id);
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    status: student.travel_plan_status,
    text: student.travel_plan_text,
    files: student.travel_plan_files,
    requested_at: student.travel_plan_requested_at,
    submitted_at: student.travel_plan_submitted_at,
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await canAccessStudent(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const student = await getStudent(id);
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (student.travel_plan_status !== "requested" && student.travel_plan_status !== "submitted") {
    return NextResponse.json(
      { error: "Travel plan has not been requested yet" },
      { status: 400 },
    );
  }

  try {
    const form = await req.formData();
    const text = String(form.get("text") || "").trim();
    if (text.length < 10) {
      return NextResponse.json(
        {
          error:
            "Please describe your travel plan (from where, when, and how you travel).",
        },
        { status: 400 },
      );
    }

    const files: TravelPlanFile[] = [...(student.travel_plan_files || [])];
    const uploads = form.getAll("files");
    for (const item of uploads) {
      if (!(item instanceof File) || item.size <= 0) continue;
      if (item.size > 12 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${item.name} is too large (max 12MB)` },
          { status: 400 },
        );
      }
      const type = item.type || "application/octet-stream";
      if (!ALLOWED.has(type) && !type.startsWith("image/")) {
        return NextResponse.json(
          { error: `Unsupported file type: ${item.name}` },
          { status: 400 },
        );
      }
      const buf = Buffer.from(await item.arrayBuffer());
      const ext =
        type.includes("pdf")
          ? "pdf"
          : type.includes("png")
            ? "png"
            : type.includes("webp")
              ? "webp"
              : "jpg";
      const fileId = randomId();
      const path = await saveUpload(
        `travel/${student.id}/${fileId}.${ext}`,
        buf,
        type,
      );
      files.push({
        path,
        filename: item.name || `attachment.${ext}`,
        contentType: type,
      });
    }

    const now = new Date().toISOString();
    const updated = {
      ...student,
      travel_plan_status: "submitted" as const,
      travel_plan_text: text,
      travel_plan_files: files,
      travel_plan_submitted_at: now,
      updated_at: now,
    };
    await saveStudent(updated);
    return NextResponse.json({ student: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Submit failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
