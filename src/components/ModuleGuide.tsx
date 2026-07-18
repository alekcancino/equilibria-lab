import { useId, useState } from 'react';
import { useT } from '../hooks/useT';
import type { TKey } from '../i18n/translations';

export type ModuleGuideId =
  | 'acidobase'
  | 'actividad'
  | 'complejos'
  | 'condicionalesedta'
  | 'especiacion'
  | 'extraccion'
  | 'ionexchange'
  | 'mezclas'
  | 'potencialcond'
  | 'pourbaix'
  | 'redox'
  | 'solcomp'
  | 'solcond'
  | 'solsal'
  | 'solubilidad'
  | 'titulacion-acidobase'
  | 'titulacion-edta'
  | 'titulacion-potenciometrica'
  | 'titulacion-precipitacion'
  | 'titulacion-redox';

const guideKeys: Record<ModuleGuideId, { objective: TKey; workflow: TKey }> = {
  acidobase: { objective: 'guide.acidobase.objective', workflow: 'guide.acidobase.workflow' },
  actividad: { objective: 'guide.actividad.objective', workflow: 'guide.actividad.workflow' },
  complejos: { objective: 'guide.complejos.objective', workflow: 'guide.complejos.workflow' },
  condicionalesedta: { objective: 'guide.condicionalesedta.objective', workflow: 'guide.condicionalesedta.workflow' },
  especiacion: { objective: 'guide.especiacion.objective', workflow: 'guide.especiacion.workflow' },
  extraccion: { objective: 'guide.extraccion.objective', workflow: 'guide.extraccion.workflow' },
  ionexchange: { objective: 'guide.ionexchange.objective', workflow: 'guide.ionexchange.workflow' },
  mezclas: { objective: 'guide.mezclas.objective', workflow: 'guide.mezclas.workflow' },
  potencialcond: { objective: 'guide.potencialcond.objective', workflow: 'guide.potencialcond.workflow' },
  pourbaix: { objective: 'guide.pourbaix.objective', workflow: 'guide.pourbaix.workflow' },
  redox: { objective: 'guide.redox.objective', workflow: 'guide.redox.workflow' },
  solcomp: { objective: 'guide.solcomp.objective', workflow: 'guide.solcomp.workflow' },
  solcond: { objective: 'guide.solcond.objective', workflow: 'guide.solcond.workflow' },
  solsal: { objective: 'guide.solsal.objective', workflow: 'guide.solsal.workflow' },
  solubilidad: { objective: 'guide.solubilidad.objective', workflow: 'guide.solubilidad.workflow' },
  'titulacion-acidobase': { objective: 'guide.titulacionAcidobase.objective', workflow: 'guide.titulacionAcidobase.workflow' },
  'titulacion-edta': { objective: 'guide.titulacionEdta.objective', workflow: 'guide.titulacionEdta.workflow' },
  'titulacion-potenciometrica': { objective: 'guide.titulacionPotenciometrica.objective', workflow: 'guide.titulacionPotenciometrica.workflow' },
  'titulacion-precipitacion': { objective: 'guide.titulacionPrecipitacion.objective', workflow: 'guide.titulacionPrecipitacion.workflow' },
  'titulacion-redox': { objective: 'guide.titulacionRedox.objective', workflow: 'guide.titulacionRedox.workflow' },
};

export default function ModuleGuide({ id }: { id: ModuleGuideId }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const workflowId = useId();
  const keys = guideKeys[id];

  return (
    <section className="module-guide" aria-label={t('guide.label')}>
      <p className="module-guide-objective">{t(keys.objective)}</p>
      <button
        type="button"
        className="module-guide-toggle"
        aria-expanded={open}
        aria-controls={workflowId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{t('guide.howToUse')}</span>
        <span className="ui-chevron" aria-hidden />
      </button>
      {open && (
        <div id={workflowId} className="module-guide-workflow">
          <span className="module-guide-sequence" aria-hidden>
            {t('guide.define')} → {t('guide.interpret')} → {t('guide.extend')}
          </span>
          <p>{t(keys.workflow)}</p>
        </div>
      )}
    </section>
  );
}
