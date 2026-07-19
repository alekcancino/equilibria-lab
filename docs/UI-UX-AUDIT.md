# UI/UX Audit — Equilibria Lab (2026-07-18, fourth pass)

Baseline: `main` at `8c5b30b` plus the current uncommitted UI audit-wave worktree.

Method: code-level audit using the product register and WCAG 2.1/2.2 criteria, plus live
browser inspection on `localhost:5173`. The route matrix covered all 16 module destinations at
1440×900, 375×812 and 320×568; representative workflows were inspected in Spanish and English,
light and dark themes. Keyboard checks covered the module sheet, tablists and chart export menu.
PNG and CSV actions were activated from the live UI. Bundle evidence comes from the current
production build in `dist/`.

This pass is diagnostic only. It records fixes but does not implement them.

**Update (2026-07-18):** P1 items UIA-01 through UIA-05 were implemented on PR #100
(`feat/ux-audit-waves`). P2/P3 items UIA-06–10 were implemented on PR #101
(`fix/ux-audit-p2-p3`). See Recommended actions below for any residual follow-ups.

## Audit health score

| # | Dimension | Score | Key finding |
| --- | --- | ---: | --- |
| 1 | Accessibility | 2/4 | The Home topic tabs have no keyboard entry point; ten local segmented groups and one select have incomplete accessible semantics. |
| 2 | Performance | 3/4 | Route-level lazy loading is effective; Plotly remains a 1.0 MB raw on-demand chunk. |
| 3 | Responsive design | 3/4 | All routes avoid document overflow down to 320 px, but three mobile plots have measured legend/title collisions. |
| 4 | Theming | 3/4 | Tokens and dark remapping are strong; one unmapped white annotation produces a 2.56:1 dark-mode label and light selected text is below AA. |
| 5 | Anti-patterns | 4/4 | The interface is restrained, task-oriented and free of visible AI-design tropes. |
| **Total** |  | **15/20** | **Good — address the accessibility and chart-reading defects before the next release.** |

Issue count: **0 P0, 5 P1, 3 P2 and 2 P3**.

## Anti-pattern verdict

**Pass. The product does not look AI-generated.** The scientific canvas is primary, surfaces are
quiet, decoration is subordinate to data and components follow a recognizable vocabulary. The
Home cards are legitimate topic destinations rather than a generic metric-card dashboard. The
small scientific SVG previews are functional route cues, not decorative illustrations.

The only system-level cleanup is internal: atmospheric/glass tokens remain in `tokens.css` even
though the shipped UI is now flat. They are not visibly harming the product, but removing unused
roles would make future theming decisions less ambiguous.

## Executive summary

The current interface is materially better than the previous audit baseline. Every route loads
without a console error, no route creates document-level horizontal overflow at 320, 375 or 1440
px, the mobile Variables sheet traps focus and restores it correctly, and the unified Export menu
works with pointer and keyboard for PNG and CSV. Complexation equilibrium and metal speciation now
share a coherent shell while retaining their different independent variables and scientific goals.

The remaining release-level problems are narrow but important:

1. Home's desktop topic navigation is unreachable by keyboard because every topic is assigned
   `tabIndex=-1` when no hub is active.
2. Ten hand-built segmented controls bypass the accessible shared `Segmented` component, and the
   Kielland ion-size select has no programmatic label.
3. Light-mode selected text misses WCAG AA (`3.995:1` on the selected soft surface and `4.467:1`
   on white).
4. Conditional potential renders a white crossing label in dark mode; the remapped text is only
   `2.564:1` against it.
5. At phone width, the x-axis title intersects the legend in Complexes, Competitive precipitation
   and Activity.

## Detailed findings

### P1 — fix before release

#### UIA-01 — Home topic navigation has no keyboard entry point

- **Location:** `src/App.tsx:221-235`
- **Category:** Accessibility / information architecture
- **Evidence:** With no active hub, all seven topic tabs render `aria-selected="false"` and
  `tabIndex=-1`. Live inspection confirmed the entire top topic group is skipped by Tab on Home.
- **Impact:** A keyboard user cannot use the primary desktop navigation to enter Acid–base,
  Complexes, Redox, Solubility, Separations, Titrations or Activity. The Home cards remain a
  workaround, but the global navigation itself is inoperable.
- **Standard:** WCAG 2.1.1 Keyboard; ARIA tabs require one focusable tab in a roving-tabindex set.
- **Recommendation:** Treat hubs as global navigation (`nav` links/buttons with `aria-current`) or
  make the first Home tab the roving focus target without falsely marking its panel selected.
  Add Home and in-module keyboard tests for Tab, arrows, Home and End.
- **Suggested command:** `$impeccable harden`

#### UIA-02 — Ten segmented groups bypass the shared accessible control

- **Location:** `Actividad.tsx:287`, `ConstantesCondicionales.tsx:539`, `Editors.tsx:287`,
  `ExtraccionLiquido.tsx:158,243`, `PotencialCondicional.tsx:656`,
  `SolubilidadCondicional.tsx:736,790`, `Titulacion.tsx:1452,1459`; Kielland select at
  `Actividad.tsx:271`
- **Category:** Accessibility / component consistency
- **Evidence:** These groups render `.segmented` plus plain buttons, but no `radiogroup`,
  `radio`, `aria-checked`, roving tabindex or arrow-key behavior. The selected value is expressed
  only by `.active`. The Kielland `<select>` is visually preceded by a text span but has neither a
  `<label>` nor `aria-labelledby`.
- **Impact:** Screen-reader users cannot reliably identify the selected coefficient/mode or the
  purpose of the ion-size select. Keyboard behavior differs depending on which visually identical
  segmented control a user encounters.
- **Standard:** WCAG 1.3.1 Info and Relationships; 2.1.1 Keyboard; 4.1.2 Name, Role, Value.
- **Recommendation:** Replace every manual group with shared `Segmented`/`NumberSegmented`, pass an
  explicit accessible group name, and connect the Kielland label through `htmlFor` or
  `aria-labelledby`. Add a lint/test guard against new raw `.segmented` groups.
- **Suggested command:** `$impeccable harden`

#### UIA-03 — Light selected-state text is below AA contrast

- **Location:** `src/styles/tokens.css:11-14`; active topic/subtopic/diagram rules in `src/App.css`
- **Category:** Accessibility / theming
- **Evidence:** `#6366F1` over `#EEF2FF` is `3.995:1`; the same accent over white is `4.467:1`.
  The affected labels are generally 12–14 px and therefore require `4.5:1`.
- **Impact:** Selected navigation and view state is harder to read for low-vision users, and the
  failure repeats across the main navigation, subnavigation and diagram tabs.
- **Standard:** WCAG 1.4.3 Contrast (Minimum).
- **Recommendation:** Darken the light-theme text accent while keeping the current softer accent
  for borders/graphics, or introduce separate `--accent-text` and `--accent-decoration` tokens.
  Verify every semantic pair in both themes with an automated contrast table.
- **Suggested command:** `$impeccable colorize`

#### UIA-04 — Conditional-potential crossing label breaks in dark mode

- **Location:** `src/modules/PotencialCondicional.tsx:304-305`; mapping in
  `src/lib/plotTheme.ts`
- **Category:** Theming / accessibility
- **Evidence:** The annotation background remains literal `#fff` while its light gray text is
  remapped to `#94A3B8`. The resulting contrast is `2.564:1`. Live dark-mode inspection showed
  the `× pH 7.8` label as a white patch with nearly invisible text.
- **Impact:** The crossing pH is a decision result, not decoration; users can miss or misread it in
  the theme where the rest of the graph is otherwise coherent.
- **Standard:** WCAG 1.4.3 Contrast (Minimum).
- **Recommendation:** Pass annotation surfaces through the theme, preferably using Plotly layout
  tokens rather than expanding a literal-color lookup. Add a regression test that rejects
  unmapped plot color literals or snapshots this annotation in both themes.
- **Suggested command:** `$impeccable colorize`

#### UIA-05 — Mobile legends collide with scientific axis titles

- **Location:** mobile Plotly layout in `src/components/PlotChart.tsx:72-111`
- **Category:** Responsive design / scientific readability
- **Evidence:** Bounding-box intersection checks at 375×812 found:
  - Complexes: `pL (−log[L])` intersects `M(L)`.
  - Competitive precipitation: the long pAg title intersects both precipitation legend entries.
  - Activity: `Ionic strength I (M)` intersects `γ (z = ±2)`.
- **Impact:** Labels visually merge into chemically meaningless strings. This can cause a learner
  to associate a species with the axis quantity or simply make the graph unreadable on a phone.
- **Recommendation:** Compute bottom margin from legend rows and title size, place legends above
  the plot on narrow screens, or provide a compact scrollable legend outside Plotly. Add a
  collision assertion for every chart family in Spanish and English at 320/375/390 px.
- **Suggested command:** `$impeccable adapt`

### P2 — next focused pass

#### UIA-06 — Charts lack a complete non-visual alternative

- **Location:** `src/components/Chart.tsx`, `PlotChart.tsx`, `PredominanceDiagram.tsx`,
  `Predominance2D.tsx`, `RedoxPredictionScale.tsx`
- **Category:** Accessibility
- **Evidence:** The Plotly wrapper provides a live hover readout and CSV export, but the chart has
  no concise accessible name/description or keyboard-readable data summary. The custom SVG
  diagrams have no `role="img"`, `<title>` or `<desc>`.
- **Impact:** A screen-reader user receives surrounding metrics but not the relationship encoded by
  the curves, regions or operating marker. CSV is useful, but it is a separate download rather
  than an immediate equivalent.
- **Standard:** WCAG 1.1.1 Non-text Content; 1.3.1 Info and Relationships.
- **Recommendation:** Add per-chart bilingual summaries and SVG titles/descriptions; expose a
  compact data table or structured key points where a full table would be excessive.
- **Suggested command:** `$impeccable harden`

#### UIA-07 — The language toggle communicates current and destination states differently

- **Location:** `src/components/LanguageToggle.tsx:5-18`
- **Category:** UX clarity / i18n
- **Evidence:** The visible pill says the current language (`ES` or `EN`), while its accessible name
  and title describe the destination language. Both conventions are common, so the bare two-letter
  pill is ambiguous without hovering.
- **Impact:** A first-time user may interpret `EN` as “switch to English” even while the page is
  already English.
- **Recommendation:** Use a two-state ES/EN segmented control with the current state visibly
  selected, or label the action explicitly with the destination in both visible and accessible
  text.
- **Suggested command:** `$impeccable clarify`

#### UIA-08 — Mobile verticalizes every segmented control indiscriminately

- **Location:** `src/App.css:2164-2177`
- **Category:** Responsive design / efficiency
- **Evidence:** Under 800 px, every `.segmented` becomes a vertical stack. This is helpful for long
  workflow names but makes compact charge, stoichiometry and two-option controls consume several
  times their necessary height inside an already scroll-heavy Variables sheet.
- **Impact:** Experts must scroll more to compare coupled parameters, while learners lose the
  visual “one choice from a small set” relationship.
- **Recommendation:** Add compact and verbose variants. Keep 2–4 short numeric/symbolic options in
  a horizontal 44 px target row; stack only long labels or groups that fail a measured fit test.
- **Suggested command:** `$impeccable adapt`

### P3 — polish

#### UIA-09 — Product inventory wording is ambiguous

- **Location:** `src/i18n/translations.ts:198-199`
- **Category:** Information architecture / UX copy
- **Evidence:** Home promises 14 engines while the current route inventory presents 16 module
  destinations and the UI documentation refers to all 16 routes.
- **Impact:** It does not block a task, but it weakens product precision and complicates future
  release notes.
- **Recommendation:** State the distinction explicitly, for example “14 calculation engines across
  16 guided workflows,” or use one canonical count everywhere.
- **Suggested command:** `$impeccable clarify`

#### UIA-10 — Scientific compound-name typography is not fully normalized

- **Location:** selected keys in `src/i18n/translations.ts`, including
  `acidoBase.title`, `titulacion.acidBaseTitle` and `actividad.title`
- **Category:** Typography / i18n
- **Evidence:** The dictionary mixes hyphen-minus and en dash for the same compound constructions:
  `ácido-base` vs `ácido–base`, `líquido-líquido` vs `líquido–líquido`, and
  `Debye-Hückel` vs `Debye–Hückel`.
- **Impact:** Minor visual inconsistency in an otherwise careful scientific product.
- **Recommendation:** Define a short bilingual notation style sheet and normalize display prose;
  leave export keys or source-specific notation untouched where deliberate.
- **Suggested command:** `$impeccable typeset`

## Patterns and systemic issues

- Shared components are now strong, but manual lookalikes remain the main regression path. A lint
  or render-test guard should enforce `Segmented`, labeled form controls and themed plot colors.
- Chart responsiveness is treated as a fixed Plotly margin rather than content-aware layout. The
  three collisions are symptoms of that shared rule, not three independent module bugs.
- Theme colors have two paths: CSS tokens for chrome and literal-remapping for charts. The one dark
  annotation failure shows why a single plot-theme source of truth is safer.
- The accessibility architecture is strongest in newly revised components (Variables sheet,
  DiagramTabs, Export) and weakest in legacy inline JSX controls and custom SVG diagrams.

## Positive findings to preserve

- All 16 routes loaded without console errors in the desktop and phone matrices.
- No document-level horizontal overflow at 320, 375 or 1440 px.
- The Variables sheet focuses the close action, traps Tab/Shift+Tab, closes on Escape, prevents
  background interaction and restores focus to Variables.
- Topic/submodule selects give mobile users a compact, predictable navigation model.
- Diagram and titration strips expose continuation through clipping, mask treatment and scrolling.
- Export uses one labeled menu, fits at phone width, supports arrow keys/Home/End/Escape, and live
  PNG/CSV activation produced no console error.
- Dark neutral surfaces, plot grids and series remapping are coherent in the inspected modules.
- Model guides, validity warnings, result strips and chart readouts establish a credible
  Define → Interpret → Extend learning path without limiting expert inputs.
- Route-level code splitting keeps Plotly off Home. The production Plotly chunk is approximately
  1.0 MB raw / 358 kB gzip and is loaded only when a chart route needs it.

Final deterministic gate: `npm run check` passes ESLint, all 19 Vitest files / 338 tests,
TypeScript and the production Vite build. Vite reports only its expected size warning for the
lazy Plotly chunk.

## Recommended actions

1. **[P1] `$impeccable harden`** — repair Home keyboard navigation, replace all manual segmented
   groups, label the Kielland select and add chart/SVG alternatives.
2. **[P1] `$impeccable adapt`** — make Plotly legend placement content-aware and split compact vs
   verbose segmented behavior on mobile.
3. **[P1] `$impeccable colorize`** — introduce AA-safe light accent text and eliminate unmapped
   annotation surfaces from dark plots.
4. **[P2] `$impeccable clarify`** — make the language action unambiguous and reconcile the product
   inventory count.
5. **[P3] `$impeccable typeset`** — normalize compound-name punctuation in bilingual prose.
6. **[Final] `$impeccable polish`** — re-run the full route/theme/language/viewport matrix after
   the fixes and remove any remaining one-off control variants.

You can ask me to run these one at a time, all at once, or in any order you prefer.

Re-run `$impeccable audit` after fixes to see the score improve.
