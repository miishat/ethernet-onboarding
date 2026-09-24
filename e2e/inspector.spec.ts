import { expect, test } from "@playwright/test";

async function applyFrame(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Apply frame" }).click();
  await expect(page.getByText("Calculating applied frame…")).toBeHidden();
}

test("opens a stage deep link, calculates only after Apply, and exposes candidate provenance", async ({ page }) => {
  await page.goto("/?view=inspector&inspectStage=pam4&from=stack");
  await expect(page.getByRole("main", { name: "Frame inspector" })).toBeVisible();
  await expect(page.getByLabel("Unavailable calculation")).toContainText("Calculation not available yet");

  await page.getByRole("button", { name: "MAC frame" }).click();
  const payload = page.locator("textarea");
  await payload.fill("00 01 02 03");
  await expect(page.getByText("Unapplied edits")).toBeVisible();
  await applyFrame(page);
  await expect(page.getByText("Frame bytes")).toBeVisible();

  await page.getByRole("button", { name: "PAM4" }).click();
  await expect(page.getByLabel("PAM4 values")).toBeVisible();
  await expect(page.getByText("Experimental reference using candidate contracts")).toBeVisible();
  await expect(page.getByText("Candidate IEEE source")).toBeVisible();
  await expect(page.getByText("Independent local fixture")).toBeVisible();
  await expect(page.getByText("Not IEEE verified or standards conformant")).toBeVisible();
  await expect(page.getByText(/IEEE-only 400G TX profile remains verification-blocked/i)).toBeVisible();
});

test("uses the newest result when Apply is pressed rapidly", async ({ page }) => {
  await page.goto("/?view=inspector&inspectStage=mac&from=stack");
  const payload = page.locator("textarea");
  await payload.fill("aa bb cc dd");
  await page.getByRole("button", { name: "Apply frame" }).dblclick();
  await expect(page.getByText("Calculating applied frame…")).toBeHidden();
  await page.getByRole("button", { name: "PAM4" }).click();
  await expect(page.getByLabel("PAM4 values")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("preserves walkthrough position and browser history across inspector navigation", async ({ page }) => {
  await page.goto("/?view=frame&step=5");
  await expect(page.getByRole("button", { name: "Inspect this stage" })).toBeVisible();
  await page.getByRole("button", { name: "Inspect this stage" }).click();
  await expect(page).toHaveURL(/view=inspector.*inspectStage=fec.*from=frame/);
  await page.getByRole("button", { name: "Return to learning" }).click();
  await expect(page).toHaveURL(/view=frame.*step=5/);

  await page.getByRole("button", { name: "Inspect this stage" }).click();
  await page.getByRole("button", { name: "64b/66b" }).click();
  await expect(page).toHaveURL(/inspectStage=encode66/);
  await page.goBack();
  await expect(page).toHaveURL(/inspectStage=fec/);
  await page.goForward();
  await expect(page).toHaveURL(/inspectStage=encode66/);
});

test("keeps keyboard ownership and provides labelled announcements", async ({ page }) => {
  await page.goto("/?view=inspector&inspectStage=mac&from=stack");
  await page.getByRole("button", { name: "MAC frame" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "64b/66b" })).toBeFocused();
  await expect(page.getByLabel("Frame processing stages")).toBeVisible();
  await expect(page.locator(".frame-editor__actions [aria-live=polite]")).toContainText("Applies only when you choose Apply frame");
});

test("fits the inspector at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=inspector&inspectStage=mac&from=stack");
  await expect(page.getByRole("main", { name: "Frame inspector" })).toBeVisible();
  await expect(page.getByRole("button", { name: "PAM4" })).toBeVisible();
  const metrics = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewport);
});
