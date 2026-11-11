# Campground booking — implementation plan

This plan adds campsite booking to the existing `camp-form` app. It is written to be implemented by someone (or an agent) who has not seen the discussion that produced it. Work one phase at a time, each on its own branch and PR.

## 1. Background and decisions

Mulhurst Camp runs summer camps (the existing app) and also a campground on the same property. The campground has 13 sites that guests book by the night. Bookings are taken by phone and email today.

Decisions already made with the owner:

| Topic | Decision |
|---|---|
| Where it lives | Inside this app: same repo, database, auth, Stripe account, tax rate, deployment |
| Sites | 13 sites, each with its own list of features (power, water, fire pit, and so on) |
| Site choice | Guests pick a specific site |
| Accounts | Guests must have an account to book. Browsing availability is public |
| Payment | In full at booking, through Stripe embedded checkout, CAD, existing `TAX_RATE` |
| Cancellation | Admin-configurable tiers: "N or more days before check-in refunds X%". Example default: 7+ days = 100%, 1+ days = 50%, later = 0% |
| Who manages it | Users with the `admin` role only. `hcp` and `staff` must not see campground admin |
| Camp vs campground | Independent. No date conflicts, no shared capacity, no shared discounts |

Assumptions not yet confirmed by the owner (build them this way, keep them easy to change):

1. Flat nightly rate per site. No weekend, holiday or seasonal rates.
2. The camp's discounts (`discounts` table, Stripe coupons) do not apply to campsite bookings, and promotion codes are off for booking checkouts.
3. Guest details collected: name, phone, party size, free-text notes.
4. Admins can create a booking for a phone caller without a Stripe charge (paid by cash or e-transfer).
5. A refund percentage applies to the whole amount paid, tax included.
6. One site per booking. A guest who wants two sites makes two bookings.

Out of scope: multi-site carts, waitlists, variable pricing, point of sale, check-in tracking.

## 2. Existing code to know

Stack: Next.js 16 (app router, server actions), React 19, Drizzle ORM on Postgres (`postgres-js`), better-auth, Stripe embedded checkout, Resend, shadcn/Radix UI, TanStack Form, Zod 4, Biome, Bun for scripts.

| Concern | Where | Notes |
|---|---|---|
| Schema | `src/lib/data/schema.ts` | `id()` helper (cuid2) and `timestamps` spread. Reuse both |
| Auth tables | `src/lib/data/auth-schema.ts` | `user.role` is a string: `admin`, `hcp`, `staff`, or null |
| Migrations | `drizzle/`, `bun run db:generate` | `start` script runs `drizzle-kit migrate` on deploy |
| Route guard | `src/proxy.ts` | `publicRoutes` list and `adminRouteRoles` patterns |
| Role helpers | `src/lib/auth-helpers.ts` | `adminPage()`, `adminAction()`, `requireAuth()`, `getSession()` |
| Stripe client | `src/lib/stripe.ts` | |
| Checkout session creation | `src/app/registration/checkout/payment/actions.ts` | Pattern to copy: `ui_mode: "embedded"`, `tax_rates: [process.env.TAX_RATE!]` |
| Stripe webhook | `src/app/api/webhooks/stripe/route.ts` | Assumes every line item has `product.metadata.registrationId`. Ignores partial refunds |
| Admin refund | `src/app/admin/[year]/registrations/actions.ts` (`refundRegistration`) | Full refunds only. Pattern to follow |
| Admin shell | `src/app/admin/layout.tsx`, `src/app/admin/components/admin-nav.tsx` | Every nav link is built as `/admin/${year}${href}` |
| Email | `src/lib/email.ts` | `sendEmail()` plus inline HTML template functions |
| Home page | `src/app/page.tsx` | Redirects signed-in users to `/registration/overview` |
| Sign-in/up | `src/app/sign-in/page.tsx`, `src/app/sign-up/page.tsx`, `src/lib/auth.ts` | `callbackURL` is hardcoded to `/registration/overview` in six places |
| Forms and UI | `src/components/forms/*`, `src/components/ui/*` | `date-range-picker.tsx` and `calendar.tsx` already exist |
| Seed | `src/lib/data/seed.ts` | |

Two things in the existing code that matter here:

- The proxy patterns `/admin/users(.*)`, `/admin/discounts(.*)` and `/admin/camps(.*)` never match the real URLs (`/admin/2026/users`), so only the page-level `adminPage()` wrappers enforce admin-only access today. Campground admin routes have no year segment, so a proxy pattern for them will work, but still wrap every page and action.
- `capacity` on `camp_years` is stored and displayed but never enforced. Do not copy that approach. Campsite availability must be enforced by the database.

Conventions to follow: server actions in an `actions.ts` beside the page, Zod schemas in `schema.ts` beside the page or in `src/lib/types/`, shared queries in `src/lib/services/`, money in integer cents, Biome formatting (`bunx biome check --write`).

## 3. Data model

Add to `src/lib/data/schema.ts` (or a new `campground-schema.ts` re-exported from it, so `db.query.*` sees the tables).

```ts
export const CAMPSITE_FEATURES = [
  "power", "water", "sewer", "fire_pit", "picnic_table", "pull_through", "shade", "waterfront",
] as const; // placeholder list, confirm with the owner
export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "expired"] as const;
export const BOOKING_SOURCES = ["online", "admin"] as const;

export type CancellationTier = { minDaysBefore: number; refundPercent: number };

export const campsites = pgTable("campsites", {
  id: id(),
  name: text().notNull(),                       // "Site 7"
  features: text().array().$type<CampsiteFeature[]>().notNull().default(sql`'{}'::text[]`),
  nightlyRate: integer("nightly_rate").notNull(), // cents, before tax
  maxOccupancy: integer("max_occupancy").notNull().default(6),
  description: text(),
  mapX: real("map_x"),                          // marker position on the site map, 0-100 (% from left); null = not placed
  mapY: real("map_y"),                          // 0-100 (% from top)
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

// Single row, id fixed to "default".
export const campgroundSettings = pgTable("campground_settings", {
  id: text().primaryKey().default("default"),
  isBookingOpen: boolean("is_booking_open").notNull().default(false),
  seasonStart: date("season_start"),            // first bookable night
  seasonEnd: date("season_end"),                // last bookable check-out date
  minNights: integer("min_nights").notNull().default(1),
  maxNights: integer("max_nights").notNull().default(14),
  maxAdvanceDays: integer("max_advance_days").notNull().default(365),
  checkInTime: text("check_in_time").notNull().default("14:00"),
  checkOutTime: text("check_out_time").notNull().default("11:00"),
  cancellationTiers: jsonb("cancellation_tiers")
    .$type<CancellationTier[]>()
    .notNull()
    .default([
      { minDaysBefore: 7, refundPercent: 100 },
      { minDaysBefore: 1, refundPercent: 50 },
    ]),
  policyText: text("policy_text"),              // optional extra wording shown to guests
  ...timestamps,
});

export const bookings = pgTable("bookings", {
  id: id(),
  siteId: text("site_id").references(() => campsites.id, { onDelete: "restrict" }).notNull(),
  userId: text("user_id").references(() => user.id), // null for admin-entered phone bookings
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone").notNull(),
  partySize: integer("party_size").notNull(),
  notes: text(),
  adminNotes: text("admin_notes"),
  checkIn: date("check_in").notNull(),          // first night
  checkOut: date("check_out").notNull(),        // morning of departure, exclusive
  status: text({ enum: BOOKING_STATUSES }).notNull().default("pending"),
  source: text({ enum: BOOKING_SOURCES }).notNull().default("online"),
  holdExpiresAt: timestamp("hold_expires_at"),
  subtotal: integer().notNull(),                // sum of night prices, before tax
  pricePaid: integer("price_paid"),             // Stripe amount_total, tax included
  paidOffline: boolean("paid_offline").notNull().default(false),
  cancellationTiers: jsonb("cancellation_tiers").$type<CancellationTier[]>().notNull(), // snapshot at booking time
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: text("cancelled_by", { enum: ["guest", "admin"] }),
  refundAmount: integer("refund_amount"),
  stripeRefundId: text("stripe_refund_id"),
  ...timestamps,
}, (t) => [index().on(t.userId), index().on(t.siteId, t.checkIn), index().on(t.status)]);

// One row per site per occupied night. The primary key is what prevents double booking.
export const bookingNights = pgTable("booking_nights", {
  siteId: text("site_id").references(() => campsites.id, { onDelete: "restrict" }).notNull(),
  night: date().notNull(),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  price: integer().notNull().default(0),        // nightly rate charged for this night
  blockReason: text("block_reason"),            // set when an admin blocks the night, bookingId null
}, (t) => [primaryKey({ columns: [t.siteId, t.night] }), index().on(t.bookingId)]);
```

Add Drizzle `relations` for these tables, and add `bookings: many(bookings)` to `userRelations`.

Rules that go with the model:

- **Dates are strings.** Drizzle `date` columns return `"YYYY-MM-DD"`. Keep them as strings everywhere and never pass them through `new Date()` without an explicit time zone. Put "today at the campground" behind one helper that uses a `CAMPGROUND_TIMEZONE` constant (default `America/Edmonton`, confirm with the owner).
- **A booking occupies nights `checkIn` up to but not including `checkOut`.** A 3 July to 5 July booking has two night rows: 3 July and 4 July.
- **A site is free on a night when no `booking_nights` row exists for it.** Pending holds, confirmed bookings and admin blocks all hold rows.
- **Freeing a site means deleting its night rows.** Cancelled and expired bookings keep their `bookings` row and lose their night rows.
- **Never check availability and then insert.** Insert the night rows inside a transaction and treat a primary-key violation (Postgres code `23505`) as "site no longer available".

## 4. Core logic

Put this in `src/lib/services/campground-service.ts` and a pure-function module `src/lib/campground/` so it can be unit tested with `bun test` (the repo has no tests yet; add them for the pure functions below).

### Pure functions (unit test these)

- `nightsBetween(checkIn, checkOut): string[]`
- `daysUntil(dateStr, todayStr): number`
- `calculateRefund(pricePaid, tiers, checkIn, todayStr): { percent, amount }`
  Sort tiers by `minDaysBefore` descending. The first tier where `daysUntil(checkIn) >= minDaysBefore` gives the percent. No matching tier means 0%. `amount = Math.round(pricePaid * percent / 100)`.
- `validateStay(checkIn, checkOut, settings, todayStr)`: check-in not in the past, within season, within `maxAdvanceDays`, night count between `minNights` and `maxNights`.
- `validateTiers(tiers)`: percentages 0 to 100, `minDaysBefore >= 0`, no duplicate `minDaysBefore`, percent does not increase as days decrease.

### Availability

`getAvailability(from, to)` returns every active site with the set of taken nights in the range. One query on `booking_nights` filtered by `night >= from AND night < to`. Before reading, run `releaseExpiredHolds()`.

### Holds

`createHold(userId, input)`:

1. Validate with Zod and `validateStay`. Check `isBookingOpen`, site is active, party size within `maxOccupancy`.
2. Cancel the user's other `pending` bookings first (expire their Stripe sessions with `stripe.checkout.sessions.expire`, delete night rows, set status `expired`). This stops one person holding several sites while browsing.
3. In a transaction: insert the `bookings` row (`pending`, `holdExpiresAt`, `subtotal`, tier snapshot from settings), then insert one `booking_nights` row per night with `price = site.nightlyRate`. On `23505`, roll back and return a "just booked by someone else" error.
4. Create the Stripe session (section 5) and store `stripeSessionId`.

`releaseExpiredHolds()`: for `pending` bookings with `holdExpiresAt < now()`, delete night rows and set status `expired`. Call it at the start of `getAvailability` and `createHold`. This is the fallback if the Stripe expiry webhook is missed.

Timing: set the Stripe session `expires_at` to 30 minutes from creation (Stripe's documented minimum; verify against current Stripe docs) and `holdExpiresAt` to 5 minutes after that, so the hold always outlives the ability to pay.

### Cancellation

`cancelBooking(bookingId, { by, refundOverrideAmount? })`:

1. Load the booking, require status `confirmed`.
2. Compute the refund from the booking's own `cancellationTiers` snapshot. An admin may pass an override amount between 0 and `pricePaid`. Guests cannot.
3. If the amount is above 0 and the booking was paid through Stripe, call `stripe.refunds.create({ payment_intent, amount })` with an idempotency key of `booking-refund-${bookingId}`.
4. In a transaction: delete night rows, set `status = "cancelled"`, `cancelledAt`, `cancelledBy`, `refundAmount`, `stripeRefundId`.
5. Send a cancellation email stating the refund amount.

For `paidOffline` bookings, skip Stripe and record the refund amount the admin enters, so they know what to hand back.

## 5. Stripe

### Session creation

Follow `fetchClientSecret` in `src/app/registration/checkout/payment/actions.ts`, with these differences:

- One line item: name such as `Site 7, 3 Jul to 5 Jul 2027, 2 nights`, `unit_amount = subtotal`, `quantity = 1`, `tax_rates: [process.env.TAX_RATE!]`.
- Session-level `metadata: { kind: "campsite_booking", bookingId }`. Also set `payment_intent_data.metadata` to the same values so refunds can be traced in the Stripe dashboard.
- `expires_at` as described above.
- No `discounts`, and `allow_promotion_codes: false`.
- `return_url` to `/campground/bookings/{bookingId}?session_id={CHECKOUT_SESSION_ID}`.

### Webhook changes (`src/app/api/webhooks/stripe/route.ts`)

Refactor the handler into a dispatch, keeping the existing registration behaviour unchanged:

- `checkout.session.completed`
  - `session.metadata.kind === "campsite_booking"`: confirm the booking (below).
  - otherwise: existing registration logic.
- `checkout.session.expired`
  - campsite booking: if still `pending`, delete night rows and set `expired`.
  - otherwise: ignore.
- `charge.refunded`
  - existing registration logic stays as is. Bookings are updated by `cancelBooking` directly, so nothing is required here. Optionally, if a booking matches the payment intent and has no `stripeRefundId`, record the refund so dashboard-issued refunds show up in admin. Do not auto-cancel on a dashboard refund.

Confirming a booking:

1. Load the booking by `metadata.bookingId`.
2. If already `confirmed`, return 200 (webhooks are retried, so this must be idempotent).
3. If `pending`: set `confirmed`, `pricePaid = session.amount_total`, `stripePaymentIntentId`, clear `holdExpiresAt`.
4. If `expired` (payment landed after the hold was released): in a transaction, try to re-insert the night rows. If that succeeds, confirm as normal. If it hits `23505`, refund the payment in full, leave the booking `expired` with `refundAmount` set, and email the guest an apology. Log this loudly; it should be very rare.
5. Send the confirmation email.

Add `checkout.session.expired` to the events the Stripe webhook endpoint subscribes to (Stripe dashboard for production, and it is forwarded automatically by `bun run stripe:listen` locally). Call this out in the PR description because it is a manual production step.

## 6. Routes

### Guest

| Route | Access | Purpose |
|---|---|---|
| `/campground` | Public | Pick dates, see the availability grid, pick a site |
| `/campground/book` | Signed in | Guest details form for the chosen site and dates, policy summary, then embedded checkout |
| `/campground/bookings` | Signed in | My bookings: upcoming, past, cancelled |
| `/campground/bookings/[id]` | Signed in, owner only | Booking detail, confirmation state after payment, cancel button |

Availability UI: 13 sites is small enough to show everything. After the guest picks a date range, list all sites with their features, rate, total for the stay, and available or unavailable. Let guests filter by feature (for example, power only). Below that, an optional month grid (sites as rows, days as columns) helps guests find open dates. Build the list first.

Show the cancellation policy as windows that do not overlap, never as overlapping thresholds. Before dates are chosen use `refundWindows` ("7 days or more before check-in: full refund", "1 to 6 days before: 50%", "On or after check-in day: no refund"). Once the stay is known, use `refundSchedule` to show real dates ("On or before Jul 3, 2027: full refund"). Both live in `src/lib/campground/policy.ts`.

### Site map

Guests see a simple illustrated map of the campground with one marker per site, so they know where the site they are booking is. This is the usual campground-booking pattern: a static background drawing with clickable, colour-coded markers on top. It is not an interactive geographic map; do not add Leaflet, Mapbox or Google Maps.

- **Background:** one image at `public/campground/map.svg`, drawn for this purpose: the loop road, the access road, Range Rd 281, a "To camp office / waterfront" label and a north arrow. The owner supplied a rough sketch showing the 13 sites along the outside of the east side of the loop. Do not ship a Google Maps screenshot (their terms do not allow it); redraw the roads as a few SVG paths. Keep the file replaceable so the camp can swap in a nicer illustration later without code changes.
- **Markers:** rendered by a `SiteMap` component as absolutely positioned buttons over the image, placed with `left: mapX%` and `top: mapY%` inside a container that keeps the image's aspect ratio. Percent coordinates mean the map scales to any screen width with no extra work. Sites with null coordinates are left off the map and still appear in the list.
- **Marker states:** available, unavailable, selected. Each marker shows the site number. Do not rely on colour alone: unavailable markers are also muted and struck through or hatched, and every marker has an accessible label such as "Site 7, power, available". Add a small legend, and distinguish site type by marker shape or a small icon.
- **Behaviour:** the map and the site list show the same data and share one selection. Clicking a marker selects that site and scrolls to or highlights its row; hovering or focusing a row highlights its marker. Before dates are chosen the map shows all sites neutrally as a "where things are" overview. The list remains the primary control and must work fully without the map (keyboard, screen reader, very small screens).
- **Mobile:** markers need a tap target of at least 32px. With 13 sites along one road this fits at phone width; if markers overlap, let the map scroll horizontally inside its container at a fixed minimum width.
- **Admin placement:** on the Sites admin page, a "Place on map" control shows the same map; clicking it sets `mapX` / `mapY` for the site being edited, with the other sites shown faintly for reference. This avoids hand-typing coordinates and lets the camp fix positions themselves.
- **Reuse:** show the same component read-only, with the booked site highlighted, on the booking detail page and optionally in the admin bookings page.

The cancel dialog must show the exact refund amount, computed server-side from the booking's tier snapshot, before the guest confirms.

Every server action re-checks ownership (`booking.userId === session.user.id`). Never trust a booking id from the client.

### Admin (all wrapped in `adminPage()` / `adminAction()`)

| Route | Purpose |
|---|---|
| `/admin/campground` | Redirect to bookings |
| `/admin/campground/bookings` | Month grid of sites by days, plus a searchable list. Click a booking for detail, cancel and refund |
| `/admin/campground/sites` | Create, edit, deactivate sites and rates |
| `/admin/campground/settings` | Booking open switch, season dates, stay limits, check-in and check-out times, cancellation tier editor |

Admin booking tools on the bookings page:

- **New booking** for phone and email guests: site, dates, guest details, and either "paid offline" (confirmed immediately, `source = "admin"`, `paidOffline = true`, `pricePaid` entered by the admin) or "send to guest" is out of scope for now.
- **Block nights**: pick a site and date range, enter a reason. Inserts `booking_nights` rows with `bookingId` null. Unblock deletes them.
- **Cancel**: shows the policy refund, allows an override amount, calls `cancelBooking`.

Deactivating a site hides it from new bookings and leaves existing bookings alone. Do not allow deleting a site that has bookings (the `restrict` foreign key enforces this).

### Shared changes

- `src/proxy.ts`: add `/campground` to `publicRoutes`. Add `{ pattern: "/admin/campground(.*)", roles: ADMIN_ROLES }` above the catch-all admin pattern.
- `admin-nav.tsx`: split into two labelled groups. "Camp" keeps the existing year-scoped links. "Campground" (admin only) has Bookings, Sites and Settings with plain hrefs that do not go through the year prefix. The year selector applies to the Camp group only. `useAdminYear` reads `params.year`, which is undefined on campground routes; make sure it falls back to the current year so Camp links still work from there.
- `/admin` currently redirects to the current year's registrations. Leave that.
- `src/app/page.tsx`: stop redirecting signed-in users straight to `/registration/overview`. Show two entry points for everyone, "Summer camp registration" and "Campground booking", with sign-in and sign-up below for signed-out users.
- Main navbar: add a Campground link, and "My bookings" for signed-in users.
- Sign-in, sign-up and email verification: accept a `?redirect=` query parameter and use it for `callbackURL` in place of the hardcoded `/registration/overview`. Only accept relative paths that start with a single `/` to avoid open redirects. `/campground/book` sends signed-out users to `/sign-in?redirect=...` with the site and dates preserved in the query string.

## 7. Emails

Add template functions to `src/lib/email.ts` in the existing style:

- Booking confirmed: site, dates, nights, amount paid, check-in and check-out times, the cancellation schedule with real dates (`refundSchedule`), link to the booking.
- Booking cancelled: refund amount and when to expect it.
- Payment received but site unavailable (the rare race in section 5).

Phase 4 adds a reminder a few days before check-in.

## 8. Phases

Each phase ends with `bun run build` passing, `bunx biome check` clean, and the manual checks listed. Use `bun run stripe:listen` and Stripe test cards for payment checks.

### Cleanup tasks and fixes

These three problems were found in the existing code while planning. Each is assigned to a phase below and must be done as part of it, not left as optional.

**C1. Proxy admin patterns never match (Phase 1).**
In `src/proxy.ts`, `adminRouteRoles` has `/admin/users(.*)`, `/admin/discounts(.*)` and `/admin/camps(.*)`. The real URLs include the year (`/admin/2026/users`), so these never match and every admin URL falls through to the catch-all, which allows `hcp` and `staff`. Admin-only access currently depends only on the `adminPage()` wrapper on each page.

- Change the patterns to include the year segment, for example `/admin/[^/]+/users(.*)`, and the same for `discounts` and `camps`.
- Keep the page-level `adminPage()` wrappers. The proxy is a second layer, not a replacement.
- Check: signed in as `staff`, visiting `/admin/2026/users`, `/admin/2026/discounts` and `/admin/2026/camps` redirects to `/` from the proxy. `/admin/2026/registrations` still loads for `staff` and `hcp`.

**C2. Hardcoded post-sign-in destination (Phase 2).**
`/registration/overview` is hardcoded as `callbackURL` in six places: three in `src/app/sign-in/page.tsx`, two in `src/app/sign-up/page.tsx`, and `emailVerification.callbackURL` in `src/lib/auth.ts`. The proxy also redirects signed-out users to `/sign-in` without remembering where they were going.

- Add one helper, for example `getSafeRedirect(param, fallback = "/registration/overview")`, that accepts only relative paths starting with a single `/` (reject `//`, `/\` and anything with a scheme). Unit test it.
- Use it for every `callbackURL` in sign-in and sign-up, reading `?redirect=` from the URL. Carry the parameter across the links between the sign-in and sign-up pages.
- For email verification, pass the destination as the `callbackURL` on the sign-up call so the verification link returns the guest to it. Check the better-auth docs for how the per-request `callbackURL` interacts with the global `emailVerification.callbackURL`, and keep the global value as the fallback.
- In `src/proxy.ts`, when redirecting a signed-out user to `/sign-in`, append `?redirect=` with the original path and query string.
- Check: a signed-out visitor to `/registration/camper` lands there after signing in. A new guest who picks a site, signs up and verifies their email lands on the booking form with site and dates intact. `?redirect=https://example.com` and `?redirect=//example.com` both fall back to the default.

**C3. Stripe webhook event subscription (Phase 2, manual production step).**
The production webhook endpoint in the Stripe dashboard must be subscribed to `checkout.session.expired` in addition to its current events. Without it, abandoned holds are only released by the `releaseExpiredHolds()` fallback.

- This cannot be done from the code. Put it in the Phase 2 PR description as a required step before merge to production, with the exact event name.
- While there, record the full list of events the endpoint needs in `README.md`: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`.
- Check: after deploy, the Stripe dashboard shows `checkout.session.expired` deliveries returning 200.

### Phase 1: foundations

1. Schema, relations and generated migration (`bun run db:generate`). Review the SQL before committing.
2. Seed: the settings row and 13 sites with placeholder names, features and rates (the owner will supply real ones).
3. Pure functions in `src/lib/campground/` with `bun test` coverage. Add a `test` script to `package.json`.
4. `campground-service.ts`: site and settings queries.
5. Admin: Sites page and Settings page, including the cancellation tier editor with validation.
6. Proxy pattern and admin nav split.
7. Webhook refactored into a dispatch with no behaviour change for registrations.
8. Cleanup C1: fix the proxy admin patterns.

Check: the C1 checks pass. An admin can add sites and edit settings. `staff` and `hcp` users are redirected away from `/admin/campground/*`. A camp registration checkout still completes and marks the registration `registered`.

### Phase 2: guest booking

1. `getAvailability`, `createHold`, `releaseExpiredHolds`.
2. `/campground` availability page (public).
3. `/campground/book` with guest details and embedded checkout.
4. Webhook: `checkout.session.completed` for bookings, `checkout.session.expired`.
5. Confirmation email.
6. `/campground/bookings` and `/campground/bookings/[id]`.
7. Cleanup C2: `?redirect=` support in sign-in, sign-up, verification and the proxy.
8. Home page and navbar entry points.
9. Site map, as its own PR after the list-based flow works: background SVG, `SiteMap` component on `/campground` and the booking detail page, and the admin "Place on map" control.
10. Cleanup C3: document the webhook events in `README.md` and flag the Stripe dashboard step in the PR description.

Check: the C2 checks pass. Place all 13 sites on the map from admin, then confirm a guest can select a site from either the map or the list, that unavailable sites are visibly different on the map for chosen dates, and that the map is usable at phone width. Book a site end to end. Open two browsers, hold the same site and dates in both, and confirm the second gets the "no longer available" error. Abandon a checkout and confirm the site frees up after expiry (temporarily shorten the hold in development, or trigger `stripe trigger checkout.session.expired` with matching metadata). Replay a `checkout.session.completed` event and confirm nothing changes. Confirm a signed-out guest who picks a site lands back on the booking form after signing up.

### Phase 3: admin operations and cancellation

1. `cancelBooking` with partial refunds.
2. Admin bookings page: month grid and list, booking detail.
3. Admin cancel with refund override.
4. Admin new booking (paid offline).
5. Block and unblock nights.
6. Cancellation email.

Check: cancel bookings at each tier boundary and confirm the Stripe refund amounts. Change the settings tiers and confirm an existing booking still refunds under its original terms. Confirm a blocked night shows as unavailable to guests. Confirm a cancelled booking's nights can be booked again.

### Phase 4: polish

1. Guest self-service cancel on the booking detail page, with the refund amount shown first.
2. Reminder email before check-in (needs a scheduled trigger; check how the app is deployed before choosing between a cron hitting an API route and a platform scheduler).
3. Site photos and descriptions on the availability page.
4. Empty, loading and error states. Mobile layout pass on the availability page.

## 9. Risks and things to get right

- **Double booking.** The `(site_id, night)` primary key is the only guarantee. Every code path that occupies a night must insert rows and handle `23505`. No path may skip this, including admin bookings.
- **Webhook idempotency.** Stripe retries. Every branch must be safe to run twice.
- **Time zones.** The server may run in UTC. "Today", season limits and refund tiers must all use the campground's time zone.
- **Refund tiers changing.** Always refund from the booking's snapshot, never from current settings.
- **Existing registration flow.** The webhook and sign-in changes touch live camp registration. Re-test a full camp registration and a registration refund after phases 1 and 2.
- **Production steps outside the code.** Subscribe the Stripe webhook endpoint to `checkout.session.expired`. Run the seed or enter the 13 sites by hand. Keep `isBookingOpen` false until the owner has entered real sites, rates, season dates and policy.

## 10. Open questions for the owner

1. Real site names, features and nightly rates for the 13 sites, and the final feature list.
2. Season dates, minimum and maximum stay, check-in and check-out times.
3. Final cancellation tiers.
4. Any extra guest details wanted (vehicle plate, trailer length, pets).
5. Whether weekend or holiday rates are wanted later.
6. Time zone confirmation (`America/Edmonton` assumed).
