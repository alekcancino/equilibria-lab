// Short, UI-facing definitions for the cryptic variables shown in control
// labels. Keyed by a stable id; rendered by <HelpTip> as an ⓘ tooltip. Only genuinely
// cryptic variables get an entry — obvious ones (pH, volumen) are left without help.
// Bilingual (es/en) — see src/i18n/translations.ts for the rest of the UI dictionary;
// this one stays separate since it's keyed by variable id, not a flat translation key.

import type { Lang } from '../hooks/useLanguage';

export interface GlossaryEntry {
  /** What the variable means, in one plain sentence. */
  meaning: Record<Lang, string>;
  /** Units, or "adimensional"/"dimensionless". */
  units: Record<Lang, string>;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  logBeta: {
    meaning: {
      es: 'Constante global de formación del complejo MLₙ (acumula todas las etapas).',
      en: 'Overall formation constant of the MLₙ complex (accumulates every step).',
    },
    units: { es: 'log β, adimensional', en: 'log β, dimensionless' },
  },
  logBetaOH: {
    meaning: {
      es: 'Constante de formación de los hidroxo-complejos del metal M(OH)ₖ (hidrólisis).',
      en: 'Formation constant of the metal\'s hydroxo-complexes M(OH)ₖ (hydrolysis).',
    },
    units: { es: 'log β, adimensional', en: 'log β, dimensionless' },
  },
  pKa: {
    meaning: {
      es: '−log de la constante de acidez. Cada pKa marca una frontera de predominio ácido-base.',
      en: '−log of the acidity constant. Each pKa marks an acid-base predominance boundary.',
    },
    units: { es: 'adimensional', en: 'dimensionless' },
  },
  pKsp: {
    meaning: {
      es: 'Producto de solubilidad como −log Kps. A mayor pKps, menos soluble es la sal.',
      en: 'Solubility product as −log Ksp. The higher pKsp, the less soluble the salt.',
    },
    units: { es: 'adimensional', en: 'dimensionless' },
  },
  logKf: {
    meaning: {
      es: 'Constante de formación del complejo M–Y (1:1), sin corregir por reacciones laterales.',
      en: 'Formation constant of the M–Y complex (1:1), not corrected for side reactions.',
    },
    units: { es: 'log Kf, adimensional', en: 'log Kf, dimensionless' },
  },
  logKprime: {
    meaning: {
      es: 'Constante condicional log K′ = f(pH): la estabilidad efectiva ya corregida por reacciones parásitas.',
      en: 'Conditional constant log K′ = f(pH): effective stability already corrected for side reactions.',
    },
    units: { es: 'adimensional', en: 'dimensionless' },
  },
  co: {
    meaning: {
      es: 'Concentración analítica total del complejante, en exceso sobre el metal.',
      en: 'Total analytical concentration of the complexing agent, in excess over the metal.',
    },
    units: { es: 'mol/L (M)', en: 'mol/L (M)' },
  },
  pXprime: {
    meaning: {
      es: 'p de la concentración condicional del ligando libre (−log[X′]), con reacciones laterales incluidas.',
      en: 'p of the conditional free-ligand concentration (−log[X′]), side reactions included.',
    },
    units: { es: 'adimensional', en: 'dimensionless' },
  },
  pMprime: {
    meaning: {
      es: 'p de la concentración condicional del metal libre (−log[M′]).',
      en: 'p of the conditional free-metal concentration (−log[M′]).',
    },
    units: { es: 'adimensional', en: 'dimensionless' },
  },
  E0: {
    meaning: {
      es: 'Potencial estándar del par redox frente al electrodo normal de hidrógeno.',
      en: 'Standard potential of the redox couple vs. the normal hydrogen electrode.',
    },
    units: { es: 'V (vs ENH)', en: 'V (vs NHE)' },
  },
  n: {
    meaning: {
      es: 'Número de electrones intercambiados en la semirreacción.',
      en: 'Number of electrons exchanged in the half-reaction.',
    },
    units: { es: 'adimensional', en: 'dimensionless' },
  },
  mH: {
    meaning: {
      es: 'Protones (H⁺) que participan en la semirreacción; fija la pendiente de E°′ frente al pH.',
      en: 'Protons (H⁺) involved in the half-reaction; sets the slope of E°′ vs. pH.',
    },
    units: { es: 'adimensional', en: 'dimensionless' },
  },
  alphaY: {
    meaning: {
      es: 'Fracción del ligando en su forma libre reactiva (coeficiente α de Ringbom).',
      en: 'Fraction of the ligand in its free reactive form (Ringbom α coefficient).',
    },
    units: { es: 'adimensional, 0–1', en: 'dimensionless, 0–1' },
  },
  Kd: {
    meaning: {
      es: 'Coeficiente de reparto del soluto neutro entre la fase orgánica y la acuosa.',
      en: 'Partition coefficient of the neutral solute between the organic and aqueous phases.',
    },
    units: { es: 'log Kd, adimensional', en: 'log Kd, dimensionless' },
  },
  Kex: {
    meaning: {
      es: 'Constante global del equilibrio de extracción (reparto + complejación + acidez).',
      en: 'Overall extraction equilibrium constant (partition + complexation + acidity).',
    },
    units: { es: 'log K_ex, adimensional', en: 'log K_ex, dimensionless' },
  },
  logK2: {
    meaning: {
      es: 'Constante de dimerización del quelato en la fase orgánica.',
      en: 'Dimerization constant of the chelate in the organic phase.',
    },
    units: { es: 'log K₂, adimensional', en: 'log K₂, dimensionless' },
  },
  Ksel: {
    meaning: {
      es: 'Coeficiente de selectividad de la resina entre los dos iones que compiten.',
      en: 'Resin selectivity coefficient between the two competing ions.',
    },
    units: { es: 'adimensional', en: 'dimensionless' },
  },
  K2HM: {
    meaning: {
      es: 'Coeficiente de selectividad condicional H/M del intercambio iónico.',
      en: 'Conditional H/M selectivity coefficient of the ion exchange.',
    },
    units: { es: 'adimensional', en: 'dimensionless' },
  },
  capacity: {
    meaning: {
      es: 'Capacidad de intercambio de la resina por unidad de volumen.',
      en: 'Exchange capacity of the resin per unit volume.',
    },
    units: { es: 'eq/L', en: 'eq/L' },
  },
  ionicStrength: {
    meaning: {
      es: 'Fuerza iónica del medio; gobierna los coeficientes de actividad (Debye–Hückel).',
      en: 'Ionic strength of the medium; governs the activity coefficients (Debye–Hückel).',
    },
    units: { es: 'mol/L (M)', en: 'mol/L (M)' },
  },
  logKprotonation: {
    meaning: {
      es: 'Constante de protonación del complejo (MY + H⁺ ⇌ MHY).',
      en: 'Protonation constant of the complex (MY + H⁺ ⇌ MHY).',
    },
    units: { es: 'log K, adimensional', en: 'log K, dimensionless' },
  },
  logBetaHydroxy: {
    meaning: {
      es: 'Constante del complejo hidroxo mixto (MY + OH⁻ ⇌ MOHY).',
      en: 'Constant of the mixed hydroxo complex (MY + OH⁻ ⇌ MOHY).',
    },
    units: { es: 'log β, adimensional', en: 'log β, dimensionless' },
  },
  ligFree: {
    meaning: {
      es: 'Concentración de equilibrio de la forma libre (no complejada) del agente complejante, ya descontada su protonación.',
      en: 'Equilibrium concentration of the free (uncomplexed) form of the complexing agent, already net of its protonation.',
    },
    units: { es: 'mol/L (M)', en: 'mol/L (M)' },
  },
  Kref: {
    meaning: {
      es: 'Constante del electrodo de vidrio: potencial de referencia que agrupa la asimetría del electrodo y el potencial de unión líquida. E = K_ref − 59.16·pH·S.',
      en: 'Glass electrode constant: reference potential lumping electrode asymmetry and the liquid-junction potential. E = K_ref − 59.16·pH·S.',
    },
    units: { es: 'mV', en: 'mV' },
  },
  pKwApp: {
    meaning: {
      es: 'Kw corregido por fuerza iónica: K′w = Kw/(γH⁺·γOH⁻). Como γ < 1, K′w crece (pK′w baja) al aumentar I.',
      en: 'Kw corrected for ionic strength: K′w = Kw/(γH⁺·γOH⁻). Since γ < 1, K′w grows (pK′w drops) as I increases.',
    },
    units: { es: 'adimensional', en: 'dimensionless' },
  },
  KspPrime: {
    meaning: {
      es: 'Producto de solubilidad condicional: Kps′ = Kps/(αM·αX), ya corregido por reacciones laterales del catión y/o del anión.',
      en: 'Conditional solubility product: Ksp′ = Ksp/(αM·αX), already corrected for cation and/or anion side reactions.',
    },
    units: { es: 'adimensional', en: 'dimensionless' },
  },
  duzp: {
    meaning: {
      es: 'Diagrama Unidimensional de Zonas de Predominio: cada tramo del eje muestra qué especie domina; las fronteras están en los pKa/pM/pL.',
      en: 'One-dimensional Predominance Zone Diagram: each stretch of the axis shows which species dominates; boundaries sit at the pKa/pM/pL values.',
    },
    units: { es: 'n/a', en: 'n/a' },
  },
  gran: {
    meaning: {
      es: 'Función de Gran: transforma la curva de titulación en un tramo lineal cuyo cruce con cero da el volumen de equivalencia experimental.',
      en: 'Gran function: transforms the titration curve into a linear stretch whose zero-crossing gives the experimental equivalence volume.',
    },
    units: { es: 'n/a', en: 'n/a' },
  },
  Eprime: {
    meaning: {
      es: 'Potencial normal condicional: E°′ = E° − S·(mH/n)·pH, ya corregido por el efecto del pH sobre la semirreacción.',
      en: 'Conditional formal potential: E°′ = E° − S·(mH/n)·pH, already corrected for the effect of pH on the half-reaction.',
    },
    units: { es: 'V (vs ENH)', en: 'V (vs NHE)' },
  },
};
