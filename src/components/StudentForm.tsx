"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  formatStudentValidationError,
  STUDENT_FIELD_LABELS,
  studentFormSchema,
  type StudentFormInput,
} from "@/lib/student-schema";
import type { FieldMismatch, Student } from "@/lib/types";
import { ParticipantDocuments } from "@/components/ParticipantDocuments";
import { DocumentsToSignPreview } from "@/components/DocumentsToSignPreview";
import type { ProjectType } from "@/lib/project-packs";
import type { FieldErrors, FieldPath } from "react-hook-form";

type Props = {
  initial?: Student | null;
  projectId?: string;
  projectTitle?: string;
  projectType?: ProjectType;
};

function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return url;
}

export function StudentForm({
  initial,
  projectId,
  projectTitle,
  projectType = "youth_exchange",
}: Props) {
  const router = useRouter();
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(initial ?? null);
  const [mismatches, setMismatches] = useState<FieldMismatch[] | null>(
    initial?.id_mismatches ?? null,
  );
  const [matchOk, setMatchOk] = useState(
    initial?.id_verification_status === "matched",
  );

  const frontPreview = useObjectUrl(frontFile);
  const backPreview = useObjectUrl(backFile);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError: setFieldError,
    formState: { errors },
  } = useForm<StudentFormInput>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      first_name: initial?.first_name ?? "",
      has_second_name: initial?.has_second_name ?? false,
      second_name: initial?.second_name ?? "",
      surname: initial?.surname ?? "",
      has_second_surname: initial?.has_second_surname ?? false,
      second_surname: initial?.second_surname ?? "",
      birth_date: initial?.birth_date ?? "",
      nationality: initial?.nationality ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      document_type: initial?.document_type ?? "id_card",
      document_number: initial?.document_number ?? "",
      document_country: initial?.document_country ?? "",
    },
  });

  const hasSecondName = watch("has_second_name");
  const hasSecondSurname = watch("has_second_surname");
  const documentType = watch("document_type");
  const birthDate = watch("birth_date");

  useEffect(() => {
    if (!hasSecondName) setValue("second_name", "");
  }, [hasSecondName, setValue]);

  useEffect(() => {
    if (!hasSecondSurname) setValue("second_surname", "");
  }, [hasSecondSurname, setValue]);

  async function verify(studentId: string, force = false) {
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/verify-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, force }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : formatStudentValidationError(json.error) || "Verification failed",
        );
      }
      if (json.student) setStudent(json.student);
      if (json.status === "matched") {
        setMismatches([]);
        setMatchOk(true);
      } else {
        setMatchOk(false);
        setMismatches(json.mismatches || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
      setMatchOk(false);
    } finally {
      setVerifying(false);
    }
  }

  async function onSubmit(data: StudentFormInput) {
    setSubmitting(true);
    setError(null);
    setMatchOk(false);
    try {
      if (!student && !projectId) {
        throw new Error("Missing project — use your invite link");
      }
      if (!student && !frontFile) {
        throw new Error("Please upload the front of your ID");
      }
      if (
        data.document_type === "id_card" &&
        !student?.id_back_path &&
        !backFile
      ) {
        throw new Error("Please upload the back of your ID card");
      }

      const form = new FormData();
      form.set(
        "data",
        JSON.stringify(student ? data : { ...data, project_id: projectId }),
      );
      if (frontFile) form.set("id_front", frontFile);
      if (backFile) form.set("id_back", backFile);

      const url = student ? `/api/students/${student.id}` : "/api/students";
      const method = student ? "PUT" : "POST";
      const res = await fetch(url, { method, body: form });
      const json = await res.json();
      if (!res.ok) {
        applyServerFieldErrors(json.error);
        throw new Error(formatStudentValidationError(json.error));
      }

      setStudent(json.student);
      if (!student) {
        router.replace(`/apply/student/${json.student.id}`);
      }
      await verify(json.student.id, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  function applyServerFieldErrors(error: unknown) {
    if (!error || typeof error !== "object") return;
    const fieldErrors = (
      error as { fieldErrors?: Record<string, string[] | undefined> }
    ).fieldErrors;
    if (!fieldErrors) return;
    for (const [field, msgs] of Object.entries(fieldErrors)) {
      const message = msgs?.[0];
      if (!message) continue;
      setFieldError(field as FieldPath<StudentFormInput>, {
        type: "server",
        message,
      });
    }
    const first = Object.keys(fieldErrors)[0];
    if (first) scrollToField(first);
  }

  function onInvalid(errs: FieldErrors<StudentFormInput>) {
    const lines: string[] = [];
    for (const [field, err] of Object.entries(errs)) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String(err.message || "")
          : "";
      if (!message) continue;
      const label = STUDENT_FIELD_LABELS[field] || field;
      lines.push(
        `${label}: ${
          /match pattern|must match|Invalid string/i.test(message)
            ? "this value is not in the right format"
            : message
        }`,
      );
    }
    setError(
      lines.length
        ? `Please fix:\n${lines.join("\n")}`
        : "Please fix the highlighted fields below",
    );
    const first = Object.keys(errs)[0];
    if (first) scrollToField(first);
  }

  function scrollToField(field: string) {
    const el = document.querySelector<HTMLElement>(
      `input[name="${field}"], select[name="${field}"]`,
    );
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function dismissMismatch() {
    if (!student) return;
    const res = await fetch("/api/verify-id/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id }),
    });
    const json = await res.json();
    if (res.ok) {
      setStudent(json.student);
      setMismatches(null);
      setMatchOk(true);
    }
  }

  const verified =
    matchOk ||
    student?.id_verification_status === "matched" ||
    student?.id_verification_status === "mismatch_dismissed";

  const frontSrc =
    frontPreview ||
    (student?.id_front_path
      ? `/api/students/${student.id}/files/front`
      : null);
  const backSrc =
    backPreview ||
    (student?.id_back_path
      ? `/api/students/${student.id}/files/back`
      : null);

  return (
    <div className="space-y-8">
      {projectTitle && (
        <p className="rounded-2xl border border-[var(--line)] bg-[var(--sky)]/40 px-4 py-3 text-sm text-[var(--navy)]">
          Applying for <strong>{projectTitle}</strong>
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[var(--navy)]">
            Personal details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.first_name?.message}>
              <input className="input" {...register("first_name")} />
            </Field>
            <Field label="Surname" error={errors.surname?.message}>
              <input className="input" {...register("surname")} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("has_second_name")} />
            I have a second / middle name
          </label>
          {hasSecondName && (
            <Field label="Second name" error={errors.second_name?.message}>
              <input className="input" {...register("second_name")} />
            </Field>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("has_second_surname")} />
            I have a second surname
          </label>
          {hasSecondSurname && (
            <Field
              label="Second surname"
              error={errors.second_surname?.message}
            >
              <input className="input" {...register("second_surname")} />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Birth date" error={errors.birth_date?.message}>
              <input
                type="date"
                className="input"
                {...register("birth_date")}
              />
            </Field>
            <Field label="Nationality" error={errors.nationality?.message}>
              <input className="input" {...register("nationality")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input type="email" className="input" {...register("email")} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input className="input" {...register("phone")} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[var(--navy)]">
            Identity document
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Document type" error={errors.document_type?.message}>
              <select className="input" {...register("document_type")}>
                <option value="id_card">ID card</option>
                <option value="passport">Passport</option>
              </select>
            </Field>
            <Field
              label="Document number"
              error={errors.document_number?.message}
            >
              <input className="input" {...register("document_number")} />
            </Field>
            <Field
              label="Issuing country"
              error={errors.document_country?.message}
            >
              <input className="input" {...register("document_country")} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={
                student?.id_front_path
                  ? "ID front (upload to replace)"
                  : "ID front photo"
              }
            >
              <input
                type="file"
                accept="image/*"
                className="input"
                onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            {(documentType === "id_card" || student?.id_back_path) && (
              <Field
                label={
                  student?.id_back_path
                    ? "ID back (upload to replace)"
                    : "ID back photo"
                }
              >
                <input
                  type="file"
                  accept="image/*"
                  className="input"
                  onChange={(e) => setBackFile(e.target.files?.[0] ?? null)}
                />
              </Field>
            )}
          </div>

          {(frontSrc || backSrc) && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--navy)]">
                Check your upload — make sure the photo is clear and readable
              </p>
              <div className="grid gap-4">
                {frontSrc && (
                  <figure className="space-y-2">
                    <figcaption className="text-xs font-semibold uppercase tracking-wide text-[var(--mint-text)]">
                      Front
                    </figcaption>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frontSrc}
                      alt="ID front preview"
                      className="max-h-[min(70vh,520px)] w-full rounded-2xl border border-[var(--line)] bg-black/5 object-contain"
                    />
                  </figure>
                )}
                {backSrc && (
                  <figure className="space-y-2">
                    <figcaption className="text-xs font-semibold uppercase tracking-wide text-[var(--mint-text)]">
                      Back
                    </figcaption>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={backSrc}
                      alt="ID back preview"
                      className="max-h-[min(70vh,520px)] w-full rounded-2xl border border-[var(--line)] bg-black/5 object-contain"
                    />
                  </figure>
                )}
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-3 text-sm text-red-800 whitespace-pre-line">
            {error}
          </div>
        )}

        <DocumentsToSignPreview
          projectType={projectType}
          birthDate={birthDate}
          needsTravelDeclaration={student?.needs_travel_declaration ?? false}
        />

        <button
          type="submit"
          disabled={submitting || verifying}
          className="btn-primary"
        >
          {submitting || verifying
            ? "Saving & verifying…"
            : student
              ? "Update & re-verify ID"
              : "Submit & verify ID"}
        </button>
      </form>

      {matchOk && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Your details match the ID document. Please sign the documents below.
        </div>
      )}

      {mismatches && mismatches.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-5 text-sm text-amber-950">
          <div>
            <p className="text-base font-bold text-[var(--navy)]">
              We found {mismatches.length} difference
              {mismatches.length === 1 ? "" : "s"} between your form and the ID
            </p>
            <p className="mt-1 text-[var(--mint-text)]">
              Fix the form fields below, or ignore and continue if the ID photo
              is correct and the automatic reading is wrong.
            </p>
          </div>

          <ul className="space-y-3">
            {mismatches.map((m) => {
              const label = STUDENT_FIELD_LABELS[m.field] || m.field;
              return (
                <li
                  key={m.field}
                  className="rounded-xl border border-amber-200 bg-white/80 px-4 py-3"
                >
                  <p className="font-semibold text-[var(--navy)]">
                    Field: {label}
                  </p>
                  <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    <p>
                      <span className="text-[var(--muted)]">
                        You entered:{" "}
                      </span>
                      <span className="font-medium">
                        {m.formValue || "(empty)"}
                      </span>
                    </p>
                    <p>
                      <span className="text-[var(--muted)]">
                        Document says:{" "}
                      </span>
                      <span className="font-medium text-amber-900">
                        {m.idValue || "(not readable)"}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const first = mismatches[0]?.field;
                const el = first
                  ? document.querySelector<HTMLInputElement>(
                      `input[name="${first}"], select[name="${first}"]`,
                    )
                  : null;
                el?.focus();
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              Correct my data
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={dismissMismatch}
            >
              Ignore and continue anyway
            </button>
          </div>
        </div>
      )}

      {student?.id_verification_status === "mismatch_dismissed" && (
        <p className="text-sm text-[var(--muted)]">
          You chose to ignore the differences. You can still sign your documents
          below; an administrator can review the ID vs your data.
        </p>
      )}

      {student && (
        <ParticipantDocuments
          key={`${student.id}-${student.id_verification_status}-${matchOk}`}
          student={student}
          unlocked={!!verified}
        />
      )}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-[var(--navy)]">{label}</span>
      <div
        className={
          error
            ? "[&_input]:border-red-500 [&_select]:border-red-500 [&_input]:ring-1 [&_input]:ring-red-400 [&_select]:ring-1 [&_select]:ring-red-400"
            : undefined
        }
      >
        {children}
      </div>
      {error && (
        <span className="block text-xs font-medium text-red-600">{error}</span>
      )}
    </label>
  );
}
