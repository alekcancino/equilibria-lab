/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

interface ActivityContextValue {
  showActivityNote: boolean;
  setShowActivityNote: (v: boolean) => void;
}

const ActivityContext = createContext<ActivityContextValue>({
  showActivityNote: false,
  setShowActivityNote: () => {},
});

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [showActivityNote, setShowActivityNote] = useState(false);
  return (
    <ActivityContext.Provider value={{ showActivityNote, setShowActivityNote }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivityNote() {
  return useContext(ActivityContext);
}
