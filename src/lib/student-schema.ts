import { z } from "zod";

export const studentFormSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required"),
    has_second_name: z.boolean(),
    second_name: z.string().trim().optional().nullable(),
    surname: z.string().trim().min(1, "Surname is required"),
    has_second_surname: z.boolean(),
    second_surname: z.string().trim().optional().nullable(),
    birth_date: z
      .string()
      .trim()
      .min(1, "Birth date is required — use the date picker")
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Birth date is invalid — use the date picker",
      ),
    nationality: z.string().trim().min(1, "Nationality is required"),
    email: z
      .string()
      .trim()
      .email("Enter a valid email (e.g. name@example.com)"),
    phone: z
      .string()
      .trim()
      .min(5, "Phone number is required (at least 5 digits)"),
    document_type: z.enum(["id_card", "passport"], {
      error: "Choose ID card or passport",
    }),
    document_number: z.string().trim().min(1, "Document number is required"),
    document_country: z
      .string()
      .trim()
      .min(1, "Issuing country is required"),
  })
  .superRefine((data, ctx) => {
    if (data.has_second_name && !data.second_name?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["second_name"],
        message: "Second name is required when checked",
      });
    }
    if (data.has_second_surname && !data.second_surname?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["second_surname"],
        message: "Second surname is required when checked",
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

/** Turn Zod flatten / API validation payload into readable lines. */
export function formatStudentValidationError(error: unknown): string {
  if (typeof error === "string" && error.trim()) {
    // Zod sometimes stringifies the whole issues array — unwrap if possible
    if (error.trimStart().startsWith("[")) {
      try {
        const issues = JSON.parse(error) as Array<{
          path?: (string | number)[];
          message?: string;
        }>;
        if (Array.isArray(issues) && issues.length) {
          const lines = issues.map((issue) => {
            const field = String(issue.path?.[0] ?? "");
            const label = STUDENT_FIELD_LABELS[field] || field || "Form";
            const msg = humanizeZodMessage(issue.message || "Invalid value");
            return `${label}: ${msg}`;
          });
          return `Please fix:\n${lines.join("\n")}`;
        }
      } catch {
        /* fall through */
      }
    }
    return humanizeZodMessage(error);
  }
  if (!error || typeof error !== "object") {
    return "Could not save your application";
  }

  const payload = error as {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
  };
  const lines: string[] = [];

  for (const msg of payload.formErrors || []) {
    if (msg) lines.push(humanizeZodMessage(msg));
  }
  for (const [field, msgs] of Object.entries(payload.fieldErrors || {})) {
    const label = STUDENT_FIELD_LABELS[field] || field;
    for (const msg of msgs || []) {
      if (msg) lines.push(`${label}: ${humanizeZodMessage(msg)}`);
    }
  }

  if (lines.length === 0) return "Could not save your application";
  return `Please fix:\n${lines.join("\n")}`;
}

function humanizeZodMessage(message: string): string {
  if (/match pattern|must match|invalid_format|Invalid string/i.test(message)) {
    return "This value is not in the right format — check the field highlighted below";
  }
  return message;
}
