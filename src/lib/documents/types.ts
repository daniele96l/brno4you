import type { Student } from "../types";

export type GenContext = {
  generatedAt: string;
};

export type DocumentTemplate = {
  id: string;
  label: string;
  generate: (
    student: Student,
    ctx: GenContext,
  ) => Promise<{ buffer: Buffer; filename: string; mime: string }>;
};
