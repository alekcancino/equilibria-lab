// Shared editors following the standard UI pattern:
// PRIMARY = free label + editable constants with ± buttons.
// SECONDARY = collapsible database that auto-fills and closes.

import { ConstantList, DbPanel, HelpTip, LabelField, ModelBadge, Segmented, SelectControl, Slider, ConcSlider } from './Controls';
import { useT } from '../hooks/useT';
import { useLanguage } from '../hooks/useLanguage';
import type { TKey } from '../i18n/translations';
import { ACIDS } from '../lib/database';
import { REDOX_COUPLES } from '../lib/redoxDatabase';
import { COMPLEX_PRESETS } from '../lib/complexDatabase';
import {
  acidSystemFromPreset, coupleFromPreset, inferredSystemLabel, isGenericSystemLabel,
  type AcidSystem, type CoupleState,
} from '../lib/editorModels';
import type { SideReactionEditorState } from '../lib/sideReactions';

export function AcidSystemEditor({
  system, onChange, includeStrong = false, allowNoConstants = false, showModel = true,
  allowAquaCations = false,
}: {
  system: AcidSystem;
  onChange: (s: AcidSystem) => void;
  includeStrong?: boolean;
  allowNoConstants?: boolean;
  showModel?: boolean;
  /** Expose z0=+3 (aqua-acid cations, Fe³⁺/Al³⁺) and their presets. Defaults
   * to false since not every AcidSystemEditor caller wants cationic acids
   * in its dropdown; AcidoBase.tsx, Titulacion.tsx and Mezclas.tsx opt in
   * explicitly (their engines handle the counter-anion these need via
   * saltCounterIons/defaultStartIndex in equilibrium.ts). */
  allowAquaCations?: boolean;
}) {
  const t = useT();
  const lang = useLanguage();
  const presets = ACIDS.filter((a) => (includeStrong || !a.strong) && (allowAquaCations || !a.aquaCation));
  // z0 > 0 alone doesn't mean "base": an aqua-acid cation (Fe³⁺, Al³⁺, z0=+3)
  // is chemically an acid even though its most-protonated form is cationic.
  // The tell is whether the modeled pKas actually reach a neutral species
  // (charge 0) — a protonated base (BH⁺/B, BH₂²⁺/BH⁺/B…) always does; an
  // aqua-acid with only its first hydrolysis step modeled stays cationic.
  const role = system.z0 > 0 && system.z0 - system.pKas.length <= 0
    ? t('acidSystemEditor.roleBase')
    : t('acidSystemEditor.roleAcid');
  const classification = system.pKas.length === 0
    ? t('acidSystemEditor.classStrong', { role })
    : system.pKas.length === 1
      ? t('acidSystemEditor.classWeak', { role })
      : t('acidSystemEditor.classPolyprotic', { role, n: system.pKas.length });
  return (
    <div className="editor">
      <LabelField
        label={t('acidSystemEditor.systemLabel')}
        value={system.label}
        onChange={(label) => onChange({ ...system, label })}
      />
      {showModel && <ModelBadge model={classification} />}
      {allowNoConstants && system.pKas.length === 0 && (
        <p className="hint">{t('acidSystemEditor.noConstantsHint')}</p>
      )}
      <ConstantList
        prefix="pKa"
        helpId="pKa"
        values={system.pKas}
        min={-2}
        max={35}
        // An aqua-acid cation (z0≥3) with zero pKas is chemically ill-defined
        // (no charge/anion convention applies) and downstream analyteKind
        // classification (Titulacion.tsx) special-cases only z0=1 as "strong
        // base" — never let the pKa list empty out for these.
        minItems={system.z0 >= 3 ? 1 : allowNoConstants ? 0 : 1}
        initialValue={system.z0 > 0 ? 9.25 : 4.76}
        onChange={(pKas) => {
          const shouldRename = allowNoConstants && isGenericSystemLabel(system.label);
          onChange({
            ...system,
            label: shouldRename ? inferredSystemLabel(system.z0, pKas, lang) : system.label,
            pKas,
            // if the number of constants changed, database labels no longer apply
            speciesLabels: pKas.length === system.pKas.length ? system.speciesLabels : null,
            reference: null,
          });
        }}
      />
      <details className="section-collapse">
        <summary className="section-collapse-title">{t('acidSystemEditor.systemTypeSummary')}<span className="ui-chevron" aria-hidden /></summary>
        <SelectControl
          label={t('acidSystemEditor.z0Label')}
          value={String(system.z0)}
          options={[
            { value: '0', label: t('acidSystemEditor.z0Option0') },
            { value: '1', label: t('acidSystemEditor.z0Option1') },
            { value: '2', label: t('acidSystemEditor.z0Option2') },
            ...(allowAquaCations ? [{ value: '3', label: t('acidSystemEditor.z0Option3') }] : []),
          ]}
          onChange={(v) => {
            const z0 = parseInt(v, 10);
            onChange({
              ...system,
              z0,
              label: allowNoConstants && isGenericSystemLabel(system.label)
                ? inferredSystemLabel(z0, system.pKas, lang)
                : system.label,
              speciesLabels: null,
              reference: null,
            });
          }}
        />
        <p className="hint">{t('acidSystemEditor.z0Hint')}</p>
      </details>
      <DbPanel
        items={presets.map((a) => ({
          id: a.id,
          label: a.formula,
          detail: a.strong
            ? `${t(`acidPreset.${a.id}` as TKey)} · ${t('acidSystemEditor.completeDissociation')}`
            : `${t(`acidPreset.${a.id}` as TKey)} · pKa ${a.pKas.map((k) => k.toFixed(2)).join(', ')}`,
          group: a.strong
            ? t('acidSystemEditor.groupStrong')
            : a.isBase
              ? t('acidSystemEditor.groupBases')
              : a.pKas.length > 1
                ? t('acidSystemEditor.groupPolyprotic')
                : t('acidSystemEditor.groupMonoprotic'),
        }))}
        onSelect={(id) => onChange(acidSystemFromPreset(id, allowNoConstants))}
      />
    </div>
  );
}

export function CoupleEditor({
  title, couple, onChange,
}: {
  title: string;
  couple: CoupleState;
  onChange: (c: CoupleState) => void;
}) {
  const t = useT();
  const edited = (patch: Partial<CoupleState>) =>
    onChange({ ...couple, ...patch, reference: '', caveat: undefined, name: patch.name ?? couple.name });
  return (
    <div className="editor">
      <p className="editor-title">{title}</p>
      <LabelField
        label={t('coupleEditor.nameLabel')}
        value={couple.name}
        onChange={(name) => onChange({ ...couple, name })}
      />
      <Slider label={t('coupleEditor.e0Label')} value={couple.E0} min={-1} max={2} step={0.01} onChange={(E0) => edited({ E0 })} decimals={2} unit="V" helpId="E0" />
      <Slider label={t('coupleEditor.nLabel')} value={couple.n} min={1} max={6} step={1} onChange={(n) => edited({ n })} decimals={0} helpId="n" />
      <Slider label={t('coupleEditor.mHLabel')} value={couple.mH} min={0} max={14} step={1} onChange={(mH) => edited({ mH })} decimals={0} helpId="mH" />
      {couple.caveat && <p className="badge warn">⚠ {couple.caveat}</p>}
      <DbPanel
        items={REDOX_COUPLES.map((c) => ({
          id: c.id,
          label: `${c.ox}/${c.red}`,
          detail: `E° ${c.E0.toFixed(3)} V · n=${c.n}${c.mH ? ` · ${c.mH}H⁺` : ''}`,
        }))}
        onSelect={(id) => onChange(coupleFromPreset(id))}
      />
    </div>
  );
}

/** Reusable side-reaction (Ringbom) editor. */
export function SideReactionEditor({
  state,
  onChange,
  showLigandPKas = true,
  ligandTitle,
  auxLigandTitle,
  showComplexSection = true,
  showHydrolysisSection = true,
}: {
  state: SideReactionEditorState;
  onChange: (s: SideReactionEditorState) => void;
  showLigandPKas?: boolean;
  ligandTitle?: string;
  /** The default "α_M(L)" name is only accurate for the Ringbom axis-shift
   * use of this section; callers that consume it as a real second
   * complexation branch (Complejos' coupled X-M-L mode) should override it —
   * "α_M(L)" would misleadingly claim this is still just a side-reaction
   * coefficient. */
  auxLigandTitle?: string;
  /** Hide "Protonación / hidrólisis del complejo MY" — that section only
   * affects the product coefficient α_MY (via alphaComplex), which is meaningless where there's no
   * primary M–Y complex (e.g. a bare redox Ox/Red side-reaction stack). */
  showComplexSection?: boolean;
  /** Hide "Hidrólisis del metal α_M(OH)" — the coupled X-M-L engine only
   * consumes the auxiliary-ligand section (OH enters as X with fixed pX). */
  showHydrolysisSection?: boolean;
}) {
  const t = useT();
  const set = <K extends keyof SideReactionEditorState>(k: K, v: SideReactionEditorState[K]) =>
    onChange({ ...state, [k]: v });

  // Concentration/species labels below name the actual agent (e.g. "[NH₃] libre")
  // instead of a hardcoded "[L]" — otherwise, when this editor drives the X branch
  // (Complejos coupled, Especiación), the concentration reads as the primary ligand.
  const aux = state.auxLabel.trim() || 'X';

  return (
    <>
      {showLigandPKas && (
        <details className="section-collapse">
          <summary className="section-collapse-title">{ligandTitle ?? t('sideReactionEditor.ligandPKasTitle')}<span className="ui-chevron" aria-hidden /></summary>
          <ConstantList
            prefix="pKa"
            helpId="pKa"
            values={state.ligandPKas}
            onChange={(v) => set('ligandPKas', v)}
            min={0}
            max={14}
            maxItems={8}
            minItems={0}
            initialValue={4.76}
          />
        </details>
      )}

      {showHydrolysisSection && (
      <details
        className="section-collapse"
        open={state.showOH}
        onToggle={(e) => set('showOH', (e.target as HTMLDetailsElement).open)}
      >
        <summary className="section-collapse-title">{t('sideReactionEditor.hydrolysisTitle')}<span className="ui-chevron" aria-hidden /></summary>
        <ConstantList
          prefix="log β(OH)"
          helpId="logBetaOH"
          values={state.logBetasOH}
          onChange={(v) => {
            set('logBetasOH', v);
            if (!state.showOH) set('showOH', true);
          }}
          min={-50}
          max={40}
          maxItems={6}
          minItems={0}
          initialValue={5}
        />
      </details>
      )}

      <details
        className="section-collapse"
        open={state.showAux}
        onToggle={(e) => set('showAux', (e.target as HTMLDetailsElement).open)}
      >
        <summary className="section-collapse-title">{auxLigandTitle ?? t('sideReactionEditor.auxLigandTitleDefault')}<span className="ui-chevron" aria-hidden /></summary>
        <p className="hint compact-hint">{t('sideReactionEditor.presetsLabel')}</p>
        <div className="preset-chip-row preset-chip-row-spaced">
          {COMPLEX_PRESETS.map((cp) => (
            <button type="button"
              key={cp.id}
              className="preset-chip"
              title={`log β: [${cp.logBetas.join(', ')}]`}
              onClick={() => {
                onChange({
                  ...state,
                  auxLabel: cp.ligandLabel,
                  logBetasAux: [...cp.logBetas],
                  showAux: true,
                });
              }}
            >
              {cp.metalLabel}/{cp.ligandLabel}
            </button>
          ))}
        </div>
        <LabelField label={t('sideReactionEditor.agentName')} value={state.auxLabel} onChange={(v) => set('auxLabel', v)} />
        <ConstantList
          prefix="log β"
          helpId="logBeta"
          values={state.logBetasAux}
          onChange={(v) => set('logBetasAux', v)}
          min={0}
          max={25}
          maxItems={6}
        />
        <div className="control">
          <div className="control-header">
            <span className="control-label">{t('sideReactionEditor.howMuchDissolved', { aux })}</span>
            <HelpTip id="ligFree" />
          </div>
          <div className="control-input">
            <Segmented
              ariaLabel={t('sideReactionEditor.howMuchDissolved', { aux })}
              options={([
                { value: 'free', label: t('sideReactionEditor.free', { aux }) },
                { value: 'total', label: t('sideReactionEditor.total') },
                { value: 'fixedPX', label: t('sideReactionEditor.fixedPX') },
              ])}
              value={state.auxSpecMode}
              onChange={(value) => set('auxSpecMode', value as SideReactionEditorState['auxSpecMode'])}
            />
          </div>
          <p className="hint">
            <strong>{t('sideReactionEditor.free', { aux })}</strong>{t('sideReactionEditor.specModeFreeBody')}{' '}
            <strong>{t('sideReactionEditor.total')}</strong>{t('sideReactionEditor.specModeTotalBody')}{' '}
            <strong>{t('sideReactionEditor.fixedPX')}</strong>{t('sideReactionEditor.specModeFixedBody', { aux })}
          </p>
        </div>
        {state.auxSpecMode === 'free' && (
          <ConcSlider label={t('sideReactionEditor.freeConcLabel', { aux })} helpId="ligFree" value={state.cAuxFree} onChange={(v) => set('cAuxFree', v)} />
        )}
        {state.auxSpecMode === 'total' && (
          <>
            <ConcSlider label={t('sideReactionEditor.totalAddedLabel', { aux })} value={state.cAuxTotal} onChange={(v) => set('cAuxTotal', v)} min={-3} max={1} />
            <ConstantList
              prefix={t('sideReactionEditor.conjugateAcidPrefix')}
              helpId="pKa"
              values={state.auxPKas}
              onChange={(v) => set('auxPKas', v)}
              min={0}
              max={14}
              maxItems={4}
              minItems={1}
              initialValue={9.2}
            />
            <p className="hint">{t('sideReactionEditor.nh3Hint')}</p>
          </>
        )}
        {state.auxSpecMode === 'fixedPX' && (
          <Slider label={t('sideReactionEditor.targetPX', { aux })} helpId="pXprime" value={state.pXFixed} min={0} max={14} step={0.1} onChange={(v) => set('pXFixed', v)} decimals={1} />
        )}
      </details>

      {showComplexSection && (
        <details
          className="section-collapse"
          open={state.showComplex}
          onToggle={(e) => set('showComplex', (e.target as HTMLDetailsElement).open)}
        >
          <summary className="section-collapse-title">{t('sideReactionEditor.complexProtonationTitle')}<span className="ui-chevron" aria-hidden /></summary>
          <Slider
            label="log K (MY + H⁺ ⇌ MHY)"
            helpId="logKprotonation"
            value={state.logBetaProtonation ?? 0}
            min={0}
            max={30}
            step={0.01}
            onChange={(v) => {
              set('logBetaProtonation', v);
              if (!state.showComplex) set('showComplex', true);
            }}
            decimals={2}
          />
          <Slider
            label="log β (MY + OH⁻ ⇌ MOHY)"
            helpId="logBetaHydroxy"
            value={state.logBetaHydroxy ?? 0}
            min={-10}
            max={20}
            step={0.01}
            onChange={(v) => {
              set('logBetaHydroxy', v);
              if (!state.showComplex) set('showComplex', true);
            }}
            decimals={2}
          />
          <p className="hint">{t('sideReactionEditor.complexHint')}</p>
        </details>
      )}
    </>
  );
}
