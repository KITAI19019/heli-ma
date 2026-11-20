import { GrowingTextarea } from './GrowingTextarea';
import type { Analysis } from './model';

interface InputPageProps {
  value: Analysis;
  error: string;
  onChange: (value: Analysis) => void;
  onAnalyze: () => void;
  onHome: () => void;
}

export function InputPage({ value, error, onChange, onAnalyze, onHome }: InputPageProps) {
  const statementLabel = value.kind === 'fact' ? '待核查的说法' : '待分析的主张';
  const errorId = error ? 'analysis-input-error' : undefined;

  return (
    <form
      className={value.kind === 'relation' ? 'input-form relation-form' : 'input-form'}
      onSubmit={(event) => {
        event.preventDefault();
        onAnalyze();
      }}
    >
      {value.kind === 'relation' ? (
        <>
          <label className="field">
            <span className="field-name">
              <span className="field-key">A</span>可能的原因
            </span>
            <GrowingTextarea
              label="A · 可能的原因"
              autoFocus
              aria-describedby={errorId}
              value={value.a}
              onChange={(event) => onChange({ ...value, a: event.target.value })}
              placeholder="例如，每天用间隔复习法背单词"
            />
          </label>
          <label className="field">
            <span className="field-name">
              <span className="field-key">B</span>观察到的结果
            </span>
            <GrowingTextarea
              label="B · 观察到的结果"
              aria-describedby={errorId}
              value={value.b}
              onChange={(event) => onChange({ ...value, b: event.target.value })}
              placeholder="例如，一周后记住的单词更多"
            />
          </label>
        </>
      ) : (
        <label className="field">
          <span className="field-name">{statementLabel}</span>
          <GrowingTextarea
            label={statementLabel}
            autoFocus
            aria-describedby={errorId}
            value={value.statement}
            onChange={(event) => onChange({ ...value, statement: event.target.value })}
            placeholder={
              value.kind === 'fact'
                ? '例如，学校图书馆周末也开放。'
                : '例如，图书馆应该延长开放时间。'
            }
          />
        </label>
      )}
      <div className="input-footer">
        {error && (
          <p id={errorId} className="input-error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button className="primary" type="submit">
            进入分析 →
          </button>
          <button className="text-button" type="button" onClick={onHome}>
            回到首页
          </button>
        </div>
      </div>
    </form>
  );
}
