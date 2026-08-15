import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const brand = Montserrat({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Brno4You — Erasmus student portal",
  description: "Student registration and ID verification for Brno for you",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${brand.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <header className="site-header">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="logo-stack text-white">
              <span className="text-lg sm:text-xl">Brno.</span>
              <span className="text-lg sm:text-xl">For you.</span>
            </Link>
            <nav className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wide text-white/90 sm:gap-6 sm:text-sm sm:normal-case sm:tracking-normal sm:font-medium">
              <Link href="/apply" className="hover:text-white">
                Apply
              </Link>
              <a
                href="https://www.brnoforyou.cz/en/"
                target="_blank"
                rel="noreferrer"
                className="hidden hover:text-white sm:inline"
              >
                About
              </a>
              <Link href="/admin" className="hover:text-white">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="relative flex-1 overflow-hidden">{children}</main>
        <footer className="border-t border-[var(--line)] bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-[var(--muted)] sm:px-6">
            <p>Brno for you · Erasmus student portal</p>
            <a
              href="https://www.brnoforyou.cz/en/"
              className="font-medium text-[var(--navy)] hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              brnoforyou.cz
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
