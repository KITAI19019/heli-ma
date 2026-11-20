import type { Kind } from './model';

export function TopicIcon({ kind }: { kind: Kind | 'ai' }) {
  const size = kind === 'fact' ? 3 : 2;
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      {kind === 'ai' ? (
        <>
          <circle cx="32" cy="32" r="25" fill="currentColor" fillOpacity=".12" />
          <path d="M24 27v10m16-10v10" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : kind === 'claim' ? (
        <>
          <rect x="5" y="8" width="20" height="15" rx="2" />
          <rect x="39" y="8" width="20" height="15" rx="2" />
          <rect x="22" y="40" width="20" height="15" rx="2" fill="currentColor" fillOpacity=".12" />
          <path d="M25 16h14m-5-4 5 4-5 4M32 40V16m-4 19 4-5 4 5" />
        </>
      ) : (
        Array.from({ length: size * size }, (_, index) => (
          <rect
            key={index}
            x={6 + (index % size) * (52 / size)}
            y={6 + Math.floor(index / size) * (52 / size)}
            width={52 / size - 4}
            height={52 / size - 4}
            rx="2"
            fill={index === (kind === 'fact' ? 4 : 1) ? 'currentColor' : 'none'}
            fillOpacity=".18"
          />
        ))
      )}
    </svg>
  );
}
