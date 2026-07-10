import { useState } from 'react';
import { useSavedSystems } from '../hooks/useSavedSystems';

/**
 * "Mis sistemas" — save/load named snapshots of the current scenario.
 * Piggybacks on the same shareable URL ShareButton copies (kept in sync by
 * useShareEffect/useShareableState): saving stores it under a name, loading
 * navigates to it so restoration goes through each module's normal
 * share-link parsing, with no separate persistence logic to keep in sync.
 */
export default function SavedSystemsButton({ moduleId }: { moduleId: string }) {
  const { systems, save, remove, load } = useSavedSystems(moduleId);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    setSaving(true);
    save(name);
    setName('');
    // save() itself is debounce-delayed (see useSavedSystems) — clear the
    // "Guardando…" state a bit after it settles rather than track its
    // completion, which would need threading a callback through the hook.
    window.setTimeout(() => setSaving(false), 500);
  };

  return (
    <details className="saved-systems" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="share-btn" title="Mis sistemas guardados" aria-label="Mis sistemas guardados">
        ✦ Mis sistemas{systems.length > 0 ? ` (${systems.length})` : ''}
      </summary>
      <div className="saved-systems-menu">
        <div className="saved-systems-save">
          <input
            type="text"
            className="text-field"
            placeholder="Nombre del sistema"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
          <button type="button" className="add-btn" onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        {systems.length === 0 ? (
          <p className="hint">Aún no hay sistemas guardados en este módulo.</p>
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
                  title="Eliminar"
                  onClick={() => remove(s.id)}
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
