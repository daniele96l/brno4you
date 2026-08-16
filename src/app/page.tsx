import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <section className="relative mx-auto min-h-[calc(100vh-8rem)] max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
      {/* Pastel circle blobs — brand vibe from brnoforyou.cz */}
      <div
        className="blob animate-soft-pulse bg-[var(--lavender)]"
        style={{
          width: "42vw",
          maxWidth: 520,
          aspectRatio: "1",
          top: "-8%",
          right: "8%",
          opacity: 0.85,
        }}
      />
      <div
        className="blob animate-float bg-[var(--mint)]"
        style={{
          width: "28vw",
          maxWidth: 340,
          aspectRatio: "1",
          top: "18%",
          right: "28%",
          opacity: 0.75,
        }}
      />
      <div
        className="blob bg-[var(--sky)]"
        style={{
          width: "36vw",
          maxWidth: 420,
          aspectRatio: "1",
          bottom: "-12%",
          left: "-8%",
          opacity: 0.9,
        }}
      />
      <div
        className="blob bg-[var(--lavender)]"
        style={{
          width: 180,
          aspectRatio: "1",
          bottom: "18%",
          left: "22%",
          opacity: 0.45,
        }}
      />

      <div className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
        <div className="animate-fade-up max-w-xl space-y-6">
          <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-[var(--navy)] sm:text-4xl lg:text-[2.65rem]">
            Ready for your Erasmus journey with Brno for you?
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-[var(--mint-text)] sm:text-lg">
            Choose a project, submit your registration, and track approval in
            your participant portal. After you are accepted you can sign the
            required documents online.
          </p>
          <div className="flex flex-col items-start gap-4 pt-2 sm:flex-row sm:items-center">
            <Link href="/apply" className="btn-link-cta group">
              <span className="cta-icon transition-transform group-hover:translate-x-0.5">
                ›
              </span>
              Apply to a project
            </Link>
            <Link
              href="/apply/portal"
              className="text-sm font-semibold text-[var(--navy)] underline-offset-4 hover:underline"
            >
              Open my participant profile
            </Link>
          </div>
          <Link
            href="/admin/login"
            className="inline-block text-sm font-medium text-[var(--mint-text)] underline-offset-4 hover:text-[var(--navy)] hover:underline"
          >
            Administrator login
          </Link>
        </div>

        <div className="animate-fade-up-delay relative mx-auto w-full max-w-md lg:max-w-none">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square w-[115%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--lavender)]"
            aria-hidden
          />
          <div className="relative z-[1] mx-auto aspect-square w-[min(100%,420px)] overflow-hidden rounded-full shadow-[0_25px_60px_rgba(36,58,140,0.18)] ring-8 ring-white">
            <Image
              src="/hero-circle.jpg"
              alt="Young people together outdoors"
              fill
              className="object-cover"
              sizes="420px"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
