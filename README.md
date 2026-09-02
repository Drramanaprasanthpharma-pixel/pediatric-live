# Real-Time NICU Handover System

A Next.js + PostgreSQL app for live NICU/pediatric bed board, shift handovers, on-call roster, and admissions tracking.

## Stack
- Next.js 16 (App Router, Turbopack)
- PostgreSQL via Drizzle ORM
- Tailwind CSS 4

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the database connection string in `.env`:
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres
   ```
3. Push the schema:
   ```bash
   npx drizzle-kit push
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```

## Deploying (Vercel)

1. Import this repository into Vercel.
2. Add an environment variable `DATABASE_URL` pointing at your Postgres instance (e.g. a Supabase project's connection string — use the pooled/"Transaction" connection string for serverless).
3. Deploy. Build command and output are auto-detected for Next.js.

## Scripts
- `npm run dev` – local dev server
- `npm run build` – production build
- `npm run start` – run production build
- `npm run lint` – lint
- `npm run typecheck` – TypeScript check
