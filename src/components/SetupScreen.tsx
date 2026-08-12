import { useMemo, useState } from 'react';
import { useGameStore } from '../store';
import { SCENARIOS } from '../engine/scenarios';
import type { FactionId, GameSettings } from '../engine/types';
import { FACTION_META as BASE_FACTION_META } from '../data/factionMeta';
import './SetupScreen.css';

const BLURBS: Record<FactionId, string> = {
  bacteria: 'Durable colonies, steady spread, toxins & resistance.',
  virus: 'Explosive replication, must infect cells, fragile alone.',
  immune: 'Weak early, devastating once adaptive immunity kicks in.',
};
const FACTION_META = Object.fromEntries(
  (Object.keys(BASE_FACTION_META) as FactionId[]).map((f) => [f, { ...BASE_FACTION_META[f], blurb: BLURBS[f] }]),
) as Record<FactionId, { label: string; icon: string; color: string; resourceLabel: string; blurb: string }>;

type Mode = 'quick' | 'standard' | 'scenario';

export default function SetupScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const startTutorial = useGameStore((s) => s.startTutorial);
  const continueSavedGame = useGameStore((s) => s.continueSavedGame);
  const hasSave = useGameStore((s) => s.hasSave);
  const setCodexOpen = useGameStore((s) => s.setCodexOpen);

  const [mode, setMode] = useState<Mode>('quick');
  const [scenarioId, setScenarioId] = useState(SCENARIOS[3].id);
  const [players, setPlayers] = useState<Partial<Record<FactionId, 'human' | 'ai'>>>({ bacteria: 'human', virus: 'ai', immune: 'ai' });
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [medicine, setMedicine] = useState<'on' | 'off'>('on');

  const scenario = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId)!, [scenarioId]);

  const activeFactions = scenario.factions;

  function setPlayerMode(f: FactionId, m: 'human' | 'ai') {
    setPlayers((p) => ({ ...p, [f]: m }));
  }

  function handleStart() {
    const settings: GameSettings = {
      players: {
        bacteria: activeFactions.includes('bacteria') ? players.bacteria ?? 'ai' : 'none',
        virus: activeFactions.includes('virus') ? players.virus ?? 'ai' : 'none',
        immune: players.immune ?? 'ai',
      },
      aiDifficulty: difficulty,
      maxRounds: mode === 'quick' ? 12 : scenario.rounds,
      medicine,
      scenarioId: scenario.id,
    };
    startGame(settings);
  }

  const humanCount = activeFactions.filter((f) => players[f] === 'human').length;

  return (
    <div className="setup-screen scroll">
      <div className="setup-hero">
        <div className="setup-hero-icon">🧬</div>
        <h1>Infection: Battle for the Body</h1>
        <p className="setup-tagline">A strategy game fought from inside the human body.</p>
        <div className="setup-hero-actions">
          <button className="ghost-btn" onClick={() => setCodexOpen(true)}>
            📖 Science Codex
          </button>
          <button className="ghost-btn" onClick={startTutorial}>
            🎓 Tutorial
          </button>
          {hasSave && (
            <button className="ghost-btn accent" onClick={continueSavedGame}>
              ▶ Continue Saved Game
            </button>
          )}
        </div>
      </div>

      <div className="setup-grid">
        <section className="setup-card">
          <h2>1. Game Length</h2>
          <div className="pill-row">
            <button className={mode === 'quick' ? 'pill active' : 'pill'} onClick={() => setMode('quick')}>
              Quick Game<span>12 rounds</span>
            </button>
            <button className={mode === 'standard' ? 'pill active' : 'pill'} onClick={() => setMode('standard')}>
              Standard Game<span>{scenario.rounds} rounds</span>
            </button>
            <button className={mode === 'scenario' ? 'pill active' : 'pill'} onClick={() => setMode('scenario')}>
              Scenario Mode<span>story setup</span>
            </button>
          </div>
        </section>

        <section className="setup-card">
          <h2>2. Choose a Matchup</h2>
          <div className="scenario-grid">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                className={s.id === scenarioId ? 'scenario-card active' : 'scenario-card'}
                onClick={() => setScenarioId(s.id)}
              >
                <div className="scenario-card-factions">
                  {s.factions.map((f) => (
                    <span key={f} style={{ color: FACTION_META[f].color }}>
                      {FACTION_META[f].icon}
                    </span>
                  ))}
                </div>
                <strong>{s.name}</strong>
                <p>{s.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="setup-card">
          <h2>3. Assign Factions</h2>
          <div className="faction-assign-list">
            {(['bacteria', 'virus', 'immune'] as FactionId[]).map((f) => {
              const active = activeFactions.includes(f);
              const meta = FACTION_META[f];
              return (
                <div key={f} className={active ? 'faction-assign-row' : 'faction-assign-row disabled'}>
                  <div className="faction-assign-label" style={{ color: meta.color }}>
                    <span className="faction-icon">{meta.icon}</span>
                    <div>
                      <strong>{meta.label}</strong>
                      <p>{meta.blurb}</p>
                    </div>
                  </div>
                  {active ? (
                    <div className="toggle-row">
                      <button
                        className={players[f] === 'human' ? 'toggle-btn active' : 'toggle-btn'}
                        onClick={() => setPlayerMode(f, 'human')}
                      >
                        Human
                      </button>
                      <button
                        className={players[f] === 'ai' ? 'toggle-btn active' : 'toggle-btn'}
                        onClick={() => setPlayerMode(f, 'ai')}
                      >
                        AI
                      </button>
                    </div>
                  ) : (
                    <span className="not-in-play">Not in this scenario</span>
                  )}
                </div>
              );
            })}
          </div>
          {humanCount === 0 && <p className="setup-hint">Tip: assign at least one faction to Human to play.</p>}
        </section>

        <section className="setup-card">
          <h2>4. Options</h2>
          <div className="options-row">
            <div>
              <label>AI Difficulty</label>
              <div className="pill-row small">
                {(['easy', 'normal', 'hard'] as const).map((d) => (
                  <button key={d} className={difficulty === d ? 'pill active' : 'pill'} onClick={() => setDifficulty(d)}>
                    {d[0].toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Medicine Events</label>
              <div className="pill-row small">
                <button className={medicine === 'on' ? 'pill active' : 'pill'} onClick={() => setMedicine('on')}>
                  On
                </button>
                <button className={medicine === 'off' ? 'pill active' : 'pill'} onClick={() => setMedicine('off')}>
                  Off
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="setup-footer">
        <button className="start-btn" onClick={handleStart}>
          Begin Infection ▶
        </button>
      </div>
    </div>
  );
}
