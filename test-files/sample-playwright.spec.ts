// sample-playwright.spec.ts
// This is a sample Playwright test file for testing the proof-of-concept checker
import { test, expect } from '@playwright/test';

test('basic Playwright test', async ({ page }) => {
  await page.goto('https://example.com');
  const title = await page.title();
  expect(title).toContain('Example');
});
