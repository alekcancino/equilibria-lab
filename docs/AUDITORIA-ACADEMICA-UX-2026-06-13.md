# Auditoría académica y de UX — 2026-06-13

Alcance: contraste del repositorio con los programas oficiales UNAM 1402
Química Analítica I, 1504 Química Analítica II y 1604 Química Analítica III,
incluyendo temarios, bibliografía declarada, arquitectura, calidad técnica e
interfaz de usuario.

## Dictamen ejecutivo

QuimEq tiene un motor amplio y una buena base visual para explorar equilibrios,
pero todavía no cumple de forma completa los tres programas. Existe una suite de
pruebas automatizadas (`npm run test`, 60+ casos) que cubre los motores
principales; faltan casos golden completos para todos los metales Pourbaix.

La prioridad de producto no debe ser agregar más gráficas aisladas, sino hacer
explícito el razonamiento analítico: reacción principal, reacciones parásitas,
criterio de cuantitatividad, condiciones controlables, predicción y conclusión.

Desde la auditoría inicial se añadieron pruebas unitarias y `npm run check`
(lint + test + build). En v0.3.0 se corrigió K′ EDTA, se amplió UX, se añadieron
módulos MVP (intercambio iónico, actividad) y se sincronizó la documentación.

## Cobertura corregida

| Programa | Cobertura estimada | Huecos principales |
|---|---:|---|
| QA I (1402) | 72–76 % | proceso analítico; ΔG y K; balanceo redox; potencial de mezclas/anfolitos; actividad integrada en motores |
| QA II (1504) | 78–82 % | intercambio iónico completo (columna); actividad en motores; concentración aparente vs analítica |
| QA III (1604) | 68–72 % | constantes consecutivas; disolventes no acuosos; columna iónica real |

Las titulaciones son valiosas para aplicar conceptos, pero no sustituyen unidades
que el programa pide explícitamente.

## Bibliografía

Los PDF oficiales priorizan estas fuentes:

- QA I: Charlot; Harris; Burgot; Powell y Pettit; Silva y Barbosa; Aguilar
  Sanjuán. Complementarias: Skoog, Christian, IUPAC Stability Constants Database.
- QA II: Charlot; Ringbom; Vera Ávila; Burgot; Silva y Barbosa; Sanjuán.
  Complementarias: Tremillon, Enke, Skoog, Clavijo, Powell y Pettit.
- QA III: Ringbom; Valcárcel y Gómez; Queré; Tremillon; Patnaik.
  Complementarias: Charlot, Inczedy, Kotrly y Sucha, Enke, Burgot.

### Hallazgos de trazabilidad

- Las bases internas sí guardan referencias para varios datos, pero la interfaz
  las ocultaba por completo. La auditoría reactiva su visualización.
- Muchas referencias son demasiado generales: falta edición, tabla/página,
  temperatura, fuerza iónica y definición exacta de la constante.
- Hay fuentes usadas por el proyecto que no aparecen en los programas
  proporcionados, como Bard, Parsons & Jordan y Stumm & Morgan. Son fuentes
  pertinentes, pero deben declararse como fuentes de datos adicionales, no como
  sustitutos implícitos de la bibliografía del curso.
- El texto “constantes de Harris, Skoog, Bard 1985 y Stumm & Morgan 1996” no
  describe qué registro proviene de cada fuente.

### Requisito recomendado por registro

Cada preset debe conservar: valor, especie/reacción, convención, temperatura,
fuerza iónica o medio, fuente completa y localizador de tabla/página. Cuando el
usuario edite un dato, la UI debe indicar que ya es un valor personalizado.

## Auditoría de interfaz

### Problemas prioritarios

1. La titulación ácido-base obligaba a representar ácidos y bases fuertes con
   valores extremos de pKa, en lugar de reconocer la disociación completa.
2. El editor no infería si un sistema era fuerte, débil o poliprótico según las
   constantes definidas.
3. Las referencias estaban ocultas, lo que impide evaluar la confiabilidad de
   constantes y presets.
4. La navegación móvil no controlaba bien el desbordamiento de secciones,
   submódulos y tipos de titulación.
5. Los resultados muestran valores, pero no siempre cierran el ciclo pedagógico
   “predicción → cálculo → conclusión”.

### Cambios implementados en esta auditoría

- Las titulaciones ácido-base y potenciométricas inician como sistemas fuertes,
  sin pKa.
- Agregar o quitar pKa cambia automáticamente entre fuerte, débil y
  poliprótico; la dirección cambia entre ácido y base fuerte.
- El motor representa los analitos fuertes mediante sus iones espectadores, no
  mediante pKa artificiales.
- Los módulos multivariables parten del caso físico mínimo y reconocen el
  aumento de complejidad al agregar constantes, componentes, reacciones
  parásitas o comparaciones.
- Se muestra el modelo detectado en todas las secciones y submódulos. Las capas
  activas se comunican de forma uniforme mediante `ModelBadge`.
- Marcadores, indicadores, derivadas, comparaciones y líneas auxiliares arrancan
  desactivados; Pourbaix inicia con un sistema genérico simple editable.
- Referencias visibles para datos cargados desde bases internas.
- Mejoras responsive para navegación principal, subnavegación y titulaciones.

### Resueltos en v0.3.0 (post-auditoría)

- K′ EDTA unificada con αM(OH) en `edta.ts` (alineada con `conditional.ts`).
- Token CSS `--bg-alt` definido; InfoBox EDTA corregido.
- Marcador vertical pH en Solubilidad; botón Restablecer en Mezclas.
- Pourbaix: cursor pH/E + ResultCard de predominio; default modo custom.
- ARIA en tabs principales y DiagramTabs; panel móvil 58vh.
- Módulos MVP: Intercambio iónico, Actividad/Debye-Hückel.
- 60+ tests unitarios; Plotly lazy-loaded en chunk separado.

## Calidad técnica

- `npm run build`: pasa.
- `npm run lint`: pasa sin errores ni advertencias.
- `npm run test`: 60+ pruebas en [`src/lib/__tests__/engines.test.ts`](../src/lib/__tests__/engines.test.ts).
- `npm run check`: encadena lint + test + build.
- Plotly en chunk `PlotChart-*.js` (~1 MB); módulos React con lazy import.

## Backlog recomendado

### P0 — confianza y reproducibilidad

1. ~~Crear pruebas unitarias para cada motor~~ — **parcial**: 60+ tests; ampliar golden Pourbaix y smoke de presets.
2. ~~Agregar `npm run check`~~ — **hecho**.
3. Normalizar la procedencia bibliográfica por registro.
4. ~~Mantener `COBERTURA-TEMARIO.md` sincronizado~~ — **hecho en v0.3.0**; revisar tras cada release.

### P1 — aprendizaje y uso profesional

1. Extender la inferencia del modelo a nuevos módulos sin convertirla en un
   asistente guiado ni exigir categorías redundantes.
2. ~~Implementar log s=f(pX) e intercambio iónico~~ — **MVP hecho**; profundizar columna y actividad en motores.
3. ~~Completar polimerización, preconcentración~~ — **MVP hecho** en ExtraccionLiquido.
4. Añadir conclusiones exportables con datos, supuestos, resultado y fuente.

### P2 — amplitud curricular

1. Actividad, fuerza iónica y Debye-Hückel.
2. Disolventes no acuosos.
3. Proceso analítico total como módulo conceptual o colección de casos.
