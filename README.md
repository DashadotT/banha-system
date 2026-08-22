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

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase SQL Editor, run the schema in `supabase/schema.sql`. This creates all tables (`profiles`, `devices`, `recordings`, `environmental_readings`, `assessments`), sets up Row Level Security policies, a trigger to auto-create a profile on signup, and enables Realtime on `recordings` and `environmental_readings`.
3. In **Authentication → Users**, create at least one user (email + password) so you can log in. Their `profiles` row is created automatically; update its `role` to `administrator` or `researcher` as needed (default is `researcher`).
4. In **Authentication → Providers**, make sure Email/Password sign-in is enabled.
5. Add at least one row to `devices` (e.g. `device_name: BANHA-01`, `node_number: 1`) so recordings have somewhere to attach.

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

## Project Structure

```
src/
├── components/
│   ├── layout/        Sidebar, Topbar, AppLayout, Logo
│   ├── dashboard/      Dashboard-specific cards & panels
│   ├── charts/         Recharts trend chart
│   ├── recordings/     Recording status badge
│   ├── assessments/    Assessment entry form
│   ├── analysis/       Pearson & t-test result tables
│   ├── auth/            ProtectedRoute
│   └── common/          Button, Card, Badge, Modal, Table, FormField, States
├── pages/               One file per route (Login, Dashboard, LiveMonitoring, …)
├── services/            Supabase client + data access functions per domain
├── hooks/                useAsync, useMediaQuery
├── context/              AuthContext
├── types/                TypeScript interfaces matching the DB schema
└── utils/                dateTime.ts, calculations.ts, statistics.ts
```

## Key Behaviors

- **Archive, never delete.** Recordings and assessments use `is_archived` / `archived_at` instead of hard deletes. Archiving requires confirmation and immediately excludes the record from active lists, Dashboard totals, Pearson correlation, t-tests, and reports. Records can be restored from the **Archived Records** page.
- **12-hour time format everywhere**, via the shared utilities in `src/utils/dateTime.ts`.
- **Live Monitoring** is wired for Supabase Realtime — it subscribes to `INSERT` events on `environmental_readings` and status changes on `recordings`, so a device sending `START` / `DATA` / `STOP` packets updates the UI without a page refresh.
- **Statistics are computed, not hardcoded.** `src/utils/statistics.ts` implements Pearson's r with a real Student's t-distribution p-value (incomplete beta function) and an independent-samples (Welch's) t-test, both driven entirely by the filtered, non-archived dataset.
- **No mock data.** Every page fetches from Supabase through the `services/` layer; pages show loading, error, and empty states while data is unavailable.

## Notes for Going Live

- The RLS policies in `schema.sql` currently allow any authenticated user full read/write access to research data — tighten these (e.g. restrict assessment/recording writes to `administrator` role) before deploying to production.
- The BANHA device→Node 2→Supabase ingestion path (writing `recordings` and `environmental_readings` rows from `START` / `DATA` / `STOP` packets) is expected to be implemented on the Node 2 / gateway side using the Supabase service role key — this web app only reads and displays that data.
