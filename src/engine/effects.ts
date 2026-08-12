import type { GameState } from './types';

export function feverMultiplier(state: GameState): number {
  const f = state.immune.fever;
  if (f >= 40) return 0.65;
  if (f >= 39) return 0.8;
  if (f >= 38) return 0.9;
  return 1;
}

export function antiviralMultiplier(state: GameState): number {
  return state.virus.antiviralActive > 0 ? 0.5 : 1;
}
