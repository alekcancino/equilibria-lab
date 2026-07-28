import { test, expect } from '@playwright/test';
import { openModule, seedLanguage } from './helpers';

test('diagram tabs respond to ArrowRight keyboard navigation', async ({ page }) => {
  await openModule(page, 'acidobase');
  const tablist = page.getByRole('tablist', { name: /Diagramas|Diagrams/ });
  await expect(tablist).toBeVisible();
  const tabs = tablist.getByRole('tab');
  const count = await tabs.count();
  test.skip(count < 2, 'need at least two diagram tabs');

  const first = tabs.first();
  const second = tabs.nth(1);
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(second).toHaveAttribute('aria-controls', /.+/);
});

test('language toggle switches panel copy ES → EN', async ({ page }) => {
  await seedLanguage(page, 'es');
  await openModule(page, 'acidobase', { openPanel: true });
  await expect(page.getByText('Sistema', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'EN' }).click();
  await expect(page.getByText('System', { exact: true })).toBeVisible();
});

test('module guide keeps aria-controls target mounted when collapsed', async ({ page }) => {
  await openModule(page, 'acidobase', { openPanel: true });
  const toggle = page.locator('.module-guide-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const controlsId = await toggle.getAttribute('aria-controls');
  expect(controlsId).toBeTruthy();
  await expect(page.locator(`[id="${controlsId}"]`)).toBeAttached();
});
