# ServiceFlow

ServiceFlow is a Next.js SaaS platform for service businesses (salons, spas, barbershops) that combines public booking, operations management, attendance/payroll tooling, and payment workflows.

![ServiceFlow Landing](public/ServiceFlow2-logo.png)

## What is implemented

- Public booking pages per business slug (`/[businessSlug]`)
- Service and package management
- Voucher and sale event management
- Owner and employee dashboards
- Attendance (clock in/out, leave requests, paid leave tracking)
- Payroll and payslip workflows
- Customer records and booking history
- Cash and QRPH booking/payment paths (PayMongo integration)
- Email workflows (booking confirmations, reminders, re-engagement, flow reminders)
- Background cron endpoints for operational jobs
- Transactional outbox and audit log models

## Tech stack

- Next.js 16 (App Router, Server Components, Route Handlers)
- TypeScript
- React 19
- PostgreSQL
- Prisma 7 (`@prisma/adapter-pg` + `pg` pool)
- NextAuth (credentials provider)
- TanStack Query
- Tailwind CSS v4 + Radix/shadcn-style components
- Vitest + Testing Library
- Sentry

## Quick start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database
- npm (lockfile in repo is `package-lock.json`)

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment variables

Create `.env` in the project root.

Minimum local setup:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/serviceflow?schema=public"
NEXTAUTH_SECRET="replace-me-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

For payment, email, uploads, and cron jobs, also configure:

```env
PAYMONGO_SECRET_KEY=""
PAYMONGO_WEBHOOK_SECRET=""
RESEND_API_KEY=""
BLOB_READ_WRITE_TOKEN=""
CRON_USER="admin"
CRON_PASSWORD=""
```

Optional:

```env
APP_URL="http://localhost:3000"
BOOKING_SUCCESS_TOKEN_SECRET=""
```

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 7. Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - ESLint
- `npm run test` - Vitest
- `npm run typecheck` - TypeScript type check
- `npm run test:ci` - Vitest with coverage thresholds
- `npm run test:e2e` - Playwright booking smoke test

## API and operational endpoints

### Public/system routes

- `GET /api/health` - health check JSON
- `POST /api/upload` - authenticated upload token endpoint
- `GET /api/paymongo/webhook` - webhook health
- `POST /api/paymongo/webhook` - PayMongo webhook receiver

### Cron routes (HTTP Basic auth required)

- `GET /api/cron/expire-holds`
- `GET /api/cron/reminders`
- `GET /api/cron/re-engagement`
- `GET /api/cron/flow-reminders`
- `GET /api/cron/process-outbox`

Auth credentials are validated against `CRON_USER` (default `admin`) and `CRON_PASSWORD`.

Example:

```bash
curl -u "$CRON_USER:$CRON_PASSWORD" http://localhost:3000/api/cron/expire-holds
```

## Security and platform notes

- Route access is enforced in `proxy.ts` (redirects unauthenticated `/app/*` traffic).
- API rate limiting is currently in-memory (`lib/rate-limit.ts`).
- Security headers are configured in both `proxy.ts` and `next.config.ts`.
- Private dashboard pages are marked `noindex`.

## Deployment

### Docker

```bash
docker build -t service-flow .
docker run -p 3000:3000 --env-file .env service-flow
```

### Vercel

- Set the same environment variables in your Vercel project.
- Configure cron schedules in Vercel dashboard (current `vercel.json` has no cron entries).
- Ensure PayMongo webhook points to `/api/paymongo/webhook`.

## Project structure

```text
app/                    # App Router pages, route handlers, metadata routes
app/(public)/           # Public business pages and booking flow
app/(private)/          # Authenticated app dashboard routes
app/api/                # Health, auth, upload, webhook, cron handlers
components/             # UI, dashboard, bookings, landing, SEO components
lib/                    # Business logic, server actions, utilities, services
prisma/schema.prisma    # Data model
prisma/migrations/      # Prisma migrations
prisma/seed.ts          # Development seed script
prisma/sql/             # Manual SQL hardening scripts
```

## Current gaps and caveats

- `app/[businessSlug]/inbox` is currently placeholder UI.
- No separate `API.md` exists in this repository.
- No `LICENSE` file currently exists in the repository root.
