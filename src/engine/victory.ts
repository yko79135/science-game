import { BAL } from './balance';
import { MAJOR_ORGANS } from './regions';
import { aggregateRegion, countHexesControlled, distinctRegionsControlled, recomputeTotals } from './aggregate';
import type { FactionId, GameState } from './types';
import { addLog } from './log';

function hasFaction(state: GameState, f: FactionId): boolean {
  return (state.settings.players[f] ?? 'none') !== 'none';
}

export function checkVictory(state: GameState): boolean {
  if (state.winner) return true;

  recomputeTotals(state);

  if (state.bodyHealth <= 0) {
    state.winner = 'draw';
    state.endReason = 'hostFailure';
    addLog(state, 'system', '💀', 'HOST FAILURE — Body Health reached 0. The host has died.');
    state.phase = 'gameover';
    return true;
  }

  if (hasFaction(state, 'bacteria')) {
    const hexesControlled = countHexesControlled(state, 'bacteria');
    state.stats.peakHexesControlled.bacteria = Math.max(state.stats.peakHexesControlled.bacteria, hexesControlled);
    const infectedMajorOrgans = MAJOR_ORGANS.filter((id) => aggregateRegion(state, id).hexesWithColony > 0).length;
    if (hexesControlled >= BAL.bacteria.victoryHexesControlled && infectedMajorOrgans >= BAL.bacteria.victoryMajorOrgans) {
      state.winner = 'bacteria';
      state.endReason = 'bacteriaSystemic';
      addLog(state, 'system', '🏆', 'BACTERIA VICTORY — systemic infection established across major organs.');
      state.phase = 'gameover';
      return true;
    }
  }

  if (hasFaction(state, 'virus')) {
    const hexesControlled = countHexesControlled(state, 'virus');
    state.stats.peakHexesControlled.virus = Math.max(state.stats.peakHexesControlled.virus, hexesControlled);
    const infectedRegions = distinctRegionsControlled(state, 'virus');
    if (hexesControlled >= BAL.virus.victoryHexesControlled && infectedRegions >= BAL.virus.victoryRegions) {
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
