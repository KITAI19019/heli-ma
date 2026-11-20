import type { Appearance } from './appearance';
import { Artwork } from './Artwork';
import { kindNames, type Kind } from './model';
import { TopicIcon } from './TopicIcon';

interface HomePageProps {
  appearance: { value: Appearance; customUrl: string };
  onStart: (kind: Kind) => void;
}

export function HomePage({ appearance, onStart }: HomePageProps) {
  return (
    <div className="home">
      <div className="home-artwork" data-artwork={appearance.value.selected} aria-hidden="true">
        <Artwork value={appearance.value} customUrl={appearance.customUrl} />
      </div>
      <div className="method-list">
        {(['fact', 'relation', 'claim'] as const).map((kind) => (
          <button className="type-card" data-method={kind} key={kind} onClick={() => onStart(kind)}>
            <span className="method-icon" aria-hidden="true">
              <TopicIcon kind={kind} />
            </span>
            <strong className="method-title">{kindNames[kind]}</strong>
            <span className="method-enter" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
