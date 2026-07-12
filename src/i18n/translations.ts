// Bilingual UI dictionary — pilot rollout (see AGENTS.md "Language rules").
// Chemistry notation, formulas and user-entered free-text labels are NEVER
// translated (they're already international/language-neutral); only static
// prose (labels, hints, button/menu text) goes through this dictionary.
//
// Scope of this pilot: shared chrome (nav, panel, share/save buttons) +
// generic Controls.tsx defaults + AcidSystemEditor + the Ácido-base module.
// Every other module's JSX stays hardcoded Spanish until translated in a
// follow-up PR — toggling to English elsewhere simply shows Spanish there,
// which is expected for an incremental rollout, not a bug.
//
// Every key requires BOTH `es` and `en` in the same object literal, so a
// missing translation is a compile error, not a silent fallback.

import type { Lang } from '../hooks/useLanguage';

export const translations = {
  // ── Chrome: topbar, footer, home ──────────────────────────────────────────
  'chrome.goHome': { es: 'Ir al inicio', en: 'Go home' },
  'chrome.tagline': { es: 'Simulador de equilibrio químico', en: 'Chemical equilibrium simulator' },
  'chrome.topics': { es: 'Temas', en: 'Topics' },
  'chrome.loading': { es: 'Cargando…', en: 'Loading…' },
  'chrome.assumptionsShort': { es: 'ⓘ Supuestos', en: 'ⓘ Assumptions' },
  'chrome.assumptionsLong': { es: 'Supuestos y opciones', en: 'Assumptions and options' },
  // Split around the <sub>w</sub> in "Kw" — no Unicode subscript "w" exists.
  'chrome.assumptionsBase1': { es: 'T = 25 °C · actividades ≈ concentraciones · K', en: 'T = 25 °C · activities ≈ concentrations · K' },
  'chrome.assumptionsBase2': {
    es: ' = 10⁻¹⁴ · exporta gráficas con el botón flotante sobre la gráfica',
    en: ' = 10⁻¹⁴ · export charts with the floating button over the chart',
  },
  'chrome.viewsOf': { es: 'Vistas de', en: 'Views for' },
  'chrome.showActivityCorrection': { es: 'Mostrar corrección γ', en: 'Show γ correction' },

  // ── Home landing screen ───────────────────────────────────────────────────
  'home.title': { es: '¿Qué equilibrio quieres estudiar?', en: 'Which equilibrium do you want to study?' },
  'home.intro': {
    es: 'Catorce motores de química analítica en siete temas. Cada tema empieza con el modelo mínimo y crece contigo: agrega constantes, reacciones laterales o comparaciones cuando las necesites.',
    en: 'Fourteen analytical-chemistry engines across seven topics. Each topic starts from the minimal model and grows with you: add constants, side reactions or comparisons whenever you need them.',
  },

  // ── Hub navigation (App.tsx HUBS) ─────────────────────────────────────────
  'hub.acidobase.label': { es: 'Ácido-base', en: 'Acid-base' },
  'hub.acidobase.desc': {
    es: 'pH, distribución de especies y diagramas de un sistema o de mezclas.',
    en: 'pH, species distribution and diagrams for a single system or mixtures.',
  },
  'view.acidobase.label': { es: 'Sistema único', en: 'Single system' },
  'view.mezclas.label': { es: 'Mezclas', en: 'Mixtures' },

  'hub.complejos.label': { es: 'Complejos', en: 'Complexes' },
  'hub.complejos.desc': {
    es: 'Formación de complejos, número de Bjerrum, sistemas X–M–L acoplados y constantes condicionales.',
    en: 'Complex formation, Bjerrum number, coupled X–M–L systems and conditional constants.',
  },
  'view.complejos.label': { es: 'Equilibrio (pL)', en: 'Equilibrium (pL)' },
  'view.especiacion.label': { es: 'Especiación vs pH', en: 'Speciation vs pH' },
  'view.condicionalesedta.label': { es: 'K′ condicional', en: 'Conditional K′' },

  'hub.redox.label': { es: 'Redox', en: 'Redox' },
  'hub.redox.desc': {
    es: 'Escala de predicción, potencial condicional E°′ y diagramas de Pourbaix.',
    en: 'Prediction scale, conditional potential E°′ and Pourbaix diagrams.',
  },
  'view.redox.label': { es: 'Escala y DUZP', en: 'Scale and DUZP' },
  'view.potencialcond.label': { es: 'E°′ condicional', en: 'Conditional E°′' },
  'view.pourbaix.label': { es: 'Pourbaix (E–pH)', en: 'Pourbaix (E–pH)' },

  'hub.solubilidad.label': { es: 'Solubilidad', en: 'Solubility' },
  'hub.solubilidad.desc': {
    es: 'Kps, efecto del pH e ion común, hidróxidos anfóteros, precipitación selectiva y competitiva.',
    en: 'Ksp, pH and common-ion effect, amphoteric hydroxides, selective and competitive precipitation.',
  },
  'view.solubilidad.label': { es: 'Kps e ion común', en: 'Ksp and common ion' },
  'view.solsal.label': { es: 'Solubilidad y pH', en: 'Solubility and pH' },
  'view.solcond.label': { es: 'Precipitación selectiva', en: 'Selective precipitation' },
  'view.solcomp.label': { es: 'Competitiva (2 sales)', en: 'Competitive (2 salts)' },

  'hub.separaciones.label': { es: 'Separaciones', en: 'Separations' },
  'hub.separaciones.desc': {
    es: 'Extracción líquido-líquido e intercambio iónico condicionados por el pH.',
    en: 'Liquid–liquid extraction and ion exchange, both pH-conditioned.',
  },
  'view.extraccion.label': { es: 'Extracción L–L', en: 'L–L extraction' },
  'view.ionexchange.label': { es: 'Intercambio iónico', en: 'Ion exchange' },

  'hub.titulaciones.label': { es: 'Titulaciones', en: 'Titrations' },
  'hub.titulaciones.desc': {
    es: 'Curvas de valoración ácido-base, EDTA, redox, precipitación y potenciométricas.',
    en: 'Acid-base, EDTA, redox, precipitation and potentiometric titration curves.',
  },
  'view.titulacion.label': { es: 'Curvas de titulación', en: 'Titration curves' },

  'hub.actividad.label': { es: 'Actividad', en: 'Activity' },
  'hub.actividad.desc': {
    es: 'Coeficientes γ — Debye–Hückel, Kielland, Davies o Güntelberg — fuerza iónica y pKw aparente.',
    en: 'γ coefficients — Debye–Hückel, Kielland, Davies or Güntelberg — ionic strength and apparent pKw.',
  },
  'view.actividad.label': { es: 'Debye–Hückel', en: 'Debye–Hückel' },

  // ── Panel shell (sidebar / mobile sheet) ──────────────────────────────────
  'panel.reset': { es: '↺ Restablecer', en: '↺ Reset' },
  'panel.variables': { es: 'Variables', en: 'Variables' },
  'panel.closeVariables': { es: 'Cerrar variables', en: 'Close variables' },
  'panel.showVariables': { es: 'Mostrar panel de variables', en: 'Show variables panel' },
  'panel.hideVariables': { es: 'Ocultar panel de variables', en: 'Hide variables panel' },
  'panel.ariaVariables': { es: 'Panel de variables', en: 'Variables panel' },

  // ── Theme toggle ───────────────────────────────────────────────────────────
  'theme.switchToDark': { es: 'Cambiar a modo oscuro', en: 'Switch to dark mode' },
  'theme.switchToLight': { es: 'Cambiar a modo claro', en: 'Switch to light mode' },
  'theme.dark': { es: 'Modo oscuro', en: 'Dark mode' },
  'theme.light': { es: 'Modo claro', en: 'Light mode' },

  // ── Share / saved systems ──────────────────────────────────────────────────
  'share.label': { es: 'Compartir', en: 'Share' },
  'share.ariaLabel': { es: 'Compartir enlace de este escenario', en: 'Share a link to this scenario' },
  'share.copied': { es: '¡Enlace copiado!', en: 'Link copied!' },
  'saved.button': { es: 'Mis sistemas guardados', en: 'My saved systems' },
  'saved.buttonShort': { es: 'Mis sistemas', en: 'My systems' },
  'saved.namePlaceholder': { es: 'Nombre del sistema', en: 'System name' },
  'saved.saving': { es: 'Guardando…', en: 'Saving…' },
  'saved.save': { es: 'Guardar', en: 'Save' },
  'saved.empty': { es: 'Aún no hay sistemas guardados en este módulo.', en: 'No systems saved in this module yet.' },
  'saved.delete': { es: 'Eliminar', en: 'Delete' },

  // ── Mobile nav ─────────────────────────────────────────────────────────────
  'mobilenav.topic': { es: 'Tema', en: 'Topic' },
  'mobilenav.view': { es: 'Vista', en: 'View' },
  'mobilenav.topicAria': { es: 'Tema del simulador', en: 'Simulator topic' },
  'mobilenav.viewAria': { es: 'Módulo activo', en: 'Active module' },
  'mobilenav.home': { es: 'Inicio', en: 'Home' },

  // ── Generic Controls.tsx defaults ──────────────────────────────────────────
  'controls.help': { es: 'Ayuda', en: 'Help' },
  'controls.removeConstant': { es: 'Quitar constante', en: 'Remove constant' },
  'controls.add': { es: 'Agregar', en: 'Add' },
  'controls.dbExamples': { es: 'Ejemplos de la base de datos', en: 'Database examples' },
  'controls.otherGroup': { es: 'Otros', en: 'Other' },
  'controls.loadFullSystem': { es: 'Cargar sistema completo', en: 'Load full system' },
  'controls.modelDetected': { es: 'Modelo detectado', en: 'Model detected' },

  // ── Shared AcidSystemEditor (also reused by Mezclas/Titulación — those
  //    modules stay Spanish elsewhere until translated, so this editor may
  //    show as an English island there until their turn.) ─────────────────
  'acidSystemEditor.systemLabel': { es: 'Sistema (nombre libre)', en: 'System (free name)' },
  'acidSystemEditor.noConstantsHint': {
    es: 'Sin pKa: disociación completa. Agrega un pKa para modelar un sistema débil.',
    en: 'No pKa: complete dissociation. Add a pKa to model a weak system.',
  },
  'acidSystemEditor.systemTypeSummary': { es: 'Tipo de sistema (carga inicial z₀)', en: 'System type (initial charge z₀)' },
  'acidSystemEditor.z0Label': { es: 'Carga de la forma más protonada (z₀)', en: 'Charge of the most protonated form (z₀)' },
  'acidSystemEditor.z0Option0': { es: '0 — ácido neutro (HₙA)', en: '0 — neutral acid (HₙA)' },
  'acidSystemEditor.z0Option1': { es: '+1 — base protonada (BH⁺)', en: '+1 — protonated base (BH⁺)' },
  'acidSystemEditor.z0Option2': { es: '+2 — diamina protonada (BH₂²⁺)', en: '+2 — protonated diamine (BH₂²⁺)' },
  'acidSystemEditor.z0Option3': { es: '+3 — catión acuo-ácido (Fe³⁺, Al³⁺)', en: '+3 — aqua-acid cation (Fe³⁺, Al³⁺)' },
  'acidSystemEditor.z0Hint': {
    es: 'z₀ es la carga de la especie con todos sus protones puestos. Distingue un ácido neutro (HₙA) de una base que empieza protonada (NH₄⁺, etilendiamina) o de un catión que se hidroliza (Fe³⁺). Fija el balance de carga con que se calcula el pH; para un ácido común déjalo en 0.',
    en: 'z₀ is the charge of the species with every proton attached. It distinguishes a neutral acid (HₙA) from a base that starts protonated (NH₄⁺, ethylenediamine) or a cation that hydrolyzes (Fe³⁺). It sets the charge balance the pH is solved from; for an ordinary acid leave it at 0.',
  },
  'acidSystemEditor.roleAcid': { es: 'ácido', en: 'acid' },
  'acidSystemEditor.roleBase': { es: 'base', en: 'base' },
  'acidSystemEditor.classStrong': { es: '{role} fuerte', en: 'strong {role}' },
  'acidSystemEditor.classWeak': { es: '{role} débil', en: 'weak {role}' },
  'acidSystemEditor.classPolyprotic': { es: '{role} poliprótico ({n} etapas)', en: 'polyprotic {role} ({n} steps)' },

  // ── Ácido-base module (pilot) ──────────────────────────────────────────────
  'acidoBase.title': { es: 'Equilibrio ácido-base', en: 'Acid-base equilibrium' },
  'acidoBase.systemSection': { es: 'Sistema', en: 'System' },
  'acidoBase.conditionsSection': { es: 'Condiciones', en: 'Conditions' },
  'acidoBase.concLabel': { es: 'Concentración analítica', en: 'Analytical concentration' },
  'acidoBase.markPureSolutionPH': { es: 'Marcar pH de la disolución pura', en: 'Mark the pure-solution pH' },
  'acidoBase.activityCorrection': { es: 'Corrección por actividad', en: 'Activity correction' },
  'acidoBase.ionicStrengthLabel': { es: 'Fuerza iónica I', en: 'Ionic strength I' },
  'acidoBase.gammaDH': { es: 'D-H extendida', en: 'Extended D-H' },
  'acidoBase.gammaDavies': { es: 'Davies', en: 'Davies' },
  'acidoBase.gammaGuntelberg': { es: 'Güntelberg', en: 'Güntelberg' },
  'acidoBase.activityHint': {
    es: 'I = 0 → γ = 1 (resultado termodinámico). A I > 0.1 M los pKa aparentes aumentan y el pH calculado cambia. Davies es válida hasta I ≈ 0.5 M; D-H extendida pierde precisión pasando I ≈ 0.1 M.',
    en: 'I = 0 → γ = 1 (thermodynamic result). Above I > 0.1 M the apparent pKa values shift and the calculated pH changes. Davies is valid up to I ≈ 0.5 M; extended D-H loses accuracy past I ≈ 0.1 M.',
  },
  'acidoBase.activityNoteTitle': { es: 'Actividad vs concentración', en: 'Activity vs concentration' },
  'acidoBase.activityNoteBody1': {
    es: 'Este módulo (y la mayoría de motores) asume ',
    en: 'This module (and most engines) assumes ',
  },
  'acidoBase.activityNoteBold': { es: 'actividades ≈ concentraciones', en: 'activities ≈ concentrations' },
  'acidoBase.activityNoteBody2': {
    es: '. A I > 0.1 M la corrección Debye-Hückel puede desviar el pH real; use el módulo',
    en: '. Above I > 0.1 M the Debye–Hückel correction can shift the real pH; use the module',
  },
  'acidoBase.activityNoteModule': { es: ' Actividad / Debye-Hückel', en: ' Activity / Debye–Hückel' },
  'acidoBase.activityNoteBody3': { es: ' para estimar γ.', en: ' to estimate γ.' },
  'acidoBase.howToReadTitle': { es: 'Cómo leer estos diagramas', en: 'How to read these diagrams' },
  'acidoBase.duzpExplain': {
    es: ' (zonas de predominio): en cada tramo de pH domina una especie; las fronteras están en los pKa.',
    en: ' (predominance zones): one species dominates each pH stretch; boundaries sit at the pKa values.',
  },
  'acidoBase.alphaExplain': {
    es: ': fracción de cada especie vs pH; en pH = pKa las especies conjugadas se cruzan (α = 0.5).',
    en: ': fraction of each species vs pH; at pH = pKa the conjugate species cross (α = 0.5).',
  },
  'acidoBase.logCExplain': {
    es: ' (Sillén): log de cada concentración con las líneas H₃O⁺/OH⁻. La línea rosa marca el pH real de la disolución pura.',
    en: ' (Sillén): log of each concentration with the H₃O⁺/OH⁻ lines. The pink line marks the real pH of the pure solution.',
  },
  'acidoBase.saltFormTitle': { es: '¿Disolviste la sal de una forma intermedia?', en: 'Did you dissolve an intermediate salt form?' },
  'acidoBase.saltFormBody1': {
    es: 'Este módulo siempre disuelve la forma ',
    en: 'This module always dissolves the ',
  },
  'acidoBase.saltFormBold': { es: 'más protonada', en: 'most protonated' },
  'acidoBase.saltFormBody2': {
    es: ' (z₀) directamente. Para calcular el pH de la sal de una forma intermedia o final de un sistema poliprótico (ej. NaHCO₃, Na₂HPO₄, KHP) usa ',
    en: ' form (z₀) directly. To compute the pH of an intermediate or final salt form of a polyprotic system (e.g. NaHCO₃, Na₂HPO₄, KHP) use ',
  },
  'acidoBase.saltFormBold2': { es: 'Mezclas', en: 'Mixtures' },
  'acidoBase.saltFormBody3': {
    es: ' — ahí el selector "Forma de partida" agrega el contraión espectador correcto automáticamente.',
    en: ' — there the "Starting form" selector adds the correct spectator counter-ion automatically.',
  },
  'acidoBase.tabDUZP': { es: 'DUZP', en: 'DUZP' },
  'acidoBase.tabAlpha': { es: 'Distribución α', en: 'α distribution' },
  'acidoBase.tabLogC': { es: 'log C', en: 'log C' },
  'acidoBase.duzpCaption': { es: 'Zonas de predominio', en: 'Predominance zones' },
  'acidoBase.pureSolutionMarker': { es: 'disol. pura · pH {ph}', en: 'pure solution · pH {ph}' },
  'acidoBase.pureSolutionPH': { es: 'pH disolución pura', en: 'Pure-solution pH' },
  'acidoBase.pctDominantSpecies': { es: '% de {species} a pH', en: '% of {species} at pH' },
  'acidoBase.pctDominantSpeciesFallback': { es: 'especie dom.', en: 'dominant species' },
  'acidoBase.transitionPH': { es: 'pH 50 % transición (pKa)', en: 'pH 50 % transition (pKa)' },
  'acidoBase.speciesFallback': { es: 'Especie {n}', en: 'Species {n}' },
} satisfies Record<string, Record<Lang, string>>;

export type TKey = keyof typeof translations;
