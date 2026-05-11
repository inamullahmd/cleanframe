# Cleanframe

Cleanframe is a browser-first CSV workspace for turning messy CSV files into cleaner, schema-aware, chart-ready datasets.

Live site: https://cleanframe.inamullahmd.com  
Repository: https://github.com/inamullahmd/cleanframe

---

## Overview

Cleanframe helps users upload CSV files, inspect schema quality, correct inferred column types, explore table data, detect missing values and outliers, track workspace history, build charts, and export a packaged ZIP containing cleaned data, schema information, and saved chart images.

Workflow:

```txt
Upload CSV
→ Profile columns
→ Correct schema
→ Inspect data
→ Clean missing values
→ Track changes
→ Build charts
→ Export package
```

Cleanframe is designed as a compact, low-noise, spreadsheet-inspired data preparation tool. It is best used before analysis, reporting, visualization, or portfolio project work.

---

## Key Features

### CSV Upload

- Upload CSV files directly from the browser.
- Load an included sample dataset.
- Configure CSV parsing options.
- Supports comma, semicolon, tab, pipe, and custom delimiters.
- Custom delimiters may contain multiple characters, such as `::`, `||`, `###`, or `~|~`.
- Supports custom empty-value tokens.
- Browser-first workflow with no account required.

### Schema Profiling

Cleanframe profiles uploaded datasets and summarizes:

- Column names
- Inferred column types
- Missing values
- Unique values
- Duplicate rows
- Data quality score
- Outlier indicators
- Review warnings
- Clean/review status

Supported inferred column types include ID, UUID, Text, Category, Boolean, Integer, Decimal, Number, Currency, Percentage, Date, Date Time, Time, Email, Phone, URL, Country Code, Postal Code, Latitude, Longitude, and JSON.

### Schema Editor

- Rename columns.
- Override inferred column types.
- Delete columns.
- View compact column cards.
- Expand/collapse metrics.
- Review status per column.
- Responsive card grid layout.
- Compact typography and spreadsheet-style controls.

### Data Grid

- Search rows and columns.
- Sort data.
- Paginate rows.
- Switch between formatted and raw CSV values.
- Hide/show visible columns.
- Highlight missing values.
- Highlight outliers.
- Adjust table text size.
- Configure row density and page size.
- Use horizontal scrolling for wide datasets.

### Cleaning Tools

The Clean module focuses on missing-value handling.

Supported strategies:

- Leave missing values unchanged
- Drop rows
- Fill custom value
- Fill zero
- Fill median
- Fill mean
- Fill min
- Fill max
- Fill mode
- Fill configured unknown value
- Fill previous
- Fill next

### History

Cleanframe tracks workspace changes so users can review and restore prior states.

History covers schema edits, column deletion, cleaning actions, restore points, and workspace reverts.

### Charts

The Charts module uses Apache ECharts through `echarts` and `echarts-for-react`.

Supported charts:

- Bar
- Line
- Area
- Pie
- Scatter
- Histogram

Supported aggregations:

- Count
- Sum
- Average
- Median
- Minimum
- Maximum

Chart features:

- Editable chart title
- Title position: left, center, right
- Dynamic display options by chart type
- Recommended/category/numeric/date-time/all column pools
- PNG export
- Save chart to export package
- Configurable label content
- Configurable value and percentage decimals
- Tooltip formatting
- Legend, axis, grid, zoom, and animation controls

### Export Package

The Export Package module downloads a ZIP file containing selected workspace artifacts.

It can include:

- Current cleaned data grid
- Schema/profile information
- Cleaning/history information
- Saved chart PNGs

### Settings

Cleanframe includes a full Settings module covering:

- CSV parsing
- Import behavior
- Schema detection
- Data grid display
- Cleaning behavior
- History behavior
- Chart defaults
- Export package defaults
- Workspace persistence

Examples of configurable settings:

- Delimiter mode
- Custom delimiter
- Header row detection
- Empty value tokens
- Trim cells on import
- Date parsing mode
- Number parsing mode
- Column name cleaning
- Duplicate column handling
- Profile sample size
- ID column detection
- Numeric/date detection strictness
- Grid formatting
- Chart defaults
- Export defaults
- Save session behavior

### Save Session

When Save Session is enabled, Cleanframe saves the current workspace locally in browser storage so it can be restored on the same device/browser.

This is for convenience, not permanent cloud storage. Clearing browser storage, cache, or site data can remove saved sessions.

---

## Mobile Experience

Cleanframe supports smaller screens with a mobile navigation drawer, but it is best used on a laptop or desktop because CSV tables, schema cards, and chart controls are naturally wide and dense.

---

## Design Direction

Cleanframe is intended to feel like:

```txt
Notion + Observable + Airtable
```

Design principles:

- Clean
- Compact
- Schema-first
- Low-noise
- Spreadsheet-inspired
- Modular
- Calm
- Analytical
- Dense but readable

The app avoids AI-dashboard styling, enterprise admin-panel clutter, oversized controls, Material-heavy visuals, and duplicated metrics sections.

---

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Zustand
- shadcn/ui components
- Apache ECharts
- `echarts-for-react`
- Lucide React icons
- Browser storage / IndexedDB for local persistence

Install chart dependencies:

```bash
npm install echarts echarts-for-react
```

Old PDF export dependency was removed:

```bash
npm uninstall jspdf
```

---

## Project Structure

```txt
src/
├── app/
│   ├── api/profile/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   ├── robots.ts
│   └── sitemap.ts
├── components/workbench/
│   ├── analytics/
│   ├── clean/
│   ├── export/
│   ├── header/
│   ├── history/
│   ├── persistence/
│   ├── profiling/
│   ├── sample/
│   ├── schema/
│   ├── settings/
│   ├── shell/
│   ├── sidebar/
│   ├── table/
│   └── upload/
├── hooks/
├── lib/
├── store/
└── types/
```

---

## Getting Started

Clone the repository:

```bash
git clone https://github.com/inamullahmd/cleanframe.git
cd cleanframe
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

## Build

```bash
npm run build
```

Run production build locally:

```bash
npm run start
```

---

## Deployment

Cleanframe is deployed at:

```txt
https://cleanframe.inamullahmd.com
```

Recommended Hostinger settings:

```txt
Framework preset: Next.js
Branch: source
Root directory: ./
Build command: npm run build
Package manager: npm
Output directory: .next
Node version: 20.x
```

If the app is connected to GitHub deployment, pushing to the configured branch triggers deployment automatically.

---

## SEO

Cleanframe includes SEO support through:

- Next.js metadata in `src/app/layout.tsx`
- Open Graph metadata
- Twitter card metadata
- `robots.ts`
- `sitemap.ts`
- Structured data in `src/app/page.tsx`
- `public/og-image.png`

Generated SEO URLs:

```txt
https://cleanframe.inamullahmd.com/robots.txt
https://cleanframe.inamullahmd.com/sitemap.xml
```

Recommended after deployment:

1. Open Google Search Console.
2. Add property: `https://cleanframe.inamullahmd.com`
3. Submit sitemap: `https://cleanframe.inamullahmd.com/sitemap.xml`
4. Request indexing for the homepage.

---

## Open Graph Image

Place the Open Graph preview image at:

```txt
public/og-image.png
```

Recommended size:

```txt
1200 × 630 px
```

This image appears when Cleanframe is shared on platforms like LinkedIn, Twitter/X, Discord, Slack, WhatsApp, and iMessage.

---

## Local-First Privacy Model

Cleanframe is browser-first.

Current behavior:

- CSV files are processed for workspace use.
- Save Session stores workspace data locally in the browser.
- No user account is required.
- No permanent cloud database is used for workspace storage.
- Clearing browser storage can remove saved sessions.

Cleanframe should not be treated as secure long-term storage. Users should export their work if they need a permanent copy.

---

## Current Modules

Sidebar modules:

```txt
01 Schema
02 Data
03 Clean
04 History
05 Charts
06 Export package
Settings
```

Upload/source controls are available from the sidebar. Theme and Save Session controls are available in the top bar.

---

## Known Limitations

- Best experience is on laptop/desktop.
- Mobile is supported through a drawer layout, but wide tables and dense chart controls are harder to use on small screens.
- Session persistence depends on browser storage.
- Clearing browser data can remove saved workspace sessions.
- The app is local-first and does not provide account-based cloud sync.
- Very large CSV files may be limited by browser memory and upload constraints.
- This is a portfolio/workbench application, not a full enterprise data platform.

---

## Roadmap

High-priority ideas:

- Drag-and-drop chart builder
- Multi-series charts
- Dataset joins
- Derived/computed columns
- Formula engine
- Column profiling distributions
- Heatmaps
- Correlation matrix
- Save chart presets
- Dashboard mode

Medium-priority ideas:

- Virtualized table rows
- Dataset tabs
- Undo/redo stack
- Column lineage
- Export chart images in batches
- Theme system cleanup

Low-priority ideas:

- Dark theme polish
- Keyboard shortcuts
- Resizable panels
- Workspace persistence improvements
- Collaborative sessions

---

## Author

Built by Inamullah Mohammad.

Portfolio: https://inamullahmd.com  
Project: https://cleanframe.inamullahmd.com  
Repository: https://github.com/inamullahmd/cleanframe

---

## License

This project is currently maintained as a personal portfolio project. Add a license file if you want to make reuse permissions explicit.