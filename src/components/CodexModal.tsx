import { useState } from 'react';
import { CODEX, CODEX_CATEGORIES } from '../data/codex';
import './Modal.css';
import './CodexModal.css';

export default function CodexModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<(typeof CODEX_CATEGORIES)[number]['id']>('pathogens');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📖 Science Codex</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-tabs">
          {CODEX_CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={category === c.id ? 'modal-tab active' : 'modal-tab'}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="modal-body">
          <div className="codex-grid">
            {CODEX.filter((e) => e.category === category).map((entry) => (
              <div key={entry.id} className="codex-entry">
                <div className="codex-entry-icon">{entry.icon}</div>
                <div>
                  <h4>{entry.title}</h4>
                  <p>{entry.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
