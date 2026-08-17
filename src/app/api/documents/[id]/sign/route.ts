import { NextResponse } from "next/server";
import { canAccessStudent } from "@/lib/auth";
import { participantReadyForDocuments, documentsSignedByGuardian } from "@/lib/participant-id";
import { signatureLooksBlank, stampSignedPdf } from "@/lib/documents/pdf";
import { getDocument, getStudent, saveDocument } from "@/lib/students";
import { getDocTemplate } from "@/lib/documents/templates";
import { readUpload, saveUpload } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const doc = await getDocument(id);
  if (!doc || !doc.student_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!(await canAccessStudent(doc.student_id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const student = await getStudent(doc.student_id);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (!participantReadyForDocuments(student)) {
    return NextResponse.json(
      {
        error: documentsSignedByGuardian(student)
          ? "Upload the parent or legal guardian ID before signing."
          : "Complete ID verification before signing",
      },
      { status: 400 },
    );
  }

  if (doc.status === "signed") {
    return NextResponse.json({ error: "Already signed" }, { status: 400 });
  }

  const body = (await req.json()) as {
    signerName?: string;
    signaturePngBase64?: string;
  };
  const signerName = body.signerName?.trim();
  if (!signerName || signerName.length < 2) {
    return NextResponse.json(
      { error: "Typed full name is required" },
      { status: 400 },
    );
  }

  if (documentsSignedByGuardian(student)) {
    const studentName =
      `${student.first_name} ${student.surname}`.trim().toLowerCase();
    if (signerName.toLowerCase() === studentName) {
      return NextResponse.json(
        {
          error:
            "Participants under 18 must be signed by a parent or legal guardian, not the participant.",
        },
        { status: 400 },
      );
    }
  }

  if (!body.signaturePngBase64) {
    return NextResponse.json(
      { error: "Signature drawing is required" },
      { status: 400 },
    );
  }

  const b64 = body.signaturePngBase64.replace(/^data:image\/png;base64,/, "");
  const signaturePng = Buffer.from(b64, "base64");
  if (await signatureLooksBlank(signaturePng)) {
    return NextResponse.json(
      { error: "Draw your signature in the box before confirming" },
      { status: 400 },
    );
  }

  try {
    const unsigned = await readUpload(doc.storage_path);
    const template = await getDocTemplate(doc.template_id);
    const signedAt = new Date();
    const stamped = await stampSignedPdf(unsigned, {
      title: template?.label || doc.template_id,
      signerName,
      signaturePng,
      signedAt,
    });

    const signature_path = await saveUpload(
      `signatures/${doc.id}.png`,
      signaturePng,
      "image/png",
    );
    const signed_storage_path = await saveUpload(
      `docs/${doc.id}-signed.pdf`,
      stamped,
      "application/pdf",
    );

    const updated = {
      ...doc,
      status: "signed" as const,
      signed_at: signedAt.toISOString(),
      signer_name: signerName,
      signature_path,
      signed_storage_path,
      filename: doc.filename.replace(/\.pdf$/i, "") + "-signed.pdf",
    };
    await saveDocument(updated);
    return NextResponse.json({ document: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sign failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
