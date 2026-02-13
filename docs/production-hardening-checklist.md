# Production Hardening Checklist

This checklist is ordered for safe rollout. Each PR should be deployable on its own.

## PR-1: Critical Tenant Security and Access Control

- [x] Enforce tenant ownership in customer mutations.
  - `lib/server actions/customer.ts`
- [x] Enforce tenant ownership in service mutations.
  - `lib/server actions/services.ts`
- [x] Enforce tenant ownership in employee mutations and password reset.
  - `lib/server actions/employees.ts`
- [x] Enforce tenant ownership in sale-event delete and stricter owner-only mutation policy.
  - `lib/server actions/sale-event.ts`
  - `lib/auth/guards.ts` (reuse existing owner guard)
- [x] Enforce owner access to sale-events page.
  - `app/(private)/app/[businessSlug]/sale-events/page.tsx`
- [x] Prevent cross-tenant service/package linking in sale-event creation.
  - `lib/server actions/sale-event.ts`
- [x] Remove business-slug trust from customer search and force auth tenant scope.
  - `lib/server actions/customer.ts`
- [x] Add auth and upload validation (type/size) to server upload action.
  - `lib/server actions/upload.ts`

## PR-2: High-Priority Data/Query Scalability

- [x] Reduce owner dashboard query load and move heavy aggregates to DB.
  - `components/dashboard/owner/OwnerDashboardDataContainer.tsx`
- [x] Fix tenant filter bug on attendance metric.
  - `components/dashboard/owner/OwnerDashboardDataContainer.tsx`
- [x] Paginate bookings server-side and support server filters.
  - `app/(private)/app/[businessSlug]/bookings/page.tsx`
  - `components/dashboard/owner/BookingList.tsx`

## PR-3: High-Priority Async Reliability (Outbox/Cron/Reminders)

- [x] Make outbox claiming concurrency-safe and increase controlled throughput.
  - `app/api/cron/process-outbox/route.ts`
- [x] Make subscription renewal/dunning cron batches parallel-safe and chunked.
  - `app/api/cron/subscription-renewals/route.ts`
  - `app/api/cron/subscription-dunning/route.ts`
- [x] Fix reminder booking links to use canonical business slug.
  - `lib/services/flow-reminders.ts`
  - `lib/services/re-engagement.ts`
- [x] Improve reminder sending batching and DB access patterns.
  - `lib/services/reminders.ts`
  - `lib/services/flow-reminders.ts`
  - `lib/services/re-engagement.ts`

## PR-4: Caching and Schema Hardening

- [x] Add cache tagging for tenant business/service/package caches.
  - `lib/data/cached.ts`
- [x] Add revalidation tag invalidation on relevant write paths.
  - `lib/server actions/services.ts`
  - `lib/server actions/packages.ts`
  - `lib/server actions/business-settings.ts`
  - `lib/server actions/sale-event.ts`
- [x] Harden auth zod schema (non-empty password and proper register schema constraints).
  - `lib/zod schemas/auth.ts`

## PR-5: Runtime Security and Request Protection

- [x] Tighten CSP and remove duplicate header injection path.
  - `lib/security/headers.ts`
  - `next.config.ts`
  - `proxy.ts`
- [x] Narrow proxy matcher and reduce unnecessary auth token work on public routes.
  - `proxy.ts`
- [x] Harden rate-limit behavior for sensitive paths and reduce fail-open risk.
  - `lib/rate-limit.ts`
  - `proxy.ts`
  - `app/api/paymongo/webhook/route.ts` (if endpoint-specific policy needed)

## PR-6: Booking Flow Efficiency and UX Maintainability

- [x] Remove duplicate pricing/availability compute path from booking create flow.
  - `lib/server actions/booking.ts`
  - `lib/services/booking.ts`
- [x] Begin decomposition of oversized booking form module.
  - `components/bookings/BookingForm.tsx`
  - `components/bookings/*` (new extracted hooks/components)

## PR-7: Quality Gates and Test Depth

- [x] Add auth/tenant boundary tests for customer/service/employee/sale-event actions.
  - `lib/server actions/*.test.ts`
- [x] Add outbox concurrency and idempotency tests.
  - `app/api/cron/process-outbox/route.test.ts`
  - `lib/services/outbox.test.ts`
- [x] Add sale-event integration tests (owner-only, cross-tenant IDs rejected).
  - `lib/server actions/sale-event.test.ts` (new)
- [x] Raise coverage thresholds to production bar.
  - `vitest.config.ts`
- [x] Expand E2E beyond smoke paths.
  - `test/e2e/*.spec.ts`
  - `playwright.config.ts` (if parallel/test matrix adjustments required)

## Release Gate

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test:ci`
- [x] `npm run test:e2e` (requires `DIRECT_DATABASE_URL` for DB smoke)
- [x] `npm run build` (runs `prisma migrate deploy` before build)
- [x] `npm run verify:release`
