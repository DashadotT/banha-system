# BANHA
### Bridging Air, Noise, Heat, and Achievement

An IoT-based classroom environmental monitoring and research data management system built for a quasi-experimental study on classroom conditions (CO₂, temperature, noise) and academic performance.

---

## Tech Stack

- **React 19 + TypeScript** — component architecture
- **Vite** — build tooling
- **Tailwind CSS** — styling (BANHA color palette)
- **Supabase** — Authentication, Database (Postgres), Realtime
- **React Router** — routing & protected routes
- **Recharts** — environmental trend charts
- **Lucide React** — icons

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

Run these four files from `supabase/`, in the Supabase SQL Editor, **in order**:

1. **`01_schema.sql`** — creates all core tables (`profiles`, `devices`, `recordings`, `environmental_readings`, `assessments`, `settings_options`), the `recording_summary` view, triggers (auto-create a profile on signup, auto-set `ended_at` when a recording stops, auto-complete a recording once assessed), Row Level Security policies for both the authenticated web app and the anonymous Node 2 IoT gateway, and enables Realtime on `recordings` and `environmental_readings`.
2. **`02_activity_log.sql`** — adds the `activity_log` table and a set of triggers that automatically record research-data actions (recording start/stop, archive/restore/delete, assessment add/edit, settings changes, account renames) for the Dashboard's Activity Log widget — regardless of whether the action came from the web app or from Node 2.
3. **`03_seed.sql`** — adds starter Subjects/Sections/Assessment Types (editable later from System Settings) and a test device with a fixed ID (`11111111-1111-1111-1111-111111111111`) — **this ID must match the device ID configured on Node 2**, since Node 2 authenticates with the anon key and writes recordings/readings against it directly.

Then, outside the SQL editor:

4. In **Authentication → Users**, create at least one user (email + password) so you can log in. Their `profiles` row is created automatically; update its `role` to `administrator` or `researcher` as needed (default is `researcher`).
5. In **Authentication → Providers**, make sure Email/Password sign-in is enabled.

If you ever need to start over, **`supabase/04_teardown.sql`** drops everything the three files above created (tables, policies, triggers, functions, the view, and the Realtime registrations). It is destructive and permanently deletes all data — re-run `01_schema.sql`, `02_activity_log.sql`, and `03_seed.sql` afterward to rebuild.

### 3. Configure environment variables

Copy the example file and fill in your project credentials (found under **Settings → API** in Supabase):

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Run the dev server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
```

## Deploying

This is a client-side single-page app (React Router with `BrowserRouter`), so the hosting platform needs to serve `index.html` for *every* route — otherwise refreshing on a page like `/recordings` returns a 404, since there's no physical file at that path.

- **Vercel**: the included `vercel.json` already handles this with a rewrite rule that serves `index.html` for any non-asset path. No extra configuration needed — just deploy as-is.
- **Netlify** or other static hosts: add an equivalent SPA fallback (e.g. a `public/_redirects` file with `/* /index.html 200` for Netlify).

## Project Structure

```
src/
├── components/
│   ├── layout/        Sidebar, Topbar, AppLayout, Logo
│   ├── dashboard/      Dashboard-specific cards, panels & Activity Log widget
│   ├── charts/         Recharts trend chart
│   ├── recordings/     Recording status badge
│   ├── assessments/    Assessment entry form
│   ├── analysis/       Pearson & t-test tables, scatter/bar charts, printable report
│   ├── settings/        Configurable option-list manager (Subjects/Sections/Types)
│   ├── auth/            ProtectedRoute
│   └── common/          Button, Card, Badge, Modal, Table, FormField, Tabs, States
├── pages/               One file per route (Login, Dashboard, LiveMonitoring, …, Settings)
├── services/            Supabase client + data access functions per domain
├── hooks/                useAsync, useMediaQuery
├── context/              AuthContext
├── types/                TypeScript interfaces matching the DB schema
└── utils/                dateTime.ts, calculations.ts, statistics.ts
```

## Key Behaviors

- **Archive by default, delete only when you mean it.** Recordings and assessments use `is_archived` / `archived_at` instead of hard deletes, and are excluded from active lists, Dashboard totals, Pearson correlation, t-tests, and reports the moment they're archived. Records can be restored — or, from **Archived Records** only, permanently deleted with a strongly-worded confirmation, which cascades to any linked environmental readings/assessment.
- **Pages update live, not just on refresh.** Dashboard, Recordings, Assessments, Statistical Analysis, Archived Records, Recording Details, and the Settings option lists all subscribe to Supabase Realtime (`src/hooks/useRealtimeRefresh.ts`) and refetch automatically when the underlying data changes — including changes made by Node 2 directly.
- **Environmental status thresholds are explained in-app.** Every CO₂/Temperature/Noise value is classified Normal/Moderate/Poor (see `src/utils/calculations.ts` for the exact numbers), and an **Info ("Status guide")** button next to these values opens a plain-language explanation of the thresholds.
- **Activity Log** on the Dashboard shows a running feed of research-data actions — recording start/stop, archive/restore/delete, assessment changes, settings changes, account renames — populated automatically by database triggers (`supabase/02_activity_log.sql`), so it captures actions from Node 2 as well as the web app. Page navigation is never logged.
- **12-hour time format everywhere**, via the shared utilities in `src/utils/dateTime.ts`.
- **Live Monitoring** is wired for Supabase Realtime — it subscribes to `INSERT` events on `environmental_readings` and status changes on `recordings`, so a device sending `START` / `DATA` / `STOP` packets updates the UI without a page refresh. The Dashboard also falls back to showing the previous recording's last known values (clearly labeled) while a new recording is waiting for its first packet, rather than going blank.
- **Statistics are computed, not hardcoded.** `src/utils/statistics.ts` implements Pearson's r with a real Student's t-distribution p-value (incomplete beta function) and an independent-samples (Welch's) t-test, both driven entirely by the filtered, non-archived dataset.
- **No mock data.** Every page fetches from Supabase through the `services/` layer; pages show loading, error, and empty states while data is unavailable.
- **Subjects, Sections, and Assessment Types are configurable**, not hardcoded. They live in the `settings_options` table and are managed from the **System Settings** page — with inline rename and **archive-only removal** (never a hard delete), so historical assessments that reference a value are never orphaned. Archived options can be restored at any time.
- **One assessment per recording**, editable after the fact. Adding assessment details is guarded against duplicate/rapid-click submissions, and an **Edit** button on Recording Details lets researchers correct details later without creating a second record.
- **Statistical Analysis** includes Descriptive Statistics, Pearson Correlation, T-Test, Graphs & Plots, and a Generate Report tab — each with a "How is this calculated?" explainer, and the report tab can export the filtered dataset or all recordings (with current filters applied) as CSV.

## Notes for Going Live

- The RLS policies in `01_schema.sql` currently allow any authenticated user full read/write access to research data — tighten these (e.g. restrict assessment/recording writes to `administrator` role) before deploying to production.
- Node 2 (the ESP32 IoT gateway) writes `recordings` and `environmental_readings` rows directly using the Supabase **anon/publishable key**, via the `"IoT can …"` policies in `01_schema.sql` — not the service role key. This keeps the anon key scoped to only what Node 2 needs (create/view/update recordings, insert/view readings, view devices) rather than granting it full database access. Review these policies before going live, and make sure the seeded test device ID in `03_seed.sql` matches what's configured on Node 2.
