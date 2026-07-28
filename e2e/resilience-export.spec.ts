import { test, expect } from '@playwright/test';
import { openModule, seedLanguage, seedTheme } from './helpers';

test.describe('resilience and export', () => {
  test.beforeEach((_fixtures, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop-only smoke');
  });

test('failed module chunk shows recoverable error and reloads after unblock', async ({ page }) => {
  await page.route('**/*AcidoBase*.js', (route) => route.abort('connectionfailed'));
  await page.goto('/?m=acidobase');
  await expect(page.locator('.recoverable-error')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('alert')).toContainText(/could not be loaded|No se pudo cargar/);
  await expect(page.getByRole('button', { name: /Retry|Reintentar/ })).toBeVisible();

  await page.unroute('**/*AcidoBase*.js');
  await page.reload();
  await expect(page.locator('.module')).toBeVisible({ timeout: 20_000 });
});

test('theme toggle switches document data-theme', async ({ page }) => {
  await seedTheme(page, 'light');
  await openModule(page, 'acidobase');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: /Switch to dark mode|Cambiar a modo oscuro/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('chart export menu downloads CSV data', async ({ page }) => {
  await seedLanguage(page, 'en');
  await openModule(page, 'actividad');
  await expect(page.locator('.js-plotly-plot')).toBeVisible({ timeout: 30_000 });

  const toolbar = page.getByRole('toolbar', { name: 'Chart controls' });
  await toolbar.getByRole('button', { name: 'Export' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem').filter({ hasText: 'Chart data' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
});
});
