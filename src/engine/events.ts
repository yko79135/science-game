import type { GameState } from './types';
import { addLog, clampHealth } from './log';
import { applyAntibiotic, applyAntiviral, applyFeverReducer } from './medicine';

interface EventDef {
  id: string;
  name: string;
  weight: (state: GameState) => number;
  apply: (state: GameState) => void;
}

const hasFaction = (state: GameState, f: 'bacteria' | 'virus') =>
  (state.settings.players[f] ?? 'none') !== 'none';

const EVENTS: EventDef[] = [
  {
    id: 'poorSleep',
    name: 'Poor Sleep',
    weight: () => 3,
    apply: (state) => {
      state.immune.immunePoints = Math.max(0, state.immune.immunePoints - 1);
      addLog(state, 'event', '😴', 'POOR SLEEP — immune point generation is down this round.');
    },
  },
  {
    id: 'goodSleep',
    name: "Good Night's Sleep",
    weight: () => 3,
    apply: (state) => {
      state.immune.immunePoints += 2;
      addLog(state, 'event', '😌', "GOOD NIGHT'S SLEEP — immune points +2.");
    },
  },
  {
    id: 'dehydration',
    name: 'Dehydration',
    weight: () => 2,
    apply: (state) => {
      state.regions.kidneys.health = clampHealth(state.regions.kidneys.health - 6);
      addLog(state, 'event', '💧', 'DEHYDRATION — kidney effectiveness reduced.');
    },
  },
  {
    id: 'stress',
    name: 'Stress',
    weight: () => 2,
    apply: (state) => {
      state.immune.immunePoints = Math.max(0, state.immune.immunePoints - 2);
      addLog(state, 'event', '😰', 'STRESS — immune effectiveness temporarily reduced.');
    },
  },
  {
    id: 'balancedMeal',
    name: 'Balanced Meal',
    weight: () => 2,
    apply: (state) => {
      state.regions.intestines.microbiome = Math.min(100, state.regions.intestines.microbiome + 10);
      addLog(state, 'event', '🥗', 'BALANCED MEAL — the gut microbiome gets a boost.');
    },
  },
  {
    id: 'skinWound',
    name: 'Skin Wound',
    weight: (state) => (hasFaction(state, 'bacteria') && state.regions.skin.pathogen.colonyStrength === 0 ? 2 : 0),
    apply: (state) => {
      state.regions.skin.pathogen.colonyStrength = 2;
      state.bacteria.totalColonyStrength += 2;
      state.stats.regionsEverInfected.add('skin');
      addLog(state, 'event', '🩹', 'SKIN WOUND — bacteria gain a new entry point at the skin.');
    },
  },
  {
    id: 'coughing',
    name: 'Coughing',
    weight: (state) => (hasFaction(state, 'virus') && state.virus.totalViralLoad > 0 ? 2 : 0),
    apply: (state) => {
      state.virus.virions = Math.max(0, state.virus.virions - 3);
      state.stats.transmissionBonus += 1;
      addLog(state, 'event', '🤧', 'COUGHING — the virus loses some virions, but gains a transmission opportunity.');
    },
  },
  {
    id: 'antibiotic',
    name: 'Antibiotic Prescribed',
    weight: (state) =>
      state.settings.medicine === 'on' && hasFaction(state, 'bacteria') && state.bacteria.totalColonyStrength >= 8 ? 4 : 0,
    apply: applyAntibiotic,
  },
  {
    id: 'antiviral',
    name: 'Antiviral Treatment',
    weight: (state) =>
      state.settings.medicine === 'on' && hasFaction(state, 'virus') && state.virus.totalViralLoad >= 8 && state.virus.antiviralActive === 0 ? 4 : 0,
    apply: applyAntiviral,
  },
  {
    id: 'feverReducer',
    name: 'Fever Reducer',
    weight: (state) => (state.settings.medicine === 'on' && state.immune.fever >= 39.5 ? 3 : 0),
    apply: applyFeverReducer,
  },
];

export function rollRandomEvent(state: GameState) {
  if (state.round <= 1) return;
  if (Math.random() > 0.6) return;
  const eligible = EVENTS.map((e) => ({ e, w: e.weight(state) })).filter((x) => x.w > 0);
  if (eligible.length === 0) return;
  const total = eligible.reduce((s, x) => s + x.w, 0);
  let roll = Math.random() * total;
  for (const { e, w } of eligible) {
    roll -= w;
    if (roll <= 0) {
      e.apply(state);
      return;
    }
  }
}
