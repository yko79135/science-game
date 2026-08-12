import type { DiceResult } from './types';

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `dice-${idCounter}-${Date.now()}`;
}

export function rollDie(sides = 10): number {
  return 1 + Math.floor(Math.random() * sides);
}

export interface RollOptions {
  label: string;
  sides?: number;
  modifiers?: { label: string; value: number }[];
  threshold: number;
}

export function performRoll(opts: RollOptions): DiceResult {
  const sides = opts.sides ?? 10;
  const roll = rollDie(sides);
  const modTotal = (opts.modifiers ?? []).reduce((s, m) => s + m.value, 0);
  const total = roll + modTotal;
  return {
    id: nextId(),
    label: opts.label,
    roll,
    sides,
    modifiers: opts.modifiers ?? [],
    total,
    threshold: opts.threshold,
    success: total >= opts.threshold,
  };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export interface ContestResult {
  attacker: DiceResult;
  defender: DiceResult;
  attackerWins: boolean;
  margin: number;
}

export function contestRoll(
  attackerLabel: string,
  attackerMods: { label: string; value: number }[],
  defenderLabel: string,
  defenderMods: { label: string; value: number }[],
): ContestResult {
  const attacker = performRoll({ label: attackerLabel, modifiers: attackerMods, threshold: 0 });
  const defender = performRoll({ label: defenderLabel, modifiers: defenderMods, threshold: 0 });
  const attackerWins = attacker.total >= defender.total;
  return { attacker, defender, attackerWins, margin: Math.abs(attacker.total - defender.total) };
}
