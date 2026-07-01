# Exámenes QA III 2025-2 — cobertura de Equilibria Lab

Análisis de los tres exámenes del grupo 1 (Prof. Julio César Aguilar Cordero /
ordinario Ni–glicinato) frente a los módulos actuales de **Equilibria Lab**.

Estado: **2026-06-27** · versión app **v0.3.0+** (motor acoplado `sideReactions.ts` +
cargador de sistemas `systemPresets.ts` + UI premium "Soft instrument")

**Objetivo del producto:** la app debe poder **resolver o reproducir** los cálculos
de estos exámenes (diagramas, constantes condicionales, titulaciones, intercambio).
Tras el motor acoplado Ringbom (`SideReactionStack` + `SideReactionEditor`), la cobertura
sube a **~85–95 %** con edición manual de constantes del encabezado; el resto son
convenios numéricos del curso (signo de β OH del parcial 1) o modelos simplificados.

**Actualización 2026-06-27 (UI + presets):** los readouts que los exámenes piden ahora
están **expuestos directamente** en chips flotantes sobre la gráfica y tarjetas de resultado,
sin cálculo extra del estudiante:

- Titulación EDTA: **pM′/pY′ al 50 % y 150 %** + V/x de equivalencia (P1-7, P1-8).
- Complejos: **escala pX′/pY′ condicional** con toggle (P1-6).
- Precipitación selectiva: **mínimo de la curva en U** (pH de mínima solubilidad, Ord-5a) +
  pH de precipitación automáticos.
- Constantes condicionales: **pendiente d(log K′)/dpH** en el pH de evaluación (tramo lineal, Ord-2).
- **Cargador "Cargar sistema completo"**: Zn–EDTA–NH₃ y otros se cargan de un clic poblando
  todos los paneles (editable después).
- **Elución 3 compartimentos** (3P-c): solver acoplado real (resina↔solución↔quelato,
  `elutionAtPH3C`/`optimalElutionPH3C`) con curva % Ni recuperado vs pH y pH óptimo;
  ya **no** es un modelo simplificado.

**Tests de regresión:** [`src/lib/__tests__/exam-qa3-2025.test.ts`](../src/lib/__tests__/exam-qa3-2025.test.ts)

---

## Resumen ejecutivo

| Examen | Preguntas | ✅ Hoy | 🟡 Parcial | ⬜ Falta |
|--------|-----------|--------|------------|---------|
| **1.er parcial** (Zn–EDTA–NH₃) | 9 (+ subincisos) | ~75 % | ~20 % | ~5 % |
| **Ordinario A** (Ni–glicinato) | 5 (+ subincisos) | ~55 % | ~35 % | ~10 % |
| **3.er parcial** (IX + Ni–EDTA) | 3 (+ subincisos) | ~45 % | ~45 % | ~10 % |

Leyenda:

- **✅** — Módulo + datos del usuario → gráfica o número del examen sin trabajo extra.
- **🟡** — Misma física, pero hay que ajustar constantes a mano, falta un eje (pY, x),
  o el modelo simplifica (p. ej. [NH₃] libre fija en lugar de 2,0 F analítico).
- **⬜** — No implementado o requiere acoplamiento que la app aún no tiene.

---

## Examen 1 — Primer parcial 2025-2

**Sistema:** Zn²⁺ – EDTA (H₄Y, **6 pK_a**) – NH₃ – Zn(OH)₂(s) – complejos Zn(NH₃)ⱼ,
Zn(OH)ₖ, ZnY²⁻ / ZnHY⁻ / ZnOHY³⁻. Constantes a *I* = 0,1 M, 25 °C.

### Mapa pregunta por pregunta

| # | Enunciado (resumido) | Módulo(s) | Estado | Notas |
|---|----------------------|-----------|--------|-------|
| **1** | Escalas de predominio: HᵢYⁱ⁻⁴, Zn(OH)ₖ²⁻ᵏ, ZnY²⁻′ vs pH | Ácido-base, Complejos, Constantes condicionales | 🟡 | Editar **6 pK_a** en `SideReactionEditor`; α_MY en panel complejo; escalas separadas por módulo |
| **2** | log *S*′ = *f*(pH) de Zn(OH)₂; *C*Zn = 0,0100 M; *S*′ a pH 6,5 y 10 | Precip. selectiva | ✅ | `hydroxideSolCurveMasked` + umbral desde **C analítica** (−log C) |
| **3** | Mismo diagrama con **NH₃ 2,0 F**; comparar *S*′ a pH 6,5 y 10 | Precip. selectiva | ✅ | Toggle **Enmascaramiento por ligando** → auxiliar **Total analítica (F)** = 2,0 M, pKa 9,2 |
| **4** | Identificar curvas log β′ZnY = *f*(pH) A/B; calcular a pH 6,5 y 10 con NH₃ 2 F | Constantes condicionales | ✅ | `SideReactionEditor`: NH₃ total 2 F + protonación MY (19,44 / 4,54); **Evaluar log K′ en pH** |
| **5** | Mejor pH para titular Zn con EDTA en NH₃ 2 F; ¿sin NH₃? | Constantes condicionales | ✅ | Ventana de factibilidad; comparar con/sin auxiliar |
| **6** | Escala **pY₄⁻′** a pH 6,5, NH₃ 2 F (Zn²⁺′ vs ZnY²⁻′) | Complejos / Condicionales | 🟡 | Toggle **Escala pX′ condicional** en Complejos (metal); eje pY′ en titulación EDTA |
| **7** | Curvas **pY₄⁻′ = f(x)** (I, II, III); identificar al 50 % | Titulaciones EDTA | ✅ | Eje **Avance x**, traza **pY′**; panel parásitas; resultado **pY′ al 50 %** |
| **8** | **pZn²⁺′ = f(x)** curvas 1 y 2; calcular al 150 % | Titulaciones EDTA | ✅ | Eje x + **pM′ al 150 %** en ResultCard |
| **9** | Indicador metalocrómico; PF a pH 10 y 6,5; cuantitatividad en eq. | Titulaciones EDTA | 🟡 | Indicadores + Δlog K; leer pM′/pY′ en x del intervalo manualmente |

### Constantes del examen → dónde ponerlas hoy

| Dato del encabezado | Valor examen | Preset app / acción |
|---------------------|--------------|---------------------|
| log β ZnY | 16,44 | Constantes cond. → Zn²⁺ → editar log K_f = 16,44 |
| log β Zn(NH₃)ⱼ | 2,21; 4,5; 6,86; 8,89 | Auxiliar → editar 4 constantes |
| log β Zn(OH)ₖ | −8,94; −17,89; −27,98; −40,7 | Hidrólisis → editar (signo/convenio: verificar formación vs β globales) |
| log *K*_s Zn(OH)₂ | 11,38 | Precip. selectiva → pK_sp = 11,38, *n* = 2 |
| pK_a NH₄⁺ | 9,2 | Auxiliar → **Total analítica (F)** + pKa 9,2 |
| pK_a EDTA (6) | 10,2 … 0 | `SideReactionEditor` → editar 6 pK_a Y |
| log β ZnHY, ZnOHY | 19,44; 4,54* | Panel **Protonación / hidrólisis del complejo MY** |

### Features implementados (motor acoplado)

1. ✅ **NH₃ analítico total** — `freeLigandConcentration` + modo **Total analítica (F)** en `SideReactionEditor`.
2. ✅ **EDTA 6 pK_a** — lista editable en editor de parásitas.
3. ✅ **Protonación del complejo MY** — `alphaComplex` en stack.
4. ✅ **Titulación EDTA avanzada** — ejes **pY′**, **pM′** vs **x**; parásitas en titulación.
5. ✅ **Solubilidad condicional con ligando** — `hydroxideSolCurveMasked` + enmascaramiento auxiliar.

### Pendiente menor

- Convenio **log β Zn(OH)ₖ negativos** del encabezado vs β globales positivos del preset.
- Curvas múltiples identificadas A/B/C en titulación (mismo motor, distintos stacks guardados).

---

## Examen 2 — Ordinario A 2025-2

**Sistema:** Ni²⁺ – glicinato (Gly⁻) – Ni(OH)₂(s). Constantes:

| Magnitud | Valores |
|----------|---------|
| log β Ni(OH)ᵢ | 4,24; 6,84 |
| log β Ni(Gly)ᵢ | 5,66; 10,51; 14 |
| log β Gly(H)ⱼ | 9,7; 12,16 |
| pK_ps Ni(OH)₂ | 17,22 |
| *E*° Ni²⁺/Ni | −0,257 V |

### Mapa pregunta por pregunta

| # | Enunciado | Módulo(s) | Estado | Notas |
|---|-----------|-----------|--------|-------|
| **1** | ¿Por qué log K′ tiene máximo en pGly′? | Constantes condicionales | ✅ | Interpretación Ringbom (α_Y sube a pH bajo, α_M(OH) a pH alto) |
| **2** | Ecuación pGly′(*pH*) entre 12,4 y 14 (trisglicinato) | Constantes condicionales | 🟡 | Pendiente analítica deducible; app muestra curva numérica, no exporta tramo |
| **3** | Escala de predicción a pH 7 y 13 | Redox | 🟡 | Escala de predicción sí; **pares donador/receptor con glicinato** hay que armarlos a mano |
| **4** | *E*°′(*pH*) Ni a **pGly′ = 4** sin precipitar; potencial de electrodo | Potencial condicional | ✅ | Auxiliar **pX′ fijo** + **Electrodo a pM′ fijo (Nernst)** |
| **4a–b** | Potencial electrodo Ni a pH 10, pNi′ = 6 (± pGly′ = 4) | Potencial condicional | ✅ | Panel Nernst con pM′ y pH del electrodo |
| **5** | log *S*′(*pH*) Ni(OH)₂ sin/con glicinato (pGly′ = 4, pNi = 6) | Precip. selectiva | ✅ | Enmascaramiento auxiliar + **pX′ fijo** |
| **5a–b** | pH inicio precipitación; mínima solubilidad | Precip. selectiva | 🟡 | `precipitationPHMasked` + curva U; verificar pK_sp 17,22 |

### Features implementados (ordinario)

1. ✅ **Varias curvas log K′ᵢ(*pH*)** — botón **+ reacción principal** en Constantes condicionales.
2. ✅ **pX′ fijo** — modo auxiliar **pX′ fijo** (pGly′ = 4).
3. ✅ **log *S*′(*pH*) con enmascaramiento** — Precip. selectiva + stack auxiliar.
4. ✅ **Potencial de electrodo** — Nernst a pM′ y pH dados.

### Pendiente

- Preset Ni–glicinato empaquetado (constantes editables hoy).
- Ecuación analítica del tramo pGly′ 12,4–14.

---

## Examen 3 — Tercer parcial 2025-2

**Sistema:** intercambio catiónico Ni²⁺/H⁺ + equilibrios Ni(OH)₂ / NiY / EDTA (6 pK_a).

Datos: resina 5 meq/g, 1 g, 0,2 L de NiCl₂ 0,1 mM; *K*²_H/Ni = 3,0; tabla de equilibrios del encabezado.

### Mapa pregunta por pregunta

| # | Enunciado | Módulo(s) | Estado | Notas |
|---|-----------|-----------|--------|-------|
| **a** | log *S*′(*pH*) Ni(OH)₂; intervalo pH sin precipitar a 0,1 mM | Precip. selectiva | ✅ | Umbral **C analítica** 0,1 mM → log s = −4 |
| **b** | % intercambio φ_Ni a pH 4 con fórmula *D*Ni, factor 2000 | Intercambio iónico | ✅ | Modo **Competencia catiónica con H⁺** → D, φ vs pH |
| **b** | Origen del factor 2000 | — | ✅ | Documentación/conceptual (no requiere app) |
| **c** | Recuperar Ni de resina con EDTA 0,1 M (200 mL / 400 mL); pH óptimo | Intercambio iónico | 🟡 | **Elución con EDTA** — modelo simplificado de pH óptimo |

### Fórmula del examen (referencia)

```
φ_Ni = (D_Ni · r / 2000) / (1 + D_Ni · r / 2000)     r = m_R / V (g/L)

D_Ni = K²_H/Ni · (α_Ni,global)⁻¹ · [H⁺]_bulk² / [H⁺]_resina²
```

Con *C*I ≈ 5 meq/g, *m*R = 1 g, *V* = 0,2 L → 2000 = *C*I·1000·(*m*R/*V*) en las unidades del curso.

### Features implementados (3.er parcial)

1. ✅ **Intercambio iónico pH‑dependiente** — `distributionCoefficient`, curva D/φ vs pH.
2. 🟡 **Recuperación con EDTA** — `optimalElutionPH` (modelo simplificado).
3. 🟡 **pK_sp Ni(OH)₂** — editable manualmente (11,0 vs 17,22 según contexto).

---

## Qué sí resuelve la app hoy (sin código nuevo)

Con **edición manual de constantes** un estudiante puede:

1. **Parcial 1 — preguntas 4–5:** curvas log β′ZnY vs pH con y sin “auxiliar” (aproximación si acepta [NH₃] libre ≈ constante; **no exacto** para 2 F).
2. **Parcial 1 — pregunta 2:** diagrama log *S* vs pH de Zn(OH)₂ con β hidroxo editados.
3. **Ordinario — preguntas 1, 3 (parcial):** interpretación Ringbom y escala redox genérica.
4. **Tercer parcial — 3a:** curva de solubilidad Ni(OH)₂ y pH de precipitación con umbral −4.
5. **Todos:** α, DUZP, log K′ = f(pH), ventanas de factibilidad, titulación EDTA básica (pM vs mL).

---

## Checklist rápido por pregunta → controles UI

| Pregunta | Módulo | Controles clave |
|----------|--------|-----------------|
| P1-2, P1-3 | Precip. selectiva | pK_sp, log β OH, **Enmascaramiento** → NH₃ **2 F**, pKa 9,2 |
| P1-4, P1-5 | Constantes cond. | log K_f, **SideReactionEditor**, **Evaluar log K′ en pH** |
| P1-7, P1-8 | Titulación EDTA | Eje **x**, trazas **pY′/pM′**, parásitas, ResultCard 50 % / 150 % |
| Ord-4 | Potencial cond. | **Electrodo a pM′ fijo** |
| Ord-1,2,3 NiGly | Constantes cond. | **+ reacción principal**, auxiliar **pX′ fijo** |
| 3P-b | Intercambio iónico | **Competencia H⁺**, K²_H/M, CI, m_R, V |
| 3P-c | Intercambio iónico | **Elución con EDTA** |

---

## Roadmap residual

| Prioridad | Feature | Estado |
|-----------|---------|--------|
| P2 | Solver elución **3 compartimentos** (resina–solución–quelato) | 🟡 modelo simplificado |
| P3 | Presets empaquetados Zn–NH₃ / Ni–Gly (opcional) | ⬜ |
| P3 | Convenio β OH negativos del parcial 1 | 🟡 documentar en UI |

---

## Referencias cruzadas

| Documento | Contenido |
|-----------|-----------|
| [`COBERTURA-TEMARIO.md`](COBERTURA-TEMARIO.md) | Cobertura general QA I–III |
| [`ROADMAP-EQUILIBRIOS-MULTIPLES.md`](ROADMAP-EQUILIBRIOS-MULTIPLES.md) | Tier 1–3 ya implementados |
| [`VALIDACION-Y-CONGRUENCIA.md`](VALIDACION-Y-CONGRUENCIA.md) | Motor vs Spana |
| [`PROYECTOS-RELACIONADOS-Y-ROADMAP.md`](PROYECTOS-RELACIONADOS-Y-ROADMAP.md) | Ecosistema externo |

---

## Archivos fuente de los exámenes

Análisis basado en:

- `Primer examen parcial QAIII 2025-2.pdf`
- `Examen Ordinario A QAIII 2025-2.pdf`
- `Tercer examen parcial QAIII 2025-2.pdf`

(proporcionados en `/Users/alek/Documents/`)
