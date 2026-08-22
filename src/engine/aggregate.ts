import { HEXES_BY_REGION } from './hexGrid';
import { REGION_ORDER } from './regions';
import type { GameState, RegionId } from './types';

export function regionHexIds(regionId: RegionId): string[] {
  return HEXES_BY_REGION[regionId] ?? [];
}

export interface RegionAggregate {
  regionId: RegionId;
  hexCount: number;
  avgHealth: number;
  colonyStrength: number;
  viralLoad: number;
  hexesWithColony: number;
  hexesWithVirus: number;
  avgMicrobiome: number;
  avgDetection: number;
}

export function aggregateRegion(state: GameState, regionId: RegionId): RegionAggregate {
  const ids = regionHexIds(regionId);
  let health = 0;
  let colonyStrength = 0;
  let viralLoad = 0;
  let hexesWithColony = 0;
  let hexesWithVirus = 0;
  let microbiome = 0;
  let detection = 0;
  for (const id of ids) {
    const hex = state.hexes[id];
    health += hex.health;
    colonyStrength += hex.pathogen.colonyStrength;
    viralLoad += hex.pathogen.viralLoad;
    if (hex.pathogen.colonyStrength > 0) hexesWithColony++;
    if (hex.pathogen.viralLoad > 0) hexesWithVirus++;
    microbiome += hex.microbiome;
    detection += hex.pathogen.detection;
  }
  const n = Math.max(1, ids.length);
  return {
    regionId,
    hexCount: ids.length,
    avgHealth: health / n,
    colonyStrength,
    viralLoad,
    hexesWithColony,
    hexesWithVirus,
    avgMicrobiome: microbiome / n,
    avgDetection: detection / n,
  };
}

export function recomputeTotals(state: GameState) {
  let colony = 0;
  let viral = 0;
  for (const id in state.hexes) {
    colony += state.hexes[id].pathogen.colonyStrength;
    viral += state.hexes[id].pathogen.viralLoad;
  }
  state.bacteria.totalColonyStrength = colony;
  state.virus.totalViralLoad = viral;
}

export function countHexesControlled(state: GameState, faction: 'bacteria' | 'virus'): number {
  let count = 0;
  for (const id in state.hexes) {
    const hex = state.hexes[id];
    if (faction === 'bacteria' ? hex.pathogen.colonyStrength > 0 : hex.pathogen.viralLoad > 0) count++;
  }
  return count;
}

export function distinctRegionsControlled(state: GameState, faction: 'bacteria' | 'virus'): number {
  let count = 0;
  for (const regionId of REGION_ORDER) {
    const agg = aggregateRegion(state, regionId);
    if (faction === 'bacteria' ? agg.hexesWithColony > 0 : agg.hexesWithVirus > 0) count++;
  }
  return count;
}
