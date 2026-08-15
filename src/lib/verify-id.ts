import OpenAI from "openai";
import sharp from "sharp";
import type { ExtractedIdData, FieldMismatch, Student } from "./types";
import { valuesMatch } from "./normalize";

/** Minimum OCR fields that must be present and agree before status is matched. */
export const MIN_ID_FIELD_AGREEMENTS = 3;

/** Below this, extraction is too unreliable to accept as matched. */
export const MIN_ID_OCR_CONFIDENCE = 0.5;

async function downscale(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .rotate()
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

function toDataUrl(buf: Buffer) {
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

function usable(value: string | null | undefined): boolean {
  return Boolean(value && String(value).trim());
}

export async function extractIdData(
  front: Buffer,
  back?: Buffer | null,
): Promise<ExtractedIdData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });
  const frontSmall = await downscale(front);
  const images: OpenAI.Chat.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `Extract identity document fields as JSON only. Keys: first_name, second_name, surname, second_surname, birth_date (YYYY-MM-DD), nationality, document_country, document_number, document_type (id_card|passport), confidence (0-1). Use null for missing fields. Do not invent values. If the image is not a readable ID/passport, set confidence low and leave fields null.`,
    },
    { type: "image_url", image_url: { url: toDataUrl(frontSmall), detail: "low" } },
  ];

  if (back) {
    const backSmall = await downscale(back);
    images.push({
      type: "image_url",
      image_url: { url: toDataUrl(backSmall), detail: "low" },
    });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content:
          "You read ID cards and passports. Return compact JSON only. Prefer Latin transliteration of names when scripts differ.",
      },
      { role: "user", content: images },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  return JSON.parse(raw) as ExtractedIdData;
}

type FieldCheck = {
  field: string;
  formValue: string;
  idValue: string | null | undefined;
  kind?: "text" | "date" | "country";
  skip?: boolean;
};

function buildChecks(
  student: Student,
  extracted: ExtractedIdData,
): FieldCheck[] {
  return [
    { field: "first_name", formValue: student.first_name, idValue: extracted.first_name },
    {
      field: "second_name",
      formValue: student.second_name || "",
      idValue: extracted.second_name,
      skip: !student.has_second_name && !extracted.second_name,
    },
    { field: "surname", formValue: student.surname, idValue: extracted.surname },
    {
      field: "second_surname",
      formValue: student.second_surname || "",
      idValue: extracted.second_surname,
      skip: !student.has_second_surname && !extracted.second_surname,
    },
    {
      field: "birth_date",
      formValue: student.birth_date,
      idValue: extracted.birth_date,
      kind: "date",
    },
    {
      field: "document_number",
      formValue: student.document_number,
      idValue: extracted.document_number,
    },
    {
      field: "nationality",
      formValue: student.nationality,
      idValue: extracted.nationality || extracted.document_country,
      kind: "country",
    },
    {
      field: "document_country",
      formValue: student.document_country,
      idValue: extracted.document_country || extracted.nationality,
      kind: "country",
      skip: !student.document_country?.trim(),
    },
  ];
}

export function compareStudentToExtracted(
  student: Student,
  extracted: ExtractedIdData,
): FieldMismatch[] {
  const mismatches: FieldMismatch[] = [];
  for (const c of buildChecks(student, extracted)) {
    if (c.skip) continue;
    // Missing OCR does not count as agreement — surface as mismatch when form has a value.
    if (!usable(c.idValue)) {
      if (usable(c.formValue)) {
        mismatches.push({
          field: c.field,
          formValue: c.formValue,
          idValue: "",
        });
      }
      continue;
    }
    if (!valuesMatch(c.formValue, c.idValue, c.kind || "text")) {
      mismatches.push({
        field: c.field,
        formValue: c.formValue,
        idValue: String(c.idValue),
      });
    }
  }
  return mismatches;
}

/** How many fields have usable values on both sides and actually agree. */
export function countAgreeingFields(
  student: Student,
  extracted: ExtractedIdData,
): number {
  let n = 0;
  for (const c of buildChecks(student, extracted)) {
    if (c.skip) continue;
    if (!usable(c.formValue) || !usable(c.idValue)) continue;
    if (valuesMatch(c.formValue, c.idValue, c.kind || "text")) n += 1;
  }
  return n;
}

/**
 * True only when OCR is usable, confidence is acceptable, enough fields agree,
 * and there are no field mismatches. Empty/failed OCR never matches.
 */
export function isIdVerificationMatched(
  student: Student,
  extracted: ExtractedIdData,
  mismatches: FieldMismatch[],
): boolean {
  if (mismatches.length > 0) return false;
  const conf = extracted.confidence;
  if (typeof conf === "number" && conf < MIN_ID_OCR_CONFIDENCE) return false;
  return countAgreeingFields(student, extracted) >= MIN_ID_FIELD_AGREEMENTS;
}
