import { z } from "zod";
import { studentFormSchema, type StudentFormInput } from "./student-schema";
import { normalizeEmail, normalizePhone } from "./ios-form";

export type ExtraFieldType = "text" | "textarea" | "select" | "checkbox";

export type ExtraFormField = {
  id: string;
  label: string;
  type: ExtraFieldType;
  required: boolean;
  options?: string[];
};

export type ProjectFormConfig = {
  hiddenOptional: string[];
  extraFields: ExtraFormField[];
};

/** Fields admins may hide on the registration form. */
export const HIDEABLE_OPTIONAL_FIELDS = [
  { id: "second_name", label: "Second / middle name" },
  { id: "second_surname", label: "Second surname" },
  { id: "phone", label: "Phone" },
  { id: "document_country", label: "Issuing country" },
] as const;

export const CORE_LOCKED_FIELDS = [
  { id: "first_name", label: "First name" },
  { id: "surname", label: "Surname" },
  { id: "birth_date", label: "Birth date" },
  { id: "nationality", label: "Nationality" },
  { id: "email", label: "Email" },
  { id: "document_type", label: "Document type" },
  { id: "document_number", label: "Document number" },
] as const;

export const DEFAULT_FORM_CONFIG: ProjectFormConfig = {
  hiddenOptional: [],
  extraFields: [],
};

export function normalizeFormConfig(raw: unknown): ProjectFormConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FORM_CONFIG };
  const obj = raw as Record<string, unknown>;
  const hidden = Array.isArray(obj.hiddenOptional)
    ? obj.hiddenOptional.filter((x): x is string => typeof x === "string")
    : [];
  const allowed = new Set(HIDEABLE_OPTIONAL_FIELDS.map((f) => f.id));
  const extraFields: ExtraFormField[] = [];
  if (Array.isArray(obj.extraFields)) {
    for (const item of obj.extraFields) {
      if (!item || typeof item !== "object") continue;
      const f = item as Record<string, unknown>;
      const id = String(f.id || "").trim();
      const label = String(f.label || "").trim();
      const type = String(f.type || "text") as ExtraFieldType;
      if (!id || !label) continue;
      if (!["text", "textarea", "select", "checkbox"].includes(type)) continue;
      extraFields.push({
        id,
        label,
        type,
        required: Boolean(f.required),
        options: Array.isArray(f.options)
          ? f.options.map((o) => String(o)).filter(Boolean)
          : undefined,
      });
    }
  }
  return {
    hiddenOptional: hidden.filter((h) => allowed.has(h as never)),
    extraFields,
  };
}

export function isOptionalHidden(
  config: ProjectFormConfig,
  fieldId: string,
): boolean {
  return config.hiddenOptional.includes(fieldId);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Registration schema respecting hidden optionals + custom answers. */
export function buildRegistrationSchema(config: ProjectFormConfig) {
  const hidePhone = isOptionalHidden(config, "phone");
  const hideCountry = isOptionalHidden(config, "document_country");
  const hideSecond = isOptionalHidden(config, "second_name");
  const hideSecondSur = isOptionalHidden(config, "second_surname");

  const base = z.object({
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
      .transform((v) => normalizeEmail(v))
      .pipe(
        z
          .string()
          .min(1, "required")
          .refine((v) => EMAIL_RE.test(v), { message: "format" }),
      ),
    phone: hidePhone
      ? z
          .string()
          .transform((v) => normalizePhone(v || ""))
          .pipe(z.string())
      : z
          .string()
          .transform((v) => normalizePhone(v))
          .pipe(z.string().trim().min(5, "too_short")),
    document_type: z.enum(["id_card", "passport"], { error: "required" }),
    document_number: z.string().trim().min(1, "required"),
    document_country: hideCountry
      ? z.string().trim().optional().nullable()
      : z.string().trim().min(1, "required"),
    custom_answers: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  });

  return base.superRefine((data, ctx) => {
    if (!hideSecond && data.has_second_name && !data.second_name?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["second_name"],
        message: "required",
      });
    }
    if (
      !hideSecondSur &&
      data.has_second_surname &&
      !data.second_surname?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["second_surname"],
        message: "required",
      });
    }
    for (const field of config.extraFields) {
      const val = data.custom_answers?.[field.id];
      if (!field.required) continue;
      if (field.type === "checkbox") {
        if (val !== true) {
          ctx.addIssue({
            code: "custom",
            path: ["custom_answers", field.id],
            message: "required",
          });
        }
      } else if (val == null || String(val).trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: ["custom_answers", field.id],
          message: "required",
        });
      }
    }
  });
}

export type RegistrationFormInput = z.infer<
  ReturnType<typeof buildRegistrationSchema>
>;

export function toStudentFormInput(
  data: RegistrationFormInput,
  config: ProjectFormConfig,
): StudentFormInput {
  const hidePhone = isOptionalHidden(config, "phone");
  const hideCountry = isOptionalHidden(config, "document_country");
  const hideSecond = isOptionalHidden(config, "second_name");
  const hideSecondSur = isOptionalHidden(config, "second_surname");
  return studentFormSchema.parse({
    first_name: data.first_name,
    has_second_name: hideSecond ? false : data.has_second_name,
    second_name: hideSecond ? null : data.second_name,
    surname: data.surname,
    has_second_surname: hideSecondSur ? false : data.has_second_surname,
    second_surname: hideSecondSur ? null : data.second_surname,
    birth_date: data.birth_date,
    nationality: data.nationality,
    email: data.email,
    phone: hidePhone ? data.phone || "n/a" : data.phone,
    document_type: data.document_type,
    document_number: data.document_number,
    document_country: hideCountry
      ? data.document_country?.trim() || "n/a"
      : data.document_country,
  });
}

export function normalizeDocumentNumber(raw: string): string {
  return raw.normalize("NFKC").replace(/\s+/g, "").toUpperCase();
}
