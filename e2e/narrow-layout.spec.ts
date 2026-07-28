import { test, expect } from '@playwright/test';
import { assertNoHorizontalOverflow, collectPageErrors, openModule } from './helpers';

const STRESS_MODULES = ['acidobase', 'pourbaix', 'titulacion', 'solcond'] as const;

test.describe('320px stress modules', () => {
  test.skip(({ project }) => project.name !== 'narrow', '320px layout smoke only');

  for (const moduleId of STRESS_MODULES) {
    test(`${moduleId} loads without overflow`, async ({ page }) => {
      const errors = collectPageErrors(page);
      await openModule(page, moduleId);
      await assertNoHorizontalOverflow(page);
      expect(errors, `uncaught errors on ${moduleId} at 320px`).toEqual([]);
    });
  }
});
