import { BAL } from './balance';
import { REGIONS } from './regions';
import { neighborsOf } from './hexGrid';
import type { GameState, HexId } from './types';
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
    description: 'Attempt to infect host cells in an adjacent tissue tile. Chance-based.',
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
    description: 'Go dormant in this tile, hiding from detection but pausing replication.',
  },
  {
    id: 'evade',
    faction: 'virus',
    label: 'Evade Antibodies',
    icon: '🫥',
    apCost: 1,
    resourceCost: BAL.virus.evadeVirionCost,
    needsTarget: true,
    description: 'Reduce how visible this infection tile is to the immune system.',
  },
];

function ownedHexes(state: GameState): HexId[] {
  return Object.keys(state.hexes).filter((id) => state.hexes[id].pathogen.viralLoad > 0);
}

export function virusValidTargets(state: GameState, actionId: string): HexId[] {
  const owned = ownedHexes(state);
  if (actionId === 'replicate' || actionId === 'evade') {
    return owned.filter((id) => !state.hexes[id].pathogen.latent);
  }
  if (actionId === 'burst') return owned;
  if (actionId === 'latency') return owned.filter((id) => !state.hexes[id].pathogen.latent);
  if (actionId === 'infect') {
    const frontier = new Set<HexId>();
    for (const id of owned.filter((r) => !state.hexes[r].pathogen.latent)) {
      for (const n of neighborsOf(id)) {
        if (state.hexes[n].pathogen.viralLoad === 0) frontier.add(n);
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

export function virusExecute(state: GameState, actionId: string, hexId: HexId | null): ActionOutcome {
  const v = state.virus;
  const lvl = (id: string) => v.adaptations[id] ?? 0;

  if (actionId === 'infect') {
    if (!hexId) return { ok: false, message: 'Select a target hex.' };
    if (!spendVirions(state, BAL.virus.infectVirionCost)) return { ok: false, message: 'Not enough virions.' };
    const target = state.hexes[hexId];
    const def = REGIONS[target.regionId];
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
      const gain = Math.min(BAL.virus.infectGain, BAL.virus.hexCap);
      target.pathogen.viralLoad += gain;
      v.totalViralLoad += gain;
      state.stats.regionsEverInfected.add(target.regionId);
      addLog(state, 'virus', '🧫', `The virus successfully infected cells in ${def.name}.`);
    } else {
      v.virions = Math.max(0, v.virions - BAL.virus.infectFailVirionCost);
      addLog(state, 'virus', '🧫', `The virus failed to infect ${def.name}.`);
    }
    return { ok: true };
  }

  if (actionId === 'replicate') {
    if (!hexId) return { ok: false, message: 'Select a hex.' };
    const hex = state.hexes[hexId];
    const def = REGIONS[hex.regionId];
    if (hex.pathogen.latent) return { ok: false, message: 'This tile is latent — reactivate first.' };
    const rawGain = BAL.virus.replicateGain + (def.traits.virusReplicationBonus ?? 0) + lvl('rapidReplication') * 2;
    let gain = Math.max(1, Math.round(rawGain * feverMultiplier(state) * antiviralMultiplier(state)));
    gain = Math.min(gain, Math.max(0, BAL.virus.hexCap - hex.pathogen.viralLoad));
    hex.pathogen.viralLoad += gain;
    v.totalViralLoad += gain;
    v.virions += gain;
    const dmg = BAL.virus.replicateSelfDamage + lvl('rapidReplication');
    hex.health = clampHealth(hex.health - dmg);
    if (lvl('rapidReplication')) v.mutationInstability = Math.min(100, v.mutationInstability + 3);
    addLog(state, 'virus', '🔁', `Virus replicated in ${def.name} (+${gain} viral load, tissue -${dmg}).`);
    return { ok: true };
  }

  if (actionId === 'burst') {
    if (!hexId) return { ok: false, message: 'Select a hex.' };
    const hex = state.hexes[hexId];
    const def = REGIONS[hex.regionId];
    const consumed = Math.max(1, Math.round(hex.pathogen.viralLoad * BAL.virus.burstFractionConsumed));
    hex.pathogen.viralLoad = Math.max(0, hex.pathogen.viralLoad - consumed);
    v.totalViralLoad = Math.max(0, v.totalViralLoad - consumed);
    const virionGain = BAL.virus.burstVirionGain + lvl('rapidReplication') * 2;
    v.virions += virionGain;
    hex.health = clampHealth(hex.health - BAL.virus.burstSelfDamage);
    gainDetection(state, hexId, BAL.virus.burstDetectionSpike, 'virus');
    addLog(state, 'virus', '💥', `Viral burst in ${def.name}! +${virionGain} virions, but tissue damaged and immune attention rises.`);
    return { ok: true };
  }

  if (actionId === 'latency') {
    if (!hexId) return { ok: false, message: 'Select a hex.' };
    state.hexes[hexId].pathogen.latent = true;
    addLog(state, 'virus', '💤', `Infection in ${REGIONS[state.hexes[hexId].regionId].name} goes latent, hiding from the immune system.`);
    return { ok: true };
  }

  if (actionId === 'evade') {
    if (!hexId) return { ok: false, message: 'Select a hex.' };
    if (!spendVirions(state, BAL.virus.evadeVirionCost)) return { ok: false, message: 'Not enough virions.' };
    reduceDetection(state, hexId, BAL.virus.evadeDetectionReduction + lvl('immuneEvasionV') * 5);
    addLog(state, 'virus', '🫥', `Virus in ${REGIONS[state.hexes[hexId].regionId].name} evades antibody detection.`);
    return { ok: true };
  }

  return { ok: false, message: 'Unknown action.' };
}

export const virusModule: FactionActionModule = {
  catalog: VIRUS_CATALOG,
  getValidTargets: virusValidTargets,
  execute: virusExecute,
};
