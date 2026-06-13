# QuimEq — Laboratorio de Equilibrio Químico

App web interactiva tipo GeoGebra para química analítica: simula y **predice**
equilibrios ácido-base, de complejación, redox, solubilidad y titulaciones, con
gráficas que responden en tiempo real a los sliders. Pensada como herramienta de
aprendizaje y de trabajo profesional para equilibrios complejos, siguiendo el
modelo pedagógico UNAM/Baeza (Química Analítica I, II y III).

## Principio de diseño

**El usuario siempre define sus propios valores; la base de datos es un atajo,
no el punto de partida.** Cada módulo tiene un editor primario (nombre libre,
constantes editables con ±, campos numéricos) y una BD colapsable que
autocompleta. Cada módulo trae un botón **↺ Restablecer** a los valores por
defecto.

## Secciones y módulos

### Equilibrios simples (QA I)
| Módulo | Qué hace |
|---|---|
| **Ácido-base** | DUZP (zonas de predominio) + distribución α + diagrama logC–pH (Sillén) de cualquier sistema HnA/BHn⁺, con pH de la disolución pura |
| **Complejos** | Complejación multi-ligante: DUZP + distribución α + función de Bjerrum n̄ + logC, sobre el eje pL; 7 sistemas de ejemplo (M/NH₃, M/en) |
| **Redox** | Distribución α vs pe + escala de predicción de reacciones (Baeza), con pares editables y log K de la reacción espontánea |
| **Solubilidad** | log s vs pH con Kps condicional (aniones básicos editables) y efecto del ion común |

### Equilibrios múltiples (QA II / III)
| Módulo | Qué hace |
|---|---|
| **Pourbaix** | Diagramas E–pH de Fe, Cu, Mn, Zn y Cr derivados por ley de Hess desde E° y pKsp primitivos; los puntos triples cierran por construcción |
| **Mezclas ácido-base** | Hasta 4 sistemas ácido-base coexistiendo (incl. sales como NaHCO₃ o NH₄Cl): pH global, especies dominantes y titulación de la mezcla |

> El roadmap de esta sección (constantes condicionales, extracción L-L, etc.)
> está en [`docs/ROADMAP-EQUILIBRIOS-MULTIPLES.md`](docs/ROADMAP-EQUILIBRIOS-MULTIPLES.md).

### Titulaciones (QA I / II)
Cuatro tipos en un módulo unificado:
- **Ácido-base** (alcalimetría/acidimetría, balance de cargas exacto)
- **Complejométrica** (metal+EDTA o EDTA+metal, K'f condicional)
- **Redox** (oxidimetría/reductimetría, balance de electrones, pe°′ condicional al pH)
- **Precipitación** (argentometría Ag⁺+X⁻, curva pAg/pX, indicador Mohr)

## Motor de cálculo

Sin aproximaciones: el pH se resuelve con el **balance de cargas exacto** por
bisección (`src/lib/equilibrium.ts`), con fracciones α en espacio logarítmico
para estabilidad numérica. Funciona igual para HCl 10⁻⁸ M que para ácido cítrico
0.5 M.

El módulo redox usa la convención **pe = E/0.05916** (Sillén/Baeza, *Expresión
Gráfica de las Reacciones Químicas*, UNAM 2010) y resuelve las curvas por balance
de electrones. La complejación usa constantes globales β con la función de Bjerrum
y solución del pL libre por balance de masa del ligando.

Constantes a 25 °C tomadas de Harris, *Quantitative Chemical Analysis*; Skoog;
Bard, Parsons & Jordan (1985); Stumm & Morgan (1996). Datos Pourbaix y pares
redox del dataset auditado del proyecto EquilibriaLab.

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — stack, motores de cálculo, componentes, validación matemática
- [`docs/COBERTURA-TEMARIO.md`](docs/COBERTURA-TEMARIO.md) — mapa de cobertura contra los temarios UNAM QA I/II/III
- [`docs/ROADMAP-EQUILIBRIOS-MULTIPLES.md`](docs/ROADMAP-EQUILIBRIOS-MULTIPLES.md) — propuesta de módulos para predicción de equilibrios complejos

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ listo para servir estático
npx tsc --noEmit # typecheck
```

Stack: Vite + React + TypeScript + Plotly (basic dist). Todo corre en el
cliente; no hay backend.
