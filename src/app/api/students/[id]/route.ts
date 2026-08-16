import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { isAdminAuthenticated } from "@/lib/auth";
import { sendApprovalEmail } from "@/lib/email";
import { getProject } from "@/lib/projects";
import { getStudent, saveStudent } from "@/lib/students";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { canAccessStudent } = await import("@/lib/auth");
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
    participation_status?: "registered" | "approved" | "rejected";
  };

  let student = {
    ...existing,
    needs_travel_declaration:
      body.needs_travel_declaration ?? existing.needs_travel_declaration,
    project_id: body.project_id ?? existing.project_id,
    updated_at: new Date().toISOString(),
  };

  if (
    body.participation_status &&
    body.participation_status !== existing.participation_status
  ) {
    const now = new Date().toISOString();
    if (body.participation_status === "approved") {
      const token = existing.access_token || nanoid(32);
      student = {
        ...student,
        participation_status: "approved",
        access_token: token,
        approved_at: now,
        rejected_at: null,
      };
      await saveStudent(student);
      const project = student.project_id
        ? await getProject(student.project_id)
        : null;
      try {
        await sendApprovalEmail({
          to: student.email,
          firstName: student.first_name,
          projectName: project?.name || "the project",
          accessToken: token,
        });
      } catch (e) {
        return NextResponse.json(
          {
            student,
            error:
              e instanceof Error
                ? e.message
                : "Approved, but the email could not be sent",
            emailSent: false,
          },
          { status: 200 },
        );
      }
      return NextResponse.json({ student, emailSent: true });
    }
    if (body.participation_status === "rejected") {
      student = {
        ...student,
        participation_status: "rejected",
        rejected_at: now,
      };
    } else {
      student = {
        ...student,
        participation_status: body.participation_status,
      };
    }
  }

  await saveStudent(student);
  return NextResponse.json({ student });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { canAccessStudent } = await import("@/lib/auth");
  const { studentFormSchema } = await import("@/lib/student-schema");
  const { applyFormToStudent } = await import("@/lib/students");
  const { fileHash, saveUpload } = await import("@/lib/storage");
  const { normalizeIdImageBuffer } = await import("@/lib/normalize-id-image");

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
      const raw = Buffer.from(await front.arrayBuffer());
      const normalized = await normalizeIdImageBuffer(raw, front.type);
      student.id_front_path = await saveUpload(
        `ids/${student.id}/front.${normalized.ext}`,
        normalized.buffer,
        normalized.contentType,
      );
      student.id_front_hash = fileHash(normalized.buffer);
      imagesChanged = true;
    }

    if (back instanceof File && back.size > 0) {
      const raw = Buffer.from(await back.arrayBuffer());
      const normalized = await normalizeIdImageBuffer(raw, back.type);
      student.id_back_path = await saveUpload(
        `ids/${student.id}/back.${normalized.ext}`,
        normalized.buffer,
        normalized.contentType,
      );
      student.id_back_hash = fileHash(normalized.buffer);
      imagesChanged = true;
    }

    // ID photos only required when approved (post-approval phase)
    if (existing.participation_status === "approved") {
      if (!student.id_front_path) {
        return NextResponse.json(
          { error: "ID front image is required" },
          { status: 400 },
        );
      }
      if (student.document_type === "id_card" && !student.id_back_path) {
        return NextResponse.json(
          { error: "ID card back image is required" },
          { status: 400 },
        );
      }
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
