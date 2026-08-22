// Core type definitions for Infection: Battle for the Body

export type FactionId = 'bacteria' | 'virus' | 'immune';

export type RegionId =
  | 'skin'
  | 'nose'
  | 'throat'
  | 'lungs'
  | 'bloodstream'
  | 'heart'
  | 'liver'
  | 'stomach'
  | 'intestines'
  | 'kidneys'
  | 'lymphNodes'
  | 'spleen'
  | 'brain';

export type HexId = string;

export interface RegionDef {
  id: RegionId;
  name: string;
  icon: string;
  description: string;
  traits: {
    virusReplicationBonus?: number; // + to replicate/infect rolls
    bacteriaGrowthBonus?: number; // + to reproduce/spread rolls
    immuneBonus?: number; // + to immune rolls performed here
    bloodBrainBarrier?: boolean; // extra defense vs entering
    highConsequence?: number; // multiplier on body-health impact when this region is damaged
    microbiome?: number; // starting beneficial-microbiome strength (0-100)
    vitality: number; // weight of this organ in global body health calc
  };
}

export type AdaptationId = string;

export interface AdaptationDef {
  id: AdaptationId;
  faction: FactionId;
  name: string;
  description: string;
  apCost: number;
  resourceCost: number;
  tradeoff?: string;
  requires?: AdaptationId[];
  maxLevel?: number;
}

export interface PathogenState {
  // Bacteria presence
  colonyStrength: number; // 0+ population/strength on this hex
  biofilm: boolean;
  // Virus presence
  viralLoad: number; // 0+ infected cell / virion strength on this hex
  latent: boolean;
  // Immune presence / detection
  detection: number; // 0-100, per-hex accumulated intel
  inflammation: number; // 0-100 local inflammation
  quarantined: boolean;
  antibodiesPresent: boolean;
}

export interface HexState {
  id: HexId;
  regionId: RegionId;
  health: number; // 0-100
  microbiome: number; // 0-100 current beneficial bacteria strength
  pathogen: PathogenState;
}

export interface BacteriaState {
  biomass: number;
  totalColonyStrength: number;
  resistance: number; // 0-100 antibiotic resistance frequency
  adaptations: Record<AdaptationId, number>; // id -> level
  toxinLevel: number; // global accumulated toxin production (affects detection / body dmg)
}

export interface VirusState {
  virions: number;
  totalViralLoad: number;
  mutationInstability: number; // 0-100, tradeoff tracker
  adaptations: Record<AdaptationId, number>;
  antiviralActive: number; // rounds remaining under antiviral suppression
}

export interface ImmuneState {
  immunePoints: number;
  fever: number; // 37.0 baseline .. up to 41
  globalInflammation: number; // 0-100+ aggregate, drives cytokine storm
  detectionBacteria: number; // 0-100 overall intel vs bacteria
  detectionVirus: number; // 0-100 overall intel vs virus
  adaptiveVsBacteria: boolean;
  adaptiveVsVirus: boolean;
  adaptiveUnlockRound: { bacteria?: number; virus?: number };
  memoryBacteria: number; // 0-100 permanent bonus after clearing
  memoryVirus: number;
  adaptations: Record<AdaptationId, number>;
  antibodiesProduced: number;
}

export type LogCategory = 'bacteria' | 'virus' | 'immune' | 'body' | 'system' | 'event';

export interface LogEntry {
  id: string;
  round: number;
  category: LogCategory;
  icon: string;
  text: string;
}

export interface DiceResult {
  id: string;
  label: string;
  roll: number;
  sides: number;
  modifiers: { label: string; value: number }[];
  total: number;
  threshold: number;
  success: boolean;
}

export type LastRoll =
  | { type: 'check'; id: string; dice: DiceResult }
  | {
      type: 'contest';
      id: string;
      attacker: DiceResult;
      defender: DiceResult;
      attackerLabel: string;
      defenderLabel: string;
      attackerWins: boolean;
    };

export type GamePhase =
  | 'setup'
  | 'tutorial'
  | 'body'
  | 'bacteria'
  | 'virus'
  | 'immune'
  | 'resolution'
  | 'gameover';

export type MedicineSetting = 'on' | 'off';

export interface ScenarioDef {
  id: string;
  name: string;
  description: string;
  factions: FactionId[];
  seed: (state: GameState) => void;
  rounds: number;
}

export interface GameSettings {
  players: Partial<Record<FactionId, 'human' | 'ai' | 'none'>>;
  aiDifficulty: 'easy' | 'normal' | 'hard';
  maxRounds: number;
  medicine: MedicineSetting;
  scenarioId: string;
}

export interface GameState {
  settings: GameSettings;
  round: number;
  phase: GamePhase;
  hexes: Record<HexId, HexState>;
  bacteria: BacteriaState;
  virus: VirusState;
  immune: ImmuneState;
  bodyHealth: number;
  ap: Record<FactionId, number>;
  log: LogEntry[];
  lastRoll: LastRoll | null;
  winner: FactionId | 'draw' | null;
  endReason: string | null;
  stats: {
    peakViralLoad: number;
    peakColonyStrength: number;
    peakHexesControlled: { bacteria: number; virus: number };
    regionsEverInfected: Set<RegionId>;
    adaptiveActivatedRound: { bacteria?: number; virus?: number };
    antibodiesProduced: number;
    resistantEmerged: boolean;
    cytokineStorms: number;
    startRound: number;
    transmissionBonus: number;
  };
  selectedHex: HexId | null;
}
