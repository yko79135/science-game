import { BAL } from './balance';
import { getNeighbors, REGIONS } from './regions';
import type { GameState, RegionId } from './types';
import type { ActionDef, ActionOutcome, FactionActionModule } from './actionTypes';
import { addLog, clampHealth } from './log';
import { performRoll } from './dice';
import { gainDetection, reduceDetection } from './detection';
import { antiviralMultiplier, feverMultiplier } from './effects';

export const VIRUS_CATALOG: ActionDef[] = [
  {
    id: 'infect',
    faction: 'virus',
    label: 'Infect Cell',
    icon: '🧫',
    apCost: 1,
    resourceCost: BAL.virus.infectVirionCost,
    needsTarget: true,
    description: 'Attempt to infect host cells in an adjacent region. Chance-based.',
  },
  {
    id: 'replicate',
    faction: 'virus',
    label: 'Replicate',
    icon: '🔁',
    apCost: 1,
    resourceCost: 0,
    needsTarget: true,
    description: 'Hijacked cells produce more virions. Guaranteed, but damages tissue slightly.',
  },
  {
    id: 'burst',
    faction: 'virus',
    label: 'Burst & Release',
    icon: '💥',
    apCost: BAL.virus.burstApCost,
    resourceCost: 0,
    needsTarget: true,
    description: 'Sacrifice infected cells for a huge burst of virions. Loud — draws attention.',
  },
  {
    id: 'latency',
    faction: 'virus',
    label: 'Establish Latency',
    icon: '💤',
    apCost: BAL.virus.latencyApCost,
    resourceCost: 0,
    needsTarget: true,
    description: 'Go dormant in this region, hiding from detection but pausing replication.',
  },
  {
    id: 'evade',
    faction: 'virus',
    label: 'Evade Antibodies',
    icon: '🫥',
    apCost: 1,
    resourceCost: BAL.virus.evadeVirionCost,
    needsTarget: true,
    description: 'Reduce how visible this infection is to the immune system.',
  },
];

function ownedRegions(state: GameState): RegionId[] {
  return (Object.keys(state.regions) as RegionId[]).filter((id) => state.regions[id].pathogen.viralLoad > 0);
}

export function virusValidTargets(state: GameState, actionId: string): RegionId[] {
  const owned = ownedRegions(state);
  if (actionId === 'replicate' || actionId === 'evade') {
    return owned.filter((id) => !state.regions[id].pathogen.latent);
  }
  if (actionId === 'burst') return owned;
  if (actionId === 'latency') return owned.filter((id) => !state.regions[id].pathogen.latent);
  if (actionId === 'infect') {
    const frontier = new Set<RegionId>();
    for (const id of owned) {
      for (const n of getNeighbors(id)) {
        if (state.regions[n].pathogen.viralLoad === 0) frontier.add(n);
      }
    }
    return Array.from(frontier);
  }
  return [];
}

function spendVirions(state: GameState, amount: number): boolean {
  if (state.virus.virions < amount) return false;
  state.virus.virions -= amount;
  return true;
}

export function virusExecute(state: GameState, actionId: string, regionId: RegionId | null): ActionOutcome {
  const v = state.virus;
  const lvl = (id: string) => v.adaptations[id] ?? 0;

  if (actionId === 'infect') {
    if (!regionId) return { ok: false, message: 'Select a target region.' };
    if (!spendVirions(state, BAL.virus.infectVirionCost)) return { ok: false, message: 'Not enough virions.' };
    const target = state.regions[regionId];
    const def = REGIONS[regionId];
    const modifiers = [
      { label: 'Receptor adaptation', value: lvl('receptorAdaptation') * 2 },
      { label: 'Increased infectivity', value: lvl('increasedInfectivity') ? 2 : 0 },
      { label: 'Replication-friendly tissue', value: def.traits.virusReplicationBonus ?? 0 },
      { label: 'Blood-brain barrier', value: def.traits.bloodBrainBarrier ? -4 : 0 },
      { label: 'Damaged tissue', value: target.health < 70 ? 1 : 0 },
      { label: 'Antibodies present', value: target.pathogen.antibodiesPresent ? -2 : 0 },
      { label: 'Quarantine', value: target.pathogen.quarantined ? -3 : 0 },
      { label: 'Local inflammation', value: -Math.round(target.pathogen.inflammation / 25) },
      { label: 'Fever', value: state.immune.fever >= 39 ? -1 : 0 },
      { label: 'Antiviral treatment', value: v.antiviralActive > 0 ? -2 : 0 },
    ].filter((m) => m.value !== 0);
    const result = performRoll({ label: `Infect ${def.name}`, modifiers, threshold: BAL.virus.infectThreshold });
    state.lastRoll = { type: 'check', id: result.id, dice: result };
    if (result.success) {
      target.pathogen.viralLoad += BAL.virus.infectGain;
      v.totalViralLoad += BAL.virus.infectGain;
      state.stats.regionsEverInfected.add(regionId);
      addLog(state, 'virus', '🧫', `The virus successfully infected cells in ${def.name}.`);
    } else {
      v.virions = Math.max(0, v.virions - BAL.virus.infectFailVirionCost);
      addLog(state, 'virus', '🧫', `The virus failed to infect ${def.name}.`);
    }
    return { ok: true };
  }

  if (actionId === 'replicate') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    const region = state.regions[regionId];
    const def = REGIONS[regionId];
    if (region.pathogen.latent) return { ok: false, message: 'This region is latent — reactivate first.' };
    const rawGain = BAL.virus.replicateGain + (def.traits.virusReplicationBonus ?? 0) + lvl('rapidReplication') * 2;
    const gain = Math.max(1, Math.round(rawGain * feverMultiplier(state) * antiviralMultiplier(state)));
    region.pathogen.viralLoad += gain;
    v.totalViralLoad += gain;
    v.virions += gain;
    const dmg = BAL.virus.replicateSelfDamage + lvl('rapidReplication');
    region.health = clampHealth(region.health - dmg);
    if (lvl('rapidReplication')) v.mutationInstability = Math.min(100, v.mutationInstability + 3);
    addLog(state, 'virus', '🔁', `Virus replicated in ${def.name} (+${gain} viral load, tissue -${dmg}).`);
    return { ok: true };
  }

  if (actionId === 'burst') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    const region = state.regions[regionId];
    const def = REGIONS[regionId];
    const consumed = Math.max(1, Math.round(region.pathogen.viralLoad * BAL.virus.burstFractionConsumed));
    region.pathogen.viralLoad = Math.max(0, region.pathogen.viralLoad - consumed);
    v.totalViralLoad = Math.max(0, v.totalViralLoad - consumed);
    const virionGain = BAL.virus.burstVirionGain + lvl('rapidReplication') * 2;
    v.virions += virionGain;
    region.health = clampHealth(region.health - BAL.virus.burstSelfDamage);
    gainDetection(state, regionId, BAL.virus.burstDetectionSpike, 'virus');
    addLog(state, 'virus', '💥', `Viral burst in ${def.name}! +${virionGain} virions, but tissue damaged and immune attention rises.`);
    return { ok: true };
  }

  if (actionId === 'latency') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    state.regions[regionId].pathogen.latent = true;
    addLog(state, 'virus', '💤', `Infection in ${REGIONS[regionId].name} goes latent, hiding from the immune system.`);
    return { ok: true };
  }

  if (actionId === 'evade') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    if (!spendVirions(state, BAL.virus.evadeVirionCost)) return { ok: false, message: 'Not enough virions.' };
    reduceDetection(state, regionId, BAL.virus.evadeDetectionReduction + lvl('immuneEvasionV') * 5);
    addLog(state, 'virus', '🫥', `Virus in ${REGIONS[regionId].name} evades antibody detection.`);
    return { ok: true };
  }

  return { ok: false, message: 'Unknown action.' };
}

export const virusModule: FactionActionModule = {
  catalog: VIRUS_CATALOG,
  getValidTargets: virusValidTargets,
  execute: virusExecute,
};
