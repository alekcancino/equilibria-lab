// Bilingual UI dictionary — pilot rollout (see AGENTS.md "Language rules").
// Chemistry notation, formulas and user-entered free-text labels are NEVER
// translated (they're already international/language-neutral); only static
// prose (labels, hints, button/menu text) goes through this dictionary.
//
// Scope translated so far: shared chrome (nav, panel, share/save buttons) +
// generic Controls.tsx defaults + AcidSystemEditor + SideReactionEditor +
// the Ácido-base and Complejos modules. Every other module's JSX stays
// hardcoded Spanish until translated in a follow-up PR — toggling to
// English elsewhere simply shows Spanish there, which is expected for an
// incremental rollout, not a bug.
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
    en: 'z₀ is the charge of the species with every proton attached. It distinguishes a neutral acid (HₙA) from a base that starts protonated (NH₄⁺, ethylenediamine) or a cation that hydrolyzes (Fe³⁺). It sets the charge balance used to compute the pH; for an ordinary acid, leave it at 0.',
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
    en: ' (predominance zones): one species dominates each pH range, with boundaries at the pKa values.',
  },
  'acidoBase.alphaExplain': {
    es: ': fracción de cada especie vs pH; en pH = pKa las especies conjugadas se cruzan (α = 0.5).',
    en: ': fraction of each species vs pH; at pH = pKa the conjugate species cross (α = 0.5).',
  },
  'acidoBase.logCExplain': {
    es: ' (Sillén): log de cada concentración con las líneas H₃O⁺/OH⁻. La línea rosa marca el pH real de la disolución pura.',
    en: ' (Sillén): log of each concentration with the H₃O⁺/OH⁻ lines. The pink line marks the actual pH of the pure solution.',
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

  // ── Shared SideReactionEditor (Ringbom side-reaction / auxiliary-ligand
  //    stack) — also reused by EspeciacionMetal/PotencialCondicional/
  //    ConstantesCondicionales/IntercambioIonico/SolubilidadCondicional/
  //    Titulación, none translated yet, so this editor may show as an
  //    English island there until their own turn. ──────────────────────────
  'sideReactionEditor.ligandPKasTitle': { es: 'pKas del ligando Y (EDTA por defecto)', en: 'pKas of ligand Y (EDTA by default)' },
  'sideReactionEditor.auxLigandTitleDefault': { es: 'Ligando auxiliar α_M(L)', en: 'Auxiliary ligand α_M(L)' },
  'sideReactionEditor.hydrolysisTitle': { es: 'Hidrólisis del metal α_M(OH)', en: 'Metal hydrolysis α_M(OH)' },
  'sideReactionEditor.presetsLabel': { es: 'Presets (metal + ligando):', en: 'Presets (metal + ligand):' },
  'sideReactionEditor.agentName': { es: 'Nombre del agente', en: 'Agent name' },
  'sideReactionEditor.howMuchDissolved': { es: 'Cuánto {aux} hay disuelto', en: 'How much {aux} is dissolved' },
  'sideReactionEditor.free': { es: '[{aux}] libre', en: 'Free [{aux}]' },
  'sideReactionEditor.total': { es: 'Total analítica', en: 'Analytical total' },
  'sideReactionEditor.fixedPX': { es: 'pX′ fijo', en: 'Fixed pX′' },
  'sideReactionEditor.specModeFreeBody': {
    es: ': concentración de equilibrio del agente ya libre.',
    en: ': equilibrium concentration of the agent already free.',
  },
  'sideReactionEditor.specModeTotalBody': {
    es: ': lo que agregaste al vaso (requiere su pKa; el resto lo reparte la protonación).',
    en: ': what you added to the vessel (requires its pKa; protonation splits the rest).',
  },
  'sideReactionEditor.specModeFixedBody': {
    es: ': fijas −log[{aux}′] directamente.',
    en: ': you fix −log[{aux}′] directly.',
  },
  'sideReactionEditor.freeConcLabel': { es: '[{aux}] libre (M)', en: 'Free [{aux}] (M)' },
  'sideReactionEditor.totalAddedLabel': { es: '{aux} total agregado (M)', en: '{aux} total added (M)' },
  'sideReactionEditor.conjugateAcidPrefix': { es: 'pKa (ácido conjugado)', en: 'pKa (conjugate acid)' },
  'sideReactionEditor.nh3Hint': {
    es: 'NH₃/NH₄⁺: pKa ≈ 9.2. Glicina: usar el pKa del ácido conjugado.',
    en: 'NH₃/NH₄⁺: pKa ≈ 9.2. Glycine: use the pKa of the conjugate acid.',
  },
  'sideReactionEditor.targetPX': { es: 'pX′ objetivo (−log[{aux}′])', en: 'Target pX′ (−log[{aux}′])' },
  'sideReactionEditor.complexProtonationTitle': { es: 'Protonación / hidrólisis del complejo MY', en: 'Protonation / hydrolysis of the MY complex' },
  'sideReactionEditor.complexHint': {
    es: 'Ej. ZnHY (log β = 19.44) para protonación del complejo, ZnOHY (4.54) para complejo hidroxo.',
    en: 'E.g. ZnHY (log β = 19.44) for complex protonation, ZnOHY (4.54) for the hydroxo complex.',
  },

  // ── Complejos module ───────────────────────────────────────────────────────
  'complejos.title': { es: 'Equilibrio de complejación', en: 'Complexation equilibrium' },
  'complejos.conditionalPXLabel': { es: 'pX′ condicional (pH {ph})', en: 'Conditional pX′ (pH {ph})' },
  'complejos.pLAxisLabel': { es: 'pL (−log[L])', en: 'pL (−log[L])' },
  'complejos.systemSection': { es: 'Sistema', en: 'System' },
  'complejos.conditionsSection': { es: 'Condiciones', en: 'Conditions' },
  'complejos.resultSection': { es: 'Resultado', en: 'Result' },
  'complejos.model11': { es: 'complejo 1:1 (ML)', en: '1:1 complex (ML)' },
  'complejos.modelSuccessive': { es: 'complejación sucesiva hasta ML{n}', en: 'successive complexation up to ML{n}' },
  'complejos.additionMassBalance': { es: 'balance de masa y pL de equilibrio', en: 'mass balance and equilibrium pL' },
  'complejos.additionCondScale': { es: 'escala pX′ condicional', en: 'conditional pX′ scale' },
  'complejos.additionCoupled': { es: 'X–M–L acoplado (dos ligandos)', en: 'coupled X–M–L (two ligands)' },
  'complejos.additionActivity': { es: 'β′ corregidas a I = {i} M', en: 'β′ corrected at I = {i} M' },
  'complejos.metalLabel': { es: 'Metal (nombre libre)', en: 'Metal (free name)' },
  'complejos.ligandLabel': { es: 'Ligando (nombre libre)', en: 'Ligand (free name)' },
  'complejos.cmLabel': { es: 'Concentración total del metal (cM)', en: 'Total metal concentration (cM)' },
  'complejos.clLabel': { es: 'Concentración total del ligando (cL)', en: 'Total ligand concentration (cL)' },
  'complejos.markEquilPL': { es: 'Marcar pL de equilibrio en diagramas', en: 'Mark equilibrium pL on diagrams' },
  'complejos.activityToggle': { es: 'Corrección de actividad (β′ a I > 0)', en: 'Activity correction (β′ at I > 0)' },
  'complejos.ionicStrengthLabel': { es: 'Fuerza iónica I', en: 'Ionic strength I' },
  'complejos.metalChargeLabel': { es: 'Carga del metal (zM)', en: 'Metal charge (zM)' },
  'complejos.ligandChargeLabel': { es: 'Carga del ligando (zL)', en: 'Ligand charge (zL)' },
  'complejos.activityHint': {
    es: 'log β′ᵢ = log βᵢ + log γ_M + i·log γ_L − log γ(MLᵢ), con z(MLᵢ) = zM + i·zL (Debye–Hückel extendida, a = 3 Å). Un ligando neutro (zL = 0) no corrige.',
    en: 'log β′ᵢ = log βᵢ + log γ_M + i·log γ_L − log γ(MLᵢ), with z(MLᵢ) = zM + i·zL (extended Debye–Hückel, a = 3 Å). A neutral ligand (zL = 0) needs no correction.',
  },
  'complejos.activityHintXBranch': { es: ' Las β de la rama X permanecen ideales.', en: ' The X branch\'s β values stay ideal.' },
  'complejos.secondAgentLabel': { es: 'Segundo agente complejante (X)', en: 'Second complexing agent (X)' },
  'complejos.sideModeNone': { es: 'Ninguna', en: 'None' },
  'complejos.sideModeRingbom': { es: 'pX′ (Ringbom)', en: 'pX′ (Ringbom)' },
  'complejos.sideModeCoupled': { es: 'X–M–L acoplada', en: 'Coupled X–M–L' },
  'complejos.fixedPHLabel': { es: 'pH fijo', en: 'Fixed pH' },
  'complejos.ringbomHint': { es: 'pX′ = pL + log α_M (hidrólisis + auxiliar) a pH fijo.', en: 'pX′ = pL + log α_M (hydrolysis + auxiliary) at fixed pH.' },
  'complejos.xLigandTitle': { es: 'Ligando X ({x}) — presets y log β', en: 'Ligand X ({x}) — presets and log β' },
  'complejos.enableAuxHint': {
    es: 'Activa el ligando auxiliar (X) con al menos un log β para acoplar la segunda rama.',
    en: 'Enable the auxiliary ligand (X) with at least one log β to couple the second branch.',
  },
  'complejos.xIsAgentBold': {
    es: 'X es un segundo agente complejante disuelto',
    en: 'X is a second dissolved complexing agent',
  },
  'complejos.xIsAgentRest': {
    es: '(NH₃, citrato, en…) que compite con {ligand} por el metal — no el disolvente (el agua ya está en los log β).',
    en: '(NH₃, citrate, en…) competing with {ligand} for the metal — not the solvent (water is already baked into the log β).',
  },
  'complejos.coupledHint': {
    es: 'Equilibrio acoplado: M se reparte entre {ligand} y X resolviendo ambos balances de masa simultáneamente — no es el corrimiento α de Ringbom. El pH solo interviene cuando X se da como total analítico con pKa.',
    en: 'Coupled equilibrium: M is split between {ligand} and X by solving both mass balances simultaneously — this is not the Ringbom α shift. pH only enters when X is given as an analytical total with a pKa.',
  },
  'complejos.pLEquilResult': { es: 'pL de equilibrio', en: 'Equilibrium pL' },
  'complejos.noSolution': { es: 'sin solución', en: 'no solution' },
  'complejos.noLigand': { es: 'sin ligando', en: 'no ligand' },
  'complejos.pXEquilResult': { es: 'pX de equilibrio', en: 'Equilibrium pX' },
  'complejos.nBarEquilResult': { es: 'n̄ en equilibrio', en: 'n̄ at equilibrium' },
  'complejos.dominantSpecies': { es: 'Especie dominante', en: 'Dominant species' },
  'complejos.howToReadTitle': { es: 'Cómo leer estos diagramas', en: 'How to read these diagrams' },
  'complejos.duzpExplain': {
    es: ': en cada tramo de pL domina una especie. La escala crece hacia la derecha (pL alto = poco ligando libre = metal sin complejarse).',
    en: ': one species dominates each pL range. The scale grows to the right (high pL = little free ligand = metal not yet complexed).',
  },
  'complejos.bjerrumExplainTitle': { es: 'Bjerrum n̄', en: 'Bjerrum n̄' },
  'complejos.bjerrumExplain': {
    es: ': número medio de ligandos coordinados; sus inflexiones ocurren cerca de cada log Kᵢ escalonada.',
    en: ': mean number of ligands bound (Bjerrum formation function); its inflections sit near each stepwise log Kᵢ.',
  },
  'complejos.alphaLogCTitle': { es: 'Distribución α / log C', en: 'α distribution / log C' },
  'complejos.alphaLogCExplain': {
    es: ': igual que en ácido-base pero sobre el eje pL. La línea rosa marca el pL del sistema real.',
    en: ': same as in acid-base but over the pL axis. The pink line marks the pL of the real system.',
  },
  'complejos.xmlTitle': { es: 'X–M–L acoplado', en: 'Coupled X–M–L' },
  'complejos.xmlExplain': {
    es: ': no se modelan especies mixtas MXL (supuesto estándar). La hidrólisis puede entrar como X = OH⁻ con pX fijo = 14 − pH.',
    en: ': mixed MXL species are not modeled (standard assumption). Hydrolysis can enter as X = OH⁻ with fixed pX = 14 − pH.',
  },
  'complejos.solventNote': {
    es: 'El agua como disolvente ya está incluida: los log β son relativos al acuocomplejo M(H₂O)ₙ. Un disolvente coordinante (ej. NH₃) se modela como X con concentración libre fija alta.',
    en: 'Water as solvent is already accounted for: the log β values are relative to the aqua complex M(H₂O)ₙ. A coordinating solvent (e.g. NH₃) is modeled as X with a high fixed free concentration.',
  },
  'complejos.pctFormed': { es: '% formado', en: '% formed' },
  'complejos.pctFree': { es: '% libre (disociado)', en: '% free (dissociated)' },
  'complejos.pctInX': { es: '% en {x}', en: '% in {x}' },
  'complejos.pLFor50': { es: 'pL para 50 %', en: 'pL for 50 %' },
  'complejos.pXEquilPH': { es: 'pX′ equilibrio', en: 'pX′ equilibrium' },
  'complejos.pLEquilPH': { es: 'pL equilibrio', en: 'pL equilibrium' },
  'complejos.pXEquilibrium': { es: 'pX equilibrio', en: 'pX equilibrium' },
  'complejos.nBarEquilibrium': { es: 'n̄ equilibrio', en: 'n̄ equilibrium' },
  'complejos.dominant': { es: 'Dominante', en: 'Dominant' },
  'complejos.tabEquil': { es: 'Equilibrio (pL)', en: 'Equilibrium (pL)' },
  'complejos.tabDUZP': { es: 'DUZP', en: 'DUZP' },
  'complejos.tabAlpha': { es: 'Distribución α', en: 'α distribution' },
  'complejos.tabBjerrum': { es: 'Bjerrum n̄', en: 'Bjerrum n̄' },
  'complejos.tabLogC': { es: 'log C', en: 'log C' },
  'complejos.tabMap2D': { es: 'Mapa 2D (pL–pX)', en: '2D map (pL–pX)' },
  'complejos.alphaFraction': { es: 'Fracción α', en: 'α fraction' },
  'complejos.duzpCaption': { es: 'Zonas de predominio', en: 'Predominance zones' },
  'complejos.bjerrumYTitle': { es: 'n̄ (ligandos coordinados)', en: 'n̄ (ligands bound)' },
  'complejos.map2dCaption': { es: 'Zonas de predominio en 2D', en: '2D predominance zones' },
  'complejos.map2dEquilLabel': { es: 'equilibrio', en: 'equilibrium' },
  'complejos.map2dEmptyPrefix': { es: 'Activa el modo', en: 'Enable the' },
  'complejos.map2dEmptyModeBold': { es: 'X–M–L acoplado', en: 'coupled X–M–L' },
  'complejos.map2dEmptyMid': {
    es: '(un segundo agente complejante con log β) para dibujar el mapa 2D pL–pX. Con un solo ligando la predominancia es 1D — usa la pestaña',
    en: 'mode (a second complexing agent with a log β) to draw the pL–pX 2D map. With a single ligand, predominance is 1D — use the',
  },
  'complejos.map2dEmptyOr': { es: 'o', en: 'or' },
  'complejos.map2dEmptySuffix': { es: '.', en: ' tab.' },
  'complejos.dbExamples': { es: 'Ejemplos de la base de datos', en: 'Database examples' },
  'complejos.equilMarker': { es: 'equil. · {axis} {value}', en: 'equil. · {axis} {value}' },
  'complejos.speciesFallback': { es: 'ML{n}', en: 'ML{n}' },

  // ── Especiación del metal module ───────────────────────────────────────────
  'especiacion.title': { es: 'Especiación del metal (M–OH–L{x} vs pH)', en: 'Metal speciation (M–OH–L{x} vs pH)' },
  'especiacion.metalHydrolysisSection': { es: 'Metal e hidrólisis', en: 'Metal and hydrolysis' },
  'especiacion.noHydrolysis': { es: 'sin hidrólisis modelada', en: 'no hydrolysis modeled' },
  'especiacion.hydrolysisUpTo': { es: 'hidrólisis hasta M(OH){n}', en: 'hydrolysis up to M(OH){n}' },
  'especiacion.complexationWith': { es: 'complejación con {ligand} hasta ML{n}', en: 'complexation with {ligand} up to ML{n}' },
  'especiacion.secondAgentUpTo': { es: 'segundo agente {x} hasta MX{n}', en: 'second agent {x} up to MX{n}' },
  'especiacion.exampleSystems': { es: 'Sistemas de ejemplo', en: 'Example systems' },
  'especiacion.auxLigandSectionTitle': { es: 'Ligando auxiliar M–L', en: 'Auxiliary ligand M–L' },
  'especiacion.auxLigandFieldLabel': { es: 'Ligando auxiliar', en: 'Auxiliary ligand' },
  'especiacion.auxLigandHint': {
    es: '{ligand} es un ligando disuelto que se une al metal (NH₃, citrato, en…). NH₃/NH₄⁺: pKa ≈ 9.25. Sin pKa: se asume el ligando ya libre (sin protonación).',
    en: '{ligand} is a dissolved ligand that binds the metal (NH₃, citrate, en…). NH₃/NH₄⁺: pKa ≈ 9.25. No pKa: the ligand is assumed already free (unprotonated).',
  },
  'especiacion.xIsAgentRest': {
    es: '(NH₃, citrato, en…) que compite con {ligand} por el metal. El disolvente (agua) no es X: ya está incluido en los log β.',
    en: '(NH₃, citrate, en…) competing with {ligand} for the metal. The solvent (water) is not X: it is already baked into the log β.',
  },
  'especiacion.coupledHint': {
    es: 'M se reparte entre OH⁻, {ligand} y X resolviendo los balances de masa acoplados en cada pH — sin especies mixtas (M(OH)L, MLX…). Si X se da como total analítico con pKa, su protonación entra vía α_X(H) a cada pH.',
    en: 'M is split between OH⁻, {ligand} and X by solving the coupled mass balances at each pH — no mixed species (M(OH)L, MLX…). If X is given as an analytical total with a pKa, its protonation enters via α_X(H) at each pH.',
  },
  'especiacion.speciesNamesSection': { es: 'Nombres de especies', en: 'Species names' },
  'especiacion.speciesPrefix': { es: 'Especie', en: 'Species' },
  'especiacion.speciesNamesHint': {
    es: 'Solo cambia cómo se muestran las especies en gráficas y resultados, no el cálculo. Editar una constante (log β, metal, ligando) restablece los nombres genéricos.',
    en: 'Only changes how species are shown in charts and results, not the calculation. Editing a constant (log β, metal, ligand) resets the generic names.',
  },
  'especiacion.readingSection': { es: 'Lectura', en: 'Reading' },
  'especiacion.readPHLabel': { es: 'pH de lectura', en: 'Read pH' },
  'especiacion.pLFree': { es: 'pL libre', en: 'Free pL' },
  'especiacion.pLFreeNoLigand': { es: '∞ (sin ligando)', en: '∞ (no ligand)' },
  'especiacion.pXFree': { es: 'pX libre', en: 'Free pX' },
  'especiacion.nBarLabel': { es: 'n̄ (L coordinados)', en: 'n̄ (L bound)' },
  'especiacion.pctBreakdownX': { es: '% M libre / hidroxo / L / X', en: '% free M / hydroxo / L / X' },
  'especiacion.pctBreakdownNoX': { es: '% M libre / hidroxo / L-complejado', en: '% free M / hydroxo / L-complexed' },
  'especiacion.noSolutionPart1': {
    es: '⚠ El balance de masa del ligando no tiene solución física a este pH (c',
    en: '⚠ The ligand mass balance has no physical solution at this pH (c',
  },
  'especiacion.noSolutionPart2': { es: ' insuficiente frente a c', en: ' insufficient relative to c' },
  'especiacion.noSolutionPart3': { es: '·n̄). Sube c', en: '·n̄). Raise c' },
  'especiacion.noSolutionPart4': { es: ' o baja c', en: ' or lower c' },
  'especiacion.noSolutionPart5': { es: '.', en: '.' },
  'especiacion.gapWarning': {
    es: '⚠ Algunos tramos de pH no tienen solución física — la curva muestra un hueco ahí.',
    en: '⚠ Some pH ranges have no physical solution — the curve shows a gap there.',
  },
  'especiacion.alphaExplainBody': {
    es: ': a cada pH se resuelven los ligandos libres (balances de masa) y el metal se reparte entre M libre, M(OH)ⱼ, MLᵢ y — si lo activas — MXₖ del segundo agente complejante; todas las ramas están acopladas por el mismo denominador.',
    en: ': at each pH the free ligands are solved (mass balances) and the metal is split between free M, M(OH)ⱼ, MLᵢ and — if enabled — MXₖ from the second complexing agent; all branches are coupled through the same denominator.',
  },
  'especiacion.duzpExplainBody': { es: ': qué especie domina en cada tramo de pH.', en: ': which species dominates each pH range.' },
  'especiacion.assumptionsTitle': { es: 'Supuestos', en: 'Assumptions' },
  'especiacion.assumptionsBody': {
    es: ': especie mononuclear (sin dímeros/polinucleares), sin fase sólida, actividades ≈ concentraciones.',
    en: ': mononuclear species (no dimers/polynuclear species), no solid phase, activities ≈ concentrations.',
  },
  'especiacion.dominantAtReadPH': { es: 'Dominante a pH lectura', en: 'Dominant at read pH' },
  'especiacion.pctFreeM': { es: '% M libre', en: '% free M' },
  'especiacion.pctHydroxo': { es: '% hidroxo', en: '% hydroxo' },
  'especiacion.pctLComplexed': { es: '% L-complejado', en: '% L-complexed' },
  'especiacion.pctXComplexed': { es: '% X-complejado', en: '% X-complexed' },
  'especiacion.nBarShort': { es: 'n̄', en: 'n̄' },
  'especiacion.tabMap2D': { es: 'Mapa 2D (pL–pH)', en: '2D map (pL–pH)' },
  'especiacion.map2dEmptyPrefix': { es: 'Activa un', en: 'Enable an' },
  'especiacion.map2dEmptyModeBold': { es: 'ligando auxiliar (M–L)', en: 'auxiliary ligand (M–L)' },
  'especiacion.map2dEmptyMid': {
    es: 'con al menos un log β para dibujar el mapa 2D pL–pH. Sin ligando, la especiación solo depende del pH — usa la pestaña',
    en: 'with at least one log β to draw the pL–pH 2D map. Without a ligand, speciation only depends on pH — use the',
  },
} satisfies Record<string, Record<Lang, string>>;

export type TKey = keyof typeof translations;
