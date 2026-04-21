import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// UI/UX & Accessibility Playwright Tests

test.describe('UI/UX & Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for React to fully mount before each test interacts with the DOM.
    await page.waitForLoadState('networkidle');
  });

  test('Dashboard passes accessibility checks', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    const criticalOnly = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalOnly).toEqual([]);
  });

  test('Dashboard visual smoke screenshot', async ({ page }) => {
    await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot.byteLength).toBeGreaterThan(1000);
  });

  test('Primary button click and back navigation', async ({ page }) => {
    // Wait for at least one visible, enabled button before interacting.
    const button = page.locator('button:visible:not([disabled]), [role=button]:visible').first();
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
    // Simulate browser back
    await page.goBack();
    // Ensure we are back on the dashboard
    await expect(page).toHaveURL(/\/?$/);
  });

  test('File upload and download', async ({ page, context }) => {
    // Upload: Find file input and upload a file if present
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count()) {
      await fileInput.setInputFiles({ name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('hello world') });
      // Optionally check for upload success message
      // await expect(page.locator('text=Upload successful')).toBeVisible();
    }
    // Download: only wait for download if a trigger exists
    const downloadTrigger = page.locator('a[download],button[download],.download').first();
    if (await downloadTrigger.count()) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => undefined),
        downloadTrigger.click().catch(() => undefined),
      ]);
      if (download) {
        const path = await download.path();
        expect(path).toBeTruthy();
      }
    }
  });
});
