import { useState } from 'react';
import { useSavedSystems } from '../hooks/useSavedSystems';
import { useT } from '../hooks/useT';

/**
 * "Mis sistemas" — save/load named snapshots of the current scenario.
 * Piggybacks on the same shareable URL ShareButton copies (kept in sync by
 * useShareEffect/useShareableState): saving stores it under a name, loading
 * navigates to it so restoration goes through each module's normal
 * share-link parsing, with no separate persistence logic to keep in sync.
 */
export default function SavedSystemsButton({ moduleId }: { moduleId: string }) {
  const t = useT();
  const { systems, save, remove, load } = useSavedSystems(moduleId);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

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

  return (
    <details className="saved-systems" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="share-btn" title={t('saved.button')} aria-label={t('saved.button')}>
        ✦ {t('saved.buttonShort')}{systems.length > 0 ? ` (${systems.length})` : ''}
      </summary>
      <div className="saved-systems-menu">
        <div className="saved-systems-save">
          <input
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
        {saveError && <p className="hint saved-systems-error" role="alert">{t('saved.failed')}</p>}
        {systems.length === 0 ? (
          <p className="hint">{t('saved.empty')}</p>
        ) : (
          <ul className="saved-systems-list">
            {systems.map((s) => (
              <li key={s.id}>
                <button type="button" className="saved-systems-load" onClick={() => load(s)}>
                  <span>{s.name}</span>
                  <span className="saved-systems-date">{new Date(s.savedAt).toLocaleDateString()}</span>
                </button>
                <button
                  type="button"
                  className="mini-btn"
                  title={t('saved.delete')}
                  onClick={() => { if (!remove(s.id)) setSaveError(true); }}
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
