# Validación matemática y congruencia con Spana

Documento de referencia sobre la solidez del motor de cálculo de **Equilibria Lab**
(QuimEq) y su alineación con la tradición analítica clásica — en particular
**Spana / HALTAFALL** ([ignasi-p/eq-diagr](https://github.com/ignasi-p/eq-diagr)),
heredero académico de Medusa/Hydra (KTH) y linaje paralelo a **ChemEQL** (Eawag).

Estado: **2026-06-20**

---

## Veredicto

El motor de Equilibria Lab es **matemáticamente congruente** con Spana en la química
analítica docente de textbook (α, pH por balance de cargas, pe de Sillén, constantes
condicionales Ringbom, Ksp con anión ácido, Pourbaix clásico, titulaciones modulares).

**No es el mismo software:** Spana resuelve sistemas acoplados globalmente
(HALTAFALL: sólidos competitivos, redox, adsorción, actividad Davies/SIT). Equilibria
Lab usa **motores modulares** con supuestos explícitos (actividades ≈ concentraciones
por defecto, sin adsorción en superficies).

Para enseñanza Harris / Skoog / Baeza–UNAM, la app es coherente y, en UX, superior
a Spana/ChemEQL. La divergencia aparece en geoquímica avanzada o sistemas con muchas
fases sólidas simultáneas.

---

## Convenciones compartidas

| Magnitud | Equilibria Lab | Spana / HALTAFALL |
|----------|----------------|-------------------|
| Temperatura | 25 °C | 25 °C (configurable en Spana) |
| pK_w | 14,0 → K_w = 10⁻¹⁴ | 14,002 en bases Medusa |
| pe | pe = E / 0,05916 V (Sillén/Baeza, **sin** factor n en pe°) | Igual (ver salida EC: Eh = −500 mV → pe = −8,4526) |
| α ácido-base | Producto de K_a / normalización (espacio log) | Equivalente vía constantes de formación |
| K′ condicional | log K′ = log K − Σ log α (Ringbom) | Mismo criterio en sistemas acoplados |
| Solver | Bisección (~80 iter.) | HALTAFALL (iteración global) |

Diferencia numérica típica por pK_w: ΔpH ≈ 0,001 en el neutro (despreciable en docencia).

---

## Conversión de constantes Spana → pK_a

Spana almacena **log K de formación** desde componentes (H⁺, OH⁻, metal, ligando…),
no pK_a directos.

Ejemplo — ácido acético (`Examples/13-Titration acetic acid.dat`):

```text
CH3COO-  ,  9.245  ,  1  ,  1    ← CH3COOH + OH⁻ → CH3COO⁻
OH-      , -14.002
```

Equivalencia:

```
pK_a = pK_w − log K = 14,002 − 9,245 = 4,757
```

Equilibria Lab usa pK_a = **4,76** → ΔpH ≈ 0,001 en disolución 0,01 M.

---

## Comprobaciones numéricas (2026-06)

Referencias cruzadas entre fórmulas del motor (`src/lib/`), tests unitarios
(`src/lib/__tests__/engines.test.ts`) y datos Spana.

| Caso | Equilibria Lab | Referencia Spana / doc | Δ |
|------|----------------|------------------------|---|
| HAc 0,01 M, pK_a Spana (4,757) | pH 3,388 | Mismo balance de cargas | — |
| HAc 0,01 M, pK_a app (4,76) | pH 3,389 | — | 0,001 pH |
| H₃PO₄, pH = 0, α₀ | 0,99297 | Golden doc 0,99293 | 4×10⁻⁵ |
| MnO₄⁻, Δpe°′ pH 0→7 | 11,20 | (8/5)·7 | — |
| AgCl ideal, log s | −4,870 | ½ pK_sp (9,74) | — |
| pe desde Eh = −500 mV | −8,4525 | Fe.out HALTAFALL −8,4526 | 10⁻⁴ |
| Fe(OH)₃/Fe²⁺, E°′ (log C = 0) | 0,948 V | Pourbaix auditado | test ±0,02 V |
| Ca–EDTA, log K′f pH 10 | ≈ 10,2 | Ringbom (no α mal aplicado) | test ±0,2 |

Ejecutar tests:

```bash
npm test
```

67 tests en `engines.test.ts` (estado 2026-06-20).

---

## Congruencia por módulo

| Módulo | Congruencia Spana | Notas |
|--------|-------------------|-------|
| Ácido-base (DUZP, α, log C) | **Alta** | Mismo formalismo de fracciones |
| Complejos (Bjerrum, log C vs pL) | **Alta** | β globales equivalentes |
| Redox (α vs pe) | **Alta** | Convención pe compartida |
| Solubilidad / solubilidad vs pH | **Alta** (ideal) | Spana añade γ y sólidos múltiples |
| Actividad | **Media** | D–H extendido vs Davies/SIT de Spana |
| Pourbaix | **Alta** (presets) | Spana más general (sistemas custom) |
| Mezclas ácido-base | **Alta** | Balance de cargas multi-componente |
| Constantes condicionales | **Alta** | Ringbom explícito en la app |
| Potencial condicional | **Alta** | Nernst condicional |
| Precipitación selectiva | **Media** | Spana elige fase sólida globalmente |
| Titulaciones (5 modos) | **Alta–media** | Spana titula con equilibrio completo |
| Extracción L–L / intercambio iónico | **Baja en Spana** | Módulos propios (Spana casi no cubre) |

---

## Dónde **no** esperar coincidencia 1:1

1. **Actividad integrada** — Spana corrige γ en el equilibrio; la app usa ideal salvo
   módulo Actividad o futuro toggle global.
2. **Precipitación competitiva** — HALTAFALL prueba combinaciones de sólidos
   (p. ej. magnetita + Fe(cr) en `EC/tests/Davies_eqn/Fe.out`).
3. **Adsorción en superficies** — ChemEQL/Spana sí; Equilibria Lab no (roadmap).
4. **Bases de datos distintas** — Medusa/Wateq vs Harris/Skoog: misma física,
   números distintos para la misma especie.
5. **Temperatura ≠ 25 °C** — Spana soporta T variable; la app fija 25 °C.

---

## Benchmark Spana planificado (Fase 1)

Suite de regresión a implementar leyendo casos de
`~/Documents/Eq-Diagr/Examples/` (o copia en `docs/benchmarks/spana/`):

| Archivo Spana | Módulo Equilibria Lab | Magnitud a comparar |
|---------------|----------------------|---------------------|
| `02-Fraction diagram.plt` | Ácido-base | α vs pH |
| `04-Log conc diagr.plt` | Ácido-base | log C vs pH |
| `09-Predom Cd-NTA.plt` | Complejos | zonas DUZP |
| `10-Poubaix diag Cu.plt` | Pourbaix | pendientes E–pH |
| `13-Titration acetic acid.plt` | Titulación | curva pH vs V |
| `01-Make your 1st diagram.plt` | Solubilidad + Fe | log C (conversión .dat) |

Requisito: Java + `EC.jar` o salidas exportadas de Spana como golden files CSV.

---

## Linaje bibliográfico común

- **HALTAFALL** — Ingri et al., *Talanta* 14, 1261 (1967); motor de Spana.
- **SOLGASWATER** — Eriksson, *Anal. Chim. Acta* 112, 375 (1979); ideas de diagramas.
- **MICROQL / ChemEQL** — Westall; Müller (Eawag); equilibrio acuoso amplio.
- **Ringbom** — constantes condicionales; implementado en `conditional.ts`.
- **Sillén / Baeza (UNAM)** — pe, escalera unificada; `ladder.ts`, `redox.ts`.

---

## Referencias internas

- Motores: [`docs/ARQUITECTURA.md`](ARQUITECTURA.md)
- Ecosistema y roadmap: [`docs/PROYECTOS-RELACIONADOS-Y-ROADMAP.md`](PROYECTOS-RELACIONADOS-Y-ROADMAP.md)
- Código: `src/lib/equilibrium.ts`, `ladder.ts`, `conditional.ts`, `redox.ts`
