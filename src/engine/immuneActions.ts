import { BAL } from './balance';
import { REGIONS } from './regions';
import type { GameState, HexId } from './types';
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
    label: 'Quarantine Tile',
    icon: '🚧',
    apCost: BAL.immune.quarantineApCost,
    resourceCost: BAL.immune.quarantineCost,
    needsTarget: true,
    description: 'Contain a tile, making it much harder for pathogens to spread out of it.',
  },
];

function infectedHexes(state: GameState): HexId[] {
  return Object.keys(state.hexes).filter(
    (id) => state.hexes[id].pathogen.colonyStrength > 0 || state.hexes[id].pathogen.viralLoad > 0,
  );
}

export function immuneValidTargets(state: GameState, actionId: string): HexId[] {
  if (actionId === 'neutrophils' || actionId === 'macrophages' || actionId === 'inflammation' || actionId === 'quarantine') {
    return infectedHexes(state);
  }
  if (actionId === 'tcells') {
    return Object.keys(state.hexes).filter((id) => state.hexes[id].pathogen.viralLoad > 0 && !state.hexes[id].pathogen.latent);
  }
  return [];
}

function spendIP(state: GameState, amount: number): boolean {
  if (state.immune.immunePoints < amount) return false;
  state.immune.immunePoints -= amount;
  return true;
}

function innateAttack(state: GameState, hexId: HexId, baseBonus: number, label: string): void {
  const hex = state.hexes[hexId];
  const def = REGIONS[hex.regionId];
  const targetsBacteria = hex.pathogen.colonyStrength >= hex.pathogen.viralLoad && hex.pathogen.colonyStrength > 0;
  const targetsVirus = !targetsBacteria && hex.pathogen.viralLoad > 0;
  const attackerMods = [
    { label: 'Innate strength', value: baseBonus },
    { label: 'Region immune bonus', value: def.traits.immuneBonus ?? 0 },
    { label: 'Fever boost', value: state.immune.fever >= 38.5 ? 1 : 0 },
  ];
  const defenderMods = [
    { label: 'Biofilm', value: hex.pathogen.biofilm ? 4 : 0 },
    { label: 'Latency', value: hex.pathogen.latent ? 4 : 0 },
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
      const removed = Math.min(hex.pathogen.colonyStrength, dmg);
      hex.pathogen.colonyStrength -= removed;
      state.bacteria.totalColonyStrength = Math.max(0, state.bacteria.totalColonyStrength - removed);
      addLog(state, 'immune', '🛡️', `${label} destroyed ${removed} bacterial colony strength in ${def.name}.`);
      if (hex.pathogen.colonyStrength === 0) grantMemory(state, 'bacteria', hexId);
    } else if (targetsVirus) {
      const removed = Math.min(hex.pathogen.viralLoad, dmg);
      hex.pathogen.viralLoad -= removed;
      state.virus.totalViralLoad = Math.max(0, state.virus.totalViralLoad - removed);
      addLog(state, 'immune', '🛡️', `${label} cleared ${removed} infected cells in ${def.name}.`);
      if (hex.pathogen.viralLoad === 0) grantMemory(state, 'virus', hexId);
    }
  } else {
    addLog(state, 'immune', '🛡️', `${label} in ${def.name} failed to overcome the pathogen's defenses.`);
  }
}

function grantMemory(state: GameState, faction: 'bacteria' | 'virus', hexId: HexId) {
  const gain = BAL.immune.memoryGainOnClear + (state.immune.adaptations.immuneMemory ?? 0) * 10;
  if (faction === 'bacteria') {
    state.immune.memoryBacteria = Math.min(100, state.immune.memoryBacteria + gain);
  } else {
    state.immune.memoryVirus = Math.min(100, state.immune.memoryVirus + gain);
  }
  addLog(state, 'immune', '🧠', `A tile in ${REGIONS[state.hexes[hexId].regionId].name} fully cleared. Immune memory strengthened.`);
}

export function immuneExecute(state: GameState, actionId: string, hexId: HexId | null): ActionOutcome {
  const im = state.immune;
  const lvl = (id: string) => im.adaptations[id] ?? 0;

  if (actionId === 'neutrophils') {
    if (!hexId) return { ok: false, message: 'Select a hex.' };
    if (!spendIP(state, BAL.immune.neutrophilCost)) return { ok: false, message: 'Not enough immune points.' };
    innateAttack(state, hexId, 2 + lvl('strongerInnateResponse') * 2, 'Neutrophils');
    return { ok: true };
  }

  if (actionId === 'macrophages') {
    if (!hexId) return { ok: false, message: 'Select a hex.' };
    if (!spendIP(state, BAL.immune.macrophageCost)) return { ok: false, message: 'Not enough immune points.' };
    innateAttack(state, hexId, 3 + lvl('strongerInnateResponse') * 2 + lvl('improvedPhagocytosis') * 2, 'Macrophages');
    const hex = state.hexes[hexId];
    const isBacteria = hex.pathogen.colonyStrength > 0;
    gainDetection(state, hexId, BAL.immune.macrophageDetectionGain, isBacteria ? 'bacteria' : 'virus');
    return { ok: true };
  }

  if (actionId === 'inflammation') {
    if (!hexId) return { ok: false, message: 'Select a hex.' };
    if (!spendIP(state, BAL.immune.inflammationCost)) return { ok: false, message: 'Not enough immune points.' };
    const hex = state.hexes[hexId];
    const def = REGIONS[hex.regionId];
    const gain = BAL.immune.inflammationGain;
    hex.pathogen.inflammation = Math.min(100, hex.pathogen.inflammation + gain);
    im.globalInflammation = Math.min(200, im.globalInflammation + gain * 0.5);
    const control = lvl('inflammationControl');
    const dmg = Math.max(0, BAL.immune.inflammationDamage - control * 1.5);
    hex.health = clampHealth(hex.health - dmg);
    const isBacteria = hex.pathogen.colonyStrength > 0;
    gainDetection(state, hexId, 4, isBacteria ? 'bacteria' : 'virus');
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
    if (!hexId) return { ok: false, message: 'Select an infected hex.' };
    if (!spendIP(state, BAL.immune.tCellCost)) return { ok: false, message: 'Not enough immune points.' };
    const hex = state.hexes[hexId];
    const def = REGIONS[hex.regionId];
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
      const removed = Math.min(hex.pathogen.viralLoad, 5 + Math.floor(result.margin / 2));
      hex.pathogen.viralLoad -= removed;
      state.virus.totalViralLoad = Math.max(0, state.virus.totalViralLoad - removed);
      hex.health = clampHealth(hex.health - 2);
      addLog(state, 'immune', '🟢', `T cells destroyed ${removed} infected cells in ${def.name} (minor tissue damage).`);
      if (hex.pathogen.viralLoad === 0) grantMemory(state, 'virus', hexId);
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
    for (const id of Object.keys(state.hexes)) {
      const hex = state.hexes[id];
      if (im.adaptiveVsBacteria && hex.pathogen.colonyStrength > 0) {
        hex.pathogen.antibodiesPresent = true;
        const removed = Math.min(hex.pathogen.colonyStrength, strength);
        hex.pathogen.colonyStrength -= removed;
        state.bacteria.totalColonyStrength = Math.max(0, state.bacteria.totalColonyStrength - removed);
        totalHit += removed;
        if (hex.pathogen.colonyStrength === 0) grantMemory(state, 'bacteria', id);
      }
      if (im.adaptiveVsVirus && hex.pathogen.viralLoad > 0 && !hex.pathogen.latent) {
        hex.pathogen.antibodiesPresent = true;
        const removed = Math.min(hex.pathogen.viralLoad, strength);
        hex.pathogen.viralLoad -= removed;
        state.virus.totalViralLoad = Math.max(0, state.virus.totalViralLoad - removed);
        totalHit += removed;
        if (hex.pathogen.viralLoad === 0) grantMemory(state, 'virus', id);
      }
    }
    im.antibodiesProduced += 1;
    state.stats.antibodiesProduced += 1;
    addLog(state, 'immune', '🔷', `Antibodies deployed body-wide, neutralizing ${totalHit} pathogen strength across all tissue.`);
    return { ok: true };
  }

  if (actionId === 'quarantine') {
    if (!hexId) return { ok: false, message: 'Select a hex.' };
    if (!spendIP(state, BAL.immune.quarantineCost)) return { ok: false, message: 'Not enough immune points.' };
    state.hexes[hexId].pathogen.quarantined = true;
    addLog(state, 'immune', '🚧', `A tile in ${REGIONS[state.hexes[hexId].regionId].name} placed under quarantine, limiting further spread.`);
    return { ok: true };
  }

  return { ok: false, message: 'Unknown action.' };
}

export const immuneModule: FactionActionModule = {
  catalog: IMMUNE_CATALOG,
  getValidTargets: immuneValidTargets,
  execute: immuneExecute,
};
