# UI/UX Audit — Equilibria Lab (2026-07-22, fifth pass)

Baseline: `main` at `dd9e4c0` plus the current fifth-pass remediation worktree.

Method: code-level review against the product register and WCAG 2.1/2.2, plus live browser
inspection on `localhost:5173`. The route matrix covered all 16 destinations at 1440×900,
375×812 and 320×568; short-height behavior was additionally measured at 360×640 and 375×667.
Representative workflows were inspected in Spanish and English, light and dark themes. Keyboard
checks covered Home navigation, the Variables sheet, language selection and the Export menu. PNG
and CSV were activated from live Plotly charts instead of inferred from unit tests.

**Implementation update (2026-07-22):** UIA-R2-01 through UIA-R2-06 are implemented in the
current worktree and verified through the live application. The detailed findings remain below as
the acceptance record.

## Current audit health score

| # | Dimension | Score | Current evidence |
| --- | --- | ---: | --- |
| 1 | Accessibility | 4/4 | Charts expose bilingual series endpoints and interior extrema; navigation semantics match route behavior; saved-system actions are persistently labeled; mobile controls meet the 44 px target. |
| 2 | Performance | 3/4 | Route-level lazy loading remains effective; Plotly is still the dominant on-demand bundle. |
| 3 | Responsive design | 4/4 | Direct and tabbed plots preserve readable minima on short phones, use content-aware mobile legends and scroll vertically instead of compressing scientific data. |
| 4 | Theming | 4/4 | Selected states and plot annotations now meet contrast in both themes; the inspected dark-mode accents and scientific labels remain legible. |
| 5 | Anti-patterns | 4/4 | The interface remains restrained, task-oriented and visually coherent without decorative dashboard noise. |
| **Total** |  | **19/20** | **Release-ready UI/UX; the remaining point is the intentionally lazy but large Plotly bundle.** |

Open issue count from this pass: **0 P0, 0 P1, 0 P2 and 0 P3**.

## Executive summary

The fourth-pass work is real: Home has a keyboard entry point, all former manual segmented groups
use the shared accessible control, light selected text now reaches 7.07:1 on the soft accent
surface, the conditional-potential crossing annotation reaches 10.57:1 in dark mode, and the
measured Complexes/Competitive precipitation/Activity collisions are gone at 375×812. Language is
now an unambiguous ES/EN selected control, compact segmented groups remain horizontal, Home states
14 engines across 16 workflows, and scientific titles use normalized dash typography.

The remediation closes both user-visible failures and all four accessibility follow-ups. Plotly
now receives an SVG-safe font-family string and produces valid PNG files; short viewports keep
readable chart dimensions inside a vertically scrollable scientific canvas. Chart alternatives
include endpoints and interior extrema for every numeric series, global route controls use
navigation semantics, saved-system deletion names its target and supports Undo, and all inspected
mobile controls reach at least 44×44 px.

## Fifth-pass findings

### P1 — fix before release

#### UIA-R2-01 — Plotly PNG export failure — resolved

- **Location:** `src/components/Chart.tsx:63-73`; `src/components/PlotToolbar.tsx:55-64`
- **Evidence:** Live activation failed in Activity, Complexes, Conditional potential and
  Competitive precipitation. Every attempt kept the menu open and rendered “The file could not
  be generated. Try again.” CSV succeeded and returned focus to Export. Direct browser probing
  showed `Plotly.toImage(..., {format: 'svg'})` succeeds, while `png`, `jpeg` and `webp` reject
  with an image error event.
- **Impact:** The primary visual export promised by the menu is unavailable across Plotly-backed
  modules; the user's original report is still reproducible.
- **Recommendation:** Make rasterization browser-safe after SVG generation or replace the export
  path with a proven Plotly-compatible raster flow. Add a real-browser test that downloads the
  file and verifies its PNG signature and non-zero dimensions; the current Blob unit test starts
  after the failing step and cannot detect this regression.
- **Suggested command:** `$impeccable harden`
- **Resolution:** Plotly font tokens are normalized before layout serialization so the generated
  SVG contains no unescaped nested quotes. Live interception of the full toolbar flow produced
  `equilibria-actividad-gamma.png`, MIME `image/png`, 75,589 bytes, with the correct eight-byte
  PNG signature. Activity, Complexes, Conditional potential and Competitive precipitation all
  close the menu without an error and return focus to Export.

#### UIA-R2-02 — Direct charts collapse on short phone viewports — resolved

- **Location:** `src/App.css:1549-1552` and mobile chart rules around `src/App.css:2112`
- **Evidence:** At 320×568, the Plotly canvas measures 76.8 px in Solubility and 60.8 px in
  Pourbaix. At 360×640, Pourbaix is 132.8 px high and multiple legend/annotation intersections
  remain. The more specific `.plot-area > .chart-shell { min-height: 0; }` wins over the mobile
  `.chart-shell` minimum. The document itself does not overflow, so content is compressed instead
  of becoming scrollable.
- **Impact:** Axes, legends and species labels merge into unreadable scientific notation on small
  phones. Pourbaix can no longer communicate phase boundaries reliably.
- **Recommendation:** Enforce a readable plot minimum for direct-chart routes and let the content
  region scroll vertically when the viewport is too short. Keep legends outside the plotting
  rectangle or make their space content-aware. Add visual/collision tests at 320×568 and 360×640,
  not width-only overflow assertions.
- **Suggested command:** `$impeccable adapt`
- **Resolution:** Mobile plot areas now scroll vertically; direct charts keep a 480 px minimum,
  tabbed Plotly charts keep 360 px on viewports no taller than 700 px, and mobile legend columns,
  rows and top clearance follow the visible legend entries. All 16 routes pass collision and
  document-overflow checks at 320×568; Solubility and Pourbaix expose 388.8 px Plotly canvases
  instead of 76.8 px and 60.8 px.

### P2 — next focused pass

#### UIA-R2-03 — Chart alternatives describe structure, not meaning — resolved

- **Location:** `src/components/Chart.tsx:48-53`; `chart.a11ySummary` in
  `src/i18n/translations.ts`
- **Evidence:** The new `role="img"` wrapper is bilingual, but every Plotly chart falls back to
  “Y vs X with N data series.” No module supplies `accessibilitySummary`, so the alternative does
  not state trends, crossings, operating-point values or dominant regions.
- **Impact:** A screen-reader user learns that a graph exists but not what relationship it shows.
  CSV remains useful, but it is a separate download rather than an immediate equivalent.
- **Recommendation:** Provide module-specific bilingual summaries with the key scientific result,
  and expose a compact data/key-points table where the relationship cannot be summarized safely.
- **Suggested command:** `$impeccable harden`
- **Resolution:** The shared Chart derives bilingual endpoint facts for every visible numeric
  series and adds meaningful interior maxima/minima when present. Non-numeric, hidden and gap
  values are excluded. Modules can still override the generated summary when a domain-specific
  explanation is safer.

#### UIA-R2-04 — Shared numeric controls miss the 44 px product target — resolved

- **Location:** `.num-field` and `input[type='range']` in `src/App.css`; shared `Slider` and
  `ConcSlider` in `src/components/Controls.tsx`
- **Evidence:** In the live mobile Variables sheet, editable number fields measure 72×24 px and
  range inputs measure 311×6 px. Compact segmented options can be 31×44 px. Keyboard focus is
  visible and WCAG's 24 px minimum can be met in some cases, but the product register explicitly
  requires 44 px targets.
- **Impact:** Fine adjustment is unnecessarily difficult for touch users, especially when several
  scientific parameters are edited in sequence.
- **Recommendation:** Preserve the visually light track and fields while enlarging their actual
  hit boxes through wrappers/padding; keep dense symbolic segmented controls compact only when
  spacing or an equivalent control satisfies the target exception.
- **Suggested command:** `$impeccable harden`
- **Resolution:** Mobile number fields, selects, text inputs, toggles, range hit areas, compact
  segmented options and saved-system actions now measure at least 44 px in each constrained
  dimension. Slider tracks remain visually 6 px through browser-specific track styling, so the
  larger hit target does not add visual weight.

#### UIA-R2-05 — Saved-system labels disappear or do not describe the action — resolved

- **Location:** `src/components/SavedSystemsButton.tsx:40-70`
- **Evidence:** “System name” is only a placeholder, so the instruction disappears after typing.
  A saved row's remove button is announced as “✕”; `title="Delete"` is not its accessible name and
  does not identify which saved system will be removed.
- **Impact:** Users can lose input context, and screen-reader users cannot distinguish the purpose
  or target of a destructive action.
- **Recommendation:** Add a persistent visible label, give removal an `aria-label` containing the
  saved name, and provide a lightweight undo or explicit recovery path for accidental deletion.
- **Suggested command:** `$impeccable clarify`
- **Resolution:** A persistent bilingual label is linked to the name field, the placeholder is an
  example rather than the label, remove actions include the saved name, dates follow the selected
  UI language and deletion exposes an immediate Undo action. Invalid stored dates are rejected
  before rendering.

#### UIA-R2-06 — Global navigation still uses incomplete tab semantics — resolved

- **Location:** topic and subview navigation in `src/App.tsx:221-263`
- **Evidence:** Keyboard entry and arrow navigation now work, but topic/subview controls expose
  `tablist`/`tab` without controlled `tabpanel` elements or `aria-controls`. On Home, the tablist
  has one focusable tab but no selected tab because these controls are navigation destinations,
  not tabs within one composite panel.
- **Impact:** Assistive technology receives a widget model that does not match the page structure,
  despite the interaction itself being keyboard-operable.
- **Recommendation:** Model the controls as navigation links/buttons with `aria-current`, or add
  complete tab/tabpanel relationships if the interface is intentionally a tab widget.
- **Suggested command:** `$impeccable harden`
- **Resolution:** Topic and subview groups are navigation landmarks with `aria-current="page"`.
  Roving focus and Arrow/Home/End activation remain intact, while genuine diagram/titration tabs
  retain the complete tab widget pattern.

## Positive regression results

- All 16 routes loaded with zero console errors at 1440×900, 375×812 and 320×568.
- No route produced document-level horizontal overflow at those widths.
- The former 375 px axis-title/legend collisions are closed in all Plotly routes.
- Light selected text now measures 7.07:1 on `--accent-soft` and 7.90:1 on white.
- The dark conditional-potential crossing label measures 10.57:1 and no longer renders as a white
  patch.
- The mobile Variables sheet focuses Close, makes background regions inert, closes on Escape and
  restores focus to Variables.
- Home and shared segmented controls support roving focus and arrow-key selection.
- ES/EN chrome checks found no reproduced cross-language leaks in the 16-route matrix.
- CSV export succeeds, closes its menu and restores focus.
- PNG export now succeeds through the same menu in both themes and produces a valid binary file.
- At 320×568, all 16 routes report zero title/legend/annotation collisions, zero document overflow
  and zero console errors.
- The final deterministic suite contains 20 test files and 341 tests.

## Historical fourth-pass record (2026-07-18)

The detailed UIA-01…10 findings below preserve the original evidence and rationale. PRs #100 and
#101 closed their primary implementation scope; the partial semantic/accessibility residuals are
tracked above as UIA-R2-03 and UIA-R2-06.

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
