import { BAL } from './balance';
import { getNeighbors, REGIONS } from './regions';
import type { GameState, RegionId } from './types';
import type { ActionDef, ActionOutcome, FactionActionModule } from './actionTypes';
import { addLog, clampHealth } from './log';
import { performRoll } from './dice';
import { gainDetection, reduceDetection } from './detection';
import { feverMultiplier } from './effects';

export const BACTERIA_CATALOG: ActionDef[] = [
  {
    id: 'reproduce',
    faction: 'bacteria',
    label: 'Reproduce',
    icon: '🦠',
    apCost: 1,
    resourceCost: BAL.bacteria.reproduceBiomassCost,
    needsTarget: true,
    description: 'Grow an existing colony. Guaranteed effect, no roll required.',
  },
  {
    id: 'spread',
    faction: 'bacteria',
    label: 'Spread',
    icon: '➡️',
    apCost: 1,
    resourceCost: BAL.bacteria.spreadBiomassCost,
    needsTarget: true,
    description: 'Attempt to colonize an adjacent, unclaimed region. Chance-based.',
  },
  {
    id: 'biofilm',
    faction: 'bacteria',
    label: 'Form Biofilm',
    icon: '🛡️',
    apCost: 1,
    resourceCost: BAL.bacteria.biofilmBiomassCost,
    needsTarget: true,
    description: 'Build a protective matrix that raises defense against immune attacks here.',
  },
  {
    id: 'toxin',
    faction: 'bacteria',
    label: 'Produce Toxin',
    icon: '☠️',
    apCost: BAL.bacteria.toxinApCost,
    resourceCost: 6,
    needsTarget: true,
    description: 'Damage tissue directly. Powerful, but draws heavy immune attention.',
  },
  {
    id: 'resistance',
    faction: 'bacteria',
    label: 'Develop Resistance',
    icon: '🧬',
    apCost: BAL.bacteria.resistanceApCost,
    resourceCost: BAL.bacteria.resistanceBiomassCost,
    needsTarget: false,
    description: 'Increase the frequency of antibiotic-resistant bacteria in your population.',
  },
  {
    id: 'hide',
    faction: 'bacteria',
    label: 'Hide',
    icon: '🫥',
    apCost: 1,
    resourceCost: BAL.bacteria.hideBiomassCost,
    needsTarget: true,
    description: 'Reduce how visible a colony is to immune surveillance.',
  },
];

function ownedRegions(state: GameState): RegionId[] {
  return (Object.keys(state.regions) as RegionId[]).filter((id) => state.regions[id].pathogen.colonyStrength > 0);
}

export function bacteriaValidTargets(state: GameState, actionId: string): RegionId[] {
  const owned = ownedRegions(state);
  if (actionId === 'reproduce' || actionId === 'toxin' || actionId === 'hide') {
    return owned;
  }
  if (actionId === 'biofilm') {
    return owned.filter((id) => !state.regions[id].pathogen.biofilm);
  }
  if (actionId === 'spread') {
    const frontier = new Set<RegionId>();
    for (const id of owned) {
      for (const n of getNeighbors(id)) {
        if (state.regions[n].pathogen.colonyStrength === 0) frontier.add(n);
      }
    }
    return Array.from(frontier);
  }
  return [];
}

function spendBiomass(state: GameState, amount: number): boolean {
  if (state.bacteria.biomass < amount) return false;
  state.bacteria.biomass -= amount;
  return true;
}

export function bacteriaExecute(state: GameState, actionId: string, regionId: RegionId | null): ActionOutcome {
  const b = state.bacteria;
  const lvl = (id: string) => b.adaptations[id] ?? 0;

  if (actionId === 'reproduce') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    if (!spendBiomass(state, BAL.bacteria.reproduceBiomassCost)) return { ok: false, message: 'Not enough biomass.' };
    const region = state.regions[regionId];
    const def = REGIONS[regionId];
    let gain = BAL.bacteria.reproduceGain + (def.traits.bacteriaGrowthBonus ?? 0) + lvl('fasterReproduction') * 2;
    gain -= Math.floor(region.microbiome / 25);
    gain -= Math.floor(region.pathogen.inflammation / 30);
    gain = Math.max(1, Math.round(gain * feverMultiplier(state)));
    region.pathogen.colonyStrength += gain;
    b.totalColonyStrength += gain;
    addLog(state, 'bacteria', '🦠', `Bacteria reproduced in ${def.name} (+${gain} colony strength).`);
    return { ok: true };
  }

  if (actionId === 'spread') {
    if (!regionId) return { ok: false, message: 'Select a target region.' };
    if (!spendBiomass(state, BAL.bacteria.spreadBiomassCost)) return { ok: false, message: 'Not enough biomass.' };
    const target = state.regions[regionId];
    const def = REGIONS[regionId];
    const modifiers = [
      { label: 'Adhesion', value: lvl('improvedAdhesion') * 2 },
      { label: 'Capsule (slower)', value: lvl('capsule') ? -1 : 0 },
      { label: 'Growth-friendly tissue', value: def.traits.bacteriaGrowthBonus ?? 0 },
      { label: 'Blood-brain barrier', value: def.traits.bloodBrainBarrier ? -4 : 0 },
      { label: 'Microbiome resistance', value: -Math.round(target.microbiome / 20) },
      { label: 'Quarantine', value: target.pathogen.quarantined ? -3 : 0 },
      { label: 'Local inflammation', value: -Math.round(target.pathogen.inflammation / 25) },
      { label: 'Antibodies present', value: target.pathogen.antibodiesPresent ? -2 : 0 },
      { label: 'Fever', value: state.immune.fever >= 39 ? -1 : 0 },
    ].filter((m) => m.value !== 0);
    const result = performRoll({ label: `Spread to ${def.name}`, modifiers, threshold: BAL.bacteria.spreadThreshold });
    state.lastRoll = { type: 'check', id: result.id, dice: result };
    if (result.success) {
      target.pathogen.colonyStrength += BAL.bacteria.spreadGain + lvl('improvedAdhesion');
      b.totalColonyStrength += BAL.bacteria.spreadGain + lvl('improvedAdhesion');
      state.stats.regionsEverInfected.add(regionId);
      addLog(state, 'bacteria', '🦠', `Bacteria successfully spread into ${def.name}.`);
    } else {
      b.biomass = Math.max(0, b.biomass - BAL.bacteria.spreadFailBiomassCost);
      addLog(state, 'bacteria', '🦠', `Bacteria failed to establish a foothold in ${def.name}.`);
    }
    return { ok: true };
  }

  if (actionId === 'biofilm') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    if (!spendBiomass(state, BAL.bacteria.biofilmBiomassCost)) return { ok: false, message: 'Not enough biomass.' };
    state.regions[regionId].pathogen.biofilm = true;
    addLog(state, 'bacteria', '🛡️', `Biofilm formed in ${REGIONS[regionId].name}, boosting colony defense.`);
    return { ok: true };
  }

  if (actionId === 'toxin') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    if (!spendBiomass(state, 6)) return { ok: false, message: 'Not enough biomass.' };
    const region = state.regions[regionId];
    const def = REGIONS[regionId];
    const dmg = BAL.bacteria.toxinDamage + lvl('toxinPotency') * 3;
    region.health = clampHealth(region.health - dmg);
    const det = BAL.bacteria.toxinDetection + lvl('toxinPotency') * 4;
    gainDetection(state, regionId, det, 'bacteria');
    b.toxinLevel += 1;
    addLog(state, 'bacteria', '☠️', `Toxins released in ${def.name}: -${dmg} tissue health, detection rising.`);
    return { ok: true };
  }

  if (actionId === 'resistance') {
    if (!spendBiomass(state, BAL.bacteria.resistanceBiomassCost)) return { ok: false, message: 'Not enough biomass.' };
    b.resistance = Math.min(100, b.resistance + BAL.bacteria.resistanceGain);
    addLog(state, 'bacteria', '🧬', `Bacterial population shifts toward antibiotic resistance (${Math.round(b.resistance)}%).`);
    return { ok: true };
  }

  if (actionId === 'hide') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    if (!spendBiomass(state, BAL.bacteria.hideBiomassCost)) return { ok: false, message: 'Not enough biomass.' };
    reduceDetection(state, regionId, BAL.bacteria.hideDetectionReduction + lvl('immuneEvasion') * 5);
    addLog(state, 'bacteria', '🫥', `Bacteria in ${REGIONS[regionId].name} reduce their visibility to immune surveillance.`);
    return { ok: true };
  }

  return { ok: false, message: 'Unknown action.' };
}

export const bacteriaModule: FactionActionModule = {
  catalog: BACTERIA_CATALOG,
  getValidTargets: bacteriaValidTargets,
  execute: bacteriaExecute,
};
