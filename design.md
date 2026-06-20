# Equilibria Lab — Web Design System

Source of truth for the **web simulator**. Historical PPTX tokens live in [design/DESIGN-SYSTEM.md](design/DESIGN-SYSTEM.md) (not used by the app UI).

## Principles

1. **Figure first** — Plot is the focus; controls are sidebar / bottom sheet (GeoGebra pattern).
2. **Modern app chrome** — Slate neutrals, indigo accent, subtle elevation — not clinical teal or slide-deck typography.
3. **Safe data colors** — Okabe-Ito palette for chart traces (colorblind-safe); brand indigo only in UI chrome.
4. **Progressive density** — Desktop sidebar; mobile chart-first + FAB.
5. **Legibility** — 14px body, 12px minimum on interactive labels; tabular nums for values.

## Color

| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#F8FAFC` | Page background |
| `--surface` | `#FFFFFF` | Topbar, panel, cards |
| `--surface-alt` | `#F1F5F9` | Subnav, subtle fills |
| `--border` | `#E2E8F0` | Borders |
| `--text` | `#0F172A` | Primary text |
| `--text-muted` | `#64748B` | Secondary (meta, hints) |
| `--accent` | `#6366F1` | Primary action, active tabs |
| `--accent-hover` | `#4F46E5` | Hover |
| `--accent-soft` | `#EEF2FF` | Hover fills |

Runtime: [src/styles/tokens.css](src/styles/tokens.css)

## Typography

| Role | Family | Size |
|------|--------|------|
| UI / controls | Inter | 14px |
| Headings (brand, h2) | Inter 600 | 17–18px |
| Section labels (h3) | Inter 600 | 12px |
| InfoBox prose | Georgia (optional) | 14px |
| Plotly | Inter | 12–13px |

Load Inter via Google Fonts in `index.html`.

## Chart colors (Okabe-Ito)

Defined in `src/lib/database.ts` as `SPECIES_COLORS`. System markers (pH, pe): `#CC79A7`.

## Layout

- Panel width: 320px (desktop, collapsible)
- Breakpoint mobile: ≤800px
- Touch targets: ≥44px on mobile

See prior GeoGebra shell docs: PanelShell, MobileNav, PlotToolbar — unchanged.

## Accessibility

- Focus ring: indigo `box-shadow` on inputs/buttons
- `--text-muted` for non-critical meta only; controls use `--text` at ≥12px
- `prefers-reduced-motion`: disable sheet animation
