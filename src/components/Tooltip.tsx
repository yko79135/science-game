import type { ReactNode } from 'react';
import './Tooltip.css';

interface Props {
  x: number;
  y: number;
  children: ReactNode;
}

export default function Tooltip({ x, y, children }: Props) {
  const flip = x > window.innerWidth - 260;
  return (
    <div
      className="tooltip-box"
      style={{
        left: flip ? x - 260 : x + 16,
        top: Math.min(y + 12, window.innerHeight - 160),
      }}
    >
      {children}
    </div>
  );
}
