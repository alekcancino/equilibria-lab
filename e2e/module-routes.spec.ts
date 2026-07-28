import { test, expect } from '@playwright/test';
import {
  MODULE_IDS,
  assertNoHorizontalOverflow,
  collectPageErrors,
  openModule,
} from './helpers';

for (const moduleId of MODULE_IDS) {
  test(`${moduleId} loads without overflow or uncaught errors`, async ({ page }) => {
    const errors = collectPageErrors(page);
    await openModule(page, moduleId);
    await assertNoHorizontalOverflow(page);
    expect(errors, `uncaught errors on ${moduleId}`).toEqual([]);
  });
}

test('home hub cards navigate to a module', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Equilibria Lab' })).toBeVisible();
  const firstHub = page.locator('.home-card-main').first();
  await firstHub.click();
  await expect(page.locator('.module')).toBeVisible({ timeout: 20_000 });
  await assertNoHorizontalOverflow(page);
});
