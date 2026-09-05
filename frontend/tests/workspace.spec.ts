import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-page-transition]")).toHaveAttribute(
    "data-transition-state",
    "settled",
  );
}

test("landing, navigation, case workflow, and audit export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A second chance",
  );
  await settle(page);
  await page.screenshot({
    path: "../work/landing-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Open app", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little less chasing." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Load (sample cases|missing samples)/ })
    .first()
    .click();
  await expect(page.locator(".case-row")).toHaveCount(12);
  await page.screenshot({
    path: "../work/dashboard-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Needs approval", exact: false })
    .first()
    .click();
  const candidate = page.locator(".case-row").first();
  test.skip(
    (await candidate.count()) === 0,
    "All approval samples were already exercised. Restart the API with a fresh SAFERECOVER_DB_PATH to repeat this mutating scenario.",
  );
  if (await candidate.count()) {
    await candidate.click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: /Approve .* demo link/ }).click();
    await expect(modal.getByText("Link ready", { exact: true })).toBeVisible();
    await modal
      .getByRole("button", { name: "Simulate recovery captured" })
      .click();
    await expect(
      modal.getByText("Recovery paid", { exact: true }),
    ).toBeVisible();
    await modal
      .getByRole("button", { name: "Test a duplicate-payment event" })
      .click();
    await expect(
      modal.getByText("Duplicate detected", { exact: true }),
    ).toBeVisible();
    const drawerAccessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(drawerAccessibility.violations.map((v) => v.id)).toEqual([]);
    await page.screenshot({ path: "../work/case-drawer.png" });
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  }
  await page.getByRole("button", { name: "Audit trail", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Decision history" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  expect((await download).suggestedFilename()).toBe(
    "saferecover-demo-audit.json",
  );
  await page.getByRole("button", { name: "Guardrails", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Rules before recovery." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("search, zero results, API error and guide", async ({ page }) => {
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: /Load (sample cases|missing samples)/ })
    .first()
    .click();
  await expect(page.locator(".case-row")).toHaveCount(12);
  await page
    .getByRole("textbox", { name: "Search orders or failure reasons" })
    .fill("not-an-order");
  await expect(
    page.getByRole("heading", { name: "No cases match this view." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".case-row")).toHaveCount(12);
  await page.route("**/api/studio", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "The recovery API did not respond. Refresh before retrying.",
      }),
    }),
  );
  await page.getByRole("button", { name: "Refresh workspace" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "did not respond" }),
  ).toBeVisible();
  await page.goto("/guide");
  await expect(
    page.getByRole("heading", { name: "The recovery field guide." }),
  ).toBeVisible();
  const response = await page.request.get("/api/guide");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Time-of-check/time-of-use");
});

test("responsive pages and accessibility", async ({ page }) => {
  for (const width of [320, 375, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/dashboard", "/guide"]) {
      await page.goto(path);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await settle(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      expect(overflow, `${path} overflow at ${width}px`).toBe(false);
      await page.screenshot({
        path: `../work/${path === "/" ? "landing" : path.slice(1)}-${width}.png`,
        fullPage: true,
      });
    }
  }
  for (const path of ["/", "/dashboard", "/guide"]) {
    await page.goto(path);
    await settle(page);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});

test("reduced motion keeps the workflow usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Show this moment" }).nth(2).click();
  await expect(page.locator(".workflow-preview")).toContainText(
    "Original payment captured",
  );
  await expect(page.locator(".hero h1")).toBeVisible();
});
