import { NextResponse } from "next/server";
import { studentFormSchema } from "@/lib/student-schema";
import { applyFormToStudent, getStudent, saveStudent } from "@/lib/students";
import { canAccessStudent, isAdminAuthenticated } from "@/lib/auth";
import { extensionForMime, fileHash, saveUpload } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await canAccessStudent(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const student = await getStudent(id);
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ student });
}

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await getStudent(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await req.json()) as {
    needs_travel_declaration?: boolean;
    project_id?: string;
  };
  const student = {
    ...existing,
    needs_travel_declaration:
      body.needs_travel_declaration ?? existing.needs_travel_declaration,
    project_id: body.project_id ?? existing.project_id,
    updated_at: new Date().toISOString(),
  };
  await saveStudent(student);
  return NextResponse.json({ student });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await canAccessStudent(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await getStudent(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const form = await req.formData();
    const jsonRaw = form.get("data");
    if (typeof jsonRaw !== "string") {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }
    const parsed = studentFormSchema.safeParse(JSON.parse(jsonRaw));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    let student = applyFormToStudent(existing, parsed.data);

    const front = form.get("id_front");
    const back = form.get("id_back");
    let imagesChanged = false;

    if (front instanceof File && front.size > 0) {
      const buf = Buffer.from(await front.arrayBuffer());
      const ext = extensionForMime(front.type || "image/jpeg");
      student.id_front_path = await saveUpload(
        `ids/${student.id}/front.${ext}`,
        buf,
        front.type || "image/jpeg",
      );
      student.id_front_hash = fileHash(buf);
      imagesChanged = true;
    }

    if (back instanceof File && back.size > 0) {
      const buf = Buffer.from(await back.arrayBuffer());
      const ext = extensionForMime(back.type || "image/jpeg");
      student.id_back_path = await saveUpload(
        `ids/${student.id}/back.${ext}`,
        buf,
        back.type || "image/jpeg",
      );
      student.id_back_hash = fileHash(buf);
      imagesChanged = true;
    }

    if (student.document_type === "id_card" && !student.id_back_path) {
      return NextResponse.json(
        { error: "ID card back image is required" },
        { status: 400 },
      );
    }

    if (imagesChanged) {
      student.id_verification_status = "pending";
      student.id_extracted = null;
      student.id_mismatches = null;
      student.id_verified_at = null;
    }

    await saveStudent(student);
    return NextResponse.json({ student });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
