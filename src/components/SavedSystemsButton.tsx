import { useId, useMemo, useState } from 'react';
import { useSavedSystems, type SavedSystem } from '../hooks/useSavedSystems';
import { useT } from '../hooks/useT';
import { useLanguage } from '../hooks/useLanguage';

/**
 * "Mis sistemas" — save/load named snapshots of the current scenario.
 * Piggybacks on the same shareable URL ShareButton copies (kept in sync by
 * useShareEffect/useShareableState): saving stores it under a name, loading
 * navigates to it so restoration goes through each module's normal
 * share-link parsing, with no separate persistence logic to keep in sync.
 */
export default function SavedSystemsButton({ moduleId }: { moduleId: string }) {
  const t = useT();
  const lang = useLanguage();
  const { systems, save, remove, restore, load } = useSavedSystems(moduleId);
  const nameId = useId();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [removed, setRemoved] = useState<SavedSystem | null>(null);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { dateStyle: 'medium' }),
    [lang],
  );

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(false);
    const persisted = await save(name);
    setSaving(false);
    if (persisted) {
      setName('');
      return;
    }
    setSaveError(true);
    window.setTimeout(() => setSaveError(false), 4000);
  };

  const handleRemove = (system: SavedSystem) => {
    if (remove(system.id)) {
      setRemoved(system);
      setSaveError(false);
      return;
    }
    setSaveError(true);
  };

  const handleUndo = () => {
    if (!removed) return;
    if (restore(removed)) {
      setRemoved(null);
      setSaveError(false);
      return;
    }
    setSaveError(true);
  };

  return (
    <details className="saved-systems" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="share-btn" title={t('saved.button')} aria-label={t('saved.button')}>
        ✦ {t('saved.buttonShort')}{systems.length > 0 ? ` (${systems.length})` : ''}
      </summary>
      <div className="saved-systems-menu">
        <label className="saved-systems-label" htmlFor={nameId}>{t('saved.nameLabel')}</label>
        <div className="saved-systems-save">
          <input
            id={nameId}
            type="text"
            className="text-field"
            placeholder={t('saved.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }}
          />
          <button type="button" className="add-btn" onClick={() => void handleSave()} disabled={!name.trim() || saving}>
            {saving ? t('saved.saving') : t('saved.save')}
          </button>
        </div>
        {removed && (
          <div className="saved-systems-undo" role="status">
            <span>{t('saved.deletedNamed', { name: removed.name })}</span>
            <button type="button" onClick={handleUndo}>{t('saved.undo')}</button>
          </div>
        )}
        {saveError && <p className="hint saved-systems-error" role="alert">{t('saved.failed')}</p>}
        {systems.length === 0 ? (
          <p className="hint">{t('saved.empty')}</p>
        ) : (
          <ul className="saved-systems-list">
            {systems.map((s) => (
              <li key={s.id}>
                <button type="button" className="saved-systems-load" onClick={() => load(s)}>
                  <span>{s.name}</span>
                  <span className="saved-systems-date">{dateFormatter.format(new Date(s.savedAt))}</span>
                </button>
                <button
                  type="button"
                  className="mini-btn"
                  title={t('saved.deleteNamed', { name: s.name })}
                  aria-label={t('saved.deleteNamed', { name: s.name })}
                  onClick={() => handleRemove(s)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
