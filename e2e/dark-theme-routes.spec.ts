import { test, expect } from '@playwright/test';
import {
  MODULE_IDS,
  assertNoHorizontalOverflow,
  collectPageErrors,
  openModule,
  seedTheme,
} from './helpers';

for (const moduleId of MODULE_IDS) {
  test(`${moduleId} loads in dark theme without overflow or errors`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop dark-theme smoke only');
    await seedTheme(page, 'dark');
    const errors = collectPageErrors(page);
    await openModule(page, moduleId);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await assertNoHorizontalOverflow(page);
    expect(errors, `uncaught errors on ${moduleId} in dark theme`).toEqual([]);
  });
}
