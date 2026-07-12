// Dark-theme color mapping for Plotly traces/shapes/annotations.
//
// Modules build their traces with the light palette (SPECIES_COLORS + a few
// ink/guide grays). Rather than threading the theme through 14 modules,
// PlotChart remaps known light hexes to their dark equivalents at render time.
// Both palettes were validated with the dataviz six-checks script:
//   light: 6 core Okabe-Ito + violet/olive extras  → ALL CHECKS PASS
//   dark (surface #16203A): same hue identities, L in [0.48, 0.67] → ALL CHECKS PASS
// (contrast/CVD WARNs are relieved by legends + hover tooltips + CSV export.)

/** Series colors: light hex → dark equivalent (same hue identity). */
const SERIES_DARK: Record<string, string> = {
  '#0072B2': '#2E8FD0', // blue
  '#D55E00': '#E86A15', // vermillion
  '#009E73': '#00A87C', // bluish green
  '#CC79A7': '#C9699C', // reddish purple
  '#E69F00': '#C08300', // orange
  '#56B4E9': '#2596D6', // sky blue
  '#7B5CD6': '#8D74E8', // violet (slot 7)
  '#9A6A00': '#9A7A20', // olive (slot 8)
  '#117733': '#3FA35C', // green (slot 9)
  '#882255': '#C65A82', // wine (slot 10)
  '#999933': '#C4C24A', // olive-gold (slot 11)
  '#AA4499': '#C978BC', // magenta (slot 12)
};

/** Ink/guide colors hardcoded in modules: light hex → dark equivalent. */
const INK_DARK: Record<string, string> = {
  '#2c3e50': '#CBD5E1', // annotation ink only — never reuse this hex for a data series
  '#7f8c8d': '#94A3B8',
  '#999999': '#7C8BA3',
  '#95a5a6': '#7C8BA3',
  '#aaaaaa': '#5A6B85',
  '#e8ecef': '#2A3A55',
  '#94a3b8': '#B8C4D6', // solid-phase color in the 2D Sillén map (Predominance2D)
};

/**
 * Per-preset series hexes that aren't part of SPECIES_COLORS (SolubilidadSal
 * ran out of validated slots at 10 presets). Only one preset is ever plotted
 * at a time, so cross-series CVD separation doesn't apply — these just need
 * to stay legible against the dark plot surface (#16203A).
 */
const EXTRA_SERIES_DARK: Record<string, string> = {
  '#888888': '#A8B3C2',
  '#555555': '#9AA6B8',
  '#f0a500': '#FFC233',
};

// Keys are matched case-insensitively (module literals aren't consistently cased).
const DARK_MAP: Record<string, string> = Object.fromEntries(
  Object.entries({ ...SERIES_DARK, ...INK_DARK, ...EXTRA_SERIES_DARK })
    .map(([hex, dark]) => [hex.toLowerCase(), dark]),
);

// Data-carrying keys that never hold colors — skipped to avoid walking huge arrays.
const SKIP_KEYS = new Set(['x', 'y', 'z', 'text', 'customdata', 'hovertemplate', 'hovertext', 'name']);

function walk(value: unknown): unknown {
  if (typeof value === 'string') return DARK_MAP[value.toLowerCase()] ?? value;
  if (Array.isArray(value)) return value.map(walk);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SKIP_KEYS.has(k) ? v : walk(v);
    }
    return out;
  }
  return value;
}

/** Remap every known light color inside traces/shapes/annotations to its dark twin. */
export function toDarkColors<T>(items: T[] | undefined): T[] | undefined {
  if (!items) return items;
  return items.map((item) => walk(item) as T);
}
