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
