import type { FactionId, GameState, RegionId } from './types';

export interface ActionDef {
  id: string;
  faction: FactionId;
  label: string;
  icon: string;
  apCost: number;
  resourceCost: number;
  needsTarget: boolean;
  description: string;
  requiresAdaptive?: boolean;
}

export interface ActionOutcome {
  ok: boolean;
  message?: string;
}

export interface FactionActionModule {
  catalog: ActionDef[];
  getValidTargets: (state: GameState, actionId: string) => RegionId[];
  execute: (state: GameState, actionId: string, regionId: RegionId | null) => ActionOutcome;
}
