"use client";

import { useMemo } from "react";
import {
  availableStudentTemplateIds,
  isMinor,
  requiredStudentTemplateIds,
  type ProjectType,
} from "@/lib/project-packs";

const LABELS: Record<string, string> = {
  zero_tolerance: "Zero tolerance protocol",
  participants_agreement: "Participants agreement",
  legal_guardian_confirmation: "Confirmation by legal guardian",
  travel_tickets_declaration: "Declaration Travel Tickets",
  letter_for_parents: "Letter for parents",
  contract_leaders_minors: "Contract for leaders (minors)",
};

type Props = {
  projectType: ProjectType;
  birthDate?: string;
  /** When true, travel declaration is required (admin flag). Always listed as optional otherwise. */
  needsTravelDeclaration?: boolean;
};

export function DocumentsToSignPreview({
  projectType,
  birthDate = "",
  needsTravelDeclaration = false,
}: Props) {
  const items = useMemo(() => {
    const project = { type: projectType };
    const student = {
      birth_date: birthDate || "2000-01-01",
      needs_travel_declaration: needsTravelDeclaration,
    };
    // Preview required using birth date when present; if empty, show adult base pack
    const required = birthDate
      ? requiredStudentTemplateIds(project, student)
      : ["participants_agreement", "zero_tolerance"];
    const all = Array.from(
      new Set([
        ...availableStudentTemplateIds(project),
        ...required,
        "travel_tickets_declaration",
      ]),
    );
    return all.map((id) => ({
      id,
      label: LABELS[id] || id,
      required: required.includes(id),
    }));
  }, [projectType, birthDate, needsTravelDeclaration]);

  const minorNote =
    birthDate && isMinor(birthDate)
      ? "Because you are under 18, extra guardian/parent documents are included."
      : birthDate
        ? null
        : "Enter your birth date to see if guardian documents apply.";

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--sky)]/30 px-4 py-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--navy)]">
          Documents you will sign
        </h2>
        <p className="mt-1 text-sm text-[var(--mint-text)]">
          After you submit and we verify your uploaded ID, you will sign these
          one by one (preview → draw signature → confirm).
        </p>
        {minorNote && (
          <p className="mt-1 text-xs text-[var(--muted)]">{minorNote}</p>
        )}
      </div>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-xl bg-white/80 px-3 py-2.5 text-sm"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-xs font-bold text-white">
              {i + 1}
            </span>
            <div>
              <div className="font-medium text-[var(--navy)]">{item.label}</div>
              <div className="text-xs text-[var(--mint-text)]">
                {item.required ? "Required" : "Optional / if applicable"}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
