import { useGameStore } from '../store';
import { FACTION_META } from '../data/factionMeta';
import { MAJOR_ORGANS } from '../engine/regions';
import { aggregateRegion, distinctRegionsControlled } from '../engine/aggregate';
import type { GameState } from '../engine/types';
import './Modal.css';
import './EndGameScreen.css';

function title(game: GameState): { text: string; color: string } {
  if (game.winner === 'bacteria') return { text: 'VICTORY — BACTERIA', color: 'var(--bacteria)' };
  if (game.winner === 'virus') return { text: 'VICTORY — VIRUS', color: 'var(--virus)' };
  if (game.winner === 'immune') return { text: 'VICTORY — IMMUNE SYSTEM', color: 'var(--immune)' };
  if (game.endReason === 'hostFailure') return { text: 'HOST FAILURE', color: 'var(--danger)' };
  return { text: 'STALEMATE — CHRONIC INFECTION', color: 'var(--warn)' };
}

function narrative(game: GameState): string {
  const virusPeak = game.stats.peakViralLoad;
  const bactPeak = game.stats.peakColonyStrength;
  const adaptV = game.stats.adaptiveActivatedRound.virus;
  const adaptB = game.stats.adaptiveActivatedRound.bacteria;

  if (game.endReason === 'hostFailure') {
    return 'The infection spread faster than the body could compensate, and organ damage became too severe to sustain life. In the real immune system, this is exactly why doctors care so much about supportive care — sometimes the immune response itself, combined with pathogen damage, overwhelms the body before either side "wins."';
  }
  if (game.winner === 'immune') {
    const parts: string[] = [];
    if (adaptV) parts.push(`adaptive immunity against the virus activated around round ${adaptV}, after which antibodies and T cells cleared infected tissue`);
    if (adaptB) parts.push(`adaptive immunity against the bacteria activated around round ${adaptB}, letting antibodies and phagocytes finish off resistant colonies`);
    const detail = parts.length ? parts.join(', and ') : 'innate defenses alone were enough to hold the line';
    return `The immune system weathered the early infection with inflammation and innate responses, buying time to identify the threat. ${detail}. This is the core tradeoff of adaptive immunity: slow to arrive, but precise and powerful once active.`;
  }
  if (game.winner === 'bacteria') {
    return `The bacterial population established durable colonies faster than the immune system could clear them, spreading into multiple organs (peak colony strength ${bactPeak}). Because bacteria can reproduce outside host cells and defend themselves with biofilm, sustained pressure from multiple angles was needed to dislodge them — pressure that never fully arrived here.`;
  }
  if (game.winner === 'virus') {
    return `The virus replicated explosively before adaptive immunity could catch up (peak viral load ${virusPeak}), hijacking host cells across multiple regions faster than T cells and antibodies could be produced. This is the central race viral infections create: speed versus recognition.`;
  }
  return 'Neither side achieved a decisive breakthrough before time ran out. The infection became chronic — a reminder that in biology, many battles between pathogens and the immune system end in a long-term standoff rather than total victory.';
}

export default function EndGameScreen() {
  const game = useGameStore((s) => s.game)!;
  const goToMenu = useGameStore((s) => s.goToMenu);
  const { text, color } = title(game);

  const infectedMajorOrgans = MAJOR_ORGANS.filter((id) => aggregateRegion(game, id).hexesWithColony > 0).length;
  const infectedRegionsNow = distinctRegionsControlled(game, 'virus');

  return (
    <div className="modal-backdrop">
      <div className="modal-panel endgame-panel">
        <div className="endgame-title" style={{ color }}>
          {text}
        </div>
        <div className="endgame-stats">
          <div className="stat-box">
            <span>Rounds Played</span>
            <b>{game.round}</b>
          </div>
          <div className="stat-box">
            <span>Body Health Remaining</span>
            <b>{game.bodyHealth}%</b>
          </div>
          <div className="stat-box" style={{ color: 'var(--bacteria)' }}>
            <span>Peak Colony Strength</span>
            <b>{game.stats.peakColonyStrength}</b>
          </div>
          <div className="stat-box" style={{ color: 'var(--virus)' }}>
            <span>Peak Viral Load</span>
            <b>{game.stats.peakViralLoad}</b>
          </div>
          <div className="stat-box" style={{ color: 'var(--bacteria)' }}>
            <span>Peak Hex Tiles Controlled (Bacteria)</span>
            <b>{game.stats.peakHexesControlled.bacteria}</b>
          </div>
          <div className="stat-box" style={{ color: 'var(--virus)' }}>
            <span>Peak Hex Tiles Controlled (Virus)</span>
            <b>{game.stats.peakHexesControlled.virus}</b>
          </div>
          <div className="stat-box" style={{ color: 'var(--immune)' }}>
            <span>Antibodies Produced</span>
            <b>{game.stats.antibodiesProduced}</b>
          </div>
          <div className="stat-box">
            <span>Adaptive vs Virus</span>
            <b>{game.stats.adaptiveActivatedRound.virus ? `Round ${game.stats.adaptiveActivatedRound.virus}` : '—'}</b>
          </div>
          <div className="stat-box">
            <span>Adaptive vs Bacteria</span>
            <b>{game.stats.adaptiveActivatedRound.bacteria ? `Round ${game.stats.adaptiveActivatedRound.bacteria}` : '—'}</b>
          </div>
          <div className="stat-box">
            <span>Cytokine Storms</span>
            <b>{game.stats.cytokineStorms}</b>
          </div>
          <div className="stat-box">
            <span>Regions Ever Infected</span>
            <b>{game.stats.regionsEverInfected.size}</b>
          </div>
          <div className="stat-box">
            <span>Major Organs Infected (final)</span>
            <b>{infectedMajorOrgans}</b>
          </div>
          <div className="stat-box">
            <span>Regions With Active Virus (final)</span>
            <b>{infectedRegionsNow}</b>
          </div>
          <div className="stat-box">
            <span>Resistance Emerged</span>
            <b>{game.stats.resistantEmerged ? 'Yes' : 'No'}</b>
          </div>
        </div>
        <div className="endgame-narrative">
          <h3>What happened biologically?</h3>
          <p>{narrative(game)}</p>
        </div>
        <div className="endgame-factions">
          {(['bacteria', 'virus', 'immune'] as const).map((f) => (
            <span key={f} style={{ color: FACTION_META[f].color }}>
              {FACTION_META[f].icon} {FACTION_META[f].label}: {game.settings.players[f]}
            </span>
          ))}
        </div>
        <button className="endgame-restart" onClick={goToMenu}>
          New Game
        </button>
      </div>
    </div>
  );
}
