import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_SCORE_MODE,
  SCORE_MODE_META,
  isScoreMode,
  type ScoreMode,
  type ScoreModeMeta,
} from '../utils/scoreMode';

const STORAGE_KEY = 'banha:score-mode';

function readStoredMode(): ScoreMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isScoreMode(stored) ? stored : DEFAULT_SCORE_MODE;
  } catch {
    return DEFAULT_SCORE_MODE;
  }
}

interface ScoreModeContextValue {
  mode: ScoreMode;
  meta: ScoreModeMeta;
  setMode: (mode: ScoreMode) => void;
}

const ScoreModeContext = createContext<ScoreModeContextValue | undefined>(undefined);

/**
 * Holds the "Score Percentage or Average Score" preference chosen in System
 * Settings. It is read by the Assessments table and every Statistical
 * Analysis calculation, chart and report, and is remembered in this browser.
 */
export function ScoreModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ScoreMode>(readStoredMode);

  const setMode = useCallback((next: ScoreMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable — the choice then only lasts for this page load
    }
  }, []);

  const value = useMemo<ScoreModeContextValue>(
    () => ({ mode, meta: SCORE_MODE_META[mode], setMode }),
    [mode, setMode]
  );

  return <ScoreModeContext.Provider value={value}>{children}</ScoreModeContext.Provider>;
}

export function useScoreMode(): ScoreModeContextValue {
  const ctx = useContext(ScoreModeContext);
  if (!ctx) throw new Error('useScoreMode must be used within a ScoreModeProvider');
  return ctx;
}
