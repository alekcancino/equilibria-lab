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
