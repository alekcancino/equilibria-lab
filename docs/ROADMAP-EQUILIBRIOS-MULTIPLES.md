# Roadmap — Equilibrios múltiples (predicción de equilibrios complejos)

Propuesta de evolución de la sección **Equilibrios múltiples** para convertir
QuimEq en una herramienta de **predicción y simulación** de equilibrios complejos,
no solo de graficación. Fundamentada en los temarios UNAM QA II (1504) y QA III
(1604), cuyo objetivo explícito es *"la predicción y simulación de los equilibrios
químicos múltiples mediante la evaluación de las constantes condicionales"*.

Estado: **propuesta aprobada en diseño, pendiente de implementar** (2026-06-13).

---

## El concepto keystone: constante condicional (Ringbom)

Todo QA II y III gira en torno a una sola idea: una reacción principal se ve
afectada por **reacciones parásitas** (secundarias), y su efecto se condensa en
**coeficientes α**. La constante condicional mide la reactividad *real* en el medio:

```
K' = K / (α_A · α_B · …)        log K' = log K − Σ log αᵢ
```

- `α` ≥ 1 siempre; vale 1 cuando no hay reacción parásita.
- Para complejación M + Y ⇌ MY:  `log K'_MY = log K_MY − log α_M − log α_Y`
  - `α_Y(H)` = protonación del ligante (recíproco de la fracción totalmente
    desprotonada; es lo que ya calcula `edta.ts/alphaY4`)
  - `α_M(OH)` = hidrólisis del metal (β hidroxo)
  - `α_M(L)` = ligando auxiliar, ej. NH₃ (reusa `complexation.ts/complexFractions`)
- La gráfica **log K' = f(pH)** tiene forma de campana: a pH bajo cae por α_Y(H),
  a pH alto cae por α_M(OH). Hay una **ventana óptima de pH**.
- **Cuantitatividad**: la reacción/titulación es factible cuando log K' ≥ umbral
  (≈ 6 para reacción, ≈ 8 para titulación nítida a 0.01 M).
- **Enmascaramiento**: subir α de un metal (agente enmascarante) baja su K' por
  debajo del umbral mientras el analito sigue reactivo → separación selectiva.

Este es el caso de uso profesional: *"¿a qué pH (o con qué enmascarante) funciona
esta titulación / separación?"*

---

## Decisiones de diseño (resueltas)

1. **Módulos especializados, motor unificado.** Un solo `conditional.ts` provee los
   coeficientes α y K' para todos los casos; cada caso tiene su *pantalla* enfocada
   (complejación → log K'; redox → E°'; precipitación → pKs'). No se hace un
   mega-módulo con selector de tipo de reacción.

2. **Motor compartido `conditional.ts`.** La titulación EDTA actual (que ya calcula
   K'f internamente) pasará a consumir este motor → una sola fuente de verdad,
   sin lógica duplicada.

3. **Enmascaramiento: arquitectura desde el día 1, UI progresiva.** El modelo de
   datos y la gráfica soportan N curvas; la v1 expone el 2º metal / agente
   enmascarante como toggle colapsable (cerrado por defecto). Núcleo limpio para
   aprender, poder profesional a un clic.

---

## Motor compartido — `src/lib/conditional.ts`

```ts
alphaH(pKas: number[], pH: number): number          // α_Y(H) protonación del ligante
alphaOH(logBetasOH: number[], pH: number): number   // α_M(OH) hidrólisis del metal
alphaL(logBetasL: number[], cL: number): number     // α_M(L) ligando auxiliar libre cL
condLogK(logKf, { alphaM, alphaY }): number         // log K' = logKf − logα_M − logα_Y
feasibilityWindow(pHs, logKs, threshold): [number, number] | null
```

Refactor: `edta.ts/alphaY4` → delega en `conditional.ts/alphaH`.

---

## ① Constantes condicionales (Tier 1 — pieza estrella)

**Cubre:** QA II.2 + QA III.1 completos.
**Ubicación:** 3.er tab de Equilibrios múltiples. Patrón panel + DiagramTabs.

**Inputs:**
- Metal: log Kf(MY) + β hidroxo (opcional) + ligando auxiliar (opcional, desde DB)
- Ligante Y: pKas (EDTA por defecto, editable)
- `[ligando auxiliar]` concentración
- Umbral de cuantitatividad (6 / 8, ajustable)
- Toggle colapsable: 2º metal / agente enmascarante

**Diagramas (DiagramTabs):**
- **log K' = f(pH)** — campana + banda sombreada donde log K' ≥ umbral; con masking,
  segunda curva y ventana de selectividad
- **Coeficientes α = f(pH)** — α_Y(H), α_M(OH), α_M(L) por separado (muestra *qué*
  limita la reacción a cada pH)

**ResultCard:** pH óptimo · log K'máx · ventana `[pH₁, pH₂]` · veredicto de factibilidad.

**Validación objetivo:** Ca–EDTA log K'f(pH 10) ≈ 10.2 ; Mg–EDTA ventana de pH;
caso de masking Ca/Mg.

---

## ② Extracción líquido-líquido (Tier 2)

**Cubre:** QA II.6 + QA III.3.

- Soluto ácido-base: `D = K_D·[H⁺]/([H⁺]+Ka)`, `%E = 100·D/(D + V_ac/V_org)`
- Quelato metálico: `log D = log K_ex + n·log[HL]_org + n·pH` (pendiente +n)
- **Salidas:** %extracción vs pH (sigmoide); **factor de separación** D₁/D₂ entre
  dos especies → predice separaciones por control de pH; rendimiento por n etapas.

---

## ③ Solubilidad / precipitación condicional (Tier 2)

**Cubre:** QA II.5 + QA III.2.

- Vistas **pKs' = f(pH)** y **logS' = f(pH)** (extiende `solubility.ts`)
- Ventana de precipitación; **separación selectiva de hidróxidos metálicos**
  (precipitar Fe³⁺ dejando Ni²⁺ a un pH dado)
- Diagramas log s = f(pX) para sales con anión complejable.

---

## ④ Potencial condicional (Tier 2)

**Cubre:** QA II.3 + QA II.4.

- **E°' = f(pH)** y **E°' = f(pX)** (reusa `redox.ts/peConditional`)
- Detección de **dismutación** (cuándo una especie es inestable y dismuta)
- Predicción redox condicional: log K' = n₁n₂·Δpe°' a las condiciones del medio.

---

## Tier 3 (completitud del temario, nicho)

- **⑤ Intercambio iónico** (QA III.4): constante de selectividad, cociente de
  reparto condicional en lotes.
- **⑥ Disolventes no acuosos** (QA III.5): efecto nivelador, escalas de acidez,
  titulación en anfipróticos.

---

## Mejoras transversales

- **Diagramas 2D de zonas de predominio** (pM–pH, pL–pH) generalizando el motor de
  Pourbaix a otras partículas.
- **Badge de factibilidad** consistente en todos los módulos de predicción.
- Cross-links entre módulos que comparten motor (titulación EDTA ↔ ①).

---

## Orden de implementación sugerido

1. `conditional.ts` + refactor de `edta.ts` (base, sin UI visible nueva)
2. **① Constantes condicionales** (incl. masking colapsable)
3. **② Extracción L-L**
4. **③** y **④** sobre el mismo motor
5. Tier 3 según interés

> Decisión de arranque pendiente del usuario. Recomendación: 1 → 2.
