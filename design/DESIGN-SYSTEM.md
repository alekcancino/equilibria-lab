# Design System — Distill.pub / TED style

Visual reference for presentations, documents, and academic materials.
Inspired by Distill.pub aesthetics: clean, typographic, data-first.

---

## Design principles

1. **White backgrounds by default.** Dark (navy) slides are reserved for narrative impact moments — opening, closing, key transitions — not for dense technical content.
2. **Data visualizations are the focus.** Charts, diagrams, and equations are the heroes; text supports them, not the other way around.
3. **Maximum 3 colors per slide.** Avoid visual noise: one dominant color + one accent + text.
4. **Clean, minimalist layouts.** Generous whitespace, clear hierarchy, no unnecessary decorative elements.
5. **Typography as a hierarchy tool**, not just a style choice.

---

## Color palette

| Color | Hex | Use |
|---|---|---|
| Dark navy (background) | `#1B2631` | Narrative-impact slide backgrounds |
| Teal (primary accent) | `#1A8F85` | Accents, featured headings, primary data lines |
| Primary text (on white) | `#2C3E50` | Body text, headings on light backgrounds |
| Secondary / tertiary text | `#7F8C8D` | Captions, notes, supporting text |
| Purple (secondary accent) | `#8E44AD` | Occasional accent to distinguish data series |
| White | `#FFFFFF` | Default background |

> Golden rule: never more than 3 of these colors active on a single slide.

---

## Typography

| Family | Use |
|---|---|
| **Georgia** (serif) | Titles and headings |
| **Calibri** (sans-serif) | Body text and general content |
| **Consolas** (monospace) | Code, formulas, and equations |

### Type scale (PPTX)

| Size | Use |
|---|---|
| 42pt | Cover title |
| 30pt | H1 — slide title |
| 24pt | H2 — subtitle / section |
| 14pt | Body — general text |
| 11pt | Caption — footnotes, sources |

---

## Technical stack

- **PptxGenJS** — programmatic slide generation
- **sharp** — SVG-to-PNG rendering
- **react-icons** — vector iconography
- Custom SVG charts (not generic library charts) to maintain full style control

---

## Application notes

- Multivariate equations (e.g. Beer–Lambert) use rich-text runs for correct subscripts/superscripts — never plain text with digits concatenated.
- Spectral charts distinguish species by color **and** line style (thick solid vs. thin dashed), not by color alone, so the difference reads even in grayscale.
- Avoid area fills in overlapping spectrum charts; use lines + peak annotations only.
