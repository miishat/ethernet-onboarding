import { expect, test } from "@playwright/test";

test("aligns MAC details with the editor and supports compact or extended samples", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?view=inspector&inspectStage=mac&from=stack");
  const editor = page.locator(".frame-editor");
  const details = page.locator(".field-details");
  const editorBox = await editor.boundingBox();
  const detailsBox = await details.boundingBox();
  expect(editorBox).not.toBeNull();
  expect(detailsBox).not.toBeNull();
  expect(detailsBox!.x).toBeGreaterThan(editorBox!.x + editorBox!.width);
  expect(Math.abs(detailsBox!.y - editorBox!.y)).toBeLessThan(2);
  const byteView = page.locator(".byte-view");
  const byteBox = await byteView.boundingBox();
  expect(byteBox!.y).toBeGreaterThan(detailsBox!.y);
  expect(await byteView.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const destinationCard = byteView.locator(".byte-view__bytes button").filter({ hasText: "Destination" });
  const payloadCard = byteView.locator(".byte-view__bytes button").filter({ hasText: "Payload" });
  expect(Math.abs((await destinationCard.boundingBox())!.height - (await payloadCard.boundingBox())!.height)).toBeLessThan(20);
  await expect(payloadCard).toContainText("…");

  const sample = page.getByLabel("Stream sample");
  await expect(sample).toHaveValue("256");
  await expect(sample).toHaveCSS("appearance", "none");
  await page.getByRole("button", { name: "Apply frame" }).click();
  await page.getByRole("button", { name: "64B/66B" }).click();
  await expect(page.getByText(/Showing 1–64 of 8448 bits/)).toBeVisible();
  await page.getByRole("button", { name: "MAC frame" }).click();
  await sample.selectOption("4096");
  await expect(page.getByText("Unapplied edits")).toBeVisible();
  await page.getByRole("button", { name: "Apply frame" }).click();
  await page.getByRole("button", { name: "64B/66B" }).click();
  await expect(page.getByText(/Showing 1–64 of 40128 bits/)).toBeVisible();
});

test("keeps padded MAC field cards in complete rows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?view=inspector&inspectStage=mac&from=stack");
  await page.locator("textarea").fill("00 01 02 03");
  await page.getByRole("button", { name: "Apply frame" }).click();
  const cards = page.locator(".byte-view__bytes button");
  await expect(cards).toHaveCount(6);
  const payload = await cards.nth(3).boundingBox();
  const pad = await cards.nth(4).boundingBox();
  const fcs = await cards.nth(5).boundingBox();
  expect(Math.abs(payload!.y - pad!.y)).toBeLessThan(2);
  expect(Math.abs(pad!.y - fcs!.y)).toBeLessThan(2);
});

test("switches between grouped and indexed values across inspector stages", async ({ page }) => {
  await page.goto("/?view=inspector&inspectStage=mac&from=stack");
  await page.getByRole("button", { name: "Apply frame" }).click();
  await page.getByRole("button", { name: "64B/66B" }).click();
  await expect(page.getByRole("group", { name: "Value view" })).toBeVisible();
  await page.getByRole("button", { name: "Grouped" }).click();
  await expect(page.getByText(/Block 0/)).toBeVisible();
  await page.getByRole("button", { name: /Block 0/ }).click();
  await page.getByLabel("encode66 values").locator(".data-window__value").first().click();
  await expect(page.getByText(/Selected encode66/)).toBeVisible();
  await page.getByRole("button", { name: "Indexed" }).click();
  await expect(page.getByText(/Bits 0–63/)).toBeVisible();
  await page.getByRole("button", { name: "Physical lanes" }).click();
  await expect(page.getByRole("button", { name: "Indexed" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Lane", { exact: true })).toHaveCSS("appearance", "none");
  await page.getByRole("button", { name: "PAM4" }).click();
  await expect(page.getByLabel("PMD lane", { exact: true })).toHaveCSS("appearance", "none");
  await expect(page.getByRole("button", { name: "Previous" })).toHaveClass(/btn/);
  await page.getByRole("button", { name: "Grouped" }).click();
  await expect(page.getByText("Symbols 0–7")).toBeVisible();
});

async function applyAndOpenStage(page: import("@playwright/test").Page, stage: "FEC" | "PAM4") {
  await page.getByRole("button", { name: "Apply frame" }).click();
  await page.getByRole("button", { name: stage }).click();
  const values = stage === "PAM4" ? page.getByLabel("PAM4 values") : page.getByLabel("fec values");
  await expect(values).toBeVisible();
  return values.locator(".data-window__value").first();
}

test("opens a stage deep link, preserves applied output until Apply, and exposes candidate provenance", async ({ page }) => {
  await page.goto("/?view=inspector&inspectStage=pam4&from=stack");
  await expect(page.getByRole("main", { name: "Frame inspector" })).toBeVisible();
  await expect(page.getByLabel("Unavailable calculation")).toContainText("Calculation not available yet");

  await page.getByRole("button", { name: "MAC frame" }).click();
  const payload = page.locator("textarea");
  const initialFec = await applyAndOpenStage(page, "FEC");
  const beforeEdit = await initialFec.textContent();
  const initialFcs = await page.getByText(/Applied worker result FCS:/).textContent();
  expect(beforeEdit).toBeTruthy();

  await page.getByRole("button", { name: "MAC frame" }).click();
  await payload.fill("00 01 02 03");
  await expect(page.getByText("Unapplied edits")).toBeVisible();
  await page.getByRole("button", { name: "FEC" }).click();
  await expect(page.getByLabel("fec values").locator(".data-window__value").first()).toHaveText(beforeEdit!);
  await expect(page.getByText(/Applied worker result FCS:/)).toHaveText(initialFcs!);

  await page.getByRole("button", { name: "MAC frame" }).click();
  const afterApply = await applyAndOpenStage(page, "FEC");
  await expect(afterApply).toHaveText(beforeEdit!);
  await expect(page.getByText(/Applied worker result FCS:/)).not.toHaveText(initialFcs!);
  await page.getByRole("button", { name: "PAM4" }).click();
  await expect(page.getByText("Experimental reference using candidate contracts")).toBeVisible();
  await expect(page.getByText("Candidate IEEE source")).toBeVisible();
  await expect(page.getByText("Independent local fixture")).toBeVisible();
  await expect(page.getByText("Not IEEE verified or standards conformant")).toBeVisible();
  await expect(page.getByText(/IEEE-only 400G TX profile remains verification-blocked/i)).toBeVisible();
});

test("blocks experimental calculations for unsupported inspector deep links", async ({ page }) => {
  for (const query of [
    "?rate=800G&view=inspector&inspectStage=fec&from=stack",
    "?dir=rx&view=inspector&inspectStage=fec&from=stack",
    "?lane=200&view=inspector&inspectStage=fec&from=stack",
  ]) {
    await page.goto(`/${query}`);
    await expect(page.getByLabel("Unavailable calculation")).toContainText(/available only for 400G TX at 100G per lane/i);
    await page.getByRole("button", { name: "MAC frame" }).click();
    await expect(page.getByRole("button", { name: "Apply frame" })).toBeDisabled();
  }
});

test("hides an applied experimental run after the route changes to an unsupported context", async ({ page }) => {
  await page.goto("/?view=inspector&inspectStage=mac&from=stack");
  await page.getByRole("button", { name: "Apply frame" }).click();
  await page.getByRole("button", { name: "FEC" }).click();
  await expect(page.getByLabel("fec values")).toBeVisible();

  await page.getByRole("group", { name: "MAC data rate" }).getByRole("button", { name: "800G" }).click();
  await expect(page.getByLabel("Unavailable calculation")).toContainText(/available only for 400G TX at 100G per lane/i);
  await expect(page.getByLabel("fec values")).toHaveCount(0);
});

test("uses the newest distinct draft when Apply is pressed rapidly", async ({ page, context }) => {
  const reference = await context.newPage();
  await reference.goto("/?view=inspector&inspectStage=mac&from=stack");
  await reference.locator("textarea").fill("ff 00 01 02 03");
  const expected = await applyAndOpenStage(reference, "FEC");
  await expect(expected).toBeVisible();
  const newestFcs = await reference.getByText(/Applied worker result FCS:/).textContent();
  await reference.close();

  await page.goto("/?view=inspector&inspectStage=mac&from=stack");
  const payload = page.locator("textarea");
  await payload.fill("aa bb cc dd");
  await page.getByRole("button", { name: "Apply frame" }).click();
  await payload.fill("ff 00 01 02 03");
  await page.getByRole("button", { name: "Apply frame" }).click();
  await page.getByRole("button", { name: "FEC" }).click();
  await expect(page.getByText(/Applied worker result FCS:/)).toHaveText(newestFcs!);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("opens the inspector from the header", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open inspector" }).click();
  await expect(page).toHaveURL(/view=inspector.*inspectStage=mac.*from=stack/);
  await expect(page.getByRole("main", { name: "Frame inspector" })).toBeVisible();
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
  await expect(page.getByRole("button", { name: "MAC frame" })).toHaveAttribute("aria-current", "step");
  await expect(page.locator(".frame-editor__actions [aria-live=polite]")).toContainText("Applies only when you choose Apply frame");
  await page.locator("textarea").fill("not hexadecimal");
  await page.getByRole("button", { name: "Apply frame" }).click();
  await expect(page.locator("textarea")).toHaveAttribute("aria-invalid", "true");
  const describedBy = await page.locator("textarea").getAttribute("aria-describedby");
  expect(describedBy).toContain("payloadHex-error");
  await expect(page.locator("#payloadHex-error")).toHaveAttribute("role", "alert");
});

test("fits the inspector at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=inspector&inspectStage=mac&from=stack");
  await expect(page.getByRole("main", { name: "Frame inspector" })).toBeVisible();
  await expect(page.getByRole("button", { name: "PAM4" })).toBeVisible();
  const metrics = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewport);
});

test("keeps inspector controls usable at a 200 percent zoom-equivalent viewport and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto("/?view=inspector&inspectStage=mac&from=stack");
  await expect(page.getByRole("button", { name: "Apply frame" })).toBeVisible();
  const transitionDuration = await page.getByRole("button", { name: "Apply frame" }).evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeGreaterThan(0);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.000001);
  const metrics = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewport);
});
