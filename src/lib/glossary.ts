// Short, UI-facing definitions (Spanish) for the cryptic variables shown in control
// labels. Keyed by a stable id; rendered by <HelpTip> as an ⓘ tooltip. Only genuinely
// cryptic variables get an entry — obvious ones (pH, volumen) are left without help.

export interface GlossaryEntry {
  /** What the variable means, in one plain sentence. */
  meaning: string;
  /** Units, or "adimensional". */
  units: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  logBeta: {
    meaning: 'Constante global de formación del complejo MLₙ (acumula todas las etapas).',
    units: 'log β, adimensional',
  },
  logBetaOH: {
    meaning: 'Constante de formación de los hidroxo-complejos del metal M(OH)ₖ (hidrólisis).',
    units: 'log β, adimensional',
  },
  pKa: {
    meaning: '−log de la constante de acidez. Cada pKa marca una frontera de predominio ácido-base.',
    units: 'adimensional',
  },
  pKsp: {
    meaning: 'Producto de solubilidad como −log Kps. A mayor pKps, menos soluble es la sal.',
    units: 'adimensional',
  },
  logKf: {
    meaning: 'Constante de formación del complejo M–Y (1:1), sin corregir por reacciones laterales.',
    units: 'log Kf, adimensional',
  },
  logKprime: {
    meaning: 'Constante condicional log K′ = f(pH): la estabilidad efectiva ya corregida por reacciones parásitas.',
    units: 'adimensional',
  },
  co: {
    meaning: 'Concentración analítica total del complejante, en exceso sobre el metal.',
    units: 'mol/L (M)',
  },
  pXprime: {
    meaning: 'p de la concentración condicional del ligando libre (−log[X′]), con reacciones laterales incluidas.',
    units: 'adimensional',
  },
  pMprime: {
    meaning: 'p de la concentración condicional del metal libre (−log[M′]).',
    units: 'adimensional',
  },
  E0: {
    meaning: 'Potencial estándar del par redox frente al electrodo normal de hidrógeno.',
    units: 'V (vs ENH)',
  },
  n: {
    meaning: 'Número de electrones intercambiados en la semirreacción.',
    units: 'adimensional',
  },
  mH: {
    meaning: 'Protones (H⁺) que participan en la semirreacción; fija la pendiente de E°′ frente al pH.',
    units: 'adimensional',
  },
  alphaY: {
    meaning: 'Fracción del ligando en su forma libre reactiva (coeficiente α de Ringbom).',
    units: 'adimensional, 0–1',
  },
  Kd: {
    meaning: 'Coeficiente de reparto del soluto neutro entre la fase orgánica y la acuosa.',
    units: 'log Kd, adimensional',
  },
  Kex: {
    meaning: 'Constante global del equilibrio de extracción (reparto + complejación + acidez).',
    units: 'log K_ex, adimensional',
  },
  logK2: {
    meaning: 'Constante de dimerización del quelato en la fase orgánica.',
    units: 'log K₂, adimensional',
  },
  Ksel: {
    meaning: 'Coeficiente de selectividad de la resina entre los dos iones que compiten.',
    units: 'adimensional',
  },
  K2HM: {
    meaning: 'Coeficiente de selectividad condicional H/M del intercambio iónico.',
    units: 'adimensional',
  },
  capacity: {
    meaning: 'Capacidad de intercambio de la resina por unidad de volumen.',
    units: 'eq/L',
  },
  ionicStrength: {
    meaning: 'Fuerza iónica del medio; gobierna los coeficientes de actividad (Debye–Hückel).',
    units: 'mol/L (M)',
  },
  logKprotonation: {
    meaning: 'Constante de protonación del complejo (MY + H⁺ ⇌ MHY).',
    units: 'log K, adimensional',
  },
  logBetaHydroxy: {
    meaning: 'Constante del complejo hidroxo mixto (MY + OH⁻ ⇌ MOHY).',
    units: 'log β, adimensional',
  },
  ligFree: {
    meaning: 'Concentración de equilibrio de la forma libre (no complejada) del agente complejante, ya descontada su protonación.',
    units: 'mol/L (M)',
  },
  Kref: {
    meaning: 'Constante del electrodo de vidrio: potencial de referencia que agrupa la asimetría del electrodo y el potencial de unión líquida. E = K_ref − 59.16·pH·S.',
    units: 'mV',
  },
  pKwApp: {
    meaning: 'Kw corregido por fuerza iónica: K′w = Kw/(γH⁺·γOH⁻). Como γ < 1, K′w crece (pK′w baja) al aumentar I.',
    units: 'adimensional',
  },
  KspPrime: {
    meaning: 'Producto de solubilidad condicional: Kps′ = Kps/(αM·αX), ya corregido por reacciones laterales del catión y/o del anión.',
    units: 'adimensional',
  },
  duzp: {
    meaning: 'Diagrama Unidimensional de Zonas de Predominio: cada tramo del eje muestra qué especie domina; las fronteras están en los pKa/pM/pL.',
    units: 'n/a',
  },
  gran: {
    meaning: 'Función de Gran: transforma la curva de titulación en un tramo lineal cuyo cruce con cero da el volumen de equivalencia experimental.',
    units: 'n/a',
  },
  Eprime: {
    meaning: 'Potencial normal condicional: E°′ = E° − S·(mH/n)·pH, ya corregido por el efecto del pH sobre la semirreacción.',
    units: 'V (vs ENH)',
  },
};
