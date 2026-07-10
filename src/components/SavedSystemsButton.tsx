import { useState } from 'react';
import { useSavedSystems } from '../hooks/useSavedSystems';

/**
 * "Mis sistemas" — save/load named snapshots of the current scenario.
 * Piggybacks on the same shareable URL ShareButton copies (already kept in
 * sync by useShareEffect/useShareableState): saving stores it under a name,
 * loading navigates to it so restoration goes through each module's normal
 * share-link parsing, with no separate persistence logic to keep in sync.
 */
export default function SavedSystemsButton({ moduleId }: { moduleId: string }) {
  const { systems, save, remove, load } = useSavedSystems(moduleId);
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    save(name);
    setName('');
  };

  return (
    <details className="saved-systems">
      <summary className="share-btn" title="Mis sistemas guardados">
        ★ Mis sistemas{systems.length > 0 ? ` (${systems.length})` : ''}
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
          <button type="button" className="add-btn" onClick={handleSave} disabled={!name.trim()}>
            Guardar
          </button>
        </div>
        {systems.length === 0 ? (
          <p className="hint">Aún no hay sistemas guardados en este módulo.</p>
        ) : (
          <ul className="saved-systems-list">
            {systems.map((s) => (
              <li key={s.id}>
                <button type="button" className="saved-systems-load" onClick={() => load(s)}>
                  {s.name}
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
