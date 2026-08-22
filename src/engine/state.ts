import { HEX_TILES } from './hexGrid';
import { REGIONS } from './regions';
import type { GameSettings, GameState, HexState } from './types';

function freshHexState(id: string, regionId: (typeof HEX_TILES)[number]['regionId']): HexState {
  const def = REGIONS[regionId];
  return {
    id,
    regionId,
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
  const hexes = {} as GameState['hexes'];
  for (const tile of HEX_TILES) {
    hexes[tile.id] = freshHexState(tile.id, tile.regionId);
  }

  return {
    settings,
    round: 1,
    phase: 'body',
    hexes,
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
      peakHexesControlled: { bacteria: 0, virus: 0 },
      regionsEverInfected: new Set(),
      adaptiveActivatedRound: {},
      antibodiesProduced: 0,
      resistantEmerged: false,
      cytokineStorms: 0,
      startRound: 1,
      transmissionBonus: 0,
    },
    selectedHex: null,
  };
}
