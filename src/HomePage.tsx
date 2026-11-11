import type { Appearance } from './appearance';
import { Artwork } from './Artwork';
import { kindNames, type Kind } from './model';

const descriptions: Record<Kind, string> = {
  fact: '假如这句话是真的，前后会发生什么？周围和细节是否说得通？',
  relation: '把发生和没发生的情况都看一遍，判断 A 是不是 B 的原因。',
  claim: '看看理由有没有依据、哪些情况下不成立，再判断这句话有多可信。',
};

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
        {(['fact', 'relation', 'claim'] as Kind[]).map((kind, index) => (
          <button className="type-card" key={kind} onClick={() => onStart(kind)}>
            <span className="method-index" aria-hidden="true">
              0{index + 1}
            </span>
            <span className="method-body">
              <strong>{kindNames[kind]}</strong>
              <span className="method-desc">{descriptions[kind]}</span>
            </span>
            <span className="method-enter" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
