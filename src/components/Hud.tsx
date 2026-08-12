import { useGameStore } from '../store';
import { healthColor } from './mapVisuals';
import './Hud.css';

const PHASE_LABEL: Record<string, string> = {
  body: 'Body Phase',
  bacteria: "Bacteria's Turn",
  virus: "Virus's Turn",
  immune: "Immune System's Turn",
  resolution: 'Resolving Round…',
  gameover: 'Game Over',
};

const PHASE_COLOR: Record<string, string> = {
  bacteria: 'var(--bacteria)',
  virus: 'var(--virus)',
  immune: 'var(--immune)',
};

export default function Hud() {
  const game = useGameStore((s) => s.game)!;
  const goToMenu = useGameStore((s) => s.goToMenu);
  const setCodexOpen = useGameStore((s) => s.setCodexOpen);

  const hc = healthColor(game.bodyHealth);

  return (
    <div className="hud">
      <div className="hud-left">
        <button className="hud-icon-btn" onClick={goToMenu} title="Save & Exit to Menu">
          ☰
        </button>
        <div className="hud-round">
          Round <b>{game.round}</b> / {game.settings.maxRounds}
        </div>
      </div>

      <div className="hud-phase" style={{ color: PHASE_COLOR[game.phase] ?? 'var(--text-bright)' }}>
        {PHASE_LABEL[game.phase] ?? game.phase}
      </div>

      <div className="hud-body-health">
        <div className="hbh-label">
          <span>❤️ Body Health</span>
          <b style={{ color: hc }}>{game.bodyHealth}%</b>
        </div>
        <div className="hbh-bar-bg">
          <div className="hbh-bar-fill" style={{ width: `${game.bodyHealth}%`, background: hc }} />
        </div>
      </div>

      <div className="hud-vitals">
        <div className="hud-vital" title="Body temperature">
          🌡️ {game.immune.fever.toFixed(1)}°C
        </div>
        <div className="hud-vital" title="Global inflammation level">
          🔥 {Math.round(game.immune.globalInflammation)}
        </div>
      </div>

      <div className="hud-right">
        <button className="hud-icon-btn" onClick={() => setCodexOpen(true)} title="Science Codex">
          📖
        </button>
      </div>
    </div>
  );
}
