import { REGIONS, REGION_ORDER } from './regions';
import { regionHexIds } from './aggregate';
import type { GameState } from './types';

export function recomputeBodyHealth(state: GameState) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const regionId of REGION_ORDER) {
    const ids = regionHexIds(regionId);
    if (ids.length === 0) continue;
    const vitality = REGIONS[regionId].traits.vitality;
    const weightPerHex = vitality / ids.length;
    for (const id of ids) {
      weightedSum += state.hexes[id].health * weightPerHex;
      totalWeight += weightPerHex;
    }
  }
  state.bodyHealth = Math.round(weightedSum / totalWeight);
}
