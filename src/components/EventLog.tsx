import { useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import './EventLog.css';

export default function EventLog() {
  const log = useGameStore((s) => s.game?.log ?? []);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [log.length]);

  const recent = log.slice(-80);

  return (
    <div className="event-log">
      <div className="event-log-title">Event Log</div>
      <div className="event-log-list scroll">
        {recent.map((entry) => (
          <div key={entry.id} className={`log-entry log-${entry.category}`}>
            <span className="log-icon">{entry.icon}</span>
            <span className="log-text">{entry.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
