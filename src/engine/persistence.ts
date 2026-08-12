import type { GameState } from './types';

const KEY = 'infection-game-save-v1';

export function saveGame(state: GameState) {
  try {
    const serializable = {
      ...state,
      stats: { ...state.stats, regionsEverInfected: Array.from(state.stats.regionsEverInfected) },
    };
    localStorage.setItem(KEY, JSON.stringify(serializable));
  } catch {
    // storage unavailable — ignore
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    parsed.stats.regionsEverInfected = new Set(parsed.stats.regionsEverInfected);
    return parsed as GameState;
  } catch {
    return null;
  }
}

export function clearSavedGame() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
