import { useGameStore } from '../store';
import Hud from './Hud';
import MapView from './MapView';
import ActionPanel from './ActionPanel';
import EventLog from './EventLog';
import DiceOverlay from './DiceOverlay';
import CodexModal from './CodexModal';
import UpgradesModal from './UpgradesModal';
import EndGameScreen from './EndGameScreen';
import TutorialOverlay from './TutorialOverlay';
import './GameScreen.css';

export default function GameScreen() {
  const game = useGameStore((s) => s.game);
  const codexOpen = useGameStore((s) => s.codexOpen);
  const upgradesOpen = useGameStore((s) => s.upgradesOpen);
  const tutorialActive = useGameStore((s) => s.tutorialActive);
  const setCodexOpen = useGameStore((s) => s.setCodexOpen);
  const setUpgradesOpen = useGameStore((s) => s.setUpgradesOpen);

  if (!game) return null;

  return (
    <div className="game-screen">
      <Hud />
      <div className="game-body">
        <div className="game-map-wrap">
          <MapView />
          <DiceOverlay />
          {tutorialActive && <TutorialOverlay />}
        </div>
        <div className="game-sidebar">
          <ActionPanel />
          <EventLog />
        </div>
      </div>
      {codexOpen && <CodexModal onClose={() => setCodexOpen(false)} />}
      {upgradesOpen && <UpgradesModal onClose={() => setUpgradesOpen(false)} />}
      {game.phase === 'gameover' && <EndGameScreen />}
    </div>
  );
}
