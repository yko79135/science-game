import { create } from 'zustand';
import { produce, enableMapSet } from 'immer';

enableMapSet();
import { createInitialState } from './engine/state';
import { getScenario } from './engine/scenarios';
import { runBodyPhase, nextPhaseAfter } from './engine/body';
import { checkVictory } from './engine/victory';
import { executeAction } from './engine/actions';
import { buyAdaptation } from './engine/adaptationSystem';
import { adaptationsFor } from './engine/adaptations';
import { runAiTurn } from './engine/ai';
import { saveGame, loadGame, clearSavedGame } from './engine/persistence';
import type { FactionId, GameSettings, GameState, RegionId } from './engine/types';

type View = 'menu' | 'playing';

interface StoreState {
  view: View;
  game: GameState | null;
  tutorialActive: boolean;
  selectedRegion: RegionId | null;
  selectedAction: string | null;
  toast: string | null;
  codexOpen: boolean;
  upgradesOpen: boolean;
  hasSave: boolean;

  startGame: (settings: GameSettings) => void;
  continueSavedGame: () => void;
  goToMenu: () => void;
  startTutorial: () => void;
  exitTutorial: () => void;

  selectRegion: (id: RegionId | null) => void;
  selectAction: (id: string | null) => void;
  performAction: (actionId: string, regionId: RegionId | null) => void;
  buyUpgrade: (adaptationId: string) => void;
  endHumanTurn: () => void;
  setCodexOpen: (open: boolean) => void;
  setUpgradesOpen: (open: boolean) => void;
  dismissToast: () => void;
}

function isHumanFactionPhase(state: GameState): boolean {
  const phase = state.phase;
  if (phase !== 'bacteria' && phase !== 'virus' && phase !== 'immune') return false;
  return state.settings.players[phase] === 'human';
}

export const useGameStore = create<StoreState>((set, get) => {
  function stepAdvance() {
    const s = get().game;
    if (!s || s.phase === 'gameover') return;
    if (isHumanFactionPhase(s)) return;

    set(
      produce((draft: StoreState) => {
        const g = draft.game!;
        if (g.phase === 'body') {
          runBodyPhase(g);
          g.phase = nextPhaseAfter(g);
        } else if (g.phase === 'resolution') {
          const ended = checkVictory(g);
          if (!ended) {
            g.round += 1;
            g.phase = 'body';
          }
        } else {
          const faction = g.phase as FactionId;
          runAiTurn(g, faction, g.settings.aiDifficulty);
          g.ap[faction] = 0;
          g.phase = nextPhaseAfter(g);
        }
        draft.selectedAction = null;
        draft.selectedRegion = null;
      }),
    );

    const ns = get().game;
    const tutorial = get().tutorialActive;
    if (ns && ns.phase === 'gameover') {
      if (!tutorial) {
        clearSavedGame();
        set({ hasSave: false });
      }
      return;
    }
    if (ns && !tutorial) saveGame(ns);
    if (!ns) return;
    setTimeout(stepAdvance, 260);
  }

  return {
    view: 'menu',
    game: null,
    tutorialActive: false,
    selectedRegion: null,
    selectedAction: null,
    toast: null,
    codexOpen: false,
    upgradesOpen: false,
    hasSave: !!loadGame(),

    startGame: (settings) => {
      const state = createInitialState(settings);
      const scenario = getScenario(settings.scenarioId);
      scenario.seed(state);
      clearSavedGame();
      set({ view: 'playing', game: state, tutorialActive: false, selectedRegion: null, selectedAction: null, toast: null });
      stepAdvance();
    },

    continueSavedGame: () => {
      const saved = loadGame();
      if (!saved) return;
      set({ view: 'playing', game: saved, tutorialActive: false, selectedRegion: null, selectedAction: null, toast: null });
      stepAdvance();
    },

    goToMenu: () => {
      set({ view: 'menu', game: null, tutorialActive: false, hasSave: !!loadGame() });
    },

    startTutorial: () => {
      const settings: GameSettings = {
        players: { bacteria: 'human', virus: 'none', immune: 'ai' },
        aiDifficulty: 'easy',
        maxRounds: 10,
        medicine: 'off',
        scenarioId: 'skinWound',
      };
      const state = createInitialState(settings);
      getScenario('skinWound').seed(state);
      set({ view: 'playing', game: state, tutorialActive: true, selectedRegion: null, selectedAction: null, toast: null });
      stepAdvance();
    },
    exitTutorial: () => set({ view: 'menu', game: null, tutorialActive: false }),

    selectRegion: (id) => set({ selectedRegion: id }),
    selectAction: (id) => set((s) => ({ selectedAction: id, selectedRegion: id ? s.selectedRegion : null })),

    performAction: (actionId, regionId) => {
      set(
        produce((draft: StoreState) => {
          const g = draft.game!;
          const faction = g.phase as FactionId;
          const result = executeAction(g, faction, actionId, regionId);
          draft.toast = result.ok ? null : result.message ?? 'Action failed.';
          if (result.ok) {
            draft.selectedAction = null;
          }
        }),
      );
      const ns = get().game;
      if (ns && !get().tutorialActive) saveGame(ns);
    },

    buyUpgrade: (adaptationId) => {
      set(
        produce((draft: StoreState) => {
          const g = draft.game!;
          const faction = g.phase as FactionId;
          const def = adaptationsFor(faction).find((a) => a.id === adaptationId);
          if (!def) return;
          if (g.ap[faction] < def.apCost) {
            draft.toast = 'Not enough action points.';
            return;
          }
          const result = buyAdaptation(g, faction, adaptationId);
          if (result.ok) {
            g.ap[faction] -= def.apCost;
            draft.toast = null;
          } else {
            draft.toast = result.message ?? 'Cannot purchase.';
          }
        }),
      );
      const ns = get().game;
      if (ns && !get().tutorialActive) saveGame(ns);
    },

    endHumanTurn: () => {
      set(
        produce((draft: StoreState) => {
          const g = draft.game!;
          const faction = g.phase as FactionId;
          g.ap[faction] = 0;
          g.phase = nextPhaseAfter(g);
          draft.selectedAction = null;
          draft.selectedRegion = null;
        }),
      );
      const ns = get().game;
      if (ns && !get().tutorialActive) saveGame(ns);
      stepAdvance();
    },

    setCodexOpen: (open) => set({ codexOpen: open }),
    setUpgradesOpen: (open) => set({ upgradesOpen: open }),
    dismissToast: () => set({ toast: null }),
  };
});
