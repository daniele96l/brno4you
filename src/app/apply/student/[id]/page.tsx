import { notFound } from "next/navigation";
import { StudentForm } from "@/components/StudentForm";
import { canAccessStudent } from "@/lib/auth";
import { getStudent } from "@/lib/students";
import { getProject, projectTypeLabel } from "@/lib/projects";

type Props = { params: Promise<{ id: string }> };

export default async function EditApplyPage({ params }: Props) {
  const { id } = await params;
  if (!(await canAccessStudent(id))) {
    notFound();
  }
  const student = await getStudent(id);
  if (!student) notFound();
  const project = student.project_id
    ? await getProject(student.project_id)
    : null;

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div
        className="blob bg-[var(--sky)]"
        style={{
          width: 240,
          aspectRatio: "1",
          top: -20,
          right: -40,
          opacity: 0.7,
        }}
      />
      <div className="panel relative space-y-6 px-6 py-8 sm:px-10 sm:py-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">
            Your application
          </h1>
          <p className="mt-2 text-[var(--mint-text)]">
            Update your details or re-upload your ID, then verify again.
            {project
              ? ` Project: ${project.name} (${projectTypeLabel(project.type)}).`
              : ""}
          </p>
        </div>
        <StudentForm
          initial={student}
          projectId={student.project_id}
          projectTitle={project?.name}
          projectType={project?.type}
        />
      </div>
    </div>
  );
}
