import { useGameStore } from './store';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import CodexModal from './components/CodexModal';

export default function App() {
  const view = useGameStore((s) => s.view);
  const codexOpen = useGameStore((s) => s.codexOpen);
  const setCodexOpen = useGameStore((s) => s.setCodexOpen);
  const game = useGameStore((s) => s.game);

  return (
    <>
      {view === 'playing' && game ? <GameScreen /> : <SetupScreen />}
      {view === 'menu' && codexOpen && <CodexModal onClose={() => setCodexOpen(false)} />}
    </>
  );
}
