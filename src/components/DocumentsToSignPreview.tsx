"use client";

import { useMemo } from "react";
import {
  availableStudentTemplateIds,
  isMinor,
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
  isMinorParticipant?: boolean;
  needsTravelDeclaration?: boolean;
};

export function DocumentsToSignPreview({
  projectType,
  birthDate = "",
  isMinorParticipant,
}: Props) {
  const items = useMemo(() => {
    const project = { type: projectType };
    const all = availableStudentTemplateIds(project);
    return all.map((id) => ({
      id,
      label: LABELS[id] || id,
    }));
  }, [projectType]);

  const minorNote =
    (isMinorParticipant ?? (birthDate ? isMinor(birthDate) : false))
      ? "Because you are under 18, your parent or legal guardian must upload their ID and sign all documents after approval."
      : null;

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--sky)]/30 px-4 py-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--navy)]">
          Documents you may be asked to sign
        </h2>
        <p className="mt-1 text-sm text-[var(--mint-text)]">
          After approval, organisers choose which documents you must sign and
          send you a portal invite. Typical documents for this project:
        </p>
        {minorNote && (
          <p className="mt-1 text-xs text-[var(--muted)]">{minorNote}</p>
        )}
      </div>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm"
          >
            <span>
              <span className="mr-2 text-[var(--muted)]">{i + 1}.</span>
              {item.label}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
