# Cobertura del temario UNAM (QA I / II / III)

Mapa de cobertura de QuimEq contra los programas de estudio de la Facultad de
Química, UNAM:

- **1402** Química Analítica I (4.º sem)
- **1504** Química Analítica II (5.º sem)
- **1604** Química Analítica III (6.º sem)

Leyenda: ✅ cubierto · 🟡 parcial · ⬜ no cubierto (roadmap)

Última revisión: 2026-06-20 (v0.3.0).

---

## Química Analítica I (1402) — equilibrios simples

| Unidad | Tema | Estado | Módulo |
|---|---|---|---|
| 1 | Proceso analítico total | ⬜ | sin módulo de definición del problema, muestreo, preparación, medición y evaluación |
| 2 | Equilibrio acuoso, actividad, Debye-Hückel, ΔG, Le Chatelier | 🟡 | ley de masas implícita; módulo **Actividad / Debye-Hückel** (γ vs I); motores aún usan concentraciones; faltan ΔG y capa transversal en cálculos |
| 3 | Redox: Nernst, predominio, predicción, mezclas, anfolitos y dismutación | 🟡 | Redox cubre pares y predicción; Potencial condicional cubre dismutación; faltan balanceo y potencial de mezclas/anfolitos |
| 4 | Ácido-base: fuerza, pH, mezclas, buffers, curvas e indicadores | ✅ | Ácido-base + Mezclas + Titulaciones |
| 5 | Intercambio de partículas, complejos, pP y enmascaramiento | 🟡 | Complejos cubre formación/predominio; enmascaramiento en constantes condicionales |
| 6 | Solubilidad, precipitación y reparto líquido-líquido | 🟡 | Solubilidad + Extracción; actividad no integrada en Ksp |
| — | Titulaciones como aplicación | ✅ | Titulaciones ácido-base, EDTA, redox, precipitación y potenciométrica |

**QA I: cobertura estimada 72–76 %.**

---

## Química Analítica II (1504) — efecto de un equilibrio secundario

| Unidad | Tema | Estado | Módulo |
|---|---|---|---|
| 1 | Constante aparente, efecto del medio | 🟡 | concepto presente en todos los módulos de K'; sin módulo introductorio dedicado |
| 2 | **Complejos + ácido-base**: K' condicional, log K'=f(pH), zonas | ✅ | **Constantes condicionales** |
| 3 | **Redox + ácido-base**: E°' aparente, Pourbaix, cuantitatividad | ✅ | **Potencial condicional** + **Pourbaix** |
| 4 | **Redox + complejos**: E°'=f(pX), diagramas potencial-pX | ✅ | **Potencial condicional** |
| 5 | Solubilidad/precipitación: log s=f(pH), log s=f(pX), separaciones | 🟡 | **Precipitación selectiva** (log s vs pH, pX, pureza, redisolución); **Solubilidad y pH** |
| 6 | Extracción líquido-líquido (intro) | 🟡 | **Extracción líquido-líquido** — reparto, quelatos, múltiples etapas, polimerización y preconcentración (MVP) |
| 7 | Intercambio iónico, reparto condicional y separaciones | 🟡 | **Intercambio iónico** — lote, isoterma, columna simplificada; sin cromatografía completa |

**QA II: cobertura estimada 78–82 %.**

---

## Química Analítica III (1604) — constantes condicionales y separaciones

| Unidad | Tema | Estado | Módulo |
|---|---|---|---|
| 1 | **Constantes condicionales (homogéneo)** | 🟡 | **Constantes condicionales** + **Potencial condicional**; faltan consecutivos |
| 2 | **Precipitación**: pKs'=f(pH), logS'=f(pH), selectividad y pureza | 🟡 | **Precipitación selectiva** + pureza/co-precipitación; factores prácticos limitados |
| 3 | **Extracción L-L** | 🟡 | **Extracción líquido-líquido** + polimerización/preconcentración MVP |
| 4 | Intercambio iónico | 🟡 | **Intercambio iónico** (Ksel, lote, isoterma, breakthrough); sin columna real multi-zona |
| 5 | Disolventes no acuosos | ⬜ | Módulo pendiente (Tier 3) |

**QA III: cobertura estimada 68–72 %.**

---

## Resumen de huecos activos (priorizados)

| # | Tema | Prioridad | Acción |
|---|---|---|---|
| 1 | Actividad integrada en motores (no solo módulo intro) | Alta | Capa transversal γ en solvePH, K', Ksp |
| 2 | Intercambio iónico: columna real / cromatografía | Media | Ampliar motor beyond MVP |
| 3 | Disolventes no acuosos | Media | Módulo nuevo Tier 3 |
| 4 | Consecutivos, mezclas redox, ΔG | Media | Extender módulos existentes |
| 5 | Diagramas 2D pM–pH, pL–pH | Baja | Generalizar Pourbaix |

Detalle en [`ROADMAP-EQUILIBRIOS-MULTIPLES.md`](ROADMAP-EQUILIBRIOS-MULTIPLES.md).
