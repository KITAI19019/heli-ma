import {
  conclusionOf,
  grades,
  isPending,
  levels,
  newReason,
  times,
  type Analysis,
  type Cell,
  type Grade,
} from './model';
import { ClaimConnections } from './ClaimConnections';
import { useState, type CSSProperties } from 'react';
import { AdaptiveTextarea, EditorDialog } from './EditorDialog';

const factRowLabels = ['更大环境', '当前对象', '组成部分'];

function Sources({
  cell,
  onChange,
  label,
  readOnly,
}: {
  cell: Cell;
  onChange: (cell: Cell) => void;
  label: string;
  readOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState<string>();
  const add = () => {
    const id = crypto.randomUUID();
    setFocusId(id);
    onChange({ ...cell, sources: [...cell.sources, { id, text: '' }] });
  };
  return (
    <div className="sources">
      {(!readOnly || cell.sources.length > 0) && (
        <button
          type="button"
          className="text-button source-trigger"
          onClick={() => {
            if (!cell.sources.length) add();
            setOpen(true);
          }}
        >
          {cell.sources.length ? `来源 ${cell.sources.length}` : '＋ 来源'}
        </button>
      )}
      {open && (
        <EditorDialog title={`${label} · 来源`} onClose={() => setOpen(false)}>
          <div className="source-list">
            {cell.sources.length === 0 && <p>尚未添加来源。</p>}
            {cell.sources.map((source, index) => (
              <div className="source-item" key={source.id}>
                <label htmlFor={`source-${source.id}`}>来源 {index + 1}</label>
                {!readOnly && (
                  <button
                    type="button"
                    className="text-button"
                    aria-label={`移除来源 ${index + 1}`}
                    onClick={() =>
                      onChange({
                        ...cell,
                        sources: cell.sources.filter((item) => item.id !== source.id),
                      })
                    }
                  >
                    移除
                  </button>
                )}
                <textarea
                  id={`source-${source.id}`}
                  autoFocus={!readOnly && (focusId ? focusId === source.id : index === 0)}
                  aria-label={`${label}来源${index + 1}`}
                  placeholder={readOnly ? undefined : '出处、链接或页码'}
                  value={source.text}
                  readOnly={readOnly}
                  onChange={(event) =>
                    onChange({
                      ...cell,
                      sources: cell.sources.map((item) =>
                        item.id === source.id ? { ...item, text: event.target.value } : item,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
          {!readOnly && (
            <div className="source-actions">
              <button type="button" onClick={add}>
                新增来源
              </button>
            </div>
          )}
        </EditorDialog>
      )}
    </div>
  );
}

function CellEditor({
  label,
  caption = label,
  cell,
  onChange,
  readOnly,
  textReadOnly = false,
}: {
  label: string;
  caption?: string;
  cell: Cell;
  onChange: (cell: Cell) => void;
  readOnly: boolean;
  textReadOnly?: boolean;
}) {
  return (
    <div className={readOnly ? 'cell-editor readonly' : 'cell-editor'}>
      <label>
        <span className="cell-label" aria-hidden="true">
          {caption}
        </span>
        <AdaptiveTextarea
          label={label}
          value={cell.text}
          readOnly={readOnly || textReadOnly}
          onChange={(event) => onChange({ ...cell, text: event.target.value })}
        />
      </label>
      <Sources cell={cell} onChange={onChange} label={label} readOnly={readOnly} />
    </div>
  );
}

export function AnalysisEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: Analysis;
  onChange: (value: Analysis) => void;
  readOnly?: boolean;
}) {
  const changeCell = (index: number, cell: Cell) =>
    onChange({ ...value, cells: value.cells.map((item, i) => (i === index ? cell : item)) });
  if (value.kind === 'fact')
    return (
      <section className="analysis-content fact-content" aria-label="核查这句话">
        <div className="table-scroll">
          <div className="matrix fact-matrix">
            <div className="matrix-spacer" aria-hidden="true" />
            {factRowLabels.map((label, row) => (
              <div
                className="matrix-rowhead"
                key={label}
                aria-hidden="true"
                style={{ gridRow: row + 2 }}
              >
                {label}
              </div>
            ))}
            {times.map((time, col) => (
              <section
                className="fact-time-group"
                key={time}
                aria-label={time}
                style={{ '--fact-column': col + 2 } as CSSProperties}
              >
                <h2 className="matrix-head">{time}</h2>
                {levels.map((level, row) => {
                  const index = row * 3 + col;
                  return (
                    <div
                      key={level}
                      className={index === 4 ? 'matrix-cell central' : 'matrix-cell'}
                      style={{ '--fact-row': row + 2 } as CSSProperties}
                    >
                      <CellEditor
                        label={`${level}·${time}`}
                        caption={factRowLabels[row]}
                        cell={
                          index === 4
                            ? { ...value.cells[index], text: value.statement }
                            : value.cells[index]
                        }
                        onChange={(cell) => changeCell(index, cell)}
                        readOnly={readOnly}
                        textReadOnly={index === 4}
                      />
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      </section>
    );

  if (value.kind === 'relation') {
    const labels = ['A 发生，B 发生', 'A 未发生，B 发生', 'A 发生，B 未发生', 'A 未发生，B 未发生'];
    return (
      <section className="analysis-content relation-content" aria-label="判断 A 是否会导致 B">
        <div className="table-scroll">
          <div className="matrix relation-matrix">
            <div className="matrix-spacer" aria-hidden="true" />
            <div className="matrix-head" aria-hidden="true">
              A 发生
            </div>
            <div className="matrix-head" aria-hidden="true">
              A 未发生
            </div>
            {[0, 1].map((row) => [
              <div className="matrix-rowhead" key={row} aria-hidden="true">
                {row === 0 ? 'B 发生' : 'B 未发生'}
              </div>,
              ...[0, 1].map((col) => {
                const index = row * 2 + col;
                return (
                  <div key={`${row}${col}`} className="matrix-cell">
                    <CellEditor
                      label={labels[index]}
                      cell={value.cells[index]}
                      onChange={(cell) => changeCell(index, cell)}
                      readOnly={readOnly}
                    />
                  </div>
                );
              }),
            ])}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="analysis-content claim-content" aria-label="梳理主张的依据">
      <div className="graph-scroll">
        <div className="argument">
          <ClaimConnections
            structureKey={`${value.reasons.map((item) => item.id).join(',')}|${value.exceptions.map((item) => item.id).join(',')}`}
          />
          <div className={isPending(value) ? 'node qualifier is-pending' : 'node qualifier'}>
            <span>有多可信</span>
            <strong>{conclusionOf(value)}</strong>
          </div>
          <div className="node claim-node">
            <span>主张</span>
            <p tabIndex={0}>{value.statement}</p>
          </div>
          <div className="node data-node">
            <CellEditor
              label="事实"
              cell={value.evidence}
              onChange={(evidence) => onChange({ ...value, evidence })}
              readOnly={readOnly}
            />
          </div>
          <div className="claim-branches">
            <section className="reason-column" aria-label="支持主张的理由">
              {value.reasons.map((reason, index) => (
                <div className="reason-group" key={reason.id}>
                  <div className="node reason-node">
                    <label>
                      理由 {index + 1}
                      <AdaptiveTextarea
                        label={`理由${index + 1}`}
                        value={reason.text}
                        readOnly={readOnly}
                        onChange={(event) =>
                          onChange({
                            ...value,
                            reasons: value.reasons.map((item) =>
                              item.id === reason.id ? { ...item, text: event.target.value } : item,
                            ),
                          })
                        }
                      />
                    </label>
                    {!readOnly && value.reasons.length > 1 && (
                      <button
                        className="text-button"
                        onClick={() => {
                          onChange({
                            ...value,
                            reasons: value.reasons.filter((item) => item.id !== reason.id),
                          });
                        }}
                      >
                        移除理由 {index + 1}
                      </button>
                    )}
                  </div>
                  <div className="node backing">
                    <CellEditor
                      label={`理由${index + 1}的依据`}
                      cell={reason.backing}
                      readOnly={readOnly}
                      caption="依据"
                      onChange={(backing) =>
                        onChange({
                          ...value,
                          reasons: value.reasons.map((item) =>
                            item.id === reason.id ? { ...item, backing } : item,
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
              {!readOnly && (
                <button
                  className="add-button"
                  onClick={() => onChange({ ...value, reasons: [...value.reasons, newReason()] })}
                >
                  ＋ 添加理由
                </button>
              )}
            </section>
            <section className="exception-column" aria-label="限制主张">
              {value.exceptions.map((exception, index) => (
                <div className="node exception" key={exception.id}>
                  <label>
                    例外 {index + 1}
                    <AdaptiveTextarea
                      label={`例外${index + 1}`}
                      value={exception.text}
                      readOnly={readOnly}
                      onChange={(event) =>
                        onChange({
                          ...value,
                          exceptions: value.exceptions.map((item) =>
                            item.id === exception.id ? { ...item, text: event.target.value } : item,
                          ),
                        })
                      }
                    />
                  </label>
                  {!readOnly && value.exceptions.length > 1 && (
                    <button
                      className="text-button"
                      onClick={() => {
                        onChange({
                          ...value,
                          exceptions: value.exceptions.filter((item) => item.id !== exception.id),
                        });
                      }}
                    >
                      移除例外 {index + 1}
                    </button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button
                  className="add-button"
                  onClick={() =>
                    onChange({
                      ...value,
                      exceptions: [...value.exceptions, { id: crypto.randomUUID(), text: '' }],
                    })
                  }
                >
                  ＋ 添加例外
                </button>
              )}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Judgment({
  value,
  onChange,
}: {
  value: Analysis;
  onChange: (value: Analysis) => void;
}) {
  const percentage = value.kind === 'claim';
  const update = (raw: number) =>
    onChange(
      percentage
        ? { ...value, percent: raw }
        : { ...value, grade: raw === 2 ? null : (raw as Grade) },
    );
  const level = value.percent ?? 50;
  return (
    <section
      className={isPending(value) ? 'judgment is-pending' : 'judgment'}
      aria-label="合理度选择"
    >
      <div className="judgment-head">
        {percentage ? (
          <label htmlFor="judgment">合理度</label>
        ) : (
          <span id="judgment-label">合理度</span>
        )}
        {percentage && <strong aria-live="polite">{conclusionOf(value)}</strong>}
      </div>
      {percentage && (
        <input
          id="judgment"
          type="range"
          min="0"
          max="100"
          step="1"
          value={level}
          style={{ ['--fill' as string]: `${level}%` }}
          aria-valuetext={conclusionOf(value)}
          onChange={(event) => update(Number(event.target.value))}
          onPointerUp={(event) => update(Number(event.currentTarget.value))}
        />
      )}
      {percentage ? (
        <div className="range-labels">
          <span>0% 不可能</span>
          <span>100% 确定</span>
        </div>
      ) : (
        <div className="grade-buttons" role="group" aria-labelledby="judgment-label">
          {grades.map((label, index) => (
            <button
              key={label}
              aria-pressed={(value.grade ?? 2) === index}
              className={(value.grade ?? 2) === index ? 'selected' : ''}
              onClick={() => update(index)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {percentage && value.percent !== null && (
        <button className="text-button" onClick={() => onChange({ ...value, percent: null })}>
          设为不清楚
        </button>
      )}
    </section>
  );
}
