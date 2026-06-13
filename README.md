# QuimEq — Laboratorio de Equilibrio Químico

App web interactiva tipo GeoGebra para química analítica: simula equilibrios
ácido-base, titulaciones, solubilidad y complejación con gráficas que responden
en tiempo real a los sliders.

## Principio de diseño

**El usuario siempre define sus propios valores; la base de datos es un atajo,
no el punto de partida.** Cada módulo tiene un editor primario (nombre libre,
constantes editables con ±, campos numéricos) y una BD colapsable que
autocompleta; la referencia bibliográfica solo aparece cuando el valor viene
de la BD.

## Secciones

| Sección | Qué hace |
|---|---|
| **Ácido-base** | Distribución α y diagramas logC–pH (Sillén) de cualquier sistema HnA/BHn⁺ definido por el usuario, con pH de la disolución pura |
| **Titulaciones** | Tres tipos en un módulo: **ácido-base** (alcalimetría/acidimetría), **complejométrica** (metal+EDTA o EDTA+metal, K'f condicional) y **redox** (oxidimetría/reductimetría, balance de electrones, pe°′ condicional al pH) |
| **Mezclas** | Hasta 4 sistemas ácido-base coexistiendo (incl. sales como NaHCO₃ o NH₄Cl): pH global, especies dominantes y titulación de la mezcla |
| **Solubilidad** | log s vs pH con Kps condicional (aniones básicos editables) y efecto del ion común |
| **Redox** | Diagramas α vs pe y escala de predicción de reacciones (Baeza) con pares editables y log K de la reacción espontánea |
| **Pourbaix** | Diagramas E–pH de Fe, Cu, Mn, Zn y Cr derivados por ley de Hess desde E° y pKsp primitivos: los puntos triples cierran por construcción |

## Motor de cálculo

Sin aproximaciones: el pH se resuelve con el **balance de cargas exacto** por
bisección (`src/lib/equilibrium.ts`), usando fracciones α calculadas en espacio
logarítmico para estabilidad numérica. Funciona igual para HCl 10⁻⁸ M que para
ácido cítrico 0.5 M.

El módulo redox usa la convención **pe = E/0.05916** (Sillén/Baeza, *Expresión
Gráfica de las Reacciones Químicas*, UNAM 2010) y resuelve las curvas por
balance de electrones. Los datos Pourbaix y los pares redox (con referencias
por entrada) provienen del dataset auditado del proyecto EquilibriaLab.

Constantes a 25 °C tomadas de Harris, *Quantitative Chemical Analysis*; Skoog;
Bard, Parsons & Jordan (1985); Stumm & Morgan (1996).

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ listo para servir estático
```

Stack: Vite + React + TypeScript + Plotly (basic dist). Todo corre en el
cliente; no hay backend.
