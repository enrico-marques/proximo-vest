import { defineConfig, devices } from "@playwright/test";

// The global setup deletes and recreates the test user, so e2e must never run against a real database.
const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set E2E_DATABASE_URL to a disposable database (locally: `npx prisma dev --name proximo-test`).");
}

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // The local `prisma dev` database (PGlite) crashes under parallel load; CI uses real Postgres.
  workers: isCI ? undefined : 1,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 300_000,
    env: {
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      BETTER_AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else",
      // External services are not exercised by e2e; the clients only need non-empty keys to load.
      RESEND_API_KEY: "re_e2e_unused",
      STRIPE_SECRET_KEY: "sk_test_e2e_unused",
      STRIPE_WEBHOOK_SECRET: "whsec_e2e_unused",
      R2_ACCESS_KEY_ID: "e2e-unused",
      R2_SECRET_ACCESS_KEY: "e2e-unused",
      B2_ACCOUNT_ID: "e2e-unused",
      R2_BUCKET_NAME: "e2e-unused",
      GOOGLE_CLIENT_ID: "e2e-unused",
      GOOGLE_CLIENT_SECRET: "e2e-unused",
    },
  },
});
