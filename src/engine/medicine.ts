import type { GameState } from './types';
import { addLog } from './log';

export function applyAntibiotic(state: GameState) {
  const b = state.bacteria;
  let totalDestroyed = 0;
  let totalSurvived = 0;
  let preResistant = 0;
  let preTotal = 0;
  for (const id in state.hexes) {
    const hex = state.hexes[id];
    const total = hex.pathogen.colonyStrength;
    if (total <= 0) continue;
    const resistantCount = Math.round(total * (b.resistance / 100));
    const susceptibleCount = total - resistantCount;
    const destroyed = Math.round(susceptibleCount * 0.8);
    hex.pathogen.colonyStrength = Math.max(0, total - destroyed);
    totalDestroyed += destroyed;
    totalSurvived += hex.pathogen.colonyStrength;
    preResistant += resistantCount;
    preTotal += total;
  }
  b.totalColonyStrength = Math.max(0, b.totalColonyStrength - totalDestroyed);
  b.biomass = Math.max(0, Math.round(b.biomass * 0.7));
  if (preTotal > 0) {
    const newResistantFraction = preResistant / Math.max(1, totalSurvived);
    const oldResistance = b.resistance;
    b.resistance = Math.min(100, Math.round((b.resistance + newResistantFraction * 100) / 2));
    if (b.resistance > oldResistance) state.stats.resistantEmerged = true;
  }
  addLog(
    state,
    'event',
    '💊',
    `ANTIBIOTIC TREATMENT — ${totalDestroyed} susceptible bacteria destroyed, ${totalSurvived} resistant bacteria survived. Resistance frequency: ${Math.round(b.resistance)}%.`,
  );
}

export function applyAntiviral(state: GameState) {
  const v = state.virus;
  v.antiviralActive = 3;
  const reduction = Math.round(v.virions * 0.3);
  v.virions = Math.max(0, v.virions - reduction);
  addLog(
    state,
    'event',
    '💊',
    `ANTIVIRAL TREATMENT — viral replication suppressed for 3 rounds. Antibiotics would do nothing here; this virus needs a different tool.`,
  );
}

export function applyFeverReducer(state: GameState) {
  const im = state.immune;
  im.fever = Math.max(37, im.fever - 1.5);
  im.immunePoints = Math.max(0, im.immunePoints - 2);
  addLog(
    state,
    'event',
    '💊',
    `FEVER REDUCER administered — fever eased to ${im.fever.toFixed(1)}°C, but immune activity dips slightly this round.`,
  );
}
