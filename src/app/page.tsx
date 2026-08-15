import Link from "next/link";

export default function HomePage() {
  return (
    <section className="panel relative overflow-hidden px-8 py-16 sm:px-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231f6f5b' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative max-w-xl space-y-5">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent)]">
          Erasmus NGO portal
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
          Brno4You
        </h1>
        <p className="text-lg text-[var(--muted)]">
          Submit your student details and ID so we can prepare your Erasmus
          paperwork.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/apply" className="btn-primary">
            Start application
          </Link>
          <Link href="/admin/login" className="btn-secondary">
            Admin login
          </Link>
        </div>
      </div>
    </section>
  );
}
