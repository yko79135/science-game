import { BAL } from './balance';
import type { FactionId, GameState, RegionId } from './types';
import { addLog } from './log';

export function gainDetection(
  state: GameState,
  regionId: RegionId,
  amount: number,
  pathogen: 'bacteria' | 'virus',
) {
  if (amount <= 0) return;
  const region = state.regions[regionId];
  region.pathogen.detection = Math.min(100, region.pathogen.detection + amount);
  const recognitionLevel = state.immune.adaptations.fasterPathogenRecognition ?? 0;
  const globalMultiplier = 0.4 + recognitionLevel * 0.15;
  const globalGain = amount * globalMultiplier;
  if (pathogen === 'bacteria') {
    state.immune.detectionBacteria = Math.min(100, state.immune.detectionBacteria + globalGain);
  } else {
    state.immune.detectionVirus = Math.min(100, state.immune.detectionVirus + globalGain);
  }
}

export function reduceDetection(state: GameState, regionId: RegionId, amount: number) {
  const region = state.regions[regionId];
  region.pathogen.detection = Math.max(0, region.pathogen.detection - amount);
}

export function checkAdaptiveUnlock(state: GameState, faction: 'bacteria' | 'virus') {
  const key = faction === 'bacteria' ? 'adaptiveVsBacteria' : 'adaptiveVsVirus';
  if (state.immune[key]) return;
  const detection = faction === 'bacteria' ? state.immune.detectionBacteria : state.immune.detectionVirus;
  const loweredThreshold = state.immune.adaptations.fasterLymphocyteExpansion
    ? BAL.immune.adaptiveThresholdLowered
    : BAL.immune.adaptiveThreshold;
  if (detection >= loweredThreshold) {
    state.immune[key] = true;
    state.immune.adaptiveUnlockRound[faction] = state.round;
    if (!state.stats.adaptiveActivatedRound[faction]) {
      state.stats.adaptiveActivatedRound[faction] = state.round;
    }
    const label = faction === 'bacteria' ? 'Bacteria' : 'the Virus';
    addLog(
      state,
      'immune',
      '🧬',
      `Adaptive immunity has activated against ${label}! B cells and T cells are now available.`,
    );
  }
}

export function factionResourceLabel(faction: FactionId): string {
  if (faction === 'bacteria') return 'Biomass';
  if (faction === 'virus') return 'Virions';
  return 'Immune Points';
}
