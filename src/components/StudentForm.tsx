"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  studentFormSchema,
  type StudentFormInput,
} from "@/lib/student-schema";
import type { FieldMismatch, Student } from "@/lib/types";
import { ParticipantDocuments } from "@/components/ParticipantDocuments";

type Props = {
  initial?: Student | null;
  projectId?: string;
  projectTitle?: string;
};

export function StudentForm({ initial, projectId, projectTitle }: Props) {
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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
      if (!res.ok) throw new Error(json.error || "Verification failed");
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
      if (data.document_type === "id_card" && !student?.id_back_path && !backFile) {
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
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Could not save your application",
        );
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

  return (
    <div className="space-y-8">
      {projectTitle && (
        <p className="rounded-2xl border border-[var(--line)] bg-[var(--sky)]/40 px-4 py-3 text-sm text-[var(--navy)]">
          Applying for <strong>{projectTitle}</strong>
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[var(--navy)]">Personal details</h2>
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
            <Field label="Second surname" error={errors.second_surname?.message}>
              <input className="input" {...register("second_surname")} />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Birth date" error={errors.birth_date?.message}>
              <input type="date" className="input" {...register("birth_date")} />
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
          <h2 className="text-lg font-bold text-[var(--navy)]">Identity document</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Document type" error={errors.document_type?.message}>
              <select className="input" {...register("document_type")}>
                <option value="id_card">ID card</option>
                <option value="passport">Passport</option>
              </select>
            </Field>
            <Field label="Document number" error={errors.document_number?.message}>
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
        </section>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || verifying}
          className="btn-primary"
        >
          {submitting || verifying
            ? "Saving & verifying…"
            : student
              ? "Update & re-verify"
              : "Submit & verify ID"}
        </button>
      </form>

      {matchOk && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Your details match the ID document. Please sign the documents below.
        </div>
      )}

      {mismatches && mismatches.length > 0 && (
        <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-medium">
            Some fields do not match what we read on your ID. Please correct them
            or dismiss if the reading looks wrong.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {mismatches.map((m) => (
              <li key={m.field}>
                <span className="font-medium">{m.field}</span>: you entered “
                {m.formValue}”, ID shows “{m.idValue}”
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                document.querySelector<HTMLInputElement>('input[name="first_name"]')?.focus()
              }
            >
              Correct data
            </button>
            <button type="button" className="btn-secondary" onClick={dismissMismatch}>
              Dismiss and continue
            </button>
          </div>
        </div>
      )}

      {student?.id_verification_status === "mismatch_dismissed" && (
        <p className="text-sm text-[var(--muted)]">
          Mismatch dismissed. You can still sign your documents below; an
          administrator can review the ID vs your data.
        </p>
      )}

      {student && (
        <ParticipantDocuments student={student} unlocked={!!verified} />
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
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}
