import { expect, test, type Page } from "@playwright/test";

import { E2E_ADMIN, E2E_USER } from "./fixtures";
import { asClient } from "./helpers";

async function signIn(page: Page, user: { email: string; password: string }) {
  const res = await page.request.post("/api/auth/sign-in/email", { data: user });
  expect(res.ok()).toBe(true);
}

const planCard = (page: Page, label: string) =>
  page.locator('[data-slot="card"]').filter({ has: page.getByText(label, { exact: true }) });

test.describe("plans are data", () => {
  test.use(asClient("10.0.3.1"));

  test("a student sees the seeded student plans and their usage", async ({ page }) => {
    await signIn(page, E2E_USER);
    await page.goto("/dashboard/assinatura");

    await expect(page.getByText("Você não tem uma assinatura paga")).toBeVisible();
    await expect(planCard(page, "Free (Aluno)").first()).toBeVisible();
    await expect(planCard(page, "Elite (Aluno)")).toBeVisible();
    await expect(page.getByText("Premium (Professor)")).toHaveCount(0);
    // Paid plans have no Stripe price yet, so nothing is on sale.
    await expect(page.getByRole("button", { name: /Assinar/ })).toHaveCount(0);
  });
});

test.describe("plan admin", () => {
  test.use(asClient("10.0.3.2"));

  test("an admin changes a limit and the student page reflects it without a deploy", async ({ page, browser }) => {
    await signIn(page, E2E_ADMIN);
    await page.goto("/dashboard/admin/planos");

    await planCard(page, "Free (Aluno)").getByRole("button", { name: "Editar" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Questões por dia").fill("25");
    await dialog.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(dialog).toBeHidden();
    await expect(planCard(page, "Free (Aluno)").getByText("25", { exact: true })).toBeVisible();

    const student = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "10.0.3.3" } });
    await signIn(student, E2E_USER);
    await student.goto("/dashboard/assinatura");
    await expect(planCard(student, "Free (Aluno)").last().getByText("25", { exact: true })).toBeVisible();
    await student.close();
  });

  test("the plan API validates input", async ({ page }) => {
    await signIn(page, E2E_ADMIN);
    const res = await page.request.post("/api/plans", { data: { label: "" } });
    expect(res.status()).toBe(400);
  });
});
