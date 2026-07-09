/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

/**
 * Cross-view "carry over on tab switch" for the Complejos hub (Equilibrio pL,
 * Especiación vs pH, K′ condicional) — each field is only pushed/pulled by
 * the views that share its exact chemical meaning:
 *   - metalLabel: any view.
 *   - logBetasOH (metal hydrolysis): Especiación vs pH ⟷ K′ condicional only
 *     (Equilibrio pL doesn't model hydrolysis at all).
 *   - ligandLabel + logBetas (a generic M-L formation ladder): Equilibrio pL
 *     ⟷ Especiación vs pH's auxiliary ligand (K′ condicional's ligand is
 *     always EDTA by convention, so it neither reads nor writes this pair).
 * A view seeds its initial state from this on mount (only when it wasn't
 * itself restored from a ?s= share link) and pushes its own values here
 * whenever they change. Pushes MUST use the functional updater
 * (`setCarryOver((prev) => ({ ...prev, ...ownFields }))`) and only spread
 * the fields that view actually owns — a whole-object replace would erase
 * fields (e.g. logBetasOH) written by a different view earlier in the session.
 */
export interface ComplejosCarryOver {
  metalLabel?: string;
  logBetasOH?: number[];
  ligandLabel?: string;
  logBetas?: number[];
}

interface ComplejosCarryOverContextValue {
  carryOver: ComplejosCarryOver;
  setCarryOver: Dispatch<SetStateAction<ComplejosCarryOver>>;
}

const ComplejosCarryOverContext = createContext<ComplejosCarryOverContextValue>({
  carryOver: {},
  setCarryOver: () => {},
});

export function ComplejosCarryOverProvider({ children }: { children: ReactNode }) {
  const [carryOver, setCarryOver] = useState<ComplejosCarryOver>({});
  return (
    <ComplejosCarryOverContext.Provider value={{ carryOver, setCarryOver }}>
      {children}
    </ComplejosCarryOverContext.Provider>
  );
}

export function useComplejosCarryOver() {
  return useContext(ComplejosCarryOverContext);
}
