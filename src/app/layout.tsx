import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";

import "./globals.css";

const siteUrl = "https://cleanframe.inamullahmd.com";

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
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cleanframe — CSV Data Cleaning, Profiling, and Chart Builder",
    template: "%s | Cleanframe",
  },
  description:
    "Cleanframe is a browser-first CSV workspace for profiling messy datasets, fixing schema issues, inspecting rows, cleaning missing values, tracking history, and building exportable charts.",
  applicationName: "Cleanframe",
  authors: [
    {
      name: "Inamullah Mohammad",
      url: "https://inamullahmd.com",
    },
  ],
  creator: "Inamullah Mohammad",
  publisher: "Inamullah Mohammad",
  keywords: [
    "Cleanframe",
    "CSV cleaner",
    "CSV data cleaning tool",
    "CSV schema profiler",
    "CSV chart builder",
    "data profiling",
    "data quality tool",
    "browser CSV editor",
    "missing value detection",
    "outlier detection",
    "schema editor",
    "data cleaning portfolio project",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Cleanframe — CSV Data Cleaning, Profiling, and Chart Builder",
    description:
      "Upload a CSV, inspect data quality, correct schema types, clean missing values, track history, and build exportable charts from one browser-first workspace.",
    url: siteUrl,
    siteName: "Cleanframe",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cleanframe CSV workspace preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cleanframe — CSV Data Cleaning, Profiling, and Chart Builder",
    description:
      "A browser-first CSV workspace for profiling, cleaning, schema editing, and chart export.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
          dangerouslySetInnerHTML={{
            __html: themeInitScript,
          }}
        />

        {children}
      </body>
    </html>
  );
}
