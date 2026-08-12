import { useEffect, useState } from 'react';
import { useGameStore } from '../store';
import type { DiceResult } from '../engine/types';
import './DiceOverlay.css';

function DiceFace({ result }: { result: DiceResult }) {
  return (
    <div className={result.success ? 'dice-face success' : 'dice-face fail'}>
      <div className="dice-value">🎲 {result.roll}</div>
      {result.modifiers.map((m, i) => (
        <div key={i} className="dice-mod">
          {m.value >= 0 ? '+' : ''}
          {m.value} {m.label}
        </div>
      ))}
      <div className="dice-total">= {result.total} vs {result.threshold}</div>
      <div className="dice-outcome">{result.success ? 'SUCCESS' : 'FAILURE'}</div>
    </div>
  );
}

export default function DiceOverlay() {
  const lastRoll = useGameStore((s) => s.game?.lastRoll ?? null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastRoll) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3400);
    return () => clearTimeout(t);
  }, [lastRoll?.id]);

  if (!lastRoll || !visible) return null;

  return (
    <div className="dice-overlay" key={lastRoll.id}>
      {lastRoll.type === 'check' ? (
        <div className="dice-card">
          <div className="dice-card-title">{lastRoll.dice.label}</div>
          <DiceFace result={lastRoll.dice} />
        </div>
      ) : (
        <div className="dice-card contest">
          <div className="dice-card-title">
            {lastRoll.attackerLabel} vs {lastRoll.defenderLabel}
          </div>
          <div className="contest-row">
            <div className="contest-side">
              <div className="contest-label">{lastRoll.attackerLabel}</div>
              <div className="dice-value">🎲 {lastRoll.attacker.total}</div>
            </div>
            <div className="contest-vs">VS</div>
            <div className="contest-side">
              <div className="contest-label">{lastRoll.defenderLabel}</div>
              <div className="dice-value">🎲 {lastRoll.defender.total}</div>
            </div>
          </div>
          <div className={lastRoll.attackerWins ? 'dice-outcome success' : 'dice-outcome fail'}>
            {lastRoll.attackerWins ? 'ATTACK SUCCEEDS' : 'ATTACK REPELLED'}
          </div>
        </div>
      )}
    </div>
  );
}
