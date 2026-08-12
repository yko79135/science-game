import type { GameState, LogCategory } from './types';

let counter = 0;

export function addLog(state: GameState, category: LogCategory, icon: string, text: string) {
  counter += 1;
  state.log.push({
    id: `log-${counter}-${Date.now()}`,
    round: state.round,
    category,
    icon,
    text,
  });
}

export function clampHealth(n: number): number {
  return Math.max(0, Math.min(100, n));
}
