import { useGameStore } from '../store';
import { adaptationsFor } from '../engine/adaptations';
import { adaptationCostAtLevel } from '../engine/adaptationSystem';
import { FACTION_META } from '../data/factionMeta';
import type { FactionId } from '../engine/types';
import './Modal.css';
import './UpgradesModal.css';

function resourceValue(game: NonNullable<ReturnType<typeof useGameStore.getState>['game']>, faction: FactionId): number {
  if (faction === 'bacteria') return game.bacteria.biomass;
  if (faction === 'virus') return game.virus.virions;
  return game.immune.immunePoints;
}

function levelsFor(game: NonNullable<ReturnType<typeof useGameStore.getState>['game']>, faction: FactionId) {
  if (faction === 'bacteria') return game.bacteria.adaptations;
  if (faction === 'virus') return game.virus.adaptations;
  return game.immune.adaptations;
}

export default function UpgradesModal({ onClose }: { onClose: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);

  const faction = (['bacteria', 'virus', 'immune'].includes(game.phase) ? game.phase : 'bacteria') as FactionId;
  const meta = FACTION_META[faction];
  const defs = adaptationsFor(faction);
  const levels = levelsFor(game, faction);
  const resource = resourceValue(game, faction);
  const ap = game.ap[faction];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ color: meta.color }}>
            🧬 {meta.label} Adaptations
          </h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p className="upgrades-sub">
            {meta.resourceLabel}: <b>{Math.round(resource)}</b> &middot; Action Points: <b>{ap}</b>
          </p>
          <div className="upgrades-grid">
            {defs.map((def) => {
              const level = levels[def.id] ?? 0;
              const maxLevel = def.maxLevel ?? 1;
              const maxed = level >= maxLevel;
              const cost = adaptationCostAtLevel(def.resourceCost, level);
              const canAfford = !maxed && resource >= cost && ap >= def.apCost;
              return (
                <div key={def.id} className={maxed ? 'upgrade-card maxed' : 'upgrade-card'}>
                  <div className="upgrade-card-top">
                    <strong>{def.name}</strong>
                    <span className="upgrade-level">
                      {maxLevel > 1 ? `Lv ${level}/${maxLevel}` : level > 0 ? 'Owned' : ''}
                    </span>
                  </div>
                  <p>{def.description}</p>
                  {def.tradeoff && <p className="upgrade-tradeoff">⚠ {def.tradeoff}</p>}
                  <div className="upgrade-card-footer">
                    <span className="upgrade-cost">
                      {maxed ? 'Maxed' : `${def.apCost} AP · ${cost} ${meta.resourceLabel}`}
                    </span>
                    <button disabled={maxed || !canAfford} onClick={() => buyUpgrade(def.id)}>
                      {maxed ? '✓' : 'Acquire'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
