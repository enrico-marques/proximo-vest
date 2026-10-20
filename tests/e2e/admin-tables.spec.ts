import { expect, test } from "@playwright/test";

import { E2E_ADMIN, E2E_EXTRA_BOARDS } from "./fixtures";
import { asClient } from "./helpers";

test.use(asClient("10.0.2.1"));

test("the exam board table renders rows and paginates", async ({ page }) => {
  const res = await page.request.post("/api/auth/sign-in/email", {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
  });
  expect(res.ok()).toBe(true);

  await page.goto("/dashboard/admin/provas-questoes");

  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(10);
  await expect(page.getByText("Banca E2E 01", { exact: true })).toBeVisible();

  const totalBoards = E2E_EXTRA_BOARDS + 1;
  await expect(page.getByText(/Página\s*1\s*de\s*2/)).toBeVisible();

  await page.getByRole("button", { name: ">", exact: true }).click();
  await expect(page.getByText(/Página\s*2\s*de\s*2/)).toBeVisible();
  await expect(rows).toHaveCount(totalBoards - 10);
});
