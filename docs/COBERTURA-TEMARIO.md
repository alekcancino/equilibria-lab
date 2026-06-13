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
| — | Titulaciones (todas) | ✅ | Titulaciones (ác-base, EDTA, redox, precipitación) |

**QA I: cobertura completa de los temas simulables.**

---

## Química Analítica II (1504) — efecto de un equilibrio secundario

> Objetivo del curso: efecto de un **equilibrio secundario** sobre la
> cuantitatividad de la reacción principal; introducción a separaciones.

| Unidad | Tema | Estado | Módulo / roadmap |
|---|---|---|---|
| 1 | Constante aparente, efecto del medio | 🟡 | concepto presente; sin módulo dedicado |
| 2 | **Complejos + ácido-base**: K' condicional, log K'=f(pH), zonas | ⬜ | **① Constantes condicionales** (roadmap) |
| 3 | **Redox + ácido-base**: E°' aparente, Pourbaix, cuantitatividad | 🟡 | Pourbaix ✅ ; E°'=f(pH) explícito → **④** |
| 4 | **Redox + complejos**: E°'=f(pX), diagramas potencial-pX | ⬜ | **④ Potencial condicional** (roadmap) |
| 5 | Solubilidad/precipitación: log s=f(pH), log s=f(pX), separaciones | 🟡 | Solubilidad ✅ pH ; pX y separación selectiva → **③** |
| 6 | Extracción líquido-líquido (intro) | ⬜ | **② Extracción L-L** (roadmap) |

---

## Química Analítica III (1604) — constantes condicionales y separaciones

> Objetivo del curso: **predicción y simulación de equilibrios múltiples
> mediante la evaluación de constantes condicionales** en medio homogéneo y
> heterogéneo. Bibliografía base: **Ringbom**, *Complexation in Analytical
> Chemistry*. **Este es el núcleo de la herramienta profesional.**

| Unidad | Tema | Estado | Módulo / roadmap |
|---|---|---|---|
| 1 | **Constantes condicionales (homogéneo)**: coef. de equilibrios parásitos, **gráfica log K'=f(pH)**, enmascaramiento, titulaciones complejométricas, redox condicional, dismutación | ⬜ | **① Constantes condicionales** (roadmap) — pieza estrella |
| 2 | **Precipitación**: pKs'=f(pH), logS'=f(pH), hidróxidos metálicos, separaciones selectivas | 🟡 | Solubilidad ✅ base ; condicional+separación → **③** |
| 3 | **Extracción L-L**: cociente de reparto/distribución, quelatos metálicos, rendimiento=f(pH) | ⬜ | **② Extracción L-L** (roadmap) |
| 4 | Intercambio iónico: constante de selectividad, reparto condicional | ⬜ | **⑤ Intercambio iónico** (roadmap, tier 3) |
| 5 | Disolventes no acuosos: efecto nivelador, escalas de acidez | ⬜ | **⑥ Disolventes no acuosos** (roadmap, tier 3) |

---

## Resumen de huecos (priorizados)

1. **① Constantes condicionales** — keystone de QA II.2 y todo QA III.1. Convierte
   QuimEq en predictor de factibilidad. (Tier 1)
2. **② Extracción líquido-líquido** — QA II.6 + QA III.3. (Tier 2)
3. **③ Solubilidad/precipitación condicional** — completa QA II.5 + QA III.2. (Tier 2)
4. **④ Potencial condicional E°'=f(pH)/f(pX)** — QA II.3/II.4. (Tier 2)
5. **⑤ Intercambio iónico** / **⑥ Disolventes no acuosos** — QA III.4/III.5,
   nicho, pocas horas en el curso. (Tier 3)

Detalle de diseño en [`ROADMAP-EQUILIBRIOS-MULTIPLES.md`](ROADMAP-EQUILIBRIOS-MULTIPLES.md).
