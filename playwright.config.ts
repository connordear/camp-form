import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end checks against a running dev server (`bun dev`) with a seeded
 * database (`bun run db:seed && bun run db:seed:users`). Payment tests also
 * need `bun run stripe:listen` running so webhooks reach the app.
 *
 * Uses the system Chromium (pacman's `chromium`) rather than Playwright's
 * download; override with CHROMIUM_PATH.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts$/,
  // Tests share one database and seeded accounts.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    },
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts$/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
});
