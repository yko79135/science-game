import { BAL } from './balance';
import { REGION_ORDER, REGIONS } from './regions';
import type { GameState } from './types';
import { addLog, clampHealth } from './log';
import { recomputeBodyHealth } from './bodyHealth';
import { checkAdaptiveUnlock, gainDetection } from './detection';
import { rollRandomEvent } from './events';

function hasFaction(state: GameState, f: 'bacteria' | 'virus'): boolean {
  return (state.settings.players[f] ?? 'none') !== 'none';
}

export function runBodyPhase(state: GameState) {
  addLog(state, 'system', '📅', `— Round ${state.round} begins —`);

  for (const id of REGION_ORDER) {
    const region = state.regions[id];
    const def = REGIONS[id];
    const infected = region.pathogen.colonyStrength > 0 || region.pathogen.viralLoad > 0;

    const feverPenalty = state.immune.fever > 37 ? (state.immune.fever - 37) * 0.35 : 0;
    const highConsequence = def.traits.highConsequence ?? 1;
    if (feverPenalty > 0) {
      region.health = clampHealth(region.health - feverPenalty * (highConsequence > 1.3 ? 1.4 : 0.7));
    }

    if (region.pathogen.colonyStrength > 0) {
      const dmg = Math.min(6, region.pathogen.colonyStrength * 0.12) * highConsequence;
      region.health = clampHealth(region.health - dmg);
    }
    if (region.pathogen.viralLoad > 0 && !region.pathogen.latent) {
      const dmg = Math.min(7, region.pathogen.viralLoad * 0.16) * highConsequence;
      region.health = clampHealth(region.health - dmg);
    }

    if (def.traits.microbiome !== undefined) {
      if (region.pathogen.colonyStrength > 0) {
        region.microbiome = Math.max(0, region.microbiome - region.pathogen.colonyStrength * 0.3);
      } else {
        region.microbiome = Math.min(def.traits.microbiome, region.microbiome + BAL.microbiomeRegenPerRound);
      }
    }

    if (!infected) {
      region.health = clampHealth(region.health + BAL.regionRegenPerRound);
    }

    region.pathogen.inflammation = Math.max(0, region.pathogen.inflammation - 8);
    if (region.pathogen.quarantined && Math.random() < BAL.immune.quarantineDecay) {
      region.pathogen.quarantined = false;
    }

    if (region.pathogen.colonyStrength > 0) {
      const evasion = state.bacteria.adaptations.immuneEvasion ?? 0;
      gainDetection(state, id, BAL.immune.detectionPassiveGain * Math.max(0.2, 1 - evasion * 0.3), 'bacteria');
    }
    if (region.pathogen.viralLoad > 0 && !region.pathogen.latent) {
      const evasion = state.virus.adaptations.immuneEvasionV ?? 0;
      gainDetection(state, id, BAL.immune.detectionPassiveGain * Math.max(0.2, 1 - evasion * 0.3), 'virus');
    }
  }

  state.immune.globalInflammation = Math.max(0, state.immune.globalInflammation - 10);

  if (hasFaction(state, 'bacteria')) checkAdaptiveUnlock(state, 'bacteria');
  if (hasFaction(state, 'virus')) checkAdaptiveUnlock(state, 'virus');

  const passiveBiomass = Math.round(state.bacteria.totalColonyStrength * BAL.bacteria.passiveBiomassPerColony) + 2;
  state.bacteria.biomass += passiveBiomass;
  state.virus.virions = Math.max(0, Math.round(state.virus.virions * 0.9));
  if (state.virus.antiviralActive > 0) state.virus.antiviralActive -= 1;

  const intelBonus = Math.floor((state.immune.detectionBacteria + state.immune.detectionVirus) / 40);
  state.immune.immunePoints += BAL.immune.ipBasePerRound + intelBonus;

  if (state.immune.globalInflammation >= BAL.cytokineStormThreshold) {
    state.stats.cytokineStorms += 1;
    for (const id of REGION_ORDER) {
      state.regions[id].health = clampHealth(state.regions[id].health - BAL.cytokineStormBodyDamage / REGION_ORDER.length * 3);
    }
    state.immune.immunePoints = Math.max(0, state.immune.immunePoints - 6);
    state.immune.globalInflammation = Math.max(0, state.immune.globalInflammation - 30);
    addLog(
      state,
      'body',
      '⚡',
      'CYTOKINE STORM — excessive systemic inflammation causes severe body-wide damage and weakens the immune response.',
    );
  }

  recomputeBodyHealth(state);
  rollRandomEvent(state);
  recomputeBodyHealth(state);

  state.stats.peakColonyStrength = Math.max(state.stats.peakColonyStrength, state.bacteria.totalColonyStrength);
  state.stats.peakViralLoad = Math.max(state.stats.peakViralLoad, state.virus.totalViralLoad);

  state.ap = {
    bacteria: BAL.ap.bacteria,
    virus: BAL.ap.virus,
    immune: BAL.ap.immune,
  };
}

export function nextPhaseAfter(state: GameState): GameState['phase'] {
  if (state.phase === 'body') {
    if (hasFaction(state, 'bacteria')) return 'bacteria';
    if (hasFaction(state, 'virus')) return 'virus';
    return 'immune';
  }
  if (state.phase === 'bacteria') {
    if (hasFaction(state, 'virus')) return 'virus';
    return 'immune';
  }
  if (state.phase === 'virus') {
    return 'immune';
  }
  if (state.phase === 'immune') {
    return 'resolution';
  }
  return 'body';
}
