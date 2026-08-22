import { capitalHexesOf } from './hexGrid';
import type { GameState, RegionId, ScenarioDef } from './types';

function seedBacteria(state: GameState, regionId: RegionId, amount: number) {
  const hexId = capitalHexesOf(regionId)[0];
  if (!hexId) return;
  const hex = state.hexes[hexId];
  hex.pathogen.colonyStrength = amount;
  state.bacteria.totalColonyStrength += amount;
  state.stats.regionsEverInfected.add(regionId);
}

function seedVirus(state: GameState, regionId: RegionId, amount: number) {
  const hexId = capitalHexesOf(regionId)[0];
  if (!hexId) return;
  const hex = state.hexes[hexId];
  hex.pathogen.viralLoad = amount;
  state.virus.totalViralLoad += amount;
  state.stats.regionsEverInfected.add(regionId);
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'respiratoryVirus',
    name: 'Respiratory Virus',
    description: 'A virus enters through the upper airway and races to spread through the lungs before adaptive immunity catches up.',
    factions: ['virus', 'immune'],
    rounds: 16,
    seed: (state) => seedVirus(state, 'nose', 4),
  },
  {
    id: 'foodborneBacteria',
    name: 'Foodborne Bacteria',
    description: 'Bacteria enter through contaminated food and must establish colonies in the gut against a competing microbiome.',
    factions: ['bacteria', 'immune'],
    rounds: 18,
    seed: (state) => seedBacteria(state, 'intestines', 4),
  },
  {
    id: 'skinWound',
    name: 'Skin Wound',
    description: 'A wound breaches the skin barrier, giving bacteria a foothold to spread into the bloodstream.',
    factions: ['bacteria', 'immune'],
    rounds: 16,
    seed: (state) => seedBacteria(state, 'skin', 3),
  },
  {
    id: 'fullOutbreak',
    name: 'Full Outbreak (3-Player)',
    description: 'Bacteria and virus both invade at once. The immune system must fight a two-front war.',
    factions: ['bacteria', 'virus', 'immune'],
    rounds: 18,
    seed: (state) => {
      seedBacteria(state, 'skin', 3);
      seedVirus(state, 'nose', 3);
    },
  },
];

export function getScenario(id: string): ScenarioDef {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
