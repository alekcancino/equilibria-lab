import { test, expect } from '@playwright/test';
import { assertNoHorizontalOverflow, collectPageErrors, openModule } from './helpers';

const STRESS_MODULES = ['acidobase', 'pourbaix', 'titulacion', 'solcond'] as const;

for (const moduleId of STRESS_MODULES) {
  test(`${moduleId} loads at 320px without overflow`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'narrow', '320px layout smoke only');
    const errors = collectPageErrors(page);
    await openModule(page, moduleId);
    await assertNoHorizontalOverflow(page);
    expect(errors, `uncaught errors on ${moduleId} at 320px`).toEqual([]);
  });
}
