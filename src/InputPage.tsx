import { GrowingTextarea } from './GrowingTextarea';
import type { Analysis, Kind } from './model';

const introductions: Record<Kind, string> = {
  fact: '从时间和层级展开，查一查这句话。',
  relation: '对照四种情况，想一想 A 是否导致 B。',
  claim: '梳理事实、理由与例外，检查主张。',
};

interface InputPageProps {
  value: Analysis;
  onChange: (value: Analysis) => void;
  onAnalyze: () => void;
  onHome: () => void;
}

export function InputPage({ value, onChange, onAnalyze, onHome }: InputPageProps) {
  return (
    <form
      className={value.kind === 'relation' ? 'input-form relation-form' : 'input-form'}
      onSubmit={(event) => {
        event.preventDefault();
        onAnalyze();
      }}
    >
      <p className="lead">{introductions[value.kind]}</p>
      {value.kind === 'relation' ? (
        <>
          <label className="field relation-field">
            <span className="field-name">A · 可能的原因</span>
            <GrowingTextarea
              label="A · 可能的原因"
              autoFocus
              value={value.a}
              onChange={(event) => onChange({ ...value, a: event.target.value })}
              placeholder="例如，采用某种学习方法"
            />
          </label>
          <label className="field relation-field">
            <span className="field-name">B · 观察到的结果</span>
            <GrowingTextarea
              label="B · 观察到的结果"
              value={value.b}
              onChange={(event) => onChange({ ...value, b: event.target.value })}
              placeholder="例如，考试成绩提高"
            />
          </label>
          <p className="hint relation-hint">
            接下来检查“A 是否导致 B”，并寻找 A、B 发生与未发生的四类情况。
          </p>
        </>
      ) : (
        <label className="field">
          <span className="field-name">
            {value.kind === 'fact' ? '待核查的说法' : '待分析的主张'}
          </span>
          <GrowingTextarea
            label={value.kind === 'fact' ? '待核查的说法' : '待分析的主张'}
            autoFocus
            value={value.statement}
            onChange={(event) => onChange({ ...value, statement: event.target.value })}
            placeholder={value.kind === 'fact' ? '写下你想核查的那句话' : '写下你想分析的那句话'}
          />
        </label>
      )}
      <div className="actions">
        <button className="primary" type="submit">
          进入分析 →
        </button>
        <button type="button" onClick={onHome}>
          回到首页
        </button>
      </div>
    </form>
  );
}
