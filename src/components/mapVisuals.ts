import type { RegionState } from '../engine/types';

export type InfectionSeverity = 'clear' | 'mild' | 'moderate' | 'severe';

export function bacteriaSeverity(region: RegionState): InfectionSeverity {
  const c = region.pathogen.colonyStrength;
  if (c <= 0) return 'clear';
  if (c < 5) return 'mild';
  if (c < 12) return 'moderate';
  return 'severe';
}

export function virusSeverity(region: RegionState): InfectionSeverity {
  const v = region.pathogen.viralLoad;
  if (v <= 0) return 'clear';
  if (v < 5) return 'mild';
  if (v < 12) return 'moderate';
  return 'severe';
}

export function healthColor(health: number): string {
  if (health >= 70) return '#3ddc84';
  if (health >= 40) return '#f2c94c';
  return '#ff5d5d';
}

export function dominantColor(region: RegionState): string | null {
  const bSev = bacteriaSeverity(region);
  const vSev = virusSeverity(region);
  if (bSev === 'clear' && vSev === 'clear') return null;
  if (bSev !== 'clear' && vSev !== 'clear') return 'mixed';
  return bSev !== 'clear' ? 'bacteria' : 'virus';
}
