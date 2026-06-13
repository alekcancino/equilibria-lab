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
| 1 | Proceso analítico (teórico) | — | fuera de alcance (no es simulable) |
| 2 | Equilibrio en medio acuoso, Le Chatelier, actividad | 🟡 | implícito en todos los motores (actividad≈conc) |
| 3 | Óxido-reducción: par redox, Nernst, zonas de predominio, predicción | ✅ | Redox (α vs pe, escala de predicción) |
| 4 | Ácido-base: fuerza, α, pH, anfolitos, polipróticos | ✅ | Ácido-base (DUZP + α + logC) |
| 5 | Complejos: constantes sucesivas/globales, Bjerrum, predominio | ✅ | Complejos (DUZP + α + Bjerrum n̄ + logC) |
| 6 | Solubilidad: Kps, ion común | ✅ | Solubilidad |
| — | Titulaciones (todas) | ✅ | Titulaciones (ácido-base, EDTA, redox, precipitación, potenciométrica) |

**QA I: cobertura completa de los temas simulables.**

---

## Química Analítica II (1504) — efecto de un equilibrio secundario

> Objetivo del curso: efecto de un **equilibrio secundario** sobre la
> cuantitatividad de la reacción principal; introducción a separaciones.

| Unidad | Tema | Estado | Módulo |
|---|---|---|---|
| 1 | Constante aparente, efecto del medio | 🟡 | concepto presente en todos los módulos de K'; sin módulo introductorio dedicado |
| 2 | **Complejos + ácido-base**: K' condicional, log K'=f(pH), zonas | ✅ | **Constantes condicionales** — log K', coeficientes α, enmascaramiento, ventana de factibilidad |
| 3 | **Redox + ácido-base**: E°' aparente, Pourbaix, cuantitatividad | ✅ | **Potencial condicional** — E°'=f(pH), cruce de pares, escala condicional, dismutación (Latimer) |
| 4 | **Redox + complejos**: E°'=f(pX), diagramas potencial-pX | 🟡 | PotencialCondicional cubre f(pH); la curva f(pX) con α_Ox/α_Red no está implementada |
| 5 | Solubilidad/precipitación: log s=f(pH), separaciones | ✅ | **Precipitación selectiva** (hidróxidos, ventana selectiva) + **Solubilidad y pH** (sales con anión ácido débil) |
| 6 | Extracción líquido-líquido (intro) | ✅ | **Extracción líquido-líquido** — log D=f(pH), %E=f(pH), extracciones múltiples, factor de separación |

**QA II: cobertura ~90 %. Hueco menor: E°'=f(pX) en la unidad 4.**

---

## Química Analítica III (1604) — constantes condicionales y separaciones

> Objetivo del curso: **predicción y simulación de equilibrios múltiples
> mediante la evaluación de las constantes condicionales** en medio homogéneo y
> heterogéneo. Bibliografía base: **Ringbom**, *Complexation in Analytical
> Chemistry*. **Este es el núcleo de la herramienta profesional.**

| Unidad | Tema | Estado | Módulo |
|---|---|---|---|
| 1 | **Constantes condicionales (homogéneo)**: coef. de equilibrios parásitos, gráfica log K'=f(pH), enmascaramiento, titulaciones complejométricas, redox condicional, dismutación | ✅ | **Constantes condicionales** + **Potencial condicional** |
| 2 | **Precipitación**: pKs'=f(pH), logS'=f(pH), hidróxidos metálicos, separaciones selectivas | ✅ | **Precipitación selectiva** (log s=f(pH), ventana selectiva, anfotéricos) + **Solubilidad y pH** (sales) |
| 3 | **Extracción L-L**: cociente de reparto/distribución, quelatos metálicos, rendimiento=f(pH) | 🟡 | **Extracción líquido-líquido** ✅ ácidos/anfotéricos; quelatos metálicos (log D = log K_ex + n·log[HL] + n·pH) pendiente |
| 4 | Intercambio iónico: constante de selectividad, reparto condicional en lotes | ⬜ | Módulo nuevo (Tier 3 — roadmap) |
| 5 | Disolventes no acuosos: efecto nivelador, escalas de acidez, titulación en anfipróticos | ⬜ | Módulo nuevo (Tier 3 — roadmap) |

**QA III: cobertura ~75 %. Unidades 1–3 cubiertas; 4–5 pendientes (Tier 3).**

---

## Resumen de huecos activos (priorizados)

| # | Tema | Prioridad | Acción |
|---|---|---|---|
| 1 | E°'=f(pX) — redox condicional con ligandos | Media | Nueva pestaña en PotencialCondicional |
| 2 | Extracción quelatos metálicos (log D = log K_ex + n·pH) | Media | Nuevo tipo en ExtraccionLiquido |
| 3 | Intercambio iónico: Ksel, reparto condicional en lotes | Baja | Módulo nuevo (Tier 3) |
| 4 | Disolventes no acuosos: efecto nivelador, titulación en anfipróticos | Baja | Módulo nuevo (Tier 3) |

Detalle de diseño en [`ROADMAP-EQUILIBRIOS-MULTIPLES.md`](ROADMAP-EQUILIBRIOS-MULTIPLES.md).
