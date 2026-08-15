import PDFDocument from "pdfkit";

export function textToPdf(title: string, body: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor("#243a8c").fontSize(14).font("Helvetica-Bold").text(title, {
      align: "left",
    });
    doc.moveDown(0.8);
    doc.fillColor("#111").font("Helvetica").fontSize(10);

    const paragraphs = body.split(/\n{2,}/);
    for (const para of paragraphs) {
      const lines = para.split("\n").map((l) => l.trimEnd());
      for (const line of lines) {
        if (!line.trim()) {
          doc.moveDown(0.3);
          continue;
        }
        doc.text(line, { width: 495, align: "left", lineGap: 2 });
      }
      doc.moveDown(0.55);
    }

    doc.end();
  });
}

export function stampSignaturePage(opts: {
  title: string;
  signerName: string;
  signaturePng: Buffer;
  signedAt: Date;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fillColor("#243a8c")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Electronic signature", { align: "left" });
    doc.moveDown(0.6);
    doc.fillColor("#111").font("Helvetica").fontSize(10);
    doc.text(`Document: ${opts.title}`, { width: 495 });
    doc.moveDown(0.4);
    doc.text(
      `I, ${opts.signerName}, confirm that I have read this document and agree to its terms. This signature was applied electronically after identity verification.`,
      { width: 495 },
    );
    doc.moveDown(0.8);
    doc.text(`Signed name: ${opts.signerName}`);
    doc.text(`Signed at: ${opts.signedAt.toISOString()}`);
    doc.moveDown(0.8);
    doc.text("Signature:");
    doc.moveDown(0.3);
    try {
      doc.image(opts.signaturePng, { fit: [280, 100] });
    } catch {
      doc.text("(signature image could not be embedded)");
    }

    doc.end();
  });
}

/** Append a signature attestation page to the unsigned PDF. */
export async function stampSignedPdf(
  unsignedPdf: Buffer,
  opts: {
    title: string;
    signerName: string;
    signaturePng: Buffer;
    signedAt: Date;
  },
): Promise<Buffer> {
  const { PDFDocument: PDFLibDocument } = await import("pdf-lib");
  const merged = await PDFLibDocument.create();
  const original = await PDFLibDocument.load(unsignedPdf);
  const sigPageBuf = await stampSignaturePage(opts);
  const sigDoc = await PDFLibDocument.load(sigPageBuf);
  const origPages = await merged.copyPages(
    original,
    original.getPageIndices(),
  );
  for (const p of origPages) merged.addPage(p);
  const sigPages = await merged.copyPages(sigDoc, sigDoc.getPageIndices());
  for (const p of sigPages) merged.addPage(p);
  const bytes = await merged.save();
  return Buffer.from(bytes);
}
