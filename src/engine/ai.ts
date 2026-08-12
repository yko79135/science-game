import { getCatalog, getValidTargets, executeAction } from './actions';
import { adaptationsFor } from './adaptations';
import { buyAdaptation } from './adaptationSystem';
import { REGIONS } from './regions';
import type { FactionId, GameState, RegionId } from './types';

export type Difficulty = 'easy' | 'normal' | 'hard';

interface Candidate {
  actionId: string;
  regionId: RegionId | null;
  score: number;
}

function noiseFor(difficulty: Difficulty): number {
  if (difficulty === 'easy') return 6;
  if (difficulty === 'normal') return 2.5;
  return 0.5;
}

function scoreBacteria(state: GameState, actionId: string, regionId: RegionId | null): number {
  const b = state.bacteria;
  const region = regionId ? state.regions[regionId] : null;
  const def = regionId ? REGIONS[regionId] : null;
  switch (actionId) {
    case 'reproduce':
      return 4 + (def?.traits.bacteriaGrowthBonus ?? 0) - (region ? region.pathogen.detection / 25 : 0);
    case 'spread':
      return (
        6 +
        (def?.traits.bacteriaGrowthBonus ?? 0) -
        (region ? region.microbiome / 20 : 0) -
        (def?.traits.bloodBrainBarrier ? 3 : 0)
      );
    case 'biofilm':
      return 3 + (region ? region.pathogen.detection / 15 + region.pathogen.colonyStrength / 12 : 0);
    case 'toxin':
      return 2 + (region && region.pathogen.colonyStrength > 8 ? 2 : 0);
    case 'resistance':
      return 2 + (state.immune.detectionBacteria > 35 ? 4 : 0) + (b.resistance < 30 ? 2 : 0);
    case 'hide':
      return 1 + (region ? region.pathogen.detection / 18 : 0);
    default:
      return 0;
  }
}

function scoreVirus(state: GameState, actionId: string, regionId: RegionId | null): number {
  const region = regionId ? state.regions[regionId] : null;
  const def = regionId ? REGIONS[regionId] : null;
  switch (actionId) {
    case 'infect':
      return (
        7 +
        (def?.traits.virusReplicationBonus ?? 0) -
        (region ? region.pathogen.detection / 15 : 0) -
        (region?.pathogen.quarantined ? 3 : 0) -
        (def?.traits.bloodBrainBarrier ? 3 : 0)
      );
    case 'replicate':
      return 6 + (def?.traits.virusReplicationBonus ?? 0) + (region ? region.pathogen.viralLoad / 15 : 0);
    case 'burst':
      return (
        3 +
        (state.immune.adaptiveVsVirus ? 5 : 0) +
        (region && region.pathogen.detection > 65 ? 4 : 0)
      );
    case 'latency':
      return region && region.pathogen.detection > 70 && state.immune.adaptiveVsVirus ? 6 : 1;
    case 'evade':
      return 1 + (region ? region.pathogen.detection / 15 : 0);
    default:
      return 0;
  }
}

function scoreImmune(state: GameState, actionId: string, regionId: RegionId | null): number {
  const region = regionId ? state.regions[regionId] : null;
  const pathogenStrength = region ? region.pathogen.colonyStrength + region.pathogen.viralLoad : 0;
  switch (actionId) {
    case 'neutrophils':
      return 4 + pathogenStrength / 10;
    case 'macrophages':
      return 6 + pathogenStrength / 8;
    case 'inflammation':
      return 4 + pathogenStrength / 10 - state.immune.globalInflammation / 18;
    case 'feverUp':
      return state.bacteria.totalColonyStrength + state.virus.totalViralLoad > 14 && state.immune.fever < 39 ? 4 : 0.5;
    case 'feverDown':
      return state.immune.fever > 39.5 && state.bodyHealth < 60 ? 4 : 0.5;
    case 'tcells':
      return state.immune.adaptiveVsVirus ? 8 + pathogenStrength / 10 : -1;
    case 'antibodies':
      return state.immune.adaptiveVsBacteria || state.immune.adaptiveVsVirus ? 7 : -1;
    case 'quarantine':
      return region && !region.pathogen.quarantined ? 4 + pathogenStrength / 12 : -1;
    default:
      return 0;
  }
}

function scoreFor(state: GameState, faction: FactionId, actionId: string, regionId: RegionId | null): number {
  if (faction === 'bacteria') return scoreBacteria(state, actionId, regionId);
  if (faction === 'virus') return scoreVirus(state, actionId, regionId);
  return scoreImmune(state, actionId, regionId);
}

const ADAPTATION_PRIORITY: Record<FactionId, string[]> = {
  bacteria: ['immuneEvasion', 'biofilmMastery', 'fasterReproduction', 'improvedAdhesion', 'metabolicEfficiency'],
  virus: ['receptorAdaptation', 'immuneEvasionV', 'improvedTransmission', 'rapidReplication', 'antigenicChange'],
  immune: ['strongerInnateResponse', 'fasterPathogenRecognition', 'cytotoxicTCells', 'antibodyProduction', 'improvedPhagocytosis'],
};

function resourcePool(state: GameState, faction: FactionId): number {
  if (faction === 'bacteria') return state.bacteria.biomass;
  if (faction === 'virus') return state.virus.virions;
  return state.immune.immunePoints;
}

function adaptationLevels(state: GameState, faction: FactionId): Record<string, number> {
  if (faction === 'bacteria') return state.bacteria.adaptations;
  if (faction === 'virus') return state.virus.adaptations;
  return state.immune.adaptations;
}

function tryBuyAdaptation(state: GameState, faction: FactionId): boolean {
  const priority = ADAPTATION_PRIORITY[faction];
  const defs = adaptationsFor(faction);
  const levels = adaptationLevels(state, faction);
  for (const id of priority) {
    const def = defs.find((d) => d.id === id);
    if (!def) continue;
    const level = levels[id] ?? 0;
    if (level >= (def.maxLevel ?? 1)) continue;
    if (state.ap[faction] < def.apCost) continue;
    if (resourcePool(state, faction) < def.resourceCost * 1.4) continue;
    const result = buyAdaptation(state, faction, id);
    if (result.ok) {
      state.ap[faction] -= def.apCost;
      return true;
    }
  }
  return false;
}

export function runAiTurn(state: GameState, faction: FactionId, difficulty: Difficulty) {
  const noise = noiseFor(difficulty);
  let guard = 0;
  while (state.ap[faction] > 0 && guard < 10) {
    guard += 1;
    const catalog = getCatalog(faction).filter((a) => state.ap[faction] >= a.apCost);
    const candidates: Candidate[] = [];
    for (const action of catalog) {
      if (action.requiresAdaptive) {
        const ok = action.id === 'antibodies' ? state.immune.adaptiveVsBacteria || state.immune.adaptiveVsVirus : state.immune.adaptiveVsVirus;
        if (!ok) continue;
      }
      if (action.needsTarget) {
        const targets = getValidTargets(state, faction, action.id);
        for (const regionId of targets) {
          candidates.push({ actionId: action.id, regionId, score: scoreFor(state, faction, action.id, regionId) });
        }
      } else {
        candidates.push({ actionId: action.id, regionId: null, score: scoreFor(state, faction, action.id, null) });
      }
    }
    if (candidates.length === 0) break;
    for (const c of candidates) c.score += (Math.random() - 0.5) * noise;
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (best.score < 0 && difficulty !== 'easy') break;
    const result = executeAction(state, faction, best.actionId, best.regionId);
    if (!result.ok) break;
  }

  if (difficulty !== 'easy' && state.ap[faction] > 0) {
    tryBuyAdaptation(state, faction);
  }
}
