# Equilibria Lab

Simulador web interactivo de equilibrio químico: gráficas en tiempo real, controles deslizantes y predicción numérica de sistemas ácido-base, complejación, redox, solubilidad, titulaciones y equilibrios acoplados.

**English:** Interactive web simulator for chemical equilibrium — live plots, sliders, and numerical prediction for acid–base, complexation, redox, solubility, titrations, and coupled equilibria.

---

## Cómo usarlo · How to use

| | Español | English |
|---|---|---|
| **Web** | Abre la app en el navegador (sin instalar nada). Tras el despliegue en Vercel, la URL aparecerá en la descripción del repositorio en GitHub. | Open the app in your browser — no install required. After Vercel deploy, the URL will be listed in the GitHub repo description. |
| **Local** | Clona el repo, instala dependencias y arranca el servidor de desarrollo (ver abajo). | Clone the repo, install dependencies, and run the dev server (see below). |

Todo el cálculo ocurre en el navegador; no hay backend ni cuenta de usuario.

_All computation runs in the browser; there is no backend or user account._

---

## Qué cubre · Topics

### Equilibrios fundamentales · Core equilibria

| Módulo · Module | Descripción · Description |
|---|---|
| **Ácido-base · Acid–base** | DUZP (zonas de predominio), fracciones α, diagrama log *C*–pH (Sillén) y pH de la disolución pura para sistemas H*n*A / BH*n*⁺ editables. |
| **Complejos · Complexation** | Multi-ligando: DUZP, α, función de Bjerrum *n̄*, log *C* vs pL; sistemas de ejemplo incluidos. |
| **Redox** | Distribución α vs pe, escala de predicción de reacciones, pares redox editables y log *K* de la reacción espontánea. |
| **Solubilidad · Solubility** | log *s* vs pH con *K*ps condicional, aniones básicos editables e ion común. |
| **Actividad · Activity** | Fuerza iónica, γ vs *I* (Debye–Hückel extendido) y nota sobre limitaciones del modelo. |

### Equilibrios acoplados · Coupled equilibria

| Módulo · Module | Descripción · Description |
|---|---|
| **Pourbaix** | Sistema genérico Mⁿ⁺/M/M(OH)*n* y diagramas *E*–pH de Fe, Cu, Mn, Zn y Cr. |
| **Mezclas ácido-base · Acid–base mixtures** | Hasta cuatro sistemas coexistiendo (p. ej. NaHCO₃, NH₄Cl): pH global, especies dominantes y titulación de la mezcla. |
| **Constantes condicionales · Conditional constants** | log *K*′ = *f*(pH), coeficientes α, reacciones parásitas, enmascaramiento y factibilidad. |
| **Precipitación selectiva · Selective precipitation** | log *s* = *f*(pH), log *s* = *f*(pX), pureza, redisolución y ventanas de separación entre metales. |
| **Potencial condicional · Conditional potential** | *E*°′ = *f*(pH), dismutación y *E*°′ = *f*(pX) por complejación. |
| **Extracción líquido-líquido · Liquid–liquid extraction** | Reparto, quelatos, extracciones sucesivas, polimerización y preconcentración. |
| **Intercambio iónico · Ion exchange** | *K*sel, equilibrio en lote, isoterma y breakthrough en columna (modelo ideal). |
| **Solubilidad y pH · Solubility vs pH** | Solubilidad condicional de sales y comparación entre sistemas. |

### Titulaciones · Titrations

Un módulo unificado con cinco modos:

- **Ácido-base · Acid–base** — alcalimetría / acidimetría, balance de cargas exacto.
- **Complejométrica · Complexometric** — metal + EDTA o EDTA + metal, *K*′f condicional.
- **Redox** — oxidimetría / reductimetría, balance de electrones, pe°′ condicional al pH.
- **Precipitación · Precipitation** — argentometría Ag⁺ + X⁻, curvas pAg / pX, indicador Mohr.
- **Potenciométrica · Potentiometric** — electrodo de vidrio, derivadas y gráfica de Gran.

---

## Principios de diseño · Design principles

**El usuario define sus propios valores.** Cada módulo ofrece un editor principal (nombre libre, constantes con ±, campos numéricos) y una base de datos colapsable como atajo. Botón **↺ Restablecer** en cada módulo.

**The user always sets their own values.** Each module has a primary editor (free names, ± on constants, numeric fields) and a collapsible database as a shortcut. **↺ Reset** on every module.

**La interfaz crece con la complejidad del sistema.** Al añadir pKa, ligandos, reacciones parásitas o comparaciones, el modelo correspondiente se activa automáticamente — sin elegir primero una categoría teórica.

**The UI grows with system complexity.** Adding pKa values, ligands, side reactions, or comparisons activates the matching model automatically — no need to pick a theory category first.

---

## Motor de cálculo · Calculation engine

- pH por **balance de cargas exacto** (bisección), con α en espacio logarítmico para estabilidad numérica.
- Redox con **pe = *E* / 0,05916 V** y balance de electrones.
- Complejación con constantes globales β, función de Bjerrum y pL libre por balance de masa del ligando.
- Supuestos por defecto: *T* = 25 °C, actividades ≈ concentraciones, *K*w = 10⁻¹⁴.
- Constantes de Harris, Skoog, Bard (1985) y Stumm & Morgan (1996); datos Pourbaix y redox auditados del proyecto.

---

## Desarrollo local · Local development

Requisitos: **Node.js 20+** y npm.

```bash
git clone https://github.com/alekcancino/quimeq.git
cd quimeq
npm install
npm run dev      # http://localhost:5173
```

Otros comandos · Other scripts:

```bash
npm run build    # genera dist/ · static build in dist/
npm run test     # pruebas unitarias · unit tests
npm run check    # lint + test + build
```

Stack: **Vite + React + TypeScript + Plotly** (basic dist). Build estático compatible con Vercel, GitHub Pages u otro hosting estático.

---

## Documentación adicional · Further docs

| Archivo · File | Contenido · Contents |
|---|---|
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Stack, motores, componentes y validación numérica. |
| [`CHANGELOG.md`](CHANGELOG.md) | Historial de versiones. |

---

## Licencia · License

Consulta el repositorio para términos de uso. / See the repository for license terms.
