import { expect, test, type Page } from "@playwright/test";

import { E2E_USER } from "./fixtures";

async function submitLogin(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
}

test.describe("login", () => {
  test("signs in with e-mail and password and reaches the dashboard", async ({ page }) => {
    await submitLogin(page, E2E_USER.email, E2E_USER.password);

    await expect(page).toHaveURL(/\/dashboard(\/|$)/);

    // The browser now holds a real session that the server accepts.
    const me = await page.request.get("/api/auth/me");
    expect(me.status()).toBe(200);
    expect(await me.json()).toMatchObject({ emailVerified: true, status: "active" });
  });

  test("rejects a wrong password and keeps the visitor on the login page", async ({ page }) => {
    await submitLogin(page, E2E_USER.email, "senha-errada-123");

    await expect(page.locator("[data-sonner-toast]")).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login$/);
    expect((await page.request.get("/api/auth/me")).status()).toBe(401);
  });

  test("sends anonymous visitors from the dashboard to the login page", async ({ page }) => {
    await page.goto("/dashboard/professor/listas");
    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});
