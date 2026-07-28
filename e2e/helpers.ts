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

/** Audit stress set: dense charts, wide diagrams, multi-tab modules. */
export const STRESS_MODULE_IDS = [
  'acidobase',
  'complejos',
  'pourbaix',
  'solcond',
  'titulacion',
] as const;

export type StressModuleId = (typeof STRESS_MODULE_IDS)[number];

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

function isMobileViewport(page: Page): boolean {
  const width = page.viewportSize()?.width;
  return width !== undefined && width <= 800;
}

/** Pin language before navigation — CI runners default to EN via navigator.language. */
export async function seedLanguage(page: Page, lang: 'es' | 'en'): Promise<void> {
  await page.addInitScript((value: string) => {
    localStorage.setItem('equilibria-lang', value);
    document.documentElement.lang = value;
  }, lang);
}

/** Pin theme before navigation — avoids prefers-color-scheme drift in CI. */
export async function seedTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value: string) => {
    localStorage.setItem('equilibria-theme', value);
    document.documentElement.dataset.theme = value;
  }, theme);
}

export async function openVariablesPanel(page: Page): Promise<void> {
  if (!isMobileViewport(page)) return;
  await page.locator('.panel-fab').click();
  await expect(page.locator('.panel-sheet.open')).toBeVisible();
}

export async function openModule(
  page: Page,
  moduleId: ModuleId,
  options?: { openPanel?: boolean },
): Promise<void> {
  await page.goto(`/?m=${moduleId}`);
  await expect(page.locator('.module')).toBeVisible({ timeout: 20_000 });

  if (isMobileViewport(page)) {
    await expect(page.locator('.panel-fab')).toBeVisible();
    if (options?.openPanel) await openVariablesPanel(page);
  } else {
    await expect(page.locator('.panel-shell')).toBeVisible();
  }
}
