import { notFound } from "next/navigation";
import { StudentForm } from "@/components/StudentForm";
import { getProjectBySlug, projectTypeLabel } from "@/lib/projects";

type Props = { params: Promise<{ slug: string }> };

export default async function ApplyToProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div
        className="blob bg-[var(--lavender)]"
        style={{
          width: 280,
          aspectRatio: "1",
          top: -40,
          right: -60,
          opacity: 0.5,
        }}
      />
      <div className="panel relative space-y-6 px-6 py-8 sm:px-10 sm:py-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--mint-text)]">
            {projectTypeLabel(project.type)}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
            Student application
          </h1>
          <p className="mt-3 max-w-xl text-[var(--mint-text)]">
            Fill in your details exactly as on your ID or passport. We will check
            them against your uploaded document.
          </p>
        </div>
        <StudentForm
          projectId={project.id}
          projectTitle={project.name}
          projectType={project.type}
        />
      </div>
    </div>
  );
}
