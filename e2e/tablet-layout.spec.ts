import { test, expect } from '@playwright/test';
import {
  STRESS_MODULE_IDS,
  assertNoHorizontalOverflow,
  collectPageErrors,
  openModule,
} from './helpers';

for (const moduleId of STRESS_MODULE_IDS) {
  test(`${moduleId} loads at 768px without overflow`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet', '768px layout smoke only');
    const errors = collectPageErrors(page);
    await openModule(page, moduleId);
    await assertNoHorizontalOverflow(page);
    expect(errors, `uncaught errors on ${moduleId} at 768px`).toEqual([]);
  });
}
