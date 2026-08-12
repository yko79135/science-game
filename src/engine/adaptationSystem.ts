import { adaptationsFor } from './adaptations';
import type { FactionId, GameState } from './types';
import { addLog } from './log';
import type { ActionOutcome } from './actionTypes';

function resourcePool(state: GameState, faction: FactionId) {
  if (faction === 'bacteria') return state.bacteria;
  if (faction === 'virus') return state.virus;
  return state.immune;
}

function resourceKey(faction: FactionId): 'biomass' | 'virions' | 'immunePoints' {
  if (faction === 'bacteria') return 'biomass';
  if (faction === 'virus') return 'virions';
  return 'immunePoints';
}

export function adaptationCostAtLevel(base: number, level: number): number {
  return Math.round(base * (1 + level * 0.6));
}

export function buyAdaptation(state: GameState, faction: FactionId, adaptationId: string): ActionOutcome {
  const def = adaptationsFor(faction).find((a) => a.id === adaptationId);
  if (!def) return { ok: false, message: 'Unknown adaptation.' };
  const pool = resourcePool(state, faction) as unknown as Record<string, unknown>;
  const adaptations = pool.adaptations as Record<string, number>;
  const level = adaptations[adaptationId] ?? 0;
  const maxLevel = def.maxLevel ?? 1;
  if (level >= maxLevel) return { ok: false, message: 'Already at maximum level.' };
  const cost = adaptationCostAtLevel(def.resourceCost, level);
  const key = resourceKey(faction);
  const available = pool[key] as number;
  if (available < cost) return { ok: false, message: `Not enough ${key}.` };
  (pool[key] as number) = available - cost;
  adaptations[adaptationId] = level + 1;
  const icon = faction === 'bacteria' ? '🦠' : faction === 'virus' ? '🧫' : '🛡️';
  addLog(state, faction, icon, `${def.name} acquired (level ${level + 1}).${def.tradeoff ? ` Tradeoff: ${def.tradeoff}` : ''}`);
  return { ok: true };
}
