import type { FactionId, GameState, RegionId } from './types';
import type { ActionDef, ActionOutcome, FactionActionModule } from './actionTypes';
import { bacteriaModule } from './bacteriaActions';
import { virusModule } from './virusActions';
import { immuneModule } from './immuneActions';

const MODULES: Record<FactionId, FactionActionModule> = {
  bacteria: bacteriaModule,
  virus: virusModule,
  immune: immuneModule,
};

export function getCatalog(faction: FactionId): ActionDef[] {
  return MODULES[faction].catalog;
}

export function getActionDef(faction: FactionId, actionId: string): ActionDef | undefined {
  return MODULES[faction].catalog.find((a) => a.id === actionId);
}

export function getValidTargets(state: GameState, faction: FactionId, actionId: string): RegionId[] {
  return MODULES[faction].getValidTargets(state, actionId);
}

export function executeAction(
  state: GameState,
  faction: FactionId,
  actionId: string,
  regionId: RegionId | null,
): ActionOutcome {
  const def = getActionDef(faction, actionId);
  if (!def) return { ok: false, message: 'Unknown action.' };
  if (state.ap[faction] < def.apCost) return { ok: false, message: 'Not enough action points.' };
  const result = MODULES[faction].execute(state, actionId, regionId);
  if (result.ok) {
    state.ap[faction] -= def.apCost;
  }
  return result;
}
