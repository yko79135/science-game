import { useGameStore } from '../store';
import { getCatalog, getValidTargets } from '../engine/actions';
import { FACTION_META } from '../data/factionMeta';
import type { FactionId } from '../engine/types';
import './ActionPanel.css';

function resourceValue(game: NonNullable<ReturnType<typeof useGameStore.getState>['game']>, faction: FactionId): number {
  if (faction === 'bacteria') return game.bacteria.biomass;
  if (faction === 'virus') return game.virus.virions;
  return game.immune.immunePoints;
}

export default function ActionPanel() {
  const game = useGameStore((s) => s.game)!;
  const selectedAction = useGameStore((s) => s.selectedAction);
  const selectAction = useGameStore((s) => s.selectAction);
  const performAction = useGameStore((s) => s.performAction);
  const endHumanTurn = useGameStore((s) => s.endHumanTurn);
  const setUpgradesOpen = useGameStore((s) => s.setUpgradesOpen);
  const toast = useGameStore((s) => s.toast);

  if (game.phase === 'gameover') return null;

  if (game.phase === 'body' || game.phase === 'resolution') {
    return (
      <div className="action-panel">
        <div className="action-panel-waiting">
          <div className="spinner" />
          <p>{game.phase === 'body' ? 'The body processes the round…' : 'Resolving round…'}</p>
        </div>
      </div>
    );
  }

  const faction = game.phase as FactionId;
  const meta = FACTION_META[faction];
  const isHuman = game.settings.players[faction] === 'human';
  const ap = game.ap[faction];
  const resource = resourceValue(game, faction);

  if (!isHuman) {
    return (
      <div className="action-panel">
        <div className="action-panel-waiting">
          <div className="spinner" style={{ borderTopColor: meta.color }} />
          <p>
            {meta.icon} <b style={{ color: meta.color }}>{meta.label}</b> AI is acting…
          </p>
        </div>
      </div>
    );
  }

  const catalog = getCatalog(faction);

  return (
    <div className="action-panel">
      <div className="ap-header" style={{ borderColor: meta.color }}>
        <div className="ap-faction" style={{ color: meta.color }}>
          {meta.icon} {meta.label}
        </div>
        <div className="ap-resource">
          {meta.resourceLabel}: <b>{Math.round(resource)}</b>
        </div>
        <div className="ap-pips">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < ap ? 'pip filled' : 'pip'} style={i < ap ? { background: meta.color } : {}} />
          ))}
          <span className="ap-label">{ap} AP left</span>
        </div>
      </div>

      {toast && <div className="ap-toast">{toast}</div>}

      <div className="ap-actions scroll">
        {catalog.map((action) => {
          const requiresAdaptiveOk = action.requiresAdaptive
            ? action.id === 'antibodies'
              ? game.immune.adaptiveVsBacteria || game.immune.adaptiveVsVirus
              : game.immune.adaptiveVsVirus
            : true;
          const targets = action.needsTarget ? getValidTargets(game, faction, action.id) : null;
          const noTargets = action.needsTarget && targets && targets.length === 0;
          const affordableAp = ap >= action.apCost;
          const affordableResource = resource >= action.resourceCost;
          const disabled = !affordableAp || !affordableResource || noTargets || !requiresAdaptiveOk;
          const active = selectedAction === action.id;

          return (
            <button
              key={action.id}
              className={active ? 'action-btn active' : 'action-btn'}
              disabled={disabled}
              title={action.description}
              onClick={() => {
                if (action.needsTarget) {
                  selectAction(active ? null : action.id);
                } else {
                  performAction(action.id, null);
                }
              }}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-body">
                <span className="action-label">{action.label}</span>
                <span className="action-desc">{action.description}</span>
              </span>
              <span className="action-costs">
                <span className="cost-ap">{action.apCost} AP</span>
                {action.resourceCost > 0 && <span className="cost-res">{action.resourceCost}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {selectedAction && (
        <div className="ap-target-hint">
          🎯 Select a highlighted tile on the map…
          <button className="cancel-btn" onClick={() => selectAction(null)}>
            Cancel
          </button>
        </div>
      )}

      <div className="ap-footer">
        <button className="upgrades-btn" onClick={() => setUpgradesOpen(true)}>
          🧬 Upgrades
        </button>
        <button className="end-turn-btn" style={{ background: meta.color }} onClick={endHumanTurn}>
          End Turn ▶
        </button>
      </div>
    </div>
  );
}
