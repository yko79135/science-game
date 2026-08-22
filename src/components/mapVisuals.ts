import { BAL } from '../engine/balance';
import type { HexState } from '../engine/types';

export type InfectionSeverity = 'clear' | 'mild' | 'moderate' | 'severe';

export function bacteriaSeverity(hex: HexState): InfectionSeverity {
  const c = hex.pathogen.colonyStrength;
  const cap = BAL.bacteria.hexCap;
  if (c <= 0) return 'clear';
  if (c < cap * 0.3) return 'mild';
  if (c < cap * 0.7) return 'moderate';
  return 'severe';
}

export function virusSeverity(hex: HexState): InfectionSeverity {
  const v = hex.pathogen.viralLoad;
  const cap = BAL.virus.hexCap;
  if (v <= 0) return 'clear';
  if (v < cap * 0.3) return 'mild';
  if (v < cap * 0.7) return 'moderate';
  return 'severe';
}

export function healthColor(health: number): string {
  if (health >= 70) return '#3ddc84';
  if (health >= 40) return '#f2c94c';
  return '#ff5d5d';
}

export const REGION_TINTS: Record<string, string> = {
  skin: '#3a4a63',
  nose: '#3a5a63',
  throat: '#3a5563',
  lungs: '#3a5a58',
  bloodstream: '#5a3a3f',
  heart: '#5a3a3a',
  liver: '#5a4a3a',
  stomach: '#4a5a3a',
  intestines: '#4a4a3a',
  kidneys: '#3a4a4a',
  lymphNodes: '#3a3f5a',
  spleen: '#4a3a5a',
  brain: '#4a3a55',
};
