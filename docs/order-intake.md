# Order intake on Vercel + Supabase

The feature uses the existing NextAuth sessions and Prisma database connection.
Supabase Realtime carries **only** updates to two content-free `IntakeRevision`
rows (`routes` and `orders`). Customer data is fetched from authenticated Next.js
APIs. `Order` is protected by RLS with no browser grants or policies. Do not add
`Order`, `User`, or other private tables to the Realtime publication for this feature.
No service-role key or second authentication system is needed in the browser.

## Deployment

1. Configure these Vercel environment variables for each intended environment:
   - Existing `DATABASE_URL`, `DIRECT_URL`, and NextAuth configuration.
   - `NEXT_PUBLIC_SUPABASE_URL`: the project's HTTPS API URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred), or
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the project's public browser key.
   Never use a service-role or secret key for a `NEXT_PUBLIC_` variable.
2. Apply the checked-in migration using `npx prisma migrate deploy`. This uses
   `DIRECT_URL`, as configured in `prisma.config.ts`. Use the database owner
   connection with permission to create triggers, RLS policies, and modify the
   `supabase_realtime` publication. Back up production through the normal process.
   Do not run the development seed against production.
   The migration also adds `Route.sortOrder` only if absent: existing application
   code uses it, but the initial migration omitted that column.
3. Confirm `IntakeRevision` is enabled in Supabase Realtime's publication. The
   migration adds it automatically when `supabase_realtime` already exists. If
   that publication was absent when the migration ran, enable the table in the
   Supabase dashboard after enabling Realtime.
4. Deploy on Vercel after setting the environment variables. The realtime client
   now obtains only the public URL/key from `/api/intake/public/realtime` at
   runtime, so an older compiled browser environment cannot silently disable the
   subscription. A missing configuration returns HTTP 503 and an Arabic message;
   a service-role/secret key is rejected and is never returned to the browser.
   Vercel environment changes still need a new deployment to take effect.
5. Open `/admin/intake`. Review Arabic area names and structural activation.
   Known existing English area names are translated by the migration. Unknown
   names require an Arabic name before they can accept orders. All intake starts
   closed. Add any missing routes here using the correct existing business price.
6. Open appropriate routes and share `/order`. Captain screens are
   `/captain/orders` and `/captain/intake`; admin/staff orders are `/admin/orders`.
7. In `/admin/intake`, enable **صلاحية الكابتن في استقبال الطلبات** if the
   Captain should control intake. This defaults off. The setting grants opening/
   closing existing routes and activating/deactivating existing areas only.
   Creation, deletion, renaming, pricing, and role management stay restricted.
   Revocation is checked inside captain mutation transactions and updates live.

The PWA's `/` start URL and `/captain` now lead Captains to active orders. Existing
trip accounting is retained at `/captain/trips` under **المشاوير**.

## Customer tracking

New submissions return a unique, unpredictable tracking reference (128 bits),
including retries of the same submission. The customer receives a copy button
and `/order/track#ref=...` link, and can also type the reference into the tracking
page. Existing orders receive references through the second additive migration.
The tracking API returns only status, timestamps, and a customer-facing
cancellation reason; it never returns contact details, addresses, or internal
notes. Anyone holding the reference can see that limited status, so customers
should retain it and share it only as needed.

The displayed statuses are **تم استقبال طلبك**, **تم التوصيل**, and
**تم إلغاء الطلب**. New cancellations require an explicit customer-facing reason.
Older cancellations without a reason show a contact-administration message.
The tracking page subscribes to order change markers and refreshes after reconnect.

The application must use Supabase's database owner/server connection for Prisma,
not the `anon`/`authenticated` database role. Do not grant those roles access to
customer records to resolve a server connection configuration problem.

## Behavior

- Public orders require an open, active route with active, named areas. Shared
  database row locks coordinate intake checks with route and area changes.
- Manual orders may use closed, structurally active routes. Captains cannot
  create or edit orders; Moderators can create/edit active orders and change
  route availability, but cannot complete/cancel or structurally manage routes.
  Captain intake controls require the admin's persistent setting to be enabled.
- Completing a customer order does not create an accounting `TripRecord`.
  Existing captain earnings/trip entry behavior continues independently.
- Orders retain route-name snapshots and remain stored after completion or
  cancellation. Existing route force-deletion is rejected when orders reference
  the route, before any trip rows are deleted.
- Editing an existing order changes contact/building/notes information. Its route
  stays fixed; an incorrectly routed order can be cancelled by an authorized user
  and recreated. Only SuperAdmin may edit archived details.
- Structural route definitions can change only before any orders or trips refer
  to them. Saving structural route settings closes intake for explicit reopening.
- Intake changes send expected versions, and stale changes are rejected in Arabic.
  Public/manual retries use per-form idempotency keys.
- Realtime subscribes before reconciling data and refreshes after reconnection,
  tab visibility changes, and returning online. Events received during a request
  cause a follow-up refresh. No polling loop is used.
- New feature pages and APIs use network-only PWA rules. Installed clients need
  the newly deployed service worker to activate. Submissions require connectivity.
- `IntakeRevision` exposes only topic names and revision counters, never order
  IDs, phone numbers, addresses, notes, or staff identities. Observers can see
  that operational changes occurred.

## Verification

If existing area/route screens return HTTP 500 after deployment, run
`node scripts/check-intake-db.mjs`. It checks for missing intake columns, lists
migration status, and verifies the Prisma queries without printing customer data
or connection strings. A deployment built with the new Prisma schema requires
the intake migration even on older screens: `findMany()` selects the new columns.
Use `npx prisma migrate deploy` to apply pending migrations before serving the
new build. Rebuilding Prisma or clearing PWA caches does not add database columns.

Run `npm run test:intake`, `npx tsc --noEmit`, and `npm run build`.
Run `node scripts/check-deployed-realtime.mjs` to check whether the public
deployment has runtime realtime configuration (or, for older deployments, whether
the public environment variables were actually embedded). It never prints keys.
The tests use isolated PGlite PostgreSQL, not production Supabase. They cover the
permission matrix, Arabic validation, additive migration, route uniqueness,
retention, activation triggers, stale terminal transitions, transactional change
markers, and browser database privileges.

Before rollout, use separate browser sessions for customer, Captain, Moderator,
and Admin. Check opening/closing in both directions, a public submission racing
closure, manual creation on a closed route, live edit/completion/cancellation,
history updates, disconnect/reconnect, and PWA resume. Supabase Realtime delivery
and publication configuration require this deployment-level check.

Reference: https://supabase.com/docs/guides/realtime/postgres-changes
