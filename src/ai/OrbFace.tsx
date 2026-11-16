import { useRef } from 'react';
import { useOrbFace } from './useOrbFace';

export function OrbFace() {
  const face = useRef<HTMLSpanElement>(null);
  useOrbFace(face);
  return (
    <span className="ai-orb-face" ref={face} aria-hidden="true">
      <span className="ai-orb-body">
        <span className="ai-orb-eyes">
          <span className="ai-orb-eye" />
          <span className="ai-orb-eye" />
        </span>
      </span>
    </span>
  );
}
