export type SourceQuality = 'primary' | 'secondary' | 'illustrative';

export interface ConstantSource {
  citation: string;
  locator?: string;
  temperatureC: number;
  medium: string;
  basis: 'activity' | 'concentration';
  quality: SourceQuality;
  verifiedOn: string;
  uncertainty?: string;
}

export function isCompleteConstantSource(source: ConstantSource): boolean {
  if (!source.citation.trim()) return false;
  if (!Number.isFinite(source.temperatureC)) return false;
  if (!source.medium.trim()) return false;
  if (source.basis !== 'activity' && source.basis !== 'concentration') return false;
  if (!['primary', 'secondary', 'illustrative'].includes(source.quality)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.verifiedOn)) return false;
  if (Number.isNaN(Date.parse(source.verifiedOn))) return false;
  return true;
}

export function formatConstantSource(source: ConstantSource): string {
  const parts = [source.citation];
  if (source.locator) parts.push(source.locator);
  parts.push(`${source.temperatureC} °C`, source.medium);
  return parts.join(' · ');
}
