"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { explainApiError } from "@/lib/api-error";
import {
  HEIC_CONVERT_ERROR,
  ID_IMAGE_ACCEPT,
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
import type { ProjectFormConfig } from "@/lib/form-config";
import { DEFAULT_FORM_CONFIG, isOptionalHidden } from "@/lib/form-config";
import type { ProjectType } from "@/lib/project-packs";
import type { FieldPath } from "react-hook-form";

type Props = {
  initial?: Student | null;
  projectId?: string;
  projectTitle?: string;
  projectType?: ProjectType;
  formConfig?: ProjectFormConfig;
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

function isBrowserPatternNoise(text: string): boolean {
  return /did not match.*pattern|match the (expected )?pattern|must match pattern|invalid string: must match/i.test(
    text,
  );
}

/** Strip Safari/WebKit pattern-validation noise from any user-facing error text. */
function scrubPatternNoise(text: string): string {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  const kept = lines.filter((line) => {
    const t = line.trim();
    if (!t) return true;
    if (/^Details:\s*/i.test(t) && /pattern/i.test(t)) return false;
    if (/Details:\s*.*pattern/i.test(t)) return false;
    if (isBrowserPatternNoise(t)) return false;
    return true;
  });
  const result = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!result || isBrowserPatternNoise(result)) return "";
  if (/Details:\s*.*pattern/i.test(result)) return "";
  return result;
}

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
  formConfig = DEFAULT_FORM_CONFIG,
}: Props) {
  const router = useRouter();
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontError, setFrontError] = useState<string | null>(null);
  const [backError, setBackError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorFocusId, setErrorFocusId] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(initial ?? null);
  const [customAnswers, setCustomAnswers] = useState<
    Record<string, string | boolean>
  >(initial?.custom_answers || {});
  const [mismatches, setMismatches] = useState<FieldMismatch[] | null>(
    initial?.id_mismatches ?? null,
  );
  const [matchOk, setMatchOk] = useState(
    initial?.id_verification_status === "matched",
  );

  const needsIdPhase = student?.participation_status === "approved";
  const isPendingApproval = student?.participation_status === "registered";
  const isRejected = student?.participation_status === "rejected";
  const hideSecond = isOptionalHidden(formConfig, "second_name");
  const hideSecondSur = isOptionalHidden(formConfig, "second_surname");
  const hidePhone = isOptionalHidden(formConfig, "phone");
  const hideCountry = isOptionalHidden(formConfig, "document_country");

  const frontPreview = useObjectUrl(frontFile);
  const backPreview = useObjectUrl(backFile);

  const initialBirth = splitIsoDate(initial?.birth_date ?? "");
  const [birthY, setBirthY] = useState(initialBirth.y);
  const [birthM, setBirthM] = useState(initialBirth.m);
  const [birthD, setBirthD] = useState(initialBirth.d);

  const {
    register,
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
      email: pick("email") || normalizeEmail(getValues("email") || ""),
      phone: pick("phone") || normalizePhone(getValues("phone") || ""),
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

    // Keep DOM value identical to what we validate (strip autofill junk in-place)
    const emailEl = document.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );
    if (emailEl && next.email && emailEl.value !== next.email) {
      emailEl.value = next.email;
    }
    const phoneEl = document.querySelector<HTMLInputElement>(
      'input[name="phone"]',
    );
    if (phoneEl && next.phone && phoneEl.value !== next.phone) {
      phoneEl.value = next.phone;
    }

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
    const text = scrubPatternNoise(
      typeof raw === "string"
        ? raw
        : raw instanceof Error
          ? raw.message
          : "",
    );
    const safeFallback = scrubPatternNoise(fallback) || "";

    // Always try to name a real field first — never show Safari pattern noise
    const scanned = collectMistakes(syncAllFieldsFromDom());
    if (scanned.length) {
      publishMistakes(scanned);
      return;
    }

    if (text && !isBrowserPatternNoise(text)) {
      const explained = showFormError(text, safeFallback || text);
      const clean = scrubPatternNoise(explained);
      if (clean) {
        setError(clean);
        setErrorFocusId(null);
        return;
      }
    }

    // Find whichever DOM control Safari marked invalid
    const invalid = document.querySelector<
      HTMLInputElement | HTMLSelectElement
    >("form input:invalid, form select:invalid, form :invalid");
    if (invalid) {
      const name =
        invalid.getAttribute("name") ||
        (invalid.id?.startsWith("birth-date") ? "birth_date" : "") ||
        invalid.id ||
        "";
      const field =
        name.startsWith("birth-date") || name === "birth_date"
          ? "birth_date"
          : name;
      if (field && (STUDENT_FIELD_LABELS[field] || field === "birth_date")) {
        publishMistakes([
          {
            field,
            message: formatFieldMistake(
              field,
              field === "birth_date"
                ? birthIsoFromSelects() ||
                    `day=${readSelectById("birth-date-day") || "?"} month=${readSelectById("birth-date-month") || "?"} year=${readSelectById("birth-date-year") || "?"}`
                : invalid.value,
            ),
            focusId:
              field === "birth_date" ? "birth-date-day" : field || invalid.id,
          },
        ]);
        return;
      }
    }

    if (safeFallback) {
      setError(safeFallback);
      setErrorFocusId(null);
      return;
    }

    // Do not blame email when the real failure is unknown / scrubbed Safari noise
    setError(
      "Could not save — check birth date, phone, and ID photos, then try again.",
    );
    setErrorFocusId("birth-date-day");
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
    const safe: FieldMistake[] = [];
    for (const m of mistakes) {
      let message = m.message;
      if (
        !message ||
        isBrowserPatternNoise(message) ||
        /Details:\s*.*pattern/i.test(message)
      ) {
        const actual =
          m.field === "birth_date"
            ? birthIsoFromSelects() || "(incomplete)"
            : readInputValue(m.field) ||
              String(
                getValues(m.field as keyof StudentFormInput) ?? "",
              ) ||
              "(empty)";
        message = formatFieldMistake(m.field, actual);
      } else {
        message = scrubPatternNoise(message) || formatFieldMistake(m.field, "(?)");
      }
      safe.push({ ...m, message });
      if (m.field === "id_front") {
        setFrontError(message);
        continue;
      }
      if (m.field === "id_back") {
        setBackError(message);
        continue;
      }
      if (m.field in STUDENT_FIELD_LABELS || m.field in getValues()) {
        try {
          setFieldError(m.field as FieldPath<StudentFormInput>, {
            type: "manual",
            message,
          });
        } catch {
          /* non-form field */
        }
      }
    }
    const banner =
      scrubPatternNoise(safe.map((m) => m.message).join("\n\n")) ||
      safe[0]?.message ||
      "Please fix the highlighted fields, then try again.";
    // Never scroll-to-field here — that feels like a silent no-op. Popup first.
    setError(banner);
    setErrorFocusId(safe[0]?.focusId ?? null);
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
        } else if (field === "email") {
          actual = normalizeEmail(String(actual ?? ""));
        } else if (field === "phone") {
          actual = normalizePhone(String(actual ?? ""));
        }
        mistakes.push({
          field,
          message: formatFieldMistake(field, actual, issue.message),
          focusId: field === "birth_date" ? "birth-date-day" : field,
        });
      }
    }

    const needsFront =
      needsIdPhase && !student?.id_front_path && !frontFile;
    if (needsFront) {
      mistakes.push({
        field: "id_front",
        message: formatFieldMistake("id_front", "(no photo selected)"),
        focusId: "id-front-input",
      });
    }
    const needsBack =
      needsIdPhase &&
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
    // Loading immediately — first click must never look like a silent no-op
    setSubmitting(true);
    setError(null);
    setErrorFocusId(null);
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
          scrubPatternNoise(
            "Invite link\nYou entered: (opened without a project link)\nExpected instead: open the invite URL from the organisers",
          ) ||
            "Open the invite URL from the organisers, then try again.",
        );
        return;
      }

      let uploadFront = frontFile;
      let uploadBack = backFile;
      const needsConvert = !!(uploadFront || uploadBack);
      if (needsConvert) setConverting(true);
      try {
        if (uploadFront) {
          try {
            uploadFront = await normalizeImageFile(uploadFront);
            setFrontFile(uploadFront);
          } catch (e) {
            const msg =
              e instanceof Error && e.message.trim()
                ? e.message
                : HEIC_CONVERT_ERROR;
            setFrontError(msg);
            setError(msg);
            setErrorFocusId("id-front-input");
            return;
          }
        }
        if (uploadBack) {
          try {
            uploadBack = await normalizeImageFile(uploadBack);
            setBackFile(uploadBack);
          } catch (e) {
            const msg =
              e instanceof Error && e.message.trim()
                ? e.message
                : HEIC_CONVERT_ERROR;
            setBackError(msg);
            setError(msg);
            setErrorFocusId("id-back-input");
            return;
          }
        }
      } finally {
        if (needsConvert) setConverting(false);
      }

      const form = new FormData();
      form.set(
        "data",
        JSON.stringify(
          student
            ? payload
            : {
                ...payload,
                project_id: projectId,
                custom_answers: customAnswers,
              },
        ),
      );
      if (needsIdPhase) {
        if (uploadFront) form.set("id_front", uploadFront);
        if (uploadBack) form.set("id_back", uploadBack);
      }

      const url = student ? `/api/students/${student.id}` : "/api/students";
      const method = student ? "PUT" : "POST";
      const res = await fetch(url, { method, body: form });
      const json = await res.json();
      if (!res.ok) {
        applyServerFieldErrors(json.error);
        if (typeof json.error === "object") {
          const msg = scrubPatternNoise(
            formatStudentValidationError(json.error, {
              ...getValues(),
              birth_date: birthIsoFromSelects() || getValues("birth_date"),
            }),
          );
          if (msg) setError(msg);
          else {
            const scanned = collectMistakes(payload);
            if (scanned.length) publishMistakes(scanned);
            else
              setError(
                "Save failed — please check the highlighted fields, then try again.",
              );
          }
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
        const explained = scrubPatternNoise(
          showFormError(
            json.error,
            `Save failed\nServer said: ${isBrowserPatternNoise(serverMsg) ? "please check the fields below" : serverMsg || "(no details)"}`,
          ),
        );
        if (explained) setError(explained);
        else setBanner(null, "Save failed — please check the highlighted fields");
        return;
      }

      setStudent(json.student);
      if (json.student.participation_status === "approved" && needsIdPhase) {
        await verify(json.student.id, true);
      }
      if (!student) {
        router.replace(`/apply/student/${json.student.id}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (isBrowserPatternNoise(msg)) {
        const scanned = collectMistakes(syncAllFieldsFromDom());
        if (scanned.length) {
          publishMistakes(scanned);
          return;
        }
        setBanner(null, "");
        return;
      }
      const scanned = collectMistakes(payload);
      if (scanned.length) {
        publishMistakes(scanned);
        return;
      }
      setBanner(
        scrubPatternNoise(msg) || null,
        scrubPatternNoise(msg)
          ? `Save failed\nDetails: ${scrubPatternNoise(msg)}`
          : "Save failed — please check the highlighted fields",
      );
    } finally {
      setConverting(false);
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
      const hint = msgs[0];
      const message = formatFieldMistake(
        field,
        values[field as keyof StudentFormInput],
        isBrowserPatternNoise(hint || "") ? undefined : hint,
      );
      mistakes.push({
        field,
        message,
        focusId: field === "birth_date" ? "birth-date-day" : field,
      });
    }
    if (mistakes.length) publishMistakes(mistakes);
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
    needsIdPhase &&
    (matchOk ||
      student?.id_verification_status === "matched" ||
      student?.id_verification_status === "mismatch_dismissed");

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

      {needsIdPhase && !verified && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--sky)]/30 px-4 py-4 text-sm text-[var(--navy)]">
          <p className="font-bold">Next step: verify your ID</p>
          <p className="mt-1 text-[var(--mint-text)]">
            Upload clear photos of your ID / passport, then sign the documents
            below.
          </p>
        </div>
      )}

      {(submitting || verifying || converting) && !error && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          aria-busy="true"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-loading-title"
            aria-live="polite"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2
              id="form-loading-title"
              className="text-lg font-bold text-[var(--navy)]"
            >
              {converting
                ? "Preparing photos…"
                : verifying
                  ? "Verifying ID…"
                  : "Saving…"}
            </h2>
            <p className="mt-3 text-sm text-[var(--mint-text)]">
              Please wait — this can take a moment. Don&apos;t close the page.
            </p>
            <div
              className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--sky)]"
              aria-hidden
            >
              <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--navy)]" />
            </div>
          </div>
        </div>
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
        action="#"
        onInvalid={(e) => {
          // Block Safari’s native “string did not match the pattern” bubble
          e.preventDefault();
          const t = e.target as HTMLInputElement | HTMLSelectElement;
          const name =
            t.getAttribute("name") ||
            (t.id?.startsWith("birth-date") ? "birth_date" : t.id) ||
            "";
          const field = name.startsWith("birth-date") ? "birth_date" : name;
          if (field && STUDENT_FIELD_LABELS[field]) {
            publishMistakes([
              {
                field,
                message: formatFieldMistake(
                  field,
                  field === "birth_date"
                    ? birthIsoFromSelects() || "(incomplete)"
                    : t.value,
                ),
                focusId:
                  field === "birth_date" ? "birth-date-day" : field || t.id,
              },
            ]);
            return;
          }
          const scanned = collectMistakes(syncAllFieldsFromDom());
          if (scanned.length) publishMistakes(scanned);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (submitting || verifying || converting) return;
          // Avoid iOS scroll-to-focused-field when the keyboard dismisses on submit
          try {
            (document.activeElement as HTMLElement | null)?.blur?.();
          } catch {
            /* ignore */
          }
          // Critical on iPhone: autofill is in the DOM, not always in React state
          const synced = syncAllFieldsFromDom();
          const mistakes = collectMistakes(synced);
          if (mistakes.length) {
            publishMistakes(mistakes);
            return;
          }
          // Skip RHF handleSubmit — it can trip Safari native validation on iOS
          void onSubmit(synced);
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

          {!hideSecond && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("has_second_name")} />
                I have a second / middle name
              </label>
              {hasSecondName && (
                <Field label="Second name" error={errors.second_name?.message}>
                  <input className="input" {...register("second_name")} />
                </Field>
              )}
            </>
          )}

          {!hideSecondSur && (
            <>
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
            </>
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
            {!hidePhone && (
              <Field label="Phone" error={errors.phone?.message}>
                <input
                  type="text"
                  inputMode="tel"
                  autoComplete="tel"
                  className="input"
                  {...register("phone")}
                />
              </Field>
            )}
          </div>

          {formConfig.extraFields.length > 0 && (
            <div className="space-y-4 border-t border-[var(--line)] pt-4">
              <h3 className="text-sm font-bold text-[var(--navy)]">
                Extra questions
              </h3>
              {formConfig.extraFields.map((field) => (
                <Field key={field.id} label={field.label}>
                  {field.type === "textarea" ? (
                    <textarea
                      className="input min-h-[88px]"
                      value={String(customAnswers[field.id] ?? "")}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({
                          ...prev,
                          [field.id]: e.target.value,
                        }))
                      }
                      required={field.required}
                    />
                  ) : field.type === "select" ? (
                    <select
                      className="input"
                      value={String(customAnswers[field.id] ?? "")}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({
                          ...prev,
                          [field.id]: e.target.value,
                        }))
                      }
                      required={field.required}
                    >
                      <option value="">Select…</option>
                      {(field.options || []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={customAnswers[field.id] === true}
                        onChange={(e) =>
                          setCustomAnswers((prev) => ({
                            ...prev,
                            [field.id]: e.target.checked,
                          }))
                        }
                      />
                      Yes
                    </label>
                  ) : (
                    <input
                      className="input"
                      value={String(customAnswers[field.id] ?? "")}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({
                          ...prev,
                          [field.id]: e.target.value,
                        }))
                      }
                      required={field.required}
                    />
                  )}
                </Field>
              ))}
            </div>
          )}
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
            {!hideCountry && (
              <Field
                label="Issuing country"
                error={errors.document_country?.message}
              >
                <input className="input" {...register("document_country")} />
              </Field>
            )}
          </div>

          {needsIdPhase && (
            <>
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
                    accept={ID_IMAGE_ACCEPT}
                    className="input"
                    onChange={async (e) => {
                      const input = e.target;
                      const f = input.files?.[0] ?? null;
                      setFrontError(null);
                      if (!f) {
                        setFrontFile(null);
                        return;
                      }
                      setFrontFile(f);
                      setConverting(true);
                      try {
                        const jpeg = await normalizeImageFile(f);
                        setFrontFile(jpeg);
                        setFrontError(null);
                      } catch (err) {
                        setFrontError(
                          err instanceof Error && err.message.trim()
                            ? err.message
                            : HEIC_CONVERT_ERROR,
                        );
                      } finally {
                        setConverting(false);
                      }
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
                      accept={ID_IMAGE_ACCEPT}
                      className="input"
                      onChange={async (e) => {
                        const input = e.target;
                        const f = input.files?.[0] ?? null;
                        setBackError(null);
                        if (!f) {
                          setBackFile(null);
                          return;
                        }
                        setBackFile(f);
                        setConverting(true);
                        try {
                          const jpeg = await normalizeImageFile(f);
                          setBackFile(jpeg);
                          setBackError(null);
                        } catch (err) {
                          setBackError(
                            err instanceof Error && err.message.trim()
                              ? err.message
                              : HEIC_CONVERT_ERROR,
                          );
                        } finally {
                          setConverting(false);
                        }
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
            </>
          )}
        </section>

        {needsIdPhase && (
          <DocumentsToSignPreview
            projectType={projectType}
            birthDate={birthDate}
            needsTravelDeclaration={student?.needs_travel_declaration ?? false}
          />
        )}

        {!isRejected && (
        <button
          type="submit"
          disabled={submitting || verifying || converting}
          className="btn-primary"
        >
          {converting
            ? "Preparing photos…"
            : submitting || verifying
              ? needsIdPhase
                ? "Saving & verifying…"
                : "Submitting…"
              : needsIdPhase
                ? student
                  ? "Update & verify ID"
                  : "Save & verify ID"
                : student
                  ? "Update application"
                  : "Submit application"}
        </button>
        )}
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

      {student && needsIdPhase && (
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
