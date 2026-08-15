import { z } from "zod";

export const studentFormSchema = z
  .object({
    first_name: z.string().trim().min(1, "required"),
    has_second_name: z.boolean(),
    second_name: z.string().trim().optional().nullable(),
    surname: z.string().trim().min(1, "required"),
    has_second_surname: z.boolean(),
    second_surname: z.string().trim().optional().nullable(),
    birth_date: z
      .string()
      .trim()
      .min(1, "required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "format"),
    nationality: z.string().trim().min(1, "required"),
    email: z
      .string()
      .trim()
      .min(1, "required")
      .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
        message: "format",
      }),
    phone: z.string().trim().min(5, "too_short"),
    document_type: z.enum(["id_card", "passport"], {
      error: "required",
    }),
    document_number: z.string().trim().min(1, "required"),
    document_country: z.string().trim().min(1, "required"),
  })
  .superRefine((data, ctx) => {
    if (data.has_second_name && !data.second_name?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["second_name"],
        message: "required",
      });
    }
    if (data.has_second_surname && !data.second_surname?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["second_surname"],
        message: "required",
      });
    }
  });

export type StudentFormInput = z.infer<typeof studentFormSchema>;

export const STUDENT_FIELD_LABELS: Record<string, string> = {
  first_name: "First name",
  second_name: "Second / middle name",
  surname: "Surname",
  second_surname: "Second surname",
  birth_date: "Birth date",
  nationality: "Nationality",
  email: "Email",
  phone: "Phone",
  document_number: "Document number",
  document_country: "Issuing country",
  document_type: "Document type",
};

/** What a correct value should look like — one field at a time. */
export const STUDENT_FIELD_EXPECTED: Record<string, string> = {
  first_name: "your first name as on the ID (not empty)",
  second_name: "your second / middle name (because the checkbox is on)",
  surname: "your surname as on the ID (not empty)",
  second_surname: "your second surname (because the checkbox is on)",
  birth_date: "YYYY-MM-DD from the day + month + year lists (e.g. 2005-08-15)",
  nationality: "a nationality (e.g. Italian, Czech, ITA)",
  email: "a full email like name@example.com",
  phone: "a phone number with at least 5 digits",
  document_number: "the document number from your ID/passport",
  document_country: "the country that issued the document",
  document_type: "either “ID card” or “Passport”",
};

function displayValue(value: unknown): string {
  if (value == null) return "(empty)";
  const s = String(value).trim();
  return s.length ? s : "(empty)";
}

/**
 * One field, one warning — always: THIS IS WRONG / you entered Y / expected X.
 */
export function formatFieldMistake(
  field: string,
  actual: unknown,
  _zodHint?: string,
): string {
  const label = STUDENT_FIELD_LABELS[field] || field;
  const expected =
    STUDENT_FIELD_EXPECTED[field] || "a valid value for this field";
  const got = displayValue(actual);
  return (
    `${label} — THIS IS WRONG\n` +
    `You entered: ${got}\n` +
    `Expected instead: ${expected}`
  );
}

/** Turn Zod flatten / API validation payload into per-field mistake lines. */
export function formatStudentValidationError(
  error: unknown,
  values?: Partial<Record<string, unknown>>,
): string {
  if (typeof error === "string" && error.trim()) {
    if (error.trimStart().startsWith("[")) {
      try {
        const issues = JSON.parse(error) as Array<{
          path?: (string | number)[];
          message?: string;
        }>;
        if (Array.isArray(issues) && issues.length) {
          const lines = issues.map((issue) => {
            const field = String(issue.path?.[0] ?? "");
            return formatFieldMistake(
              field || "form",
              values?.[field],
              issue.message,
            );
          });
          return lines.join("\n\n");
        }
      } catch {
        /* fall through */
      }
    }
    if (/did not match the expected pattern/i.test(error)) {
      return (
        "A field failed a format check — THIS IS WRONG\n" +
        "Open the red fields below; each one shows what you entered vs what is expected."
      );
    }
    return error;
  }
  if (!error || typeof error !== "object") {
    return "Could not save your application";
  }

  const payload = error as {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
  };
  const blocks: string[] = [];

  for (const msg of payload.formErrors || []) {
    if (msg) blocks.push(msg);
  }
  for (const [field, msgs] of Object.entries(payload.fieldErrors || {})) {
    if (msgs?.length) {
      blocks.push(formatFieldMistake(field, values?.[field], msgs[0]));
    }
  }

  if (blocks.length === 0) return "Could not save your application";
  return blocks.join("\n\n");
}
