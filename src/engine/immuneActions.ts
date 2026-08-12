import { BAL } from './balance';
import { REGIONS, REGION_ORDER } from './regions';
import type { GameState, RegionId } from './types';
import type { ActionDef, ActionOutcome, FactionActionModule } from './actionTypes';
import { addLog, clampHealth } from './log';
import { contestRoll } from './dice';
import { gainDetection } from './detection';

export const IMMUNE_CATALOG: ActionDef[] = [
  {
    id: 'neutrophils',
    faction: 'immune',
    label: 'Deploy Neutrophils',
    icon: '⚪',
    apCost: BAL.immune.neutrophilApCost,
    resourceCost: BAL.immune.neutrophilCost,
    needsTarget: true,
    description: 'Fast, cheap innate response. Weak but always available.',
  },
  {
    id: 'macrophages',
    faction: 'immune',
    label: 'Activate Macrophages',
    icon: '🟡',
    apCost: BAL.immune.macrophageApCost,
    resourceCost: BAL.immune.macrophageCost,
    needsTarget: true,
    description: 'Stronger innate attack. Also helps the immune system learn the threat.',
  },
  {
    id: 'inflammation',
    faction: 'immune',
    label: 'Trigger Inflammation',
    icon: '🔥',
    apCost: BAL.immune.inflammationApCost,
    resourceCost: BAL.immune.inflammationCost,
    needsTarget: true,
    description: 'Boosts local defense and detection, but damages tissue. Watch global levels.',
  },
  {
    id: 'feverUp',
    faction: 'immune',
    label: 'Raise Fever',
    icon: '🌡️',
    apCost: BAL.immune.feverApCost,
    resourceCost: BAL.immune.feverCost,
    needsTarget: false,
    description: 'Raise body temperature to suppress pathogen reproduction body-wide.',
  },
  {
    id: 'feverDown',
    faction: 'immune',
    label: 'Lower Fever',
    icon: '❄️',
    apCost: 1,
    resourceCost: 0,
    needsTarget: false,
    description: 'Ease body temperature back down to reduce strain on the body.',
  },
  {
    id: 'tcells',
    faction: 'immune',
    label: 'Activate T Cells',
    icon: '🟢',
    apCost: BAL.immune.tCellApCost,
    resourceCost: BAL.immune.tCellCost,
    needsTarget: true,
    description: 'Cytotoxic T cells destroy infected cells directly. Requires adaptive immunity vs. virus.',
    requiresAdaptive: true,
  },
  {
    id: 'antibodies',
    faction: 'immune',
    label: 'Produce Antibodies',
    icon: '🔷',
    apCost: BAL.immune.antibodyApCost,
    resourceCost: BAL.immune.antibodyCost,
    needsTarget: false,
    description: 'B cells release antibodies body-wide, weakening pathogens everywhere. Requires adaptive immunity.',
    requiresAdaptive: true,
  },
  {
    id: 'quarantine',
    faction: 'immune',
    label: 'Quarantine Region',
    icon: '🚧',
    apCost: BAL.immune.quarantineApCost,
    resourceCost: BAL.immune.quarantineCost,
    needsTarget: true,
    description: 'Contain a region, making it much harder for pathogens to spread out of it.',
  },
];

function infectedRegions(state: GameState): RegionId[] {
  return REGION_ORDER.filter(
    (id) => state.regions[id].pathogen.colonyStrength > 0 || state.regions[id].pathogen.viralLoad > 0,
  );
}

export function immuneValidTargets(state: GameState, actionId: string): RegionId[] {
  if (actionId === 'neutrophils' || actionId === 'macrophages' || actionId === 'inflammation' || actionId === 'quarantine') {
    return infectedRegions(state);
  }
  if (actionId === 'tcells') {
    return REGION_ORDER.filter((id) => state.regions[id].pathogen.viralLoad > 0 && !state.regions[id].pathogen.latent);
  }
  return [];
}

function spendIP(state: GameState, amount: number): boolean {
  if (state.immune.immunePoints < amount) return false;
  state.immune.immunePoints -= amount;
  return true;
}

function innateAttack(
  state: GameState,
  regionId: RegionId,
  baseBonus: number,
  label: string,
): void {
  const region = state.regions[regionId];
  const def = REGIONS[regionId];
  const targetsBacteria = region.pathogen.colonyStrength >= region.pathogen.viralLoad && region.pathogen.colonyStrength > 0;
  const targetsVirus = !targetsBacteria && region.pathogen.viralLoad > 0;
  const attackerMods = [
    { label: 'Innate strength', value: baseBonus },
    { label: 'Region immune bonus', value: def.traits.immuneBonus ?? 0 },
    { label: 'Fever boost', value: state.immune.fever >= 38.5 ? 1 : 0 },
  ];
  const defenderMods = [
    { label: 'Biofilm', value: region.pathogen.biofilm ? 4 : 0 },
    { label: 'Latency', value: region.pathogen.latent ? 4 : 0 },
    { label: 'Antigenic change', value: (state.virus.adaptations.antigenicChange ?? 0) * 2 },
  ];
  const result = contestRoll(label, attackerMods, `${targetsBacteria ? 'Colony' : 'Infected cells'} defense`, defenderMods);
  state.lastRoll = {
    type: 'contest',
    id: result.attacker.id,
    attacker: result.attacker,
    defender: result.defender,
    attackerLabel: label,
    defenderLabel: 'Pathogen defense',
    attackerWins: result.attackerWins,
  };
  if (result.attackerWins) {
    const dmg = 2 + Math.floor(result.margin / 2);
    if (targetsBacteria) {
      const removed = Math.min(region.pathogen.colonyStrength, dmg);
      region.pathogen.colonyStrength -= removed;
      state.bacteria.totalColonyStrength = Math.max(0, state.bacteria.totalColonyStrength - removed);
      addLog(state, 'immune', '🛡️', `${label} destroyed ${removed} bacterial colony strength in ${def.name}.`);
      if (region.pathogen.colonyStrength === 0) grantMemory(state, 'bacteria', regionId);
    } else if (targetsVirus) {
      const removed = Math.min(region.pathogen.viralLoad, dmg);
      region.pathogen.viralLoad -= removed;
      state.virus.totalViralLoad = Math.max(0, state.virus.totalViralLoad - removed);
      addLog(state, 'immune', '🛡️', `${label} cleared ${removed} infected cells in ${def.name}.`);
      if (region.pathogen.viralLoad === 0) grantMemory(state, 'virus', regionId);
    }
  } else {
    addLog(state, 'immune', '🛡️', `${label} in ${def.name} failed to overcome the pathogen's defenses.`);
  }
}

function grantMemory(state: GameState, faction: 'bacteria' | 'virus', regionId: RegionId) {
  const gain = BAL.immune.memoryGainOnClear + (state.immune.adaptations.immuneMemory ?? 0) * 10;
  if (faction === 'bacteria') {
    state.immune.memoryBacteria = Math.min(100, state.immune.memoryBacteria + gain);
  } else {
    state.immune.memoryVirus = Math.min(100, state.immune.memoryVirus + gain);
  }
  addLog(state, 'immune', '🧠', `${REGIONS[regionId].name} fully cleared. Immune memory strengthened.`);
}

export function immuneExecute(state: GameState, actionId: string, regionId: RegionId | null): ActionOutcome {
  const im = state.immune;
  const lvl = (id: string) => im.adaptations[id] ?? 0;

  if (actionId === 'neutrophils') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    if (!spendIP(state, BAL.immune.neutrophilCost)) return { ok: false, message: 'Not enough immune points.' };
    innateAttack(state, regionId, 2 + lvl('strongerInnateResponse') * 2, 'Neutrophils');
    return { ok: true };
  }

  if (actionId === 'macrophages') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    if (!spendIP(state, BAL.immune.macrophageCost)) return { ok: false, message: 'Not enough immune points.' };
    innateAttack(state, regionId, 4 + lvl('strongerInnateResponse') * 2 + lvl('improvedPhagocytosis') * 2, 'Macrophages');
    const region = state.regions[regionId];
    const isBacteria = region.pathogen.colonyStrength > 0;
    gainDetection(state, regionId, BAL.immune.macrophageDetectionGain, isBacteria ? 'bacteria' : 'virus');
    return { ok: true };
  }

  if (actionId === 'inflammation') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    if (!spendIP(state, BAL.immune.inflammationCost)) return { ok: false, message: 'Not enough immune points.' };
    const region = state.regions[regionId];
    const def = REGIONS[regionId];
    const gain = BAL.immune.inflammationGain;
    region.pathogen.inflammation = Math.min(100, region.pathogen.inflammation + gain);
    im.globalInflammation = Math.min(200, im.globalInflammation + gain * 0.5);
    const control = lvl('inflammationControl');
    const dmg = Math.max(0, BAL.immune.inflammationDamage - control * 1.5);
    region.health = clampHealth(region.health - dmg);
    const isBacteria = region.pathogen.colonyStrength > 0;
    gainDetection(state, regionId, 4, isBacteria ? 'bacteria' : 'virus');
    addLog(state, 'immune', '🔥', `Inflammation triggered in ${def.name}: defenses up, tissue -${dmg.toFixed(1)}.`);
    return { ok: true };
  }

  if (actionId === 'feverUp') {
    if (!spendIP(state, BAL.immune.feverCost)) return { ok: false, message: 'Not enough immune points.' };
    im.fever = Math.min(BAL.immune.feverMax, im.fever + BAL.immune.feverStep);
    addLog(state, 'immune', '🌡️', `Fever raised to ${im.fever.toFixed(1)}°C.`);
    return { ok: true };
  }

  if (actionId === 'feverDown') {
    im.fever = Math.max(BAL.immune.feverMin, im.fever - BAL.immune.feverStep);
    addLog(state, 'immune', '❄️', `Fever eased to ${im.fever.toFixed(1)}°C.`);
    return { ok: true };
  }

  if (actionId === 'tcells') {
    if (!im.adaptiveVsVirus) return { ok: false, message: 'Adaptive immunity vs. virus not yet active.' };
    if (!regionId) return { ok: false, message: 'Select an infected region.' };
    if (!spendIP(state, BAL.immune.tCellCost)) return { ok: false, message: 'Not enough immune points.' };
    const region = state.regions[regionId];
    const def = REGIONS[regionId];
    const bonus = 5 + lvl('cytotoxicTCells') * 3;
    const attackerMods = [{ label: 'Cytotoxic T cells', value: bonus }];
    const defenderMods = [{ label: 'Antigenic change', value: (state.virus.adaptations.antigenicChange ?? 0) * 2 }];
    const result = contestRoll('T Cells', attackerMods, 'Infected cell defense', defenderMods);
    state.lastRoll = {
      type: 'contest',
      id: result.attacker.id,
      attacker: result.attacker,
      defender: result.defender,
      attackerLabel: 'T Cells',
      defenderLabel: 'Infected cell defense',
      attackerWins: result.attackerWins,
    };
    if (result.attackerWins) {
      const removed = Math.min(region.pathogen.viralLoad, 5 + Math.floor(result.margin / 2));
      region.pathogen.viralLoad -= removed;
      state.virus.totalViralLoad = Math.max(0, state.virus.totalViralLoad - removed);
      region.health = clampHealth(region.health - 2);
      addLog(state, 'immune', '🟢', `T cells destroyed ${removed} infected cells in ${def.name} (minor tissue damage).`);
      if (region.pathogen.viralLoad === 0) grantMemory(state, 'virus', regionId);
    } else {
      addLog(state, 'immune', '🟢', `T cells could not locate enough infected cells in ${def.name}.`);
    }
    return { ok: true };
  }

  if (actionId === 'antibodies') {
    if (!im.adaptiveVsBacteria && !im.adaptiveVsVirus) return { ok: false, message: 'Adaptive immunity not yet active.' };
    if (!spendIP(state, BAL.immune.antibodyCost)) return { ok: false, message: 'Not enough immune points.' };
    const strength = 2 + lvl('antibodyProduction') * 2;
    let totalHit = 0;
    for (const id of REGION_ORDER) {
      const region = state.regions[id];
      if (im.adaptiveVsBacteria && region.pathogen.colonyStrength > 0) {
        region.pathogen.antibodiesPresent = true;
        const removed = Math.min(region.pathogen.colonyStrength, strength);
        region.pathogen.colonyStrength -= removed;
        state.bacteria.totalColonyStrength = Math.max(0, state.bacteria.totalColonyStrength - removed);
        totalHit += removed;
        if (region.pathogen.colonyStrength === 0) grantMemory(state, 'bacteria', id);
      }
      if (im.adaptiveVsVirus && region.pathogen.viralLoad > 0 && !region.pathogen.latent) {
        region.pathogen.antibodiesPresent = true;
        const removed = Math.min(region.pathogen.viralLoad, strength);
        region.pathogen.viralLoad -= removed;
        state.virus.totalViralLoad = Math.max(0, state.virus.totalViralLoad - removed);
        totalHit += removed;
        if (region.pathogen.viralLoad === 0) grantMemory(state, 'virus', id);
      }
    }
    im.antibodiesProduced += 1;
    state.stats.antibodiesProduced += 1;
    addLog(state, 'immune', '🔷', `Antibodies deployed body-wide, neutralizing ${totalHit} pathogen strength across all regions.`);
    return { ok: true };
  }

  if (actionId === 'quarantine') {
    if (!regionId) return { ok: false, message: 'Select a region.' };
    if (!spendIP(state, BAL.immune.quarantineCost)) return { ok: false, message: 'Not enough immune points.' };
    state.regions[regionId].pathogen.quarantined = true;
    addLog(state, 'immune', '🚧', `${REGIONS[regionId].name} placed under quarantine, limiting further spread.`);
    return { ok: true };
  }

  return { ok: false, message: 'Unknown action.' };
}

export const immuneModule: FactionActionModule = {
  catalog: IMMUNE_CATALOG,
  getValidTargets: immuneValidTargets,
  execute: immuneExecute,
};
