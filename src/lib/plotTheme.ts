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
};

/** Ink/guide colors hardcoded in modules: light hex → dark equivalent. */
const INK_DARK: Record<string, string> = {
  '#2C3E50': '#CBD5E1', // annotation ink (equivalence lines, P.E. labels)
  '#2c3e50': '#CBD5E1',
  '#7F8C8D': '#94A3B8',
  '#999999': '#7C8BA3',
  '#95a5a6': '#7C8BA3',
  '#aaaaaa': '#5A6B85',
  '#e8ecef': '#2A3A55',
};

const DARK_MAP: Record<string, string> = { ...SERIES_DARK, ...INK_DARK };

// Data-carrying keys that never hold colors — skipped to avoid walking huge arrays.
const SKIP_KEYS = new Set(['x', 'y', 'z', 'text', 'customdata', 'hovertemplate', 'hovertext', 'name']);

function walk(value: unknown): unknown {
  if (typeof value === 'string') return DARK_MAP[value] ?? value;
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
