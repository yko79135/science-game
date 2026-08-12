import { useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { REGIONS, REGION_ORDER } from '../engine/regions';
import type { FactionId, RegionId } from '../engine/types';
import { getValidTargets } from '../engine/actions';
import { bacteriaSeverity, virusSeverity, healthColor } from './mapVisuals';
import Tooltip from './Tooltip';
import './MapView.css';

const SEVERITY_OPACITY: Record<string, number> = { clear: 0, mild: 0.28, moderate: 0.5, severe: 0.75 };

export default function MapView() {
  const game = useGameStore((s) => s.game)!;
  const selectedRegion = useGameStore((s) => s.selectedRegion);
  const selectedAction = useGameStore((s) => s.selectedAction);
  const selectRegion = useGameStore((s) => s.selectRegion);
  const performAction = useGameStore((s) => s.performAction);

  const [hovered, setHovered] = useState<RegionId | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentFaction = ['bacteria', 'virus', 'immune'].includes(game.phase) ? (game.phase as FactionId) : null;
  const isHumanTurn = currentFaction ? game.settings.players[currentFaction] === 'human' : false;

  const validTargets = useMemo(() => {
    if (!isHumanTurn || !currentFaction || !selectedAction) return new Set<RegionId>();
    return new Set(getValidTargets(game, currentFaction, selectedAction));
  }, [game, isHumanTurn, currentFaction, selectedAction]);

  function handleRegionClick(id: RegionId) {
    if (isHumanTurn && selectedAction && validTargets.has(id)) {
      performAction(selectedAction, id);
      return;
    }
    selectRegion(id === selectedRegion ? null : id);
  }

  function handleMouseMove(e: React.MouseEvent) {
    setMouse({ x: e.clientX, y: e.clientY });
  }

  const connections = useMemo(() => {
    const seen = new Set<string>();
    const lines: { a: RegionId; b: RegionId }[] = [];
    for (const id of REGION_ORDER) {
      for (const n of REGIONS[id].connections) {
        const key = [id, n].sort().join('-');
        if (seen.has(key)) continue;
        seen.add(key);
        lines.push({ a: id, b: n });
      }
    }
    return lines;
  }, []);

  const hoveredRegion = hovered ? game.regions[hovered] : null;
  const hoveredDef = hovered ? REGIONS[hovered] : null;

  return (
    <div className="map-view" ref={containerRef} onMouseMove={handleMouseMove}>
      <svg viewBox="0 0 100 140" className="map-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="bodyGlow" cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#1c2740" />
            <stop offset="100%" stopColor="#0d1220" />
          </radialGradient>
          <linearGradient id="silhouetteFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#232e47" />
            <stop offset="100%" stopColor="#161d30" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="140" fill="url(#bodyGlow)" />

        <g className="silhouette" fill="url(#silhouetteFill)" stroke="#324066" strokeWidth="0.4">
          <circle cx="50" cy="9" r="7.5" />
          <rect x="46.5" y="16" width="7" height="7" rx="2.4" />
          <path d="M 28 26 Q 50 18 72 26 L 77 76 Q 50 88 23 76 Z" />
          <rect x="12" y="26" width="10" height="46" rx="5" transform="rotate(9 17 26)" />
          <rect x="78" y="26" width="10" height="46" rx="5" transform="rotate(-9 83 26)" />
          <path d="M 25 76 Q 50 90 75 76 L 68 138 L 53 138 L 50 96 L 47 138 L 32 138 Z" />
        </g>

        {connections.map(({ a, b }) => {
          const da = REGIONS[a];
          const db = REGIONS[b];
          return (
            <line
              key={`${a}-${b}`}
              x1={da.x}
              y1={da.y}
              x2={db.x}
              y2={db.y}
              className="connection-line"
            />
          );
        })}

        {REGION_ORDER.map((id) => {
          const def = REGIONS[id];
          const region = game.regions[id];
          const bSev = bacteriaSeverity(region);
          const vSev = virusSeverity(region);
          const isSelected = selectedRegion === id;
          const isValidTarget = validTargets.has(id);
          const isDimmed = isHumanTurn && selectedAction && !isValidTarget;
          const hc = healthColor(region.health);

          return (
            <g
              key={id}
              className={[
                'region-node',
                isSelected ? 'selected' : '',
                isValidTarget ? 'valid-target' : '',
                isDimmed ? 'dimmed' : '',
                region.health < 35 ? 'critical' : '',
              ].join(' ')}
              transform={`translate(${def.x}, ${def.y})`}
              onClick={() => handleRegionClick(id)}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered((h) => (h === id ? null : h))}
            >
              {isValidTarget && <circle r="7.6" className="target-ring" />}
              <circle r="6.5" className="health-ring-bg" />
              <circle
                r="6.5"
                className="health-ring"
                style={{
                  stroke: hc,
                  strokeDasharray: `${(region.health / 100) * 40.84} 40.84`,
                }}
              />
              <circle r="5.4" className="node-bg" />
              {bSev !== 'clear' && (
                <circle r="5.4" className="overlay-bacteria" style={{ opacity: SEVERITY_OPACITY[bSev] }} />
              )}
              {vSev !== 'clear' && (
                <circle r="5.4" className="overlay-virus" style={{ opacity: SEVERITY_OPACITY[vSev] }} />
              )}
              <text textAnchor="middle" dy="1.9" className="region-icon">
                {def.icon}
              </text>
              {region.pathogen.biofilm && <text x="4.2" y="-3.4" className="badge">🛡️</text>}
              {region.pathogen.quarantined && <text x="-5.4" y="-3.4" className="badge">🚧</text>}
              {region.pathogen.latent && <text x="4.2" y="5.6" className="badge">💤</text>}
              {region.pathogen.antibodiesPresent && <text x="-5.4" y="5.6" className="badge">🔷</text>}
              {region.health < 35 && <circle r="7.6" className="critical-pulse" />}
              <text textAnchor="middle" y="9.6" className="region-label">
                {def.name}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered && hoveredRegion && hoveredDef && (
        <Tooltip x={mouse.x} y={mouse.y}>
          <h4>
            {hoveredDef.icon} {hoveredDef.name}
          </h4>
          <div className="tt-row">
            <span>Tissue Health</span>
            <b>{Math.round(hoveredRegion.health)}%</b>
          </div>
          {hoveredRegion.pathogen.colonyStrength > 0 && (
            <div className="tt-row">
              <span>Bacterial Colony</span>
              <b style={{ color: 'var(--bacteria)' }}>{Math.round(hoveredRegion.pathogen.colonyStrength)}</b>
            </div>
          )}
          {hoveredRegion.pathogen.viralLoad > 0 && (
            <div className="tt-row">
              <span>Viral Load</span>
              <b style={{ color: 'var(--virus)' }}>{Math.round(hoveredRegion.pathogen.viralLoad)}</b>
            </div>
          )}
          <div className="tt-row">
            <span>Detection</span>
            <b>{Math.round(hoveredRegion.pathogen.detection)}%</b>
          </div>
          {hoveredDef.traits.microbiome !== undefined && (
            <div className="tt-row">
              <span>Microbiome</span>
              <b>{Math.round(hoveredRegion.microbiome)}%</b>
            </div>
          )}
          <p>{hoveredDef.description}</p>
          <div className="tt-tags">
            {hoveredRegion.pathogen.biofilm && <span className="tt-tag">🛡️ Biofilm</span>}
            {hoveredRegion.pathogen.quarantined && <span className="tt-tag">🚧 Quarantined</span>}
            {hoveredRegion.pathogen.latent && <span className="tt-tag">💤 Latent</span>}
            {hoveredRegion.pathogen.antibodiesPresent && <span className="tt-tag">🔷 Antibodies</span>}
          </div>
        </Tooltip>
      )}
    </div>
  );
}
