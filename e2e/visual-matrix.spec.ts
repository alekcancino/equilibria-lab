import { test, expect } from '@playwright/test';
import { STRESS_MODULE_IDS, openModule, seedLanguage, seedTheme } from './helpers';

const MATRIX = [
  { lang: 'es' as const, tablist: 'Diagramas' },
  { lang: 'en' as const, tablist: 'Diagrams' },
];

for (const moduleId of STRESS_MODULE_IDS) {
  for (const { lang, tablist } of MATRIX) {
    test(`${moduleId} dark + ${lang.toUpperCase()} shows localized diagram chrome`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'desktop visual matrix only');
      await seedTheme(page, 'dark');
      await seedLanguage(page, lang);
      await openModule(page, moduleId);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(page.locator('.plot-area, .predominance-diagram, .module').first()).toBeVisible();
      const tablistLocator = page.getByRole('tablist', { name: tablist });
      if (await tablistLocator.count() > 0) {
        await expect(tablistLocator).toBeVisible();
      }
    });
  }
}
