import Script from "next/script";

import { WorkbenchShell } from "@/components/workbench/shell/WorkbenchShell";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Cleanframe",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://cleanframe.inamullahmd.com",
  author: {
    "@type": "Person",
    name: "Inamullah Mohammad",
    url: "https://inamullahmd.com",
  },
  creator: {
    "@type": "Person",
    name: "Inamullah Mohammad",
    url: "https://inamullahmd.com",
  },
  description:
    "Cleanframe is a browser-first CSV workspace for profiling messy datasets, editing schema, cleaning missing values, tracking history, and building exportable charts.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "CSV data profiling",
    "Schema editing",
    "Missing value detection",
    "Outlier detection",
    "CSV data grid",
    "Chart builder",
    "Export package",
    "Browser storage session restore",
  ],
};

export default function HomePage() {
  return (
    <>
      <Script
        id="cleanframe-structured-data"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      <WorkbenchShell />
    </>
  );
}
