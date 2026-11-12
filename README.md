## Environment Variables

Copy the following environment variables to your `.env.local` file and customize for your camp:

```bash
# Site Branding (optional - defaults provided)
NEXT_PUBLIC_SITE_NAME="Your Camp Name"
NEXT_PUBLIC_SITE_TAGLINE="Your tagline here"
NEXT_PUBLIC_SITE_DESCRIPTION="Description for SEO"
```

## Getting Started

First, run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Stripe webhook

Payments are confirmed by the webhook at `/api/webhooks/stripe`. The endpoint must be subscribed to these events:

| Event | Used for |
|---|---|
| `checkout.session.completed` | Marks camp registrations paid and confirms campsite bookings |
| `checkout.session.expired` | Releases the site held for an abandoned campsite checkout |
| `charge.refunded` | Marks camp registrations refunded from the Stripe dashboard |

Locally, `bun run stripe:listen` forwards every event. In production, set the events on the endpoint in the Stripe dashboard (Developers → Webhooks). If `checkout.session.expired` is missing, abandoned holds are still released, but only once their 35-minute hold runs out and someone next loads availability.

## Tests

Unit tests (pure functions, no database):

```bash
bun run test
```

End-to-end tests drive the running app with Playwright and the system Chromium (`pacman -S chromium`, or set `CHROMIUM_PATH`). They need:

- `bun dev` running on http://localhost:3000 (override with `E2E_BASE_URL`)
- a seeded database: `bun run db:seed && bun run db:seed:users`
- `bun run stripe:listen` running, for the payment and webhook tests

```bash
bun run test:e2e                                   # everything
bun run test:e2e e2e/admin-access.e2e.ts           # one file
bun x playwright show-report                       # last HTML report
```

The payment tests use Stripe test mode. Stripe sometimes answers repeated automated payments with an hCaptcha challenge; if the test reports that, wait a few minutes before running it again.

The tests create their own data (`E2E Test Camp`, `E2E Site …`) and remove it afterwards, and restore the campground settings they change.
