import { useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { REGIONS } from '../engine/regions';
import { HEX_TILES, hexCorners, HEX_SIZE } from '../engine/hexGrid';
import type { FactionId, HexId } from '../engine/types';
import { getValidTargets } from '../engine/actions';
import { aggregateRegion } from '../engine/aggregate';
import { bacteriaSeverity, virusSeverity, healthColor, REGION_TINTS } from './mapVisuals';
import Tooltip from './Tooltip';
import './MapView.css';

const SEVERITY_OPACITY: Record<string, number> = { clear: 0, mild: 0.3, moderate: 0.55, severe: 0.82 };

function pointsAttr(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

export default function MapView() {
  const game = useGameStore((s) => s.game)!;
  const selectedHex = useGameStore((s) => s.selectedHex);
  const selectedAction = useGameStore((s) => s.selectedAction);
  const selectHex = useGameStore((s) => s.selectHex);
  const performAction = useGameStore((s) => s.performAction);

  const [hovered, setHovered] = useState<HexId | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentFaction = ['bacteria', 'virus', 'immune'].includes(game.phase) ? (game.phase as FactionId) : null;
  const isHumanTurn = currentFaction ? game.settings.players[currentFaction] === 'human' : false;

  const validTargets = useMemo(() => {
    if (!isHumanTurn || !currentFaction || !selectedAction) return new Set<HexId>();
    return new Set(getValidTargets(game, currentFaction, selectedAction));
  }, [game, isHumanTurn, currentFaction, selectedAction]);

  function handleHexClick(id: HexId) {
    if (isHumanTurn && selectedAction && validTargets.has(id)) {
      performAction(selectedAction, id);
      return;
    }
    selectHex(id === selectedHex ? null : id);
  }

  function handleMouseMove(e: React.MouseEvent) {
    setMouse({ x: e.clientX, y: e.clientY });
  }

  const hoveredHex = hovered ? game.hexes[hovered] : null;
  const hoveredTile = hovered ? HEX_TILES.find((t) => t.id === hovered) : null;
  const hoveredDef = hoveredTile ? REGIONS[hoveredTile.regionId] : null;
  const hoveredAgg = hoveredTile ? aggregateRegion(game, hoveredTile.regionId) : null;

  return (
    <div className="map-view" ref={containerRef} onMouseMove={handleMouseMove}>
      <svg viewBox="0 0 100 92" className="map-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="bodyGlow" cx="50%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#1c2740" />
            <stop offset="100%" stopColor="#0d1220" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="100" height="92" fill="url(#bodyGlow)" />

        {HEX_TILES.map((tile) => {
          const hex = game.hexes[tile.id];
          const def = REGIONS[tile.regionId];
          const corners = hexCorners(tile.x, tile.y);
          const pts = pointsAttr(corners);
          const bSev = bacteriaSeverity(hex);
          const vSev = virusSeverity(hex);
          const isSelected = selectedHex === tile.id;
          const isValidTarget = validTargets.has(tile.id);
          const isDimmed = isHumanTurn && !!selectedAction && !isValidTarget;
          const hc = healthColor(hex.health);
          const damagePct = Math.max(0, (100 - hex.health) / 100);
          const pathoCount = hex.pathogen.colonyStrength > 0 ? hex.pathogen.colonyStrength : hex.pathogen.viralLoad;

          return (
            <g
              key={tile.id}
              className={[
                'hex-tile',
                isSelected ? 'selected' : '',
                isValidTarget ? 'valid-target' : '',
                isDimmed ? 'dimmed' : '',
                tile.isCapital ? 'capital' : '',
              ].join(' ')}
              onClick={() => handleHexClick(tile.id)}
              onMouseEnter={() => setHovered(tile.id)}
              onMouseLeave={() => setHovered((h) => (h === tile.id ? null : h))}
            >
              {isValidTarget && (
                <polygon points={pointsAttr(hexCorners(tile.x, tile.y, HEX_SIZE + 0.7))} className="target-ring" />
              )}
              <polygon points={pts} className="hex-base" style={{ fill: REGION_TINTS[tile.regionId] }} />
              {damagePct > 0.15 && (
                <polygon points={pts} className="hex-damage-overlay" style={{ fillOpacity: damagePct * 0.55 }} />
              )}
              {bSev !== 'clear' && (
                <polygon points={pts} className="hex-overlay-bacteria" style={{ opacity: SEVERITY_OPACITY[bSev] }} />
              )}
              {vSev !== 'clear' && (
                <polygon points={pts} className="hex-overlay-virus" style={{ opacity: SEVERITY_OPACITY[vSev] }} />
              )}
              {hex.pathogen.quarantined && (
                <polygon points={pts} className="hex-quarantine-overlay" />
              )}
              {tile.isCapital && (
                <text x={tile.x} y={tile.y + 1.1} textAnchor="middle" className="hex-icon">
                  {def.icon}
                </text>
              )}
              {pathoCount > 0 && (
                <text x={tile.x} y={tile.y - 1.6} textAnchor="middle" className="hex-count">
                  {Math.round(pathoCount)}
                </text>
              )}
              <polygon points={pts} className="hex-outline" style={{ stroke: isSelected ? '#fff' : undefined }} />
              {hex.health < 30 && (
                <circle cx={tile.x} cy={tile.y} r={HEX_SIZE * 0.35} className="critical-dot" style={{ fill: hc }} />
              )}
            </g>
          );
        })}
      </svg>

      {hovered && hoveredHex && hoveredDef && hoveredAgg && (
        <Tooltip x={mouse.x} y={mouse.y}>
          <h4>
            {hoveredDef.icon} {hoveredDef.name}
          </h4>
          <div className="tt-row">
            <span>Tile Health</span>
            <b>{Math.round(hoveredHex.health)}%</b>
          </div>
          {hoveredHex.pathogen.colonyStrength > 0 && (
            <div className="tt-row">
              <span>Bacterial Colony (tile)</span>
              <b style={{ color: 'var(--bacteria)' }}>{Math.round(hoveredHex.pathogen.colonyStrength)}</b>
            </div>
          )}
          {hoveredHex.pathogen.viralLoad > 0 && (
            <div className="tt-row">
              <span>Viral Load (tile)</span>
              <b style={{ color: 'var(--virus)' }}>{Math.round(hoveredHex.pathogen.viralLoad)}</b>
            </div>
          )}
          <div className="tt-row">
            <span>Detection</span>
            <b>{Math.round(hoveredHex.pathogen.detection)}%</b>
          </div>
          {hoveredDef.traits.microbiome !== undefined && (
            <div className="tt-row">
              <span>Microbiome</span>
              <b>{Math.round(hoveredHex.microbiome)}%</b>
            </div>
          )}
          <p>{hoveredDef.description}</p>
          <div className="tt-tags">
            {hoveredHex.pathogen.biofilm && <span className="tt-tag">🛡️ Biofilm</span>}
            {hoveredHex.pathogen.quarantined && <span className="tt-tag">🚧 Quarantined</span>}
            {hoveredHex.pathogen.latent && <span className="tt-tag">💤 Latent</span>}
            {hoveredHex.pathogen.antibodiesPresent && <span className="tt-tag">🔷 Antibodies</span>}
          </div>
          <div className="tt-region-summary">
            {hoveredDef.name} overall: {hoveredAgg.hexesWithColony + hoveredAgg.hexesWithVirus}/{hoveredAgg.hexCount} tiles
            infected, avg health {Math.round(hoveredAgg.avgHealth)}%
          </div>
        </Tooltip>
      )}
    </div>
  );
}
