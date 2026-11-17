const { test, expect } = require("@playwright/test");
const pages = [
  "/", "/watch.html", "/perspective-253.html", "/perspective-triton.html",
  "/perspective-joncool.html", "/perspective-kenneth.html", "/newsroom.html",
  "/events.html", "/the-253.html", "/the-253-unfiltered-question.html",
  "/the-253-shoutouts.html", "/the-253-polls.html", "/the-253-photo-challenges.html",
  "/the-253-heroes.html", "/the-253-spotlight.html", "/the-253-time-capsule.html",
  "/remote-host.html", "/membership.html", "/on-the-back-deck.html"
];

for (const route of pages) {
  test(`renders ${route} with accessible page landmarks`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(route);
    expect(response && response.ok()).toBeTruthy();
    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(page.locator("nav#primary-nav")).toHaveAttribute("aria-label", "Main navigation");
    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page).toHaveTitle(/Tacoma Nights/i);
    await expect(page.locator("iframe:not([title]), img:not([alt])")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("mobile navigation opens, closes and updates its expanded state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.locator(".menu-toggle");
  const nav = page.locator("#primary-nav");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Watch" }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

for (const width of [390, 768, 1280]) {
  test(`homepage has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
}

test("submission forms expose required fields and browser validation", async ({ page }) => {
  for (const route of ["/newsroom.html", "/events.html", "/remote-host.html"]) {
    await page.goto(route);
    const form = page.locator("form[data-mailto-form]");
    await expect(form).toBeVisible();
    const firstRequired = form.locator("[required]").first();
    await expect(firstRequired).toBeVisible();
    await form.locator('button[type="submit"]').click();
    const isInvalid = await firstRequired.evaluate(el => !el.checkValidity());
    expect(isInvalid).toBeTruthy();
  }
});
