"use client";

import { useState } from "react";
import { AdminParticipantDocsPanel } from "@/components/AdminParticipantDocsPanel";
import { GenerateDocumentForm } from "@/components/GenerateDocumentForm";
import type { GeneratedDocument, Student } from "@/lib/types";

type TemplateItem = { id: string; label: string; scope: "student" | "general" };

export function AdminStudentActions({
  initialStudent,
  templates,
  initialDocuments,
  preselectedId,
}: {
  initialStudent: Student;
  templates: TemplateItem[];
  initialDocuments: GeneratedDocument[];
  preselectedId?: string;
}) {
  const [student, setStudent] = useState(initialStudent);

  return (
    <div className="space-y-6">
      <AdminParticipantDocsPanel
        student={student}
        templates={templates.map((t) => ({ id: t.id, label: t.label }))}
        documents={initialDocuments}
        onStudentUpdate={setStudent}
      />
      <div className="panel space-y-4 px-5 py-5">
        <h2 className="text-base font-semibold">Generated PDFs</h2>
        <GenerateDocumentForm
          studentId={student.id}
          templates={templates}
          initialDocuments={initialDocuments}
          preselectedId={preselectedId}
        />
      </div>
    </div>
  );
}
