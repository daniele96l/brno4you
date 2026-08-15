import PDFDocument from "pdfkit";
import type { DocumentTemplate } from "./types";
import type { Student } from "../types";

function fullName(s: Student) {
  const parts = [
    s.first_name,
    s.has_second_name ? s.second_name : null,
    s.surname,
    s.has_second_surname ? s.second_surname : null,
  ].filter(Boolean);
  return parts.join(" ");
}

function buildPdf(student: Student, generatedAt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Verno4U — Student summary", { underline: true });
    doc.moveDown();
    doc.fontSize(11).fillColor("#444").text(`Generated: ${generatedAt}`);
    doc.moveDown();
    doc.fillColor("#000").fontSize(12);
    const lines = [
      `Name: ${fullName(student)}`,
      `Birth date: ${student.birth_date}`,
      `Nationality: ${student.nationality}`,
      `Email: ${student.email}`,
      `Phone: ${student.phone}`,
      `Document: ${student.document_type} (${student.document_country})`,
      `Document number: ${student.document_number}`,
      `Verification: ${student.id_verification_status}`,
    ];
    for (const line of lines) {
      doc.text(line);
      doc.moveDown(0.4);
    }
    doc.moveDown();
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(
        "Placeholder template. Add real Erasmus contracts via lib/documents/registry.ts.",
      );
    doc.end();
  });
}

export const studentSummaryTemplate: DocumentTemplate = {
  id: "student_summary",
  label: "Student summary (PDF)",
  async generate(student, ctx) {
    const buffer = await buildPdf(student, ctx.generatedAt);
    return {
      buffer,
      filename: `verno4u-${student.id}-summary.pdf`,
      mime: "application/pdf",
    };
  },
};
