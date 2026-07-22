import type { KeyboardEvent } from 'react';

/** WAI-ARIA tablist keyboard behavior with automatic activation. */
export function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const tablist = event.currentTarget.closest('[role="tablist"]');
  if (!tablist) return;
  const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
  const current = tabs.indexOf(event.currentTarget);
  if (current < 0 || tabs.length === 0) return;

  event.preventDefault();
  let next = current;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = tabs.length - 1;
  if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
  if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
  tabs[next].focus();
  tabs[next].click();
}

/** Arrow-key navigation for a roving set of route buttons inside a nav landmark. */
export function handleRovingNavigationKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const navigation = event.currentTarget.closest('[data-roving-navigation]');
  if (!navigation) return;
  const items = Array.from(navigation.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
  const current = items.indexOf(event.currentTarget);
  if (current < 0 || items.length === 0) return;

  event.preventDefault();
  let next = current;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = items.length - 1;
  if (event.key === 'ArrowRight') next = (current + 1) % items.length;
  if (event.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length;
  items[next].focus();
  items[next].click();
}
