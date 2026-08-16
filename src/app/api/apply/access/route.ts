import { NextResponse } from "next/server";
import { createStudentSession } from "@/lib/auth";
import { normalizeDocumentNumber } from "@/lib/form-config";
import { getStudentByAccessToken } from "@/lib/students";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      document_number?: string;
    };
    const token = body.token?.trim();
    const doc = body.document_number?.trim();
    if (!token || !doc) {
      return NextResponse.json(
        { error: "Access link and document number are required" },
        { status: 400 },
      );
    }

    const student = await getStudentByAccessToken(token);
    if (!student) {
      return NextResponse.json(
        { error: "This access link is invalid or expired" },
        { status: 404 },
      );
    }

    if (
      normalizeDocumentNumber(student.document_number) !==
      normalizeDocumentNumber(doc)
    ) {
      return NextResponse.json(
        {
          error:
            "Document number does not match this application. Check the number on your ID/passport.",
        },
        { status: 403 },
      );
    }

    await createStudentSession(student.id);
    return NextResponse.json({
      studentId: student.id,
      participation_status: student.participation_status,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Access failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
