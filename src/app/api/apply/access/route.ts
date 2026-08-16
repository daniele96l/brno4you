import { NextResponse } from "next/server";
import { createStudentSession } from "@/lib/auth";
import { normalizeEmail } from "@/lib/ios-form";
import { normalizeDocumentNumber } from "@/lib/form-config";
import {
  getStudentByAccessToken,
  getStudentByEmailAndDocument,
} from "@/lib/students";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      email?: string;
      document_number?: string;
    };
    const doc = body.document_number?.trim();
    if (!doc) {
      return NextResponse.json(
        { error: "Document number is required" },
        { status: 400 },
      );
    }

    let student = null;
    const token = body.token?.trim();
    if (token) {
      student = await getStudentByAccessToken(token);
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
    } else {
      const email = normalizeEmail(body.email || "");
      if (!email) {
        return NextResponse.json(
          { error: "Email and document number are required" },
          { status: 400 },
        );
      }
      student = await getStudentByEmailAndDocument(email, doc);
      if (!student) {
        return NextResponse.json(
          {
            error:
              "No application found for that email and document number. Check both and try again.",
          },
          { status: 404 },
        );
      }
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
