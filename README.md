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

## Tests

Unit tests (pure functions, no database):

```bash
bun run test
```

End-to-end tests drive the running app with Playwright and the system Chromium (`pacman -S chromium`, or set `CHROMIUM_PATH`). They need:

- `bun dev` running on http://localhost:3000 (override with `E2E_BASE_URL`)
- a seeded database: `bun run db:seed && bun run db:seed:users`
- `bun run stripe:listen` running, for the payment test

```bash
bun run test:e2e                                   # everything
bun run test:e2e e2e/admin-access.e2e.ts           # one file
bun x playwright show-report                       # last HTML report
```

The tests create their own data (`E2E Test Camp`, `E2E Site …`) and remove it afterwards, and restore the campground settings they change.
