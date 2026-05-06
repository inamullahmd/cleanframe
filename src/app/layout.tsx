import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-cleanframe",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Cleanframe",
  description:
    "A CSV data quality workbench for profiling, validating, cleaning, and exporting datasets.",
};

const themeInitScript = `
(function () {
  try {
    var savedTheme = localStorage.getItem("cleanframe-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = savedTheme || (prefersDark ? "dark" : "light");

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunito.variable} min-h-screen font-sans text-[var(--text)] antialiased`}
      >
        <Script
          id="cleanframe-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />

        <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="group flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-indigo-500 text-lg font-black text-white shadow-lg shadow-teal-500/20 transition group-hover:rotate-6">
                C
              </span>

              <span className="text-xl font-black tracking-tight text-[var(--text)]">
                Cleanframe
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="hidden gap-2 rounded-full border border-[color:var(--border)] bg-[var(--surface)] p-1 text-sm font-bold text-[var(--muted)] shadow-sm backdrop-blur md:flex">
                <Link
                  href="/upload"
                  className="rounded-full px-3 py-2 transition hover:bg-[var(--accent-soft)] hover:text-[var(--text)]"
                >
                  Upload
                </Link>
                <Link
                  href="/profile"
                  className="rounded-full px-3 py-2 transition hover:bg-[var(--accent-soft)] hover:text-[var(--text)]"
                >
                  Profile
                </Link>
                <Link
                  href="/about"
                  className="rounded-full px-3 py-2 transition hover:bg-[var(--accent-soft)] hover:text-[var(--text)]"
                >
                  About
                </Link>
              </div>

              <ThemeToggle />
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}