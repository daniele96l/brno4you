import {
  DOMParser,
  XMLSerializer,
  type Document,
  type Element,
} from "@xmldom/xmldom";
import { readFile } from "fs/promises";
import path from "path";
import JSZip from "jszip";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

export type DocxFillData = {
  project_name?: string;
  accreditation_no?: string;
  project_no?: string;
  project_period?: string;
  dates?: string;
  venue?: string;
  coordinator_name?: string;
  coordinator_email?: string;
  coordinator_phone?: string;
  full_name?: string;
  birth_date?: string;
  nationality?: string;
  phone?: string;
  email?: string;
  partner_name?: string;
  partner_oid?: string;
  partner_national_id?: string;
  partner_address?: string;
  partner_legal_representative?: string;
  partner_coordinator_name?: string;
  partner_email?: string;
  partner_phone?: string;
  partner_country?: string;
  sending_organisation?: string;
};

const PROJECT_LABELS: Record<string, keyof DocxFillData> = {
  "project name": "project_name",
  "accreditation no.": "accreditation_no",
  "accreditation no": "accreditation_no",
  "project no.": "project_no",
  "project no": "project_no",
  "project period": "project_period",
  "dates (including travel days)": "dates",
  "venue (place, country)": "venue",
  "sending organisation, country": "sending_organisation",
};

const COORDINATOR_LABELS: Record<string, keyof DocxFillData> = {
  "project coordinator / contact person": "coordinator_name",
  email: "coordinator_email",
  phone: "coordinator_phone",
};

const PARTNER_LABELS: Record<string, keyof DocxFillData> = {
  name: "partner_name",
  oid: "partner_oid",
  "national id / in": "partner_national_id",
  "national id, if applicable": "partner_national_id",
  address: "partner_address",
  "legal representative": "partner_legal_representative",
  "project coordinator / contact person": "partner_coordinator_name",
  email: "partner_email",
  phone: "partner_phone",
};

function localName(tag: string) {
  const i = tag.indexOf("}");
  return i >= 0 ? tag.slice(i + 1) : tag.replace(/^w:/, "");
}

function textOf(el: Element): string {
  const byNs = el.getElementsByTagNameNS(W_NS, "t");
  const nodes: Element[] =
    byNs.length > 0
      ? Array.from(byNs)
      : Array.from(el.getElementsByTagName("w:t") as unknown as Element[]);
  let out = "";
  for (const node of nodes) {
    out += node.textContent || "";
  }
  return out;
}

function setElementText(el: Element, value: string, doc: Document) {
  const texts = Array.from(el.getElementsByTagNameNS(W_NS, "t"));
  // also try without NS (xmldom quirks)
  const texts2 =
    texts.length > 0
      ? texts
      : Array.from(el.getElementsByTagName("w:t") as unknown as Element[]);
  const list = texts2.length ? texts2 : texts;
  if (!list.length) {
    let p: Element | null = null;
    const ps = el.getElementsByTagNameNS(W_NS, "p");
    p = (ps[0] as Element) || null;
    if (!p) {
      p = doc.createElementNS(W_NS, "w:p");
      el.appendChild(p);
    }
    const r = doc.createElementNS(W_NS, "w:r");
    const t = doc.createElementNS(W_NS, "w:t");
    t.setAttribute("xml:space", "preserve");
    t.textContent = value;
    r.appendChild(t);
    p.appendChild(r);
    return;
  }
  list[0]!.textContent = value;
  list[0]!.setAttribute("xml:space", "preserve");
  for (let i = 1; i < list.length; i++) list[i]!.textContent = "";
}

function rowCells(row: Element): Element[] {
  const out: Element[] = [];
  const children = row.childNodes;
  for (let i = 0; i < children.length; i++) {
    const c = children[i]!;
    if (c.nodeType === 1 && localName((c as Element).tagName) === "tc") {
      out.push(c as Element);
    }
  }
  return out;
}

function fillTableByLabels(
  table: Element,
  labels: Record<string, keyof DocxFillData>,
  data: DocxFillData,
  doc: Document,
) {
  const rows = Array.from(table.getElementsByTagNameNS(W_NS, "tr"));
  const rows2 =
    rows.length > 0
      ? rows
      : Array.from(table.getElementsByTagName("w:tr") as unknown as Element[]);
  for (const row of rows2) {
    const cells = rowCells(row);
    if (cells.length < 2) continue;
    const label = textOf(cells[0]!).trim().toLowerCase().replace(/\s+/g, " ");
    const key = labels[label];
    if (!key) continue;
    const value = data[key];
    if (value == null || value === "") continue;
    setElementText(cells[1]!, value, doc);
  }
}

function tableFirstLabel(table: Element): string {
  const rows = Array.from(table.getElementsByTagNameNS(W_NS, "tr"));
  const row =
    rows[0] ||
    (table.getElementsByTagName("w:tr")[0] as Element | undefined);
  if (!row) return "";
  const cells = rowCells(row);
  if (!cells[0]) return "";
  return textOf(cells[0]).trim().toLowerCase().replace(/\s+/g, " ");
}

function secondCellText(table: Element): string {
  const rows = Array.from(table.getElementsByTagNameNS(W_NS, "tr"));
  const row = rows[0];
  if (!row) return "";
  const cells = rowCells(row);
  if (!cells[1]) return "";
  return textOf(cells[1]).trim();
}

function replaceInParagraph(p: Element, data: DocxFillData) {
  const original = textOf(p);
  if (!original.trim()) return;

  let next = original;

  if (
    /\(participants?\s+name\s+and\s+surname\)/i.test(next) ||
    /\(Participant name and surname\)/i.test(next)
  ) {
    const name = data.full_name || "____________________";
    const birth = data.birth_date || "__________";
    next = next
      .replace(/\(participants?\s+name\s+and\s+surname\)/gi, name)
      .replace(/\(Participant name and surname\)/gi, name);
    if (/Date of birth:/i.test(next)) {
      next = next.replace(
        /Date of birth:\s*/i,
        ` Date of birth: ${birth} `,
      );
    }
    next = next.replace(/,\s*/g, ", ").replace(/\s{2,}/g, " ").trim();
    // keep "I, Name Date of birth: …"
    next = next.replace(/^I,\s*/i, "I, ");
  }

  if (/^Name and surname:\s*_*/i.test(next) && data.full_name) {
    next = `Name and surname: ${data.full_name}`;
  }
  if (/^Date of birth:\s*_*/i.test(next) && data.birth_date) {
    next = `Date of birth: ${data.birth_date}`;
  }
  if (/^Country:\s*_*/i.test(next) && data.nationality) {
    next = `Country: ${data.nationality}`;
  }
  if (/^Phone number:\s*_*/i.test(next) && data.phone) {
    next = `Phone number: ${data.phone}`;
  }
  if (/^E-mail:\s*_*/i.test(next) && data.email) {
    next = `E-mail: ${data.email}`;
  }
  if (
    /^Name and surname of child \/ participant:/i.test(next) &&
    data.full_name
  ) {
    const birth = data.birth_date || "";
    next = `Name and surname of child / participant: ${data.full_name}          Date of birth: ${birth}`;
  }

  if (next === original) return;

  const texts = Array.from(p.getElementsByTagNameNS(W_NS, "t"));
  const list =
    texts.length > 0
      ? texts
      : Array.from(p.getElementsByTagName("w:t") as unknown as Element[]);
  if (!list.length) return;
  list[0]!.textContent = next;
  list[0]!.setAttribute("xml:space", "preserve");
  for (let i = 1; i < list.length; i++) list[i]!.textContent = "";
}

function fillUnderscoreLineAfterDeclaration(
  paragraphs: Element[],
  data: DocxFillData,
) {
  for (let i = 0; i < paragraphs.length - 1; i++) {
    const t = textOf(paragraphs[i]!);
    if (
      !/\(participants?\s+name/i.test(t) &&
      !/\(Participant name/i.test(t) &&
      !/Name and surname of child/i.test(t)
    ) {
      continue;
    }
    const next = paragraphs[i + 1]!;
    const nt = textOf(next).trim();
    if (!nt.startsWith("_")) continue;
    const name = data.full_name || "";
    const birth = data.birth_date || "";
    if (!name && !birth) continue;
    const filled = `${name}                ${birth}`.trim();
    const texts = Array.from(next.getElementsByTagNameNS(W_NS, "t"));
    const list =
      texts.length > 0
        ? texts
        : Array.from(next.getElementsByTagName("w:t") as unknown as Element[]);
    if (!list[0]) continue;
    list[0].textContent = filled;
    list[0].setAttribute("xml:space", "preserve");
    for (let j = 1; j < list.length; j++) list[j]!.textContent = "";
  }
}

export async function fillDocxTemplate(
  templateBuffer: Buffer,
  data: DocxFillData,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const xmlPath = "word/document.xml";
  const xml = await zip.file(xmlPath)?.async("string");
  if (!xml) throw new Error("Invalid DOCX: missing document.xml");

  const dom = new DOMParser().parseFromString(xml, "application/xml");
  const tables = Array.from(dom.getElementsByTagNameNS(W_NS, "tbl"));
  const tables2 =
    tables.length > 0
      ? tables
      : Array.from(dom.getElementsByTagName("w:tbl") as unknown as Element[]);

  for (const table of tables2) {
    const label = tableFirstLabel(table);
    if (label === "project name") {
      fillTableByLabels(table, PROJECT_LABELS, data, dom);
      continue;
    }
    if (label === "name") {
      const existing = secondCellText(table);
      if (!existing) {
        fillTableByLabels(table, PARTNER_LABELS, data, dom);
      } else {
        fillTableByLabels(table, COORDINATOR_LABELS, data, dom);
      }
    }
  }

  const paragraphs = Array.from(dom.getElementsByTagNameNS(W_NS, "p"));
  const paragraphs2 =
    paragraphs.length > 0
      ? paragraphs
      : Array.from(dom.getElementsByTagName("w:p") as unknown as Element[]);
  for (const p of paragraphs2) replaceInParagraph(p, data);
  fillUnderscoreLineAfterDeclaration(paragraphs2, data);

  const outXml = new XMLSerializer().serializeToString(dom);
  zip.file(xmlPath, outXml);
  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  return Buffer.from(out);
}

export async function loadDocxTemplateFile(
  templateId: string,
): Promise<Buffer | null> {
  const filePath = path.join(
    process.cwd(),
    "content/doc-templates/docx",
    `${templateId}.docx`,
  );
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}
