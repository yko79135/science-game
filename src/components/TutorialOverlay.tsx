import { useState } from 'react';
import { useGameStore } from '../store';
import { TUTORIAL_STEPS } from '../data/tutorialSteps';
import './TutorialOverlay.css';

export default function TutorialOverlay() {
  const [step, setStep] = useState(0);
  const exitTutorial = useGameStore((s) => s.exitTutorial);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="tutorial-card">
      <div className="tutorial-card-header">
        <span className="tutorial-step-count">
          Step {step + 1} / {TUTORIAL_STEPS.length}
        </span>
        <button className="tutorial-skip" onClick={exitTutorial}>
          Skip Tutorial ✕
        </button>
      </div>
      <h3>{current.title}</h3>
      <p>{current.text}</p>
      <div className="tutorial-card-footer">
        <button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          ◀ Back
        </button>
        {isLast ? (
          <button className="tutorial-primary" onClick={exitTutorial}>
            Finish ✓
          </button>
        ) : (
          <button className="tutorial-primary" onClick={() => setStep((s) => Math.min(TUTORIAL_STEPS.length - 1, s + 1))}>
            Next ▶
          </button>
        )}
      </div>
    </div>
  );
}
