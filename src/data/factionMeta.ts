import type { FactionId } from '../engine/types';

export const FACTION_META: Record<FactionId, { label: string; icon: string; color: string; resourceLabel: string }> = {
  bacteria: { label: 'Bacteria', icon: '🦠', color: 'var(--bacteria)', resourceLabel: 'Biomass' },
  virus: { label: 'Virus', icon: '🧫', color: 'var(--virus)', resourceLabel: 'Virions' },
  immune: { label: 'Immune System', icon: '🛡️', color: 'var(--immune)', resourceLabel: 'Immune Points' },
};
