const { test, expect } = require('@playwright/test');

const baseURL = process.env.TACOMA_NIGHTS_BASE_URL || 'https://crowrulesentertainment-oss.github.io/tacomanights/';

test.describe('Tacoma Nights public website', () => {
  test('homepage renders on desktop without uncaught page errors', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    expect(response, 'homepage should return a document response').not.toBeNull();
    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(/Tacoma Nights/i);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('public navigation destinations return successful responses', async ({ page }) => {
    const routes = [
      'about.html',
      'join.html',
      'perspectives.html',
      'members-directory.html',
      'members.html',
      'admin.html'
    ];
    for (const route of routes) {
      const response = await page.goto(new URL(route, baseURL).toString(), { waitUntil: 'domcontentloaded' });
      expect(response, route + ' should return a document response').not.toBeNull();
      expect(response.status(), route + ' should load successfully').toBe(200);
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('homepage fits a mobile viewport without horizontal page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth
    }));
    expect(dimensions.content, 'mobile page should not overflow horizontally').toBeLessThanOrEqual(dimensions.viewport + 1);
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
