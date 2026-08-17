import mammoth from "mammoth";

/** Convert a filled DOCX to PDF, preferring Chrome print for layout fidelity. */
export async function docxBufferToPdf(docx: Buffer): Promise<Buffer> {
  const { value: bodyHtml } = await mammoth.convertToHtml({ buffer: docx });
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 18mm 16mm; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #111;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 10px 0 14px;
    }
    td, th {
      border: 1px solid #222;
      padding: 5px 8px;
      vertical-align: top;
    }
    img { max-width: 100%; height: auto; }
    p { margin: 0 0 0.55em; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;

  try {
    return await htmlToPdfWithChrome(html);
  } catch {
    return htmlToPdfFallback(bodyHtml);
  }
}

async function resolveChrome(): Promise<{
  executablePath: string;
  args: string[];
}> {
  const envPath =
    process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath) {
    return { executablePath: envPath, args: ["--no-sandbox"] };
  }
  const mac =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  try {
    const { access } = await import("fs/promises");
    await access(mac);
    return { executablePath: mac, args: ["--no-sandbox"] };
  } catch {
    // Vercel / Linux serverless
    const chromium = await import("@sparticuz/chromium");
    return {
      executablePath: await chromium.default.executablePath(),
      args: chromium.default.args,
    };
  }
}

async function htmlToPdfWithChrome(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer-core");
  const { executablePath, args } = await resolveChrome();
  const browser = await puppeteer.default.launch({
    executablePath,
    headless: true,
    args: [...args, "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function htmlToPdfFallback(bodyHtml: string): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const text = bodyHtml
    .replace(/<\/(p|tr|div|h\d)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font("Times-Roman").fontSize(10);
    for (const line of text.split("\n")) {
      doc.text(line || " ", { width: 495, lineGap: 2 });
    }
    doc.end();
  });
}
