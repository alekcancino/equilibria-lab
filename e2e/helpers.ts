import { expect, type Page } from '@playwright/test';

/** Historical ?m= ids — keep in sync with App.tsx HUBS view ids. */
export const MODULE_IDS = [
  'acidobase',
  'mezclas',
  'complejos',
  'especiacion',
  'condicionalesedta',
  'redox',
  'potencialcond',
  'pourbaix',
  'solubilidad',
  'solsal',
  'solcond',
  'solcomp',
  'extraccion',
  'ionexchange',
  'titulacion',
  'actividad',
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasOverflow, 'document should not overflow horizontally').toBe(false);
}

export async function openModule(page: Page, moduleId: ModuleId): Promise<void> {
  await page.goto(`/?m=${moduleId}`);
  await expect(page.locator('.module')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.panel-shell')).toBeVisible();
}
