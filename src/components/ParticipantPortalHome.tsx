"use client";

import { useState } from "react";
import { StudentForm } from "@/components/StudentForm";
import { ParticipantRegistrationReadonly } from "@/components/ParticipantRegistrationReadonly";
import { RegistrationReceivedModal } from "@/components/RegistrationReceivedModal";
import {
  DEFAULT_FORM_CONFIG,
  type ProjectFormConfig,
} from "@/lib/form-config";
import { projectTypeLabel, type ProjectType } from "@/lib/project-packs";
import type { MobilityProject } from "@/lib/projects";
import type { ParticipationStatus, Student } from "@/lib/types";

const STATUS_UI: Record<
  ParticipationStatus,
  { label: string; className: string }
> = {
  registered: {
    label: "Waiting",
    className: "bg-amber-100 text-amber-950 ring-amber-300",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-950 ring-emerald-300",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-950 ring-red-300",
  },
};

export function ParticipantPortalHome({
  student,
  project,
  showRegisteredModal = false,
}: {
  student: Student;
  project: MobilityProject | null;
  showRegisteredModal?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(showRegisteredModal);
  const formConfig: ProjectFormConfig =
    project?.form_config || DEFAULT_FORM_CONFIG;
  const status = STATUS_UI[student.participation_status];
  const projectName = project?.name || "Your project";
  const typeLabel = project ? projectTypeLabel(project.type) : null;

  return (
    <div className="space-y-6">
      {student.participation_status === "registered" && (
        <RegistrationReceivedModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          projectName={projectName}
        />
      )}

      <button
        type="button"
        onClick={() => setDetailsOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-left shadow-sm transition hover:border-[var(--navy)]/30 hover:bg-[var(--sky)]/20"
        aria-expanded={detailsOpen}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mint-text)]">
            You applied for
          </p>
          <p className="mt-1 text-lg font-extrabold text-[var(--navy)]">
            {projectName}
          </p>
          {typeLabel && (
            <p className="mt-0.5 text-sm text-[var(--muted)]">{typeLabel}</p>
          )}
          <p className="mt-2 text-xs text-[var(--mint-text)]">
            {detailsOpen
              ? "Hide registration details"
              : "Tap to view your registration details"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${status.className}`}
        >
          {status.label}
        </span>
      </button>

      {detailsOpen && (
        <ParticipantRegistrationReadonly
          student={student}
          formConfig={formConfig}
        />
      )}

      {student.participation_status === "approved" && (
        <StudentForm
          initial={student}
          projectId={student.project_id}
          projectTitle={project?.name}
          projectType={(project?.type || "youth_exchange") as ProjectType}
          formConfig={formConfig}
          portalMode
        />
      )}
    </div>
  );
}
