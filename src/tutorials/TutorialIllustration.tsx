import type { ReactNode } from 'react';
import { grades, levels, times, type Kind } from '../model';
import { tutorialExamples, type TutorialIllustration as Illustration } from './content';

function ExampleField({
  label,
  children,
  highlighted = false,
}: {
  label: string;
  children: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div className="tutorial-example-field" data-highlighted={highlighted || undefined}>
      <span className="tutorial-field-label">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function InputIllustration({ kind }: { kind: Kind }) {
  return (
    <div className="tutorial-input-example">
      {kind === 'relation' ? (
        <>
          <ExampleField label="A · 可能的原因">{tutorialExamples.relation.a}</ExampleField>
          <ExampleField label="B · 观察到的结果">{tutorialExamples.relation.b}</ExampleField>
        </>
      ) : (
        <ExampleField label={kind === 'fact' ? '待核查的说法' : '待分析的主张'}>
          {tutorialExamples[kind].statement}
        </ExampleField>
      )}
      <span className="tutorial-action-example">进入分析 →</span>
    </div>
  );
}

function FactGrid() {
  return (
    <div className="tutorial-grid tutorial-fact-grid">
      <span />
      {times.map((time) => (
        <span className="tutorial-grid-head" key={time}>
          {time}
        </span>
      ))}
      {levels.map((level, row) => (
        <div className="tutorial-grid-row" key={level}>
          <span className="tutorial-grid-head">{level}</span>
          {times.map((time, column) => {
            const index = row * 3 + column;
            return (
              <span
                className="tutorial-grid-cell"
                data-highlighted={index === 4 || undefined}
                key={time}
              >
                {tutorialExamples.fact.cells[index]}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function RelationGrid() {
  return (
    <div className="tutorial-grid tutorial-relation-grid">
      <span />
      <span className="tutorial-grid-head">A 发生</span>
      <span className="tutorial-grid-head">A 未发生</span>
      <span className="tutorial-grid-head">B 发生</span>
      <span className="tutorial-grid-cell">
        求雨
        <br />
        下雨
      </span>
      <span className="tutorial-grid-cell" data-highlighted>
        没求雨
        <br />
        下雨
      </span>
      <span className="tutorial-grid-head">B 未发生</span>
      <span className="tutorial-grid-cell" data-highlighted>
        求雨
        <br />
        没下雨
      </span>
      <span className="tutorial-grid-cell">
        没求雨
        <br />
        没下雨
      </span>
    </div>
  );
}

function SourceIllustration({ kind }: { kind: 'fact' | 'relation' }) {
  const { label, paragraphs, source } = tutorialExamples[kind].notes;

  return (
    <div className="tutorial-source-example">
      <ExampleField label={label}>
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <span className="tutorial-source-link">＋ 来源</span>
      </ExampleField>
      <div className="tutorial-source-detail">
        <span className="tutorial-field-label">{label} · 来源</span>
        <p>{source}</p>
        <span className="tutorial-action-outline">完成输入</span>
      </div>
    </div>
  );
}

function ClaimReason() {
  return (
    <div className="tutorial-claim-example">
      <div className="tutorial-claim-flow">
        <ExampleField label="事实">{tutorialExamples.claim.fact}</ExampleField>
        <span className="tutorial-diagram-arrow" aria-hidden="true">
          →
        </span>
        <ExampleField label="主张">{tutorialExamples.claim.statement}</ExampleField>
      </div>
      <div className="tutorial-reason-example">
        <span className="tutorial-support-arrow" aria-hidden="true">
          ↑
        </span>
        <ExampleField label="理由 1" highlighted>
          {tutorialExamples.claim.reason}
        </ExampleField>
        <span className="tutorial-action-outline">＋ 添加理由</span>
      </div>
    </div>
  );
}

function ClaimBacking() {
  return (
    <div className="tutorial-backing-example">
      <ExampleField label="理由1的依据" highlighted>
        {tutorialExamples.claim.backing}
        <span className="tutorial-source-link">＋ 来源</span>
      </ExampleField>
      <ExampleField label="例外 1">{tutorialExamples.claim.exception}</ExampleField>
      <div className="tutorial-example-pagination">
        <span>‹　1 / 2　›</span>
        <span className="tutorial-action-outline">＋ 添加例外</span>
      </div>
    </div>
  );
}

function JudgmentIllustration({ kind }: { kind: Kind }) {
  const percentage = kind === 'claim';
  return (
    <div className="tutorial-judgment-example">
      <div className="tutorial-judgment-heading">
        <span>合理度判断</span>
        <strong>不清楚</strong>
      </div>
      {percentage ? (
        <>
          <div className="tutorial-slider">
            <span />
          </div>
          <div className="tutorial-slider-labels">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          <span className="tutorial-source-link">设为不清楚</span>
        </>
      ) : (
        <div className="tutorial-grade-options">
          {grades.map((grade) => (
            <span data-highlighted={grade === '不清楚' || undefined} key={grade}>
              {grade}
            </span>
          ))}
        </div>
      )}
      <span className="tutorial-action-example">完成</span>
      <p className="tutorial-save-note">保存到本机历史记录</p>
    </div>
  );
}

export function TutorialIllustration({
  illustration,
  kind,
}: {
  illustration: Illustration;
  kind: Kind;
}) {
  switch (illustration) {
    case 'input':
      return <InputIllustration kind={kind} />;
    case 'fact-grid':
      return <FactGrid />;
    case 'fact-source':
      return <SourceIllustration kind="fact" />;
    case 'relation-grid':
      return <RelationGrid />;
    case 'relation-notes':
      return <SourceIllustration kind="relation" />;
    case 'claim-reason':
      return <ClaimReason />;
    case 'claim-backing':
      return <ClaimBacking />;
    case 'judgment':
      return <JudgmentIllustration kind={kind} />;
  }
}

export function TutorialIcon({ kind }: { kind: Kind }) {
  const size = kind === 'fact' ? 3 : 2;
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      {kind === 'claim' ? (
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
