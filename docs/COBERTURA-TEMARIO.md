# Cobertura del temario UNAM (QA I / II / III)

Mapa de cobertura de QuimEq contra los programas de estudio de la Facultad de
Química, UNAM:

- **1402** Química Analítica I (4.º sem)
- **1504** Química Analítica II (5.º sem)
- **1604** Química Analítica III (6.º sem)

Leyenda: ✅ cubierto · 🟡 parcial · ⬜ no cubierto (roadmap)

---

## Química Analítica I (1402) — equilibrios simples

| Unidad | Tema | Estado | Módulo |
|---|---|---|---|
| 1 | Proceso analítico total | ⬜ | sin módulo de definición del problema, muestreo, preparación, medición y evaluación |
| 2 | Equilibrio acuoso, actividad, Debye-Hückel, ΔG, Le Chatelier | 🟡 | ley de masas implícita; actividad≈concentración; faltan actividad, fuerza iónica y ΔG |
| 3 | Redox: Nernst, predominio, predicción, mezclas, anfolitos y dismutación | 🟡 | Redox cubre pares y predicción; Potencial condicional cubre dismutación; faltan balanceo y potencial de mezclas/anfolitos |
| 4 | Ácido-base: fuerza, pH, mezclas, buffers, curvas e indicadores | ✅ | Ácido-base + Mezclas + Titulaciones |
| 5 | Intercambio de partículas, complejos, pP y enmascaramiento | 🟡 | Complejos cubre formación/predominio; enmascaramiento aparece en constantes condicionales, no como desarrollo QA I |
| 6 | Solubilidad, precipitación y reparto líquido-líquido | 🟡 | Solubilidad + Extracción; faltan fuerza iónica y una integración explícita de separación |
| — | Titulaciones como aplicación | ✅ | Titulaciones ácido-base, EDTA, redox, precipitación y potenciométrica |

**QA I: cobertura estimada 70–75 %.** Los temas conceptuales y de cálculo
omitidos también forman parte del programa y no deben descartarse por no ser una
simulación gráfica.

---

## Química Analítica II (1504) — efecto de un equilibrio secundario

> Objetivo del curso: efecto de un **equilibrio secundario** sobre la
> cuantitatividad de la reacción principal; introducción a separaciones.

| Unidad | Tema | Estado | Módulo |
|---|---|---|---|
| 1 | Constante aparente, efecto del medio | 🟡 | concepto presente en todos los módulos de K'; sin módulo introductorio dedicado |
| 2 | **Complejos + ácido-base**: K' condicional, log K'=f(pH), zonas | ✅ | **Constantes condicionales** — log K', coeficientes α, enmascaramiento, ventana de factibilidad |
| 3 | **Redox + ácido-base**: E°' aparente, Pourbaix, cuantitatividad | ✅ | **Potencial condicional** — E°'=f(pH), cruce de pares, escala condicional, dismutación (Latimer) |
| 4 | **Redox + complejos**: E°'=f(pX), diagramas potencial-pX | ✅ | **Potencial condicional** — E°'=f(pX) con α_Ox/α_Red editables |
| 5 | Solubilidad/precipitación: log s=f(pH), log s=f(pX), separaciones | 🟡 | **Precipitación selectiva** + **Solubilidad y pH**; falta log s=f(pX) y redisolución/selectividad con complejantes |
| 6 | Extracción líquido-líquido (intro) | ✅ | **Extracción líquido-líquido** — log D=f(pH), %E=f(pH), extracciones múltiples, factor de separación |
| 7 | Intercambio iónico, reparto condicional y separaciones | ⬜ | módulo pendiente |

**QA II: cobertura estimada 75–80 %.** Intercambio iónico es una unidad completa
del programa 1504; también falta log s=f(pX).

---

## Química Analítica III (1604) — constantes condicionales y separaciones

> Objetivo del curso: **predicción y simulación de equilibrios múltiples
> mediante la evaluación de las constantes condicionales** en medio homogéneo y
> heterogéneo. Bibliografía base: **Ringbom**, *Complexation in Analytical
> Chemistry*. **Este es el núcleo de la herramienta profesional.**

| Unidad | Tema | Estado | Módulo |
|---|---|---|---|
| 1 | **Constantes condicionales (homogéneo)**: coeficientes parásitos, log K'=f(pH), enmascaramiento, consecutivos, titulaciones y redox | 🟡 | **Constantes condicionales** + **Potencial condicional**; faltan consecutivos y mayor trazabilidad del razonamiento |
| 2 | **Precipitación**: pKs'=f(pH), logS'=f(pH), selectividad y pureza | 🟡 | **Precipitación selectiva** + **Solubilidad y pH**; falta pureza teórica y factores prácticos |
| 3 | **Extracción L-L**: reparto, polimerización, separación, quelatos y preconcentración | 🟡 | **Extracción líquido-líquido** cubre reparto ácido-base, quelatos y separación; faltan polimerización, preconcentración y validación bibliográfica exhaustiva |
| 4 | Intercambio iónico: constante de selectividad, reparto condicional en lotes | ⬜ | Módulo nuevo (Tier 3 — roadmap) |
| 5 | Disolventes no acuosos: efecto nivelador, escalas de acidez, titulación en anfipróticos | ⬜ | Módulo nuevo (Tier 3 — roadmap) |

**QA III: cobertura estimada 65–70 %.** Las unidades 1–3 están parcialmente
cubiertas; 4–5 siguen pendientes.

---

## Resumen de huecos activos (priorizados)

| # | Tema | Prioridad | Acción |
|---|---|---|---|
| 1 | Intercambio iónico: Ksel, reparto condicional y separaciones | Alta | Módulo nuevo; requerido por QA II y III |
| 2 | Actividad, fuerza iónica y Debye-Hückel | Alta | Capa transversal y módulo introductorio |
| 3 | log s=f(pX), pureza y redisolución selectiva | Media | Ampliar módulos de solubilidad |
| 4 | Polimerización, preconcentración y trazabilidad de quelatos | Media | Ampliar y validar ExtraccionLiquido |
| 5 | Disolventes no acuosos | Media | Módulo nuevo |

Detalle de diseño en [`ROADMAP-EQUILIBRIOS-MULTIPLES.md`](ROADMAP-EQUILIBRIOS-MULTIPLES.md).
