import { notFound } from "next/navigation";
import { ParticipantPortalHome } from "@/components/ParticipantPortalHome";
import { canAccessStudent } from "@/lib/auth";
import { getStudent } from "@/lib/students";
import { getProject } from "@/lib/projects";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ registered?: string }>;
};

export default async function ParticipantProfilePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { registered } = await searchParams;
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
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--mint-text)]">
            Participant portal
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
            Your applications
          </h1>
          <p className="mt-2 text-[var(--mint-text)]">
            Check status, open a project for your submitted details, and
            complete next steps when approved.
          </p>
        </div>

        <ParticipantPortalHome
          student={student}
          project={project}
          showRegisteredModal={
            student.participation_status === "registered" && registered === "1"
          }
        />
      </div>
    </div>
  );
}
