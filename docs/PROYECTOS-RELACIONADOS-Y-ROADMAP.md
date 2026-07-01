# Proyectos relacionados y roadmap de features

Mapa del ecosistema open source de equilibrio químico analítico, comparación con
**Equilibria Lab**, e ideas para **features futuras** (no deuda urgente del motor).

Estado: **2026-06-20**

---

## Posicionamiento de Equilibria Lab

Equilibria Lab ocupa un **nicho poco cubierto**: simulador **web**, sin backend,
con **módulos acoplados de química analítica docente** (mezclas, constantes
condicionales, extracción, intercambio iónico, titulaciones unificadas).

Los vecinos más cercanos son herramientas de **escritorio** (Spana, ChemEQL) o
**bibliotecas** (Reaktoro, pyEQL, efta), no apps web equivalentes.

**Conclusión del análisis (2026-06):** el motor actual es sólido y congruente con
Spana en el núcleo analítico. Ver [`VALIDACION-Y-CONGRUENCIA.md`](VALIDACION-Y-CONGRUENCIA.md).

---

## Proyectos de referencia

### Tier 1 — Misma tradición académica

| Proyecto | Qué hace | Enlace |
|----------|----------|--------|
| **Spana / DataBase** | Diagramas de equilibrio acuoso (DUZP, α, log C, pe–pH). HALTAFALL. Java desktop. | [ignasi-p/eq-diagr](https://github.com/ignasi-p/eq-diagr) |
| **ChemEQL** | Equilibrio termodinámico, titulaciones, adsorción, pe–pH. Eawag. Java desktop (poco mantenido). | [eawag-surface-waters-research/ChemEQL](https://github.com/eawag-surface-waters-research/ChemEQL) · [Eawag](https://www.eawag.ch/en/department/surf/projects/chemeql/) |
| **efta** | API Python: especiación, Ksp, extracción L–L, ajuste de constantes, plots. | [arsyadmdz/efta](https://github.com/arsyadmdz/efta) |

### Tier 2 — Motores serios (sin UI docente)

| Proyecto | Qué hace | Enlace |
|----------|----------|--------|
| **Reaktoro** | Equilibrio Gibbs, cinética, transporte reactivo, bases PHREEQC. | [reaktoro/reaktoro](https://github.com/reaktoro/reaktoro) |
| **pyEQL** | Química de soluciones, Pitzer, especiación, PHREEQC. | [KingsburyLab/pyEQL](https://github.com/KingsburyLab/pyEQL) |
| **pyequion** | Equilibrio electrolitos inorgánicos, pH, SI. | [caiofcm/pyequion](https://github.com/caiofcm/pyequion) |
| **PHREEQC** | Estándar USGS; bindings y Colab/Streamlit. | [haohanyang/phreeqc](https://github.com/haohanyang/phreeqc) · [rispr/phreeqc_web](https://github.com/rispr/phreeqc_web) |
| **PourPy** | Pourbaix custom, JOSS 2024, app web Mercury. | [GitLab cmbm-ethz/pourbaix-diagrams](https://gitlab.com/cmbm-ethz/pourbaix-diagrams) |

### Tier 3 — Inspiración UX (alcance estrecho)

| Proyecto | Qué aporta |
|----------|------------|
| **Open Source Physics @ Singapore** | Titulaciones web, indicadores, animación (EjsS). |
| **t-builder** | Curvas y Bjerrum arbitrarios (Java desktop). |
| **chem_lab** | Laboratorio virtual Cambridge AS (práctica, no teoría analítica). |

### Puente de datos

| Herramienta | Qué hace |
|-------------|----------|
| **Chimera** (Amphos21) | Convierte bases PHREEQC → formato Spana/DataBase. [techlabs.amphos21.com](https://techlabs.amphos21.com/technology/chimera) |

---

## Matriz módulo ↔ proyecto (profundidad)

Leyenda: **●●●** nativo/serio · **●●○** parcial · **●○○** básico · **○○○** no aplica

### Equilibrios simples

| Módulo Equilibria Lab | Spana | ChemEQL | efta | Reaktoro | OSP |
|----------------------|:-----:|:-------:|:----:|:--------:|:---:|
| Ácido-base | ●●● | ●●● | ●●○ | ●●○ | ●○○ |
| Complejos | ●●● | ●●● | ●●○ | ●●● | ○○○ |
| Redox | ●●● | ●●● | ●○○ | ●●● | ○○○ |
| Solubilidad | ●●● | ●●● | ●●● | ●●● | ○○○ |
| Actividad | ●●○ | ●●● | ●●○ | ●●● | ○○○ |

### Equilibrios múltiples

| Módulo | Spana | ChemEQL | efta | PHREEQC | PourPy |
|--------|:-----:|:-------:|:----:|:-------:|:------:|
| Pourbaix | ●●● | ●●● | ○○○ | ●●● | ●●● |
| Mezclas ácido-base | ●●○ | ●●● | ●●○ | ●●● | ○○○ |
| Constantes condicionales | ●●○ | ●●○ | ●●○ | ●●● | ○○○ |
| Precipitación selectiva | ●●○ | ●●● | ●●○ | ●●● | ●●○ |
| Potencial condicional | ●●○ | ●●○ | ○○○ | ●●● | ●●○ |
| Extracción L–L | ○○○ | ○○○ | ●●● | ●●○ | ○○○ |
| Intercambio iónico | ○○○ | ●○○ | ○○○ | ●●● | ○○○ |
| Solubilidad y pH | ●●● | ●●● | ●●● | ●●● | ○○○ |

### Titulaciones

| Modo | Spana | ChemEQL | OSP / t-builder |
|------|:-----:|:-------:|:---------------:|
| Ácido-base | ●●○ | ●●● | ●●● |
| Complejométrica | ●●○ | ●●● | ○○○ |
| Redox | ●●○ | ●●○ | ○○○ |
| Precipitación | ●●○ | ●●● | ○○○ |
| Potenciométrica (Gran) | ●○○ | ●●○ | ●○○ |

---

## Qué aprender de cada uno (ideas para el futuro)

### De Spana — prioridad **alta** (mismo ADN)

- Suite **benchmark** Spana ↔ tests automáticos.
- **Importador** de constantes (.dat / Chimera / PHREEQC).
- **Actividad integrada** en solvePH y solubilidad (toggle ideal / D–H).
- Sólidos **competitivos** (selección global de fase).
- **Temperatura** variable (pK_w, pK_a(T)).

### De ChemEQL / PHREEQC — prioridad **media**

- Adsorción en superficies (CCM, capa difusa).
- Cinética con un paso lento + equilibrio rápido.
- Índices de saturación multimineral.
- Validación offline con PHREEQC (oráculo, no UI).

### De efta — prioridad **media** (colaboración)

- Ajuste de constantes a datos experimentales.
- Extracción multietapa (counter-current).
- Tests compartidos en repos externos.

### De pyEQL / Reaktoro — prioridad **baja**

- Modelo **Pitzer** (I > 0,5 M).
- Conductividad, densidad.
- Motor WASM/Python solo en “modo investigación”.

### De PourPy — prioridad **media**

- Pourbaix **custom** (gases, sólidos arbitrarios).
- Regiones corrosión / pasivación etiquetadas.

### De OSP / t-builder — prioridad **baja** (UX)

- Animación titulación paso a paso.
- Feedback visual de indicadores.
- Export CSV / informe.

---

## Roadmap sugerido (motor y ecosistema)

Independiente del roadmap de módulos ya implementados
([`ROADMAP-EQUILIBRIOS-MULTIPLES.md`](ROADMAP-EQUILIBRIOS-MULTIPLES.md)).

### Fase 1 — Confianza (sin cambiar física)

- [ ] Tests benchmark desde `Eq-Diagr/Examples/` (ver validación doc).
- [x] Documentación de congruencia Spana (este archivo + validación).
- [ ] `docs/benchmarks/spana/` con golden CSV exportados de Spana.
- [ ] Issue opcional en efta con casos Harris compartidos.

### Fase 2 — Profundidad analítica

- [ ] Toggle global **ideal / Debye–Hückel** en mezclas y solubilidad.
- [ ] Parser básico de sistemas Spana `.dat` → editor de la app.
- [ ] Pourbaix **modo custom** (más allá de presets Fe/Cu/…).

### Fase 3 — Investigación / geoquímica

- [ ] Precipitación competitiva (múltiples sólidos).
- [ ] Adsorción superficial (CCM mínimo).
- [ ] Puente PHREEQC solo para validación batch (CLI, no producción web).

---

## Licencias al integrar código externo

| Proyecto | Licencia | Nota |
|----------|----------|------|
| Spana (eq-diagr) | GPL-3.0 | No copiar código a TS sin compatibilizar licencia del repo. |
| ChemEQL (GitHub) | MIT | Más permisivo. |
| efta | MIT | Colaboración y comparación libres. |
| Reaktoro | LGPL-2.1 | Enlace dinámico / uso como herramienta externa. |
| PourPy | GPL-3.0+ | Mismo cuidado que Spana. |

Comparación numérica, citas y parsers de **datos** (no código) suelen ser seguros;
revisar licencia antes de embeber algoritmos.

---

## Instalar Spana para benchmarks manuales (Mac)

```bash
curl -L -o ~/Downloads/Eq-Diagr_Java.zip \
  "https://github.com/ignasi-p/eq-diagr/releases/download/0.4.0/Eq-Diagr_Java.zip"
unzip -o ~/Downloads/Eq-Diagr_Java.zip -d ~/Documents
brew install --cask temurin   # Java 8+
cd ~/Documents/Eq-Diagr/MacOS-files && chmod +x create_scripts && ./create_scripts
# Doble clic en ~/Desktop/Spana.command
```

Ejemplos: `~/Documents/Eq-Diagr/Examples/*.plt`

---

## Referencias cruzadas

| Documento | Contenido |
|-----------|-----------|
| [`VALIDACION-Y-CONGRUENCIA.md`](VALIDACION-Y-CONGRUENCIA.md) | Ecuaciones, checks numéricos, límites del motor |
| [`ARQUITECTURA.md`](ARQUITECTURA.md) | Stack, motores, convenciones |
| [`ROADMAP-EQUILIBRIOS-MULTIPLES.md`](ROADMAP-EQUILIBRIOS-MULTIPLES.md) | Tier 1–3 de módulos ya planificados |
| [`COBERTURA-TEMARIO.md`](COBERTURA-TEMARIO.md) | Cobertura UNAM QA II / III |
