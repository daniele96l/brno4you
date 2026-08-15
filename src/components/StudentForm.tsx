"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { explainApiError } from "@/lib/api-error";
import {
  normalizeEmail,
  normalizeImageFile,
  normalizePhone,
  readInputValue,
  readSelectById,
} from "@/lib/ios-form";
import { normalizeDate } from "@/lib/normalize";
import {
  formatFieldMistake,
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

/** Map raw/API errors — never a vague “check email/phone/uploads” blob. */
function showFormError(raw: unknown, fallback: string): string {
  if (raw == null || raw === "") return fallback;
  if (typeof raw === "object") {
    return formatStudentValidationError(raw) || fallback;
  }
  const text = raw instanceof Error ? raw.message : String(raw);
  if (text.includes("You entered:") || text.includes("Expected instead:")) {
    return text;
  }
  return explainApiError(text, fallback);
}

type FieldMistake = {
  field: string;
  message: string;
  focusId: string;
};

function splitIsoDate(iso: string): { y: string; m: string; d: string } {
  const n = normalizeDate(iso);
  const m = n.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { y: "", m: "", d: "" };
  return { y: m[1], m: m[2], d: m[3] };
}

const YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) =>
  String(new Date().getFullYear() - i),
);
const MONTH_OPTIONS = [
  ["01", "01 — January"],
  ["02", "02 — February"],
  ["03", "03 — March"],
  ["04", "04 — April"],
  ["05", "05 — May"],
  ["06", "06 — June"],
  ["07", "07 — July"],
  ["08", "08 — August"],
  ["09", "09 — September"],
  ["10", "10 — October"],
  ["11", "11 — November"],
  ["12", "12 — December"],
] as const;
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

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
  const [frontError, setFrontError] = useState<string | null>(null);
  const [backError, setBackError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorFocusId, setErrorFocusId] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(initial ?? null);
  const [mismatches, setMismatches] = useState<FieldMismatch[] | null>(
    initial?.id_mismatches ?? null,
  );
  const [matchOk, setMatchOk] = useState(
    initial?.id_verification_status === "matched",
  );

  const frontPreview = useObjectUrl(frontFile);
  const backPreview = useObjectUrl(backFile);

  const initialBirth = splitIsoDate(initial?.birth_date ?? "");
  const [birthY, setBirthY] = useState(initialBirth.y);
  const [birthM, setBirthM] = useState(initialBirth.m);
  const [birthD, setBirthD] = useState(initialBirth.d);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError: setFieldError,
    getValues,
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

  function birthIsoFromSelects() {
    // Prefer live DOM values — iOS picker UI can lag behind React state
    const y = readSelectById("birth-date-year") || birthY;
    const m = readSelectById("birth-date-month") || birthM;
    const d = readSelectById("birth-date-day") || birthD;
    if (y && m && d) return `${y}-${m}-${d}`;
    if (birthY && birthM && birthD) return `${birthY}-${birthM}-${birthD}`;
    return "";
  }

  /** iPhone autofill writes into the DOM without updating React Hook Form. */
  function syncAllFieldsFromDom(): StudentFormInput {
    const pick = (name: keyof StudentFormInput) => {
      const raw = readInputValue(String(name));
      if (name === "email") return normalizeEmail(raw);
      if (name === "phone") return normalizePhone(raw);
      return raw;
    };

    const y = readSelectById("birth-date-year");
    const m = readSelectById("birth-date-month");
    const d = readSelectById("birth-date-day");
    if (y) setBirthY(y);
    if (m) setBirthM(m);
    if (d) setBirthD(d);
    const iso = y && m && d ? `${y}-${m}-${d}` : "";

    const next: StudentFormInput = {
      ...getValues(),
      first_name: pick("first_name") || getValues("first_name"),
      second_name: pick("second_name") || getValues("second_name"),
      surname: pick("surname") || getValues("surname"),
      second_surname: pick("second_surname") || getValues("second_surname"),
      nationality: pick("nationality") || getValues("nationality"),
      email: pick("email") || getValues("email"),
      phone: pick("phone") || getValues("phone"),
      document_number: pick("document_number") || getValues("document_number"),
      document_country: pick("document_country") || getValues("document_country"),
      birth_date: iso || getValues("birth_date"),
      document_type: (() => {
        const t = readInputValue("document_type");
        return t === "id_card" || t === "passport"
          ? t
          : getValues("document_type");
      })(),
      has_second_name: getValues("has_second_name"),
      has_second_surname: getValues("has_second_surname"),
    };

    for (const [key, value] of Object.entries(next)) {
      setValue(key as keyof StudentFormInput, value as never, {
        shouldDirty: true,
      });
    }
    return next;
  }

  function syncBirthDate() {
    const iso = birthIsoFromSelects();
    setValue("birth_date", iso, {
      shouldValidate: !!iso,
      shouldDirty: true,
      shouldTouch: true,
    });
    return iso;
  }

  function setBanner(raw: unknown, fallback: string) {
    const text =
      typeof raw === "string"
        ? raw
        : raw instanceof Error
          ? raw.message
          : "";
    // Pattern / vague format errors → find the real field and scroll to it
    if (
      !text ||
      /format check|wrong format|did not match|expected pattern|must match|invalid string|A field/i.test(
        text,
      )
    ) {
      const scanned = collectMistakes();
      if (scanned.length) {
        publishMistakes(scanned);
        return;
      }
      const invalid = document.querySelector<
        HTMLInputElement | HTMLSelectElement
      >("form input:invalid, form select:invalid, form :invalid");
      const name =
        invalid?.getAttribute("name") ||
        invalid?.id?.replace(/^birth-date-/, "birth_date") ||
        "";
      if (name === "birth-date-day" || name === "birth-date-month" || name === "birth-date-year" || name.includes("birth")) {
        publishMistakes([
          {
            field: "birth_date",
            message: formatFieldMistake(
              "birth_date",
              birthIsoFromSelects() ||
                `day=${birthD || "?"} month=${birthM || "?"} year=${birthY || "?"}`,
            ),
            focusId: "birth-date-day",
          },
        ]);
        return;
      }
      if (name && STUDENT_FIELD_LABELS[name]) {
        publishMistakes([
          {
            field: name,
            message: formatFieldMistake(
              name,
              (invalid as HTMLInputElement | null)?.value,
            ),
            focusId: name === "birth_date" ? "birth-date-day" : name,
          },
        ]);
        return;
      }
    }
    const explained = showFormError(raw, fallback);
    if (
      explained &&
      !/format check|A field failed|A field has the wrong format/i.test(
        explained,
      )
    ) {
      setError(explained);
      setErrorFocusId(null);
      return;
    }
    const scanned = collectMistakes();
    if (scanned.length) {
      publishMistakes(scanned);
      return;
    }
    setError(fallback);
    setErrorFocusId(null);
  }

  function focusMistake(focusId: string) {
    const el =
      document.getElementById(focusId) ||
      document.querySelector<HTMLElement>(
        `input[name="${focusId}"], select[name="${focusId}"], #${focusId}`,
      );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el && "focus" in el) {
      try {
        (el as HTMLElement).focus();
      } catch {
        /* ignore */
      }
    }
  }

  function publishMistakes(mistakes: FieldMistake[]) {
    if (!mistakes.length) return;
    setFrontError(null);
    setBackError(null);
    for (const m of mistakes) {
      if (m.field === "id_front") {
        setFrontError(m.message);
        continue;
      }
      if (m.field === "id_back") {
        setBackError(m.message);
        continue;
      }
      if (m.field in STUDENT_FIELD_LABELS || m.field in getValues()) {
        try {
          setFieldError(m.field as FieldPath<StudentFormInput>, {
            type: "manual",
            message: m.message,
          });
        } catch {
          /* non-form field */
        }
      }
    }
    setError(mistakes.map((m) => m.message).join("\n\n"));
    setErrorFocusId(mistakes[0]?.focusId ?? null);
  }

  function dismissErrorPopup() {
    const focusId = errorFocusId;
    setError(null);
    setErrorFocusId(null);
    if (focusId) {
      // Let the modal close, then scroll to the field
      requestAnimationFrame(() => focusMistake(focusId));
    }
  }

  /** Find every broken field with entered vs expected — no generic blobs. */
  function collectMistakes(
    valuesOverride?: Partial<StudentFormInput>,
  ): FieldMistake[] {
    const dom = valuesOverride ?? syncAllFieldsFromDom();
    const values = {
      ...getValues(),
      ...dom,
      birth_date:
        dom.birth_date ||
        birthIsoFromSelects() ||
        getValues("birth_date"),
    };
    const mistakes: FieldMistake[] = [];
    const parsed = studentFormSchema.safeParse(values);
    if (!parsed.success) {
      const seen = new Set<string>();
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] || "");
        if (!field || seen.has(field)) continue;
        seen.add(field);
        let actual: unknown = values[field as keyof StudentFormInput];
        if (field === "birth_date") {
          actual =
            birthIsoFromSelects() ||
            `day=${birthD || "?"} month=${birthM || "?"} year=${birthY || "?"}`;
        }
        mistakes.push({
          field,
          message: formatFieldMistake(field, actual, issue.message),
          focusId: field === "birth_date" ? "birth-date-day" : field,
        });
      }
    }

    const needsFront = !student?.id_front_path && !frontFile;
    if (needsFront) {
      mistakes.push({
        field: "id_front",
        message: formatFieldMistake("id_front", "(no photo selected)"),
        focusId: "id-front-input",
      });
    }
    const needsBack =
      (values.document_type === "id_card" ||
        getValues("document_type") === "id_card") &&
      !student?.id_back_path &&
      !backFile;
    if (needsBack) {
      mistakes.push({
        field: "id_back",
        message: formatFieldMistake("id_back", "(no photo selected)"),
        focusId: "id-back-input",
      });
    }

    return mistakes;
  }

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
          showFormError(
            json.error,
            "ID verification failed — check your photos and try again",
          ),
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
      setBanner(
        e instanceof Error ? e.message : null,
        "ID verification failed — please try again",
      );
      setMatchOk(false);
    } finally {
      setVerifying(false);
    }
  }

  async function onSubmit(data: StudentFormInput) {
    setSubmitting(true);
    setError(null);
    setFrontError(null);
    setBackError(null);
    setMatchOk(false);
    const synced = syncAllFieldsFromDom();
    const birth_date = synced.birth_date || birthIsoFromSelects() || data.birth_date;
    const payload = { ...data, ...synced, birth_date };
    try {
      const pre = collectMistakes(payload);
      if (pre.length) {
        publishMistakes(pre);
        return;
      }
      if (!student && !projectId) {
        setError(
          "Invite link\nYou entered: (opened without a project link)\nExpected instead: open the invite URL from the organisers",
        );
        return;
      }

      let uploadFront = frontFile;
      let uploadBack = backFile;
      try {
        if (uploadFront) uploadFront = await normalizeImageFile(uploadFront);
        if (uploadBack) uploadBack = await normalizeImageFile(uploadBack);
      } catch {
        /* keep originals */
      }

      const form = new FormData();
      form.set(
        "data",
        JSON.stringify(
          student ? payload : { ...payload, project_id: projectId },
        ),
      );
      if (uploadFront) form.set("id_front", uploadFront);
      if (uploadBack) form.set("id_back", uploadBack);

      const url = student ? `/api/students/${student.id}` : "/api/students";
      const method = student ? "PUT" : "POST";
      const res = await fetch(url, { method, body: form });
      const json = await res.json();
      if (!res.ok) {
        applyServerFieldErrors(json.error);
        if (typeof json.error === "object") {
          const msg = formatStudentValidationError(json.error, {
            ...getValues(),
            birth_date: birthIsoFromSelects() || getValues("birth_date"),
          });
          setError(msg);
          return;
        }
        // Server string errors for uploads etc.
        const serverMsg = String(json.error || "");
        if (/front/i.test(serverMsg)) {
          publishMistakes([
            {
              field: "id_front",
              message: formatFieldMistake(
                "id_front",
                frontFile?.name || "(no photo)",
              ),
              focusId: "id-front-input",
            },
          ]);
          return;
        }
        if (/back/i.test(serverMsg)) {
          publishMistakes([
            {
              field: "id_back",
              message: formatFieldMistake(
                "id_back",
                backFile?.name || "(no photo)",
              ),
              focusId: "id-back-input",
            },
          ]);
          return;
        }
        // Last resort: re-scan the form so we never show a vague blob
        const scanned = collectMistakes(payload);
        if (scanned.length) {
          publishMistakes(scanned);
          return;
        }
        setError(
          showFormError(
            json.error,
            `Save failed\nServer said: ${serverMsg || "(no details)"}`,
          ),
        );
        return;
      }

      setStudent(json.student);
      if (!student) {
        router.replace(`/apply/student/${json.student.id}`);
      }
      await verify(json.student.id, true);
    } catch (e) {
      const scanned = collectMistakes(payload);
      if (scanned.length) {
        publishMistakes(scanned);
        return;
      }
      setBanner(
        e instanceof Error ? e.message : null,
        e instanceof Error
          ? `Save failed\nDetails: ${e.message}`
          : "Save failed\nDetails: unknown error",
      );
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
    const values = getValues();
    const mistakes: FieldMistake[] = [];
    for (const [field, msgs] of Object.entries(fieldErrors)) {
      if (!msgs?.length) continue;
      const message = formatFieldMistake(
        field,
        values[field as keyof StudentFormInput],
        msgs[0],
      );
      mistakes.push({
        field,
        message,
        focusId: field === "birth_date" ? "birth-date-day" : field,
      });
    }
    if (mistakes.length) publishMistakes(mistakes);
  }

  function onInvalid(errs: FieldErrors<StudentFormInput>) {
    const fromSchema = collectMistakes();
    if (fromSchema.length) {
      publishMistakes(fromSchema);
      return;
    }
    // Fallback from RHF errs only
    const values = getValues();
    const mistakes: FieldMistake[] = [];
    for (const field of Object.keys(errs) as (keyof StudentFormInput)[]) {
      const err = errs[field];
      if (!err || typeof err !== "object" || !("message" in err) || !err.message) {
        continue;
      }
      let actual: unknown = values[field];
      if (field === "birth_date") {
        actual =
          birthIsoFromSelects() ||
          `day=${birthD || "?"} month=${birthM || "?"} year=${birthY || "?"}`;
      }
      mistakes.push({
        field: String(field),
        message: formatFieldMistake(String(field), actual, String(err.message)),
        focusId: field === "birth_date" ? "birth-date-day" : String(field),
      });
    }
    if (mistakes.length) publishMistakes(mistakes);
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
    setError(null);
    try {
      const res = await fetch("/api/verify-id/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBanner(
          json.error,
          "Could not ignore the differences — try again",
        );
        return;
      }
      setStudent(json.student);
      setMismatches(null);
      setMatchOk(true);
    } catch (e) {
      setBanner(
        e instanceof Error ? e.message : null,
        "Could not ignore the differences — check your connection",
      );
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

      {error && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          onClick={dismissErrorPopup}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="form-error-title"
            className="max-h-[80vh] w-full max-w-md overflow-y-auto overflow-x-hidden overscroll-y-contain rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="form-error-title"
              className="text-lg font-bold text-[var(--navy)]"
            >
              Please fix
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm text-red-900">
              {error}
            </p>
            <button
              type="button"
              className="btn-primary mt-5 w-full"
              onClick={dismissErrorPopup}
            >
              OK — show me the field
            </button>
          </div>
        </div>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          // Critical on iPhone: autofill is in the DOM, not always in React state
          const synced = syncAllFieldsFromDom();
          const mistakes = collectMistakes(synced);
          if (mistakes.length) {
            publishMistakes(mistakes);
            return;
          }
          void handleSubmit(
            (data) => onSubmit({ ...data, ...synced }),
            onInvalid,
          )(e);
        }}
        className="space-y-6"
      >
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[var(--navy)]">
            Personal details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.first_name?.message}>
              <input
                className="input"
                autoComplete="given-name"
                {...register("first_name")}
              />
            </Field>
            <Field label="Surname" error={errors.surname?.message}>
              <input
                className="input"
                autoComplete="family-name"
                {...register("surname")}
              />
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
            <Field
              label="Birth date"
              hint="Choose day, month and year from the lists (saved as YYYY-MM-DD)."
              error={errors.birth_date?.message}
            >
              <div className="grid grid-cols-3 gap-2">
                <select
                  id="birth-date-day"
                  className="input"
                  value={birthD}
                  onChange={(e) => {
                    setBirthD(e.target.value);
                    const d = e.target.value;
                    if (birthY && birthM && d) {
                      setValue("birth_date", `${birthY}-${birthM}-${d}`, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                  aria-label="Day of birth"
                >
                  <option value="">Day</option>
                  {DAY_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  id="birth-date-month"
                  className="input"
                  value={birthM}
                  onChange={(e) => {
                    setBirthM(e.target.value);
                    const m = e.target.value;
                    if (birthY && m && birthD) {
                      setValue("birth_date", `${birthY}-${m}-${birthD}`, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                  aria-label="Month of birth"
                >
                  <option value="">Month</option>
                  {MONTH_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  id="birth-date-year"
                  className="input"
                  value={birthY}
                  onChange={(e) => {
                    setBirthY(e.target.value);
                    const y = e.target.value;
                    if (y && birthM && birthD) {
                      setValue("birth_date", `${y}-${birthM}-${birthD}`, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                  aria-label="Year of birth"
                >
                  <option value="">Year</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              {birthIsoFromSelects() && (
                <p className="mt-1 text-xs text-[var(--mint-text)]">
                  Selected: {birthIsoFromSelects()}
                </p>
              )}
            </Field>
            <Field label="Nationality" error={errors.nationality?.message}>
              <input className="input" {...register("nationality")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="input"
                placeholder="name@example.com"
                {...register("email")}
              />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input
                type="text"
                inputMode="tel"
                autoComplete="tel"
                className="input"
                {...register("phone")}
              />
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
              error={frontError || undefined}
            >
              <input
                id="id-front-input"
                type="file"
                accept="image/*,.heic,.heif"
                className="input"
                onChange={async (e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFrontError(null);
                  if (!f) {
                    setFrontFile(null);
                    return;
                  }
                  setFrontFile(await normalizeImageFile(f));
                }}
              />
            </Field>
            {(documentType === "id_card" || student?.id_back_path) && (
              <Field
                label={
                  student?.id_back_path
                    ? "ID back (upload to replace)"
                    : "ID back photo"
                }
                error={backError || undefined}
              >
                <input
                  id="id-back-input"
                  type="file"
                  accept="image/*,.heic,.heif"
                  className="input"
                  onChange={async (e) => {
                    const f = e.target.files?.[0] ?? null;
                    setBackError(null);
                    if (!f) {
                      setBackFile(null);
                      return;
                    }
                    setBackFile(await normalizeImageFile(f));
                  }}
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
                    {label}
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <span className="text-[var(--muted)]">You entered: </span>
                      <span className="font-medium">
                        {m.formValue || "(empty)"}
                      </span>
                    </p>
                    <p>
                      <span className="text-[var(--muted)]">
                        Document says instead:{" "}
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
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-[var(--navy)]">{label}</span>
      {hint && (
        <span className="block text-xs text-[var(--mint-text)]">{hint}</span>
      )}
      <div
        className={
          error
            ? "rounded-xl ring-2 ring-red-500 [&_input]:border-red-500 [&_select]:border-red-500"
            : undefined
        }
      >
        {children}
      </div>
      {error && (
        <span className="block whitespace-pre-line text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}
