import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-cleanframe-body",
  weight: ["400", "500", "600", "700"],
});

const brandFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-cleanframe-brand",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cleanframe",
  description:
    "A CSV workbench for profiling, correcting column types, building charts, and exporting visuals.",
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
        className={`${bodyFont.variable} ${brandFont.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <Script
          id="cleanframe-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />

        {children}
      </body>
    </html>
  );
}