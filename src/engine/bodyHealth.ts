import { REGIONS, REGION_ORDER } from './regions';
import type { GameState } from './types';

export function recomputeBodyHealth(state: GameState) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const id of REGION_ORDER) {
    const vitality = REGIONS[id].traits.vitality;
    weightedSum += state.regions[id].health * vitality;
    totalWeight += vitality;
  }
  state.bodyHealth = Math.round(weightedSum / totalWeight);
}
