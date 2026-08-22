import { getCatalog, getValidTargets, executeAction } from './actions';
import { adaptationsFor } from './adaptations';
import { buyAdaptation } from './adaptationSystem';
import { BAL } from './balance';
import { REGIONS } from './regions';
import type { FactionId, GameState, HexId } from './types';

export type Difficulty = 'easy' | 'normal' | 'hard';

// Reward filling a fragile hex up to a safe floor, but penalize piling more
// onto one that's already near its cap — pushes growth actions to taper off
// in favor of spreading once a tile is saturated.
function growthCurve(current: number, cap: number): number {
  if (current < 6) return 6 - current;
  if (current >= cap - 3) return -(current - (cap - 3)) * 2;
  return 0;
}

interface Candidate {
  actionId: string;
  hexId: HexId | null;
  score: number;
}

function noiseFor(difficulty: Difficulty): number {
  if (difficulty === 'easy') return 6;
  if (difficulty === 'normal') return 2.5;
  return 0.5;
}

function scoreBacteria(state: GameState, actionId: string, hexId: HexId | null): number {
  const b = state.bacteria;
  const hex = hexId ? state.hexes[hexId] : null;
  const def = hex ? REGIONS[hex.regionId] : null;
  switch (actionId) {
    case 'reproduce':
      return (
        4 +
        (def?.traits.bacteriaGrowthBonus ?? 0) -
        (hex ? hex.pathogen.detection / 25 : 0) +
        (hex ? growthCurve(hex.pathogen.colonyStrength, BAL.bacteria.hexCap) : 0)
      );
    case 'spread':
      return (
        5 +
        (def?.traits.bacteriaGrowthBonus ?? 0) -
        (hex ? hex.microbiome / 20 : 0) -
        (def?.traits.bloodBrainBarrier ? 3 : 0)
      );
    case 'biofilm':
      return 5.5 + (hex ? hex.pathogen.detection / 12 + hex.pathogen.colonyStrength / 10 : 0);
    case 'toxin':
      return 2 + (hex && hex.pathogen.colonyStrength > 8 ? 2 : 0);
    case 'resistance':
      return 2 + (state.immune.detectionBacteria > 35 ? 4 : 0) + (b.resistance < 30 ? 2 : 0);
    case 'hide':
      return 1 + (hex ? hex.pathogen.detection / 18 : 0);
    default:
      return 0;
  }
}

function scoreVirus(state: GameState, actionId: string, hexId: HexId | null): number {
  const hex = hexId ? state.hexes[hexId] : null;
  const def = hex ? REGIONS[hex.regionId] : null;
  switch (actionId) {
    case 'infect':
      return (
        6 +
        (def?.traits.virusReplicationBonus ?? 0) -
        (hex ? hex.pathogen.detection / 15 : 0) -
        (hex?.pathogen.quarantined ? 3 : 0) -
        (def?.traits.bloodBrainBarrier ? 3 : 0)
      );
    case 'replicate':
      return (
        6 +
        (def?.traits.virusReplicationBonus ?? 0) +
        (hex ? hex.pathogen.viralLoad / 15 : 0) +
        (hex ? growthCurve(hex.pathogen.viralLoad, BAL.virus.hexCap) : 0)
      );
    case 'burst':
      return 3 + (state.immune.adaptiveVsVirus ? 5 : 0) + (hex && hex.pathogen.detection > 65 ? 4 : 0);
    case 'latency':
      return hex && hex.pathogen.detection > 40 ? 6 : 1;
    case 'evade':
      return 1 + (hex ? hex.pathogen.detection / 15 : 0);
    default:
      return 0;
  }
}

function scoreImmune(state: GameState, actionId: string, hexId: HexId | null): number {
  const hex = hexId ? state.hexes[hexId] : null;
  const pathogenStrength = hex ? hex.pathogen.colonyStrength + hex.pathogen.viralLoad : 0;
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
      return hex && !hex.pathogen.quarantined ? 4 + pathogenStrength / 12 : -1;
    default:
      return 0;
  }
}

function scoreFor(state: GameState, faction: FactionId, actionId: string, hexId: HexId | null): number {
  if (faction === 'bacteria') return scoreBacteria(state, actionId, hexId);
  if (faction === 'virus') return scoreVirus(state, actionId, hexId);
  return scoreImmune(state, actionId, hexId);
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

// Cap how many hex targets are scored per action so a 166-tile board with
// dozens of infected hexes still evaluates quickly and deterministically.
const MAX_CANDIDATES_PER_ACTION = 24;

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
        let targets = getValidTargets(state, faction, action.id);
        if (targets.length > MAX_CANDIDATES_PER_ACTION) {
          targets = [...targets].sort(() => Math.random() - 0.5).slice(0, MAX_CANDIDATES_PER_ACTION);
        }
        for (const hexId of targets) {
          candidates.push({ actionId: action.id, hexId, score: scoreFor(state, faction, action.id, hexId) });
        }
      } else {
        candidates.push({ actionId: action.id, hexId: null, score: scoreFor(state, faction, action.id, null) });
      }
    }
    if (candidates.length === 0) break;
    for (const c of candidates) c.score += (Math.random() - 0.5) * noise;
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (best.score < 0 && difficulty !== 'easy') break;
    const result = executeAction(state, faction, best.actionId, best.hexId);
    if (!result.ok) break;
  }

  if (difficulty !== 'easy' && state.ap[faction] > 0) {
    tryBuyAdaptation(state, faction);
  }
}
