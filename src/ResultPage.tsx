import { AnalysisEditor } from './Editors';
import { conclusionOf, isPending, kindNames, titleOf, type Analysis } from './model';

interface ResultPageProps {
  value: Analysis;
  busy: boolean;
  onEdit: () => void;
  onHome: () => void;
}

export function ResultPage({ value, busy, onEdit, onHome }: ResultPageProps) {
  return (
    <>
      <div className="result-summary">
        <span className="eyebrow">{kindNames[value.kind]}</span>
        <h2>{titleOf(value)}</h2>
        <p className="result-value">
          <span className="result-label">合理度</span>
          <strong>{conclusionOf(value)}</strong>
          {isPending(value) && <span className="pending">待分析</span>}
        </p>
        <div className="actions">
          <button className="primary" disabled={busy} onClick={onEdit}>
            继续编辑
          </button>
          <button disabled={busy} onClick={onHome}>
            回到首页
          </button>
        </div>
      </div>
      <AnalysisEditor key={value.id} value={value} onChange={() => {}} readOnly />
    </>
  );
}
