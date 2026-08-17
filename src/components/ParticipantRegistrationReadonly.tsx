"use client";

import type { ProjectFormConfig } from "@/lib/form-config";
import { isOptionalHidden } from "@/lib/form-config";
import type { Student } from "@/lib/types";

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2 border-b border-[var(--line)] py-2 last:border-0 sm:grid-cols-[10rem_1fr]">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-medium text-[var(--navy)] break-words">{value}</dd>
    </div>
  );
}

export function ParticipantRegistrationReadonly({
  student,
  formConfig,
}: {
  student: Student;
  formConfig: ProjectFormConfig;
}) {
  const hideSecond = isOptionalHidden(formConfig, "second_name");
  const hideSecondSur = isOptionalHidden(formConfig, "second_surname");
  const hidePhone = isOptionalHidden(formConfig, "phone");
  const hideCountry = isOptionalHidden(formConfig, "document_country");

  const name = [
    student.first_name,
    student.has_second_name ? student.second_name : null,
    student.surname,
    student.has_second_surname ? student.second_surname : null,
  ]
    .filter(Boolean)
    .join(" ");

  const extras = formConfig.extraFields
    .map((f) => {
      const raw = student.custom_answers?.[f.id];
      if (raw == null || raw === "") return null;
      const value =
        typeof raw === "boolean" ? (raw ? "Yes" : "No") : String(raw);
      return { label: f.label, value };
    })
    .filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--navy)]">
          Your registration
        </h2>
        <p className="mt-1 text-sm text-[var(--mint-text)]">
          Submitted details (view only — contact organisers if something needs
          correcting).
        </p>
      </div>
      <dl className="text-sm">
        <Row label="Full name" value={name} />
        {!hideSecond && student.has_second_name && (
          <Row label="Second name" value={student.second_name || ""} />
        )}
        {!hideSecondSur && student.has_second_surname && (
          <Row label="Second surname" value={student.second_surname || ""} />
        )}
        <Row label="Birth date" value={student.birth_date} />
        <Row label="Nationality" value={student.nationality} />
        <Row label="Email" value={student.email} />
        {!hidePhone && <Row label="Phone" value={student.phone} />}
        <Row
          label="Document"
          value={`${student.document_type === "passport" ? "Passport" : "ID card"} · ${student.document_number}`}
        />
        {!hideCountry && (
          <Row label="Issuing country" value={student.document_country} />
        )}
        {extras.map((e) => (
          <Row key={e.label} label={e.label} value={e.value} />
        ))}
      </dl>
    </div>
  );
}
