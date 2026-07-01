# Benchmarks Spana (planificado)

Directorio reservado para **golden files** exportados de Spana
([eq-diagr](https://github.com/ignasi-p/eq-diagr)) y usados en tests de regresión
de Equilibria Lab.

Estado: **pendiente** (Fase 1 del roadmap en
[`PROYECTOS-RELACIONADOS-Y-ROADMAP.md`](PROYECTOS-RELACIONADOS-Y-ROADMAP.md)).

## Casos previstos

| ID | Origen Spana | Módulo app | Salida esperada |
|----|--------------|------------|-----------------|
| `frac-02` | `Examples/02-Fraction diagram` | Ácido-base | α vs pH |
| `logc-04` | `Examples/04-Log conc diagr` | Ácido-base | log C vs pH |
| `predom-09` | `Examples/09-Predom Cd-NTA` | Complejos | fronteras DUZP |
| `pourbaix-10` | `Examples/10-Poubaix diag Cu` | Pourbaix | E vs pH |
| `titr-13` | `Examples/13-Titration acetic acid` | Titulación | pH vs V |
| `hac-ph` | `13-Titration acetic acid.dat` | equilibrium | pH disolución 0,01 M |

## Conversión pK_a desde .dat Spana

Para especies formadas con OH⁻ como segundo componente:

```
pK_a = pK_w(Spana) − log K_formación
```

Ejemplo acético: `14,002 − 9,245 = 4,757` (app usa 4,76).

## Cómo generar golden files

1. Instalar Java y Spana (ver doc de proyectos relacionados).
2. Abrir cada `.plt` en Spana, calcular, exportar tabla CSV.
3. Guardar aquí como `{id}.csv` con columnas documentadas en el PR del benchmark.

## Tests

Los tests vivirán en `src/lib/__tests__/spana-benchmark.test.ts` (por crear),
comparando tolerancias documentadas en [`VALIDACION-Y-CONGRUENCIA.md`](../VALIDACION-Y-CONGRUENCIA.md).
