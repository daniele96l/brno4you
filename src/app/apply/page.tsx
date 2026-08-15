import { StudentForm } from "@/components/StudentForm";

export default function ApplyPage() {
  return (
    <div className="panel space-y-6 px-6 py-8 sm:px-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          Student application
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Fill in your details exactly as on your ID or passport. We will check
          them against your uploaded document.
        </p>
      </div>
      <StudentForm />
    </div>
  );
}
