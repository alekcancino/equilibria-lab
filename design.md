# Equilibria Lab — Design System

Source of truth for visual and interaction decisions. Aesthetic: [Distill](https://distill.pub/) (editorial science). Interaction: [GeoGebra Calculator](https://www.geogebra.org/calculator) (graph-first exploration).

## Principles

1. **Figure first** — The plot is the article; controls are marginal notes (sidebar / bottom sheet).
2. **Editorial calm** — Warm white surfaces, serif for reading, sans for UI chrome. No ALL CAPS section labels.
3. **Restrained color** — Brand gradient (violet → blue, teal → blue) only in logo and primary actions.
4. **Progressive density** — Desktop shows full sidebar; mobile defaults to chart-only with one-tap access to variables.
5. **Scientific legibility** — Minimum 13px body (14px mobile). Tabular nums for values. WCAG AA contrast.

## Typography

| Role | Family | Weight | Size |
|------|--------|--------|------|
| UI / controls | Source Sans 3 | 400–600 | 13–15px |
| Headings (h2) | Source Sans 3 | 600 | 17–18px |
| Section labels (h3) | Source Sans 3 | 600 | 12px, sentence case |
| Prose / InfoBox | Source Serif 4 | 400 | 14px, line-height 1.55 |
| Footer / meta | Source Sans 3 | 400 | 12px |
| Plotly | Source Sans 3 | 400 | 12–13px |

Load via Google Fonts in `index.html`. Never reference Inter without loading it.

## Color

```css
--bg:           #FAFAF8;   /* warm page */
--surface:      #FFFFFF;   /* panels, topbar */
--surface-alt:  #F5F3EF;   /* subnav, subtle fills */
--border:       #E4DFD6;   /* warm border */
--text:         #1F2933;   /* primary */
--text-muted:   #5C6770;   /* secondary — AA on white */
--accent:       #2563EB;   /* primary action */
--accent-violet:#7C3AED;   /* brand, links hover */
--accent-soft:  #EFF6FF;   /* hover fills */
--accent-teal:  #14B8A6;   /* secondary accent (logo) */
--ok:           #059669;
--warn:         #D97706;
```

Plot traces keep module-specific colors; chrome uses tokens above.

## Spacing & layout

- Base unit: 4px. Common gaps: 8, 12, 16, 24.
- Panel width (desktop): 320px, collapsible to 0.
- Breakpoints: mobile ≤800px, tablet 801–1024px, desktop >1024px.
- Touch targets: min 44×44px on mobile.

### Desktop (GeoGebra)

```
[ Topbar: brand | sections ]
[ Subnav: module pills (if >1) ]
[ Panel 320px | Plot area flex:1 ]
[ Footer: assumptions (collapsible) ]
```

### Mobile

```
[ Topbar: brand | MobileNav select ]
[ Plot area ≥55vh — default full focus ]
[ FAB: Variables ]
[ Bottom sheet 50–70vh when open ]
[ Footer: collapsed details ]
```

## Components

### Topbar
Height ~52px. White surface, bottom border. Section tabs: underline active state, no heavy backgrounds.

### PanelShell
- **Desktop:** Left aside, collapse handle on right edge. Default open.
- **Mobile:** Bottom sheet + FAB. Default **closed**. Overlay dims plot slightly.
- Header: h2 title + ↺ Restablecer.

### PlotToolbar
Floating stack bottom-right of chart: reset zoom, export PNG. Compact icon buttons with title tooltips.

### Controls
- Slider: label left, editable value right (tabular nums).
- Segmented: horizontal desktop; vertical stack or native `<select>` on mobile when labels >12 chars.
- InfoBox / DbPanel: `<details>` with Distill-style summary (serif optional for long help text).

### Tabs (subnav, diagram, chart)
Pills on warm `--surface-alt`. Active: white bg + accent underline. Horizontal scroll on narrow screens.

## Motion

- Transitions: 150–200ms ease-out (panel collapse, sheet slide).
- `@media (prefers-reduced-motion: reduce)`: disable sheet animation; instant open/close.

## Accessibility

- Focus visible on all interactive elements.
- Sheet: `role="dialog"`, `aria-modal`, focus trap optional (lightweight).
- Contrast: `--text-muted` on `--surface` ≥ 4.5:1.

## Do / Don't

**Do:** Keep plot visible when adjusting one slider on mobile (sheet partial height).  
**Don't:** Stack panel above plot at 45vh on mobile (old pattern).  
**Do:** Use sentence-case h3 ("Constantes del sistema").  
**Don't:** Uppercase h3 with 0.5px letter-spacing.  
**Do:** Load Source Sans / Source Serif explicitly.  
**Don't:** Rely on `'Inter', system-ui` without `@font-face`.
