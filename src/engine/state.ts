import { REGIONS, REGION_ORDER } from './regions';
import type { GameSettings, GameState, RegionState } from './types';

function freshRegionState(id: (typeof REGION_ORDER)[number]): RegionState {
  const def = REGIONS[id];
  return {
    id,
    health: 100,
    microbiome: def.traits.microbiome ?? 0,
    pathogen: {
      colonyStrength: 0,
      biofilm: false,
      viralLoad: 0,
      latent: false,
      detection: 0,
      inflammation: 0,
      quarantined: false,
      antibodiesPresent: false,
    },
  };
}

export function createInitialState(settings: GameSettings): GameState {
  const regions = {} as GameState['regions'];
  for (const id of REGION_ORDER) {
    regions[id] = freshRegionState(id);
  }

  return {
    settings,
    round: 1,
    phase: 'body',
    regions,
    bacteria: {
      biomass: 10,
      totalColonyStrength: 0,
      resistance: 5,
      adaptations: {},
      toxinLevel: 0,
    },
    virus: {
      virions: 10,
      totalViralLoad: 0,
      mutationInstability: 0,
      adaptations: {},
      antiviralActive: 0,
    },
    immune: {
      immunePoints: 8,
      fever: 37,
      globalInflammation: 0,
      detectionBacteria: 0,
      detectionVirus: 0,
      adaptiveVsBacteria: false,
      adaptiveVsVirus: false,
      adaptiveUnlockRound: {},
      memoryBacteria: 0,
      memoryVirus: 0,
      adaptations: {},
      antibodiesProduced: 0,
    },
    bodyHealth: 100,
    ap: { bacteria: 3, virus: 3, immune: 3 },
    log: [],
    lastRoll: null,
    winner: null,
    endReason: null,
    stats: {
      peakViralLoad: 0,
      peakColonyStrength: 0,
      regionsEverInfected: new Set(),
      adaptiveActivatedRound: {},
      antibodiesProduced: 0,
      resistantEmerged: false,
      cytokineStorms: 0,
      startRound: 1,
      transmissionBonus: 0,
    },
    selectedRegion: null,
    pendingEnd: false,
  };
}
