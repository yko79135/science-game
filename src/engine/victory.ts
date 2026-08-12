import { BAL } from './balance';
import { MAJOR_ORGANS, REGION_ORDER } from './regions';
import type { FactionId, GameState } from './types';
import { addLog } from './log';

function hasFaction(state: GameState, f: FactionId): boolean {
  return (state.settings.players[f] ?? 'none') !== 'none';
}

export function checkVictory(state: GameState): boolean {
  if (state.winner) return true;

  if (state.bodyHealth <= 0) {
    state.winner = 'draw';
    state.endReason = 'hostFailure';
    addLog(state, 'system', '💀', 'HOST FAILURE — Body Health reached 0. The host has died.');
    state.phase = 'gameover';
    return true;
  }

  if (hasFaction(state, 'bacteria')) {
    const infectedMajorOrgans = MAJOR_ORGANS.filter((id) => state.regions[id].pathogen.colonyStrength > 0).length;
    if (
      state.bacteria.totalColonyStrength >= BAL.bacteria.victoryColonyStrength &&
      infectedMajorOrgans >= BAL.bacteria.victoryMajorOrgans
    ) {
      state.winner = 'bacteria';
      state.endReason = 'bacteriaSystemic';
      addLog(state, 'system', '🏆', 'BACTERIA VICTORY — systemic infection established across major organs.');
      state.phase = 'gameover';
      return true;
    }
  }

  if (hasFaction(state, 'virus')) {
    const infectedRegions = REGION_ORDER.filter((id) => state.regions[id].pathogen.viralLoad > 0).length;
    if (state.virus.totalViralLoad >= BAL.virus.victoryViralLoad && infectedRegions >= BAL.virus.victoryRegions) {
      state.winner = 'virus';
      state.endReason = 'viralOutbreak';
      addLog(state, 'system', '🏆', 'VIRUS VICTORY — viral load has overwhelmed the body\'s defenses.');
      state.phase = 'gameover';
      return true;
    }
  }

  const bacteriaGone = !hasFaction(state, 'bacteria') || state.bacteria.totalColonyStrength <= 0;
  const virusGone = !hasFaction(state, 'virus') || state.virus.totalViralLoad <= 0;
  const anyPathogenInPlay = hasFaction(state, 'bacteria') || hasFaction(state, 'virus');
  if (anyPathogenInPlay && bacteriaGone && virusGone && state.round > state.stats.startRound) {
    state.winner = 'immune';
    state.endReason = 'cleared';
    addLog(state, 'system', '🏆', 'IMMUNE SYSTEM VICTORY — all pathogens have been cleared from the body.');
    state.phase = 'gameover';
    return true;
  }

  if (state.round >= state.settings.maxRounds) {
    if (bacteriaGone && virusGone) {
      state.winner = 'immune';
      state.endReason = 'clearedAtLimit';
    } else {
      state.winner = 'draw';
      state.endReason = 'stalemate';
    }
    addLog(state, 'system', '🏁', `Round limit reached. ${state.winner === 'immune' ? 'The immune system holds the field.' : 'The infection becomes chronic — a stalemate.'}`);
    state.phase = 'gameover';
    return true;
  }

  return false;
}
