import { BAL } from './balance';
import { REGIONS } from './regions';
import type { GameState } from './types';
import { addLog, clampHealth } from './log';
import { recomputeBodyHealth } from './bodyHealth';
import { recomputeTotals } from './aggregate';
import { checkAdaptiveUnlock, gainDetection } from './detection';
import { rollRandomEvent } from './events';

function hasFaction(state: GameState, f: 'bacteria' | 'virus'): boolean {
  return (state.settings.players[f] ?? 'none') !== 'none';
}

export function runBodyPhase(state: GameState) {
  addLog(state, 'system', '📅', `— Round ${state.round} begins —`);

  for (const id in state.hexes) {
    const hex = state.hexes[id];
    const def = REGIONS[hex.regionId];
    const infected = hex.pathogen.colonyStrength > 0 || hex.pathogen.viralLoad > 0;

    const feverPenalty = state.immune.fever > 37 ? (state.immune.fever - 37) * 0.35 : 0;
    const highConsequence = def.traits.highConsequence ?? 1;
    if (feverPenalty > 0) {
      hex.health = clampHealth(hex.health - feverPenalty * (highConsequence > 1.3 ? 1.4 : 0.7));
    }

    if (hex.pathogen.colonyStrength > 0) {
      const dmg = Math.min(6, hex.pathogen.colonyStrength * 0.12) * highConsequence;
      hex.health = clampHealth(hex.health - dmg);
    }
    if (hex.pathogen.viralLoad > 0 && !hex.pathogen.latent) {
      const dmg = Math.min(7, hex.pathogen.viralLoad * 0.16) * highConsequence;
      hex.health = clampHealth(hex.health - dmg);
    }

    if (def.traits.microbiome !== undefined) {
      if (hex.pathogen.colonyStrength > 0) {
        hex.microbiome = Math.max(0, hex.microbiome - hex.pathogen.colonyStrength * 0.3);
      } else {
        hex.microbiome = Math.min(def.traits.microbiome, hex.microbiome + BAL.microbiomeRegenPerRound);
      }
    }

    if (!infected) {
      hex.health = clampHealth(hex.health + BAL.hexRegenPerRound);
    }

    hex.pathogen.inflammation = Math.max(0, hex.pathogen.inflammation - 8);
    if (hex.pathogen.quarantined && Math.random() < BAL.immune.quarantineDecay) {
      hex.pathogen.quarantined = false;
    }

    if (hex.pathogen.colonyStrength > 0) {
      const evasion = state.bacteria.adaptations.immuneEvasion ?? 0;
      gainDetection(state, id, BAL.immune.detectionPassiveGain * Math.max(0.2, 1 - evasion * 0.3), 'bacteria');
    }
    if (hex.pathogen.viralLoad > 0 && !hex.pathogen.latent) {
      const evasion = state.virus.adaptations.immuneEvasionV ?? 0;
      gainDetection(state, id, BAL.immune.detectionPassiveGain * Math.max(0.2, 1 - evasion * 0.3), 'virus');
    }
  }

  state.immune.globalInflammation = Math.max(0, state.immune.globalInflammation - 10);

  if (hasFaction(state, 'bacteria')) checkAdaptiveUnlock(state, 'bacteria');
  if (hasFaction(state, 'virus')) checkAdaptiveUnlock(state, 'virus');

  recomputeTotals(state);

  const passiveBiomass = Math.round(state.bacteria.totalColonyStrength * BAL.bacteria.passiveBiomassPerColony) + 2;
  state.bacteria.biomass += passiveBiomass;
  state.virus.virions = Math.max(0, Math.round(state.virus.virions * 0.9));
  if (state.virus.antiviralActive > 0) state.virus.antiviralActive -= 1;

  const intelBonus = Math.floor((state.immune.detectionBacteria + state.immune.detectionVirus) / 40);
  state.immune.immunePoints += BAL.immune.ipBasePerRound + intelBonus;

  if (state.immune.globalInflammation >= BAL.cytokineStormThreshold) {
    state.stats.cytokineStorms += 1;
    for (const id in state.hexes) {
      state.hexes[id].health = clampHealth(state.hexes[id].health - BAL.cytokineStormBodyDamage);
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
  recomputeTotals(state);
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
