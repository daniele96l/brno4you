import PDFDocument from "pdfkit";

/** Shared signature block at the end of every student PDF. */
function drawUnsignedSignatureBlock(doc: InstanceType<typeof PDFDocument>) {
  doc.moveDown(1.2);
  doc
    .strokeColor("#243a8c")
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
  doc.moveDown(0.8);
  doc
    .fillColor("#243a8c")
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Participant signature");
  doc.moveDown(0.4);
  doc
    .fillColor("#b45309")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Status: NOT SIGNED");
  doc.moveDown(0.5);
  doc.fillColor("#111").font("Helvetica").fontSize(10);
  doc.text(
    "This document is not signed yet. After ID verification, the participant must draw their signature and type their full name. The signed PDF will show the signature below.",
    { width: 495 },
  );
  doc.moveDown(0.8);
  doc.text("Full name: ________________________________");
  doc.moveDown(0.5);
  doc.text("Date: ____________________________________");
  doc.moveDown(0.5);
  doc.text("Signature:");
  doc.moveDown(0.3);
  doc
    .strokeColor("#999")
    .rect(50, doc.y, 280, 70)
    .stroke();
  doc.moveDown(5);
}

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

    // Keep room for signature block on a fresh page if needed
    if (doc.y > 620) doc.addPage();
    drawUnsignedSignatureBlock(doc);

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
      .fillColor("#047857")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("SIGNED", { align: "left" });
    doc.moveDown(0.4);
    doc
      .fillColor("#243a8c")
      .fontSize(12)
      .text("Electronic signature — participant attestation");
    doc.moveDown(0.6);
    doc.fillColor("#111").font("Helvetica").fontSize(10);
    doc.text(`Document: ${opts.title}`, { width: 495 });
    doc.moveDown(0.4);
    doc.text(
      `I, ${opts.signerName}, confirm that I have read this document and agree to its terms. This signature was applied electronically after identity verification.`,
      { width: 495 },
    );
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").text(`Signed name: ${opts.signerName}`);
    doc
      .font("Helvetica")
      .text(`Signed at: ${opts.signedAt.toISOString()}`);
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").text("Handwritten signature:");
    doc.moveDown(0.4);
    try {
      doc.image(opts.signaturePng, { fit: [360, 140] });
    } catch {
      doc
        .fillColor("#b91c1c")
        .text("(signature image could not be embedded — re-sign this document)");
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
  const { PDFDocument: PDFLibDocument, rgb, StandardFonts } = await import(
    "pdf-lib"
  );
  const merged = await PDFLibDocument.create();
  const original = await PDFLibDocument.load(unsignedPdf);
  const sigPageBuf = await stampSignaturePage(opts);
  const sigDoc = await PDFLibDocument.load(sigPageBuf);

  const origPages = await merged.copyPages(
    original,
    original.getPageIndices(),
  );
  for (const p of origPages) merged.addPage(p);

  // Banner on first page so status is obvious without scrolling to the end
  if (merged.getPageCount() > 0) {
    const first = merged.getPage(0);
    const { width, height } = first.getSize();
    const font = await merged.embedFont(StandardFonts.HelveticaBold);
    first.drawRectangle({
      x: 0,
      y: height - 28,
      width,
      height: 28,
      color: rgb(0.02, 0.47, 0.34),
    });
    first.drawText("SIGNED — signature included at the end of this document", {
      x: 40,
      y: height - 19,
      size: 11,
      font,
      color: rgb(1, 1, 1),
    });
  }

  const sigPages = await merged.copyPages(sigDoc, sigDoc.getPageIndices());
  for (const p of sigPages) merged.addPage(p);

  // Also embed signature image on the last content page if possible
  try {
    const png = await merged.embedPng(opts.signaturePng);
    const lastContentIdx = Math.max(0, merged.getPageCount() - 2);
    const page = merged.getPage(lastContentIdx);
    const maxW = 220;
    const scale = Math.min(maxW / png.width, 80 / png.height);
    const w = png.width * scale;
    const h = png.height * scale;
    page.drawText(`Signed by: ${opts.signerName}`, {
      x: 50,
      y: 110,
      size: 9,
      color: rgb(0.02, 0.47, 0.34),
    });
    page.drawImage(png, {
      x: 50,
      y: 28,
      width: w,
      height: h,
    });
  } catch {
    // Signature still on dedicated page
  }

  const bytes = await merged.save();
  return Buffer.from(bytes);
}

/** Overlay a NOT SIGNED banner when previewing unsigned PDFs. */
export async function stampNotSignedBanner(
  unsignedPdf: Buffer,
): Promise<Buffer> {
  const { PDFDocument: PDFLibDocument, rgb, StandardFonts } = await import(
    "pdf-lib"
  );
  const doc = await PDFLibDocument.load(unsignedPdf);
  if (doc.getPageCount() === 0) return unsignedPdf;
  const first = doc.getPage(0);
  const { width, height } = first.getSize();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  first.drawRectangle({
    x: 0,
    y: height - 28,
    width,
    height: 28,
    color: rgb(0.71, 0.33, 0.04),
  });
  first.drawText("NOT SIGNED — awaiting participant signature", {
    x: 40,
    y: height - 19,
    size: 11,
    font,
    color: rgb(1, 1, 1),
  });
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/** True if PNG looks like an empty white canvas (no real strokes). */
export async function signatureLooksBlank(png: Buffer): Promise<boolean> {
  try {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const total = info.width * info.height;
    if (total < 100) return true;
    let ink = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      if (a < 40) continue;
      // dark enough stroke
      if (r + g + b < 600) ink += 1;
    }
    // Require a minimal stroke (not just a tap)
    return ink < Math.max(80, total * 0.001);
  } catch {
    return png.length < 800;
  }
}
