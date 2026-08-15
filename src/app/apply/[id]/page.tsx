import { notFound } from "next/navigation";
import { StudentForm } from "@/components/StudentForm";
import { canAccessStudent } from "@/lib/auth";
import { getStudent } from "@/lib/students";

type Props = { params: Promise<{ id: string }> };

export default async function EditApplyPage({ params }: Props) {
  const { id } = await params;
  if (!(await canAccessStudent(id))) {
    notFound();
  }
  const student = await getStudent(id);
  if (!student) notFound();

  return (
    <div className="panel space-y-6 px-6 py-8 sm:px-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          Your application
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Update your details or re-upload your ID, then verify again.
        </p>
      </div>
      <StudentForm initial={student} />
    </div>
  );
}
