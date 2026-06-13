# Roadmap — Equilibrios múltiples (predicción de equilibrios complejos)

Propuesta de evolución de la sección **Equilibrios múltiples** para convertir
QuimEq en una herramienta de **predicción y simulación** de equilibrios complejos,
no solo de graficación. Fundamentada en los temarios UNAM QA II (1504) y QA III
(1604), cuyo objetivo explícito es *"la predicción y simulación de los equilibrios
químicos múltiples mediante la evaluación de las constantes condicionales"*.

Estado: **Tier 1 y Tier 2 implementados** (2026-06-13). Tier 3 pendiente.

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
    desprotonada; calculado en `conditional.ts/alphaH`)
  - `α_M(OH)` = hidrólisis del metal (β hidroxo; calculado en `conditional.ts/alphaOH`)
  - `α_M(L)` = ligando auxiliar (reusa `complexation.ts/complexFractions`)
- La gráfica **log K' = f(pH)** tiene forma de campana: a pH bajo cae por α_Y(H),
  a pH alto cae por α_M(OH). Hay una **ventana óptima de pH**.
- **Cuantitatividad**: la reacción/titulación es factible cuando log K' ≥ umbral
  (≈ 6 para reacción, ≈ 8 para titulación nítida a 0.01 M).
- **Enmascaramiento**: subir α de un metal (agente enmascarante) baja su K' por
  debajo del umbral mientras el analito sigue reactivo → separación selectiva.

---

## Motor compartido — `src/lib/conditional.ts` ✅

```ts
alphaH(pKas, pH)              // α_Y(H) protonación del ligante
alphaOH(logBetasOH, pH)       // α_M(OH) hidrólisis del metal
alphaL(logBetasL, cL)         // α_M(L) ligando auxiliar libre cL
condLogKCurve(...)             // curva log K' = f(pH) + coeficientes α
feasibilityWindow(pHs, logKs, threshold)
hydroxideSolCurve(...)         // log s = f(pH) para M(OH)_n con hidroxocomplejos
precipitationPH(...)           // pH donde log s cruza el umbral
```

`edta.ts/alphaY4` delega en `conditional.ts/alphaH` → una sola fuente de verdad.

---

## ① Constantes condicionales ✅ IMPLEMENTADO

**Módulo:** `ConstantesCondicionales.tsx` · **Cubre:** QA II.2 + QA III.1

- log K' = f(pH) — campana + banda de factibilidad sombreada
- Coeficientes α = f(pH) — α_Y(H), α_M(OH), α_M(L) por separado
- Enmascaramiento con 2.º metal (toggle colapsable)
- 11 presets M–EDTA (Ca, Mg, Mn, Zn, Cu, Ni, Pb, Hg, Fe³⁺, Al, Ga)
- ResultCard: pH óptimo · log K'máx · ventana · veredicto de factibilidad

---

## ② Extracción líquido-líquido ✅ IMPLEMENTADO (parcial)

**Módulo:** `ExtraccionLiquido.tsx` · **Cubre:** QA II.6 + QA III.3 (parcial)

- log D = f(pH), %E = f(pH), extracciones múltiples (n=1..5)
- 7 presets: ácido benzoico, salicílico, aspirina, acético, 8-HQ, ditizona, I₂
- Comparación con 2.º analito; factor de separación D₁/D₂
- **Pendiente:** quelatos metálicos — `log D = log K_ex + n·log[HL] + n·pH`
  (pendiente +n en escala log, muy distinta a la curva ácido-base)

---

## ③ Precipitación selectiva ✅ IMPLEMENTADO

**Módulo:** `SolubilidadCondicional.tsx` · **Cubre:** QA II.5 + QA III.2

- log s = f(pH) para M(OH)_n incluyendo hidroxocomplejos anfotéricos (curva U)
- Ventana de separación selectiva (banda verde)
- 14 presets con β(OH) de referencia (Fe³⁺, Al, Cr, La, Cu, Pb, Zn, Ni, Co, Fe²⁺, Cd, Mn, Mg, Ca)
- ResultCard: pH de precipitación, ventana, veredicto

Complementado por `SolubilidadSal.tsx` (log S = f(pH) para sales con anión ácido débil,
tabs log S + distribución α, 10 presets).

---

## ④ Potencial condicional ✅ IMPLEMENTADO (parcial)

**Módulo:** `PotencialCondicional.tsx` · **Cubre:** QA II.3 ✅ · QA II.4 🟡

- E°' = f(pH) — rectas con pendiente −59.16·mH/n mV/pH
- Cruce de pares (pH donde se invierte la espontaneidad)
- Dismutación (diagrama de Latimer con 3.er par)
- Escala condicional al cursor
- **Pendiente:** E°'=f(pX) — efecto de ligandos sobre E°':
  `E°'= E° + (0.05916/n)·log(α_Ox/α_Red)`, donde α se toman de `conditional.ts`

---

## Tier 3 (completitud del temario, nicho)

- **⑤ Intercambio iónico** (QA III.4): constante de selectividad, cociente de
  reparto condicional en lotes.
- **⑥ Disolventes no acuosos** (QA III.5): efecto nivelador, escalas de acidez,
  titulación en anfipróticos.

---

## Mejoras transversales identificadas

- **E°'=f(pX) en PotencialCondicional** — nueva pestaña, usa `conditional.ts/alphaOH`
  + `complexation.ts/complexFractions` para α_Ox y α_Red.
- **Quelatos metálicos en ExtraccionLiquido** — nuevo selector de tipo de analito
  ("ácido" / "quelato"), motor `log D = log K_ex + n·pH` para la fase orgánica.
- **Diagramas 2D de zonas de predominio** (pM–pH, pL–pH) generalizando el motor
  de Pourbaix a otras partículas.

---

## Orden de implementación sugerido (pendientes)

1. E°'=f(pX) en PotencialCondicional (pequeño, alto valor pedagógico)
2. Quelatos en ExtraccionLiquido (mediano, completa QA III.3)
3. ⑤ Intercambio iónico (módulo nuevo, Tier 3)
4. ⑥ Disolventes no acuosos (módulo nuevo, Tier 3)
