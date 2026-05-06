export default function AboutPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        About Cleanframe
      </h1>

      <p className="mt-4 leading-7 text-slate-600">
        Cleanframe is a portfolio-grade CSV data quality workbench. It is
        designed to demonstrate full-stack TypeScript development and practical
        data analysis workflows.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">MVP scope</h2>

        <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-600">
          <li>Upload and parse CSV files</li>
          <li>Profile dataset structure and quality</li>
          <li>Detect missing values, duplicates, column types, and outliers</li>
          <li>Recommend deterministic cleaning actions</li>
          <li>Export cleaned datasets and reports in later milestones</li>
        </ul>
      </div>
    </div>
  );
}