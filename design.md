# Equilibria Lab — Web Design System

Source of truth for the **web simulator**. Historical PPTX tokens live in [design/DESIGN-SYSTEM.md](design/DESIGN-SYSTEM.md) (not used by the app UI).

## Direction: "C panels + D curves" (final, 2026-06-27)

Resolved after reviewing variants C and D on the live app. Audience: chemistry
undergrad/grad students and professors — easy, intuitive, projectable in class.
Applies uniformly to all 14 modules (simples, múltiples, titulaciones).

- **Panels & variable controls → C:** the left panel is a stack of **soft rounded section
  cards** (`PanelSection`, `--radius-xl`, `--shadow-card`) — Sistema / Condiciones /
  Resultado — with comfortable padding and accordion (`Disclosure`) for advanced layers.
  A nested `.editor` inside a card is flattened (no card-in-card).
- **Results → C:** key numbers live in a **row of big cards below the plot** (`ResultCardRow`,
  `.result-row`), the single most important in the `--accent-grad` (indigo→violet) card.
  Big `tabular-nums`, readable from across a classroom. These carry the exam answers
  (pM′/pY′ at x %, V eq, windows, etc.).
- **Curves → D:** the plot is an **immersive hero** inside a soft card (`.chart-shell`,
  `--radius-2xl`). Thick **Okabe-Ito** lines (primary `#0072B2`), clean light grid
  (`--plot-grid`), no zerolines, axis titles **with units**, legend hidden when a single
  series, equivalence/markers labelled. Colorblind-safe by default.

Net: a friendly editable card panel that scales to dense modules, an immersive figure-first
curve, and exam-ready numbers in a readout row. `PlotChart.tsx` carries the curve styling;
`ResultCardRow` + `.plot-area` flex column carry the layout.

## Principles

1. **Figure first** — Plot is the hero (elevated card, ambient background); controls are a
   soft-card sidebar (desktop) / bottom sheet (mobile).
2. **Soft instrument chrome** — Slate neutrals, indigo→violet accent gradient, layered soft
   elevation and glass — not clinical teal or slide-deck typography.
3. **Safe data colors** — Okabe-Ito palette for chart traces (colorblind-safe); brand indigo
   only in UI chrome and the primary result chip.
4. **Progressive disclosure** — Basic controls always visible in grouped section cards;
   advanced (side reactions, comparisons) behind a single ordered accordion, not nested
   `<details>`.
5. **Result-forward** — Key numeric outputs surface in floating chips on the plot, not buried
   in the panel. Tabular nums everywhere.
6. **Legibility** — 14px body, 12px minimum on interactive labels.

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
