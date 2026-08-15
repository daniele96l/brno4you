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
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    nationality: z.string().trim().min(1, "Nationality is required"),
    email: z.string().trim().email("Valid email required"),
    phone: z.string().trim().min(5, "Phone is required"),
    document_type: z.enum(["id_card", "passport"]),
    document_number: z.string().trim().min(1, "Document number is required"),
    document_country: z.string().trim().min(1, "Document country is required"),
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
