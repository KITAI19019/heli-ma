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
import { useState } from 'react';
import { Pager } from './Pager';
import { AdaptiveTextarea, EditorDialog } from './EditorDialog';

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
  const [selected, setSelected] = useState(0);
  const page = Math.min(selected, Math.max(0, cell.sources.length - 1));
  const source = cell.sources[page];
  const add = () => {
    setSelected(cell.sources.length);
    onChange({ ...cell, sources: [...cell.sources, { id: crypto.randomUUID(), text: '' }] });
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
          {source ? (
            <textarea
              key={source.id}
              autoFocus
              className="expanded-textarea"
              aria-label={`${label}来源${page + 1}`}
              placeholder="出处、链接或页码（选填）"
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
          ) : (
            <p>尚未添加来源。</p>
          )}
          <div className="source-actions">
            <Pager
              label={`${label}来源`}
              page={page}
              count={cell.sources.length}
              onChange={setSelected}
            />
            {!readOnly && (
              <>
                <button type="button" onClick={add}>
                  新增来源
                </button>
                {source && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(Math.max(0, page - 1));
                      onChange({
                        ...cell,
                        sources: cell.sources.filter((item) => item.id !== source.id),
                      });
                    }}
                  >
                    移除来源
                  </button>
                )}
              </>
            )}
          </div>
        </EditorDialog>
      )}
    </div>
  );
}

function CellEditor({
  label,
  cell,
  onChange,
  readOnly,
  placeholder,
  textReadOnly = false,
  hideLabel = false,
}: {
  label: string;
  cell: Cell;
  onChange: (cell: Cell) => void;
  readOnly: boolean;
  placeholder?: string;
  textReadOnly?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <div className={readOnly ? 'cell-editor readonly' : 'cell-editor'}>
      <label>
        {!hideLabel && (
          <span className="cell-label" aria-hidden="true">
            {label}
          </span>
        )}
        <AdaptiveTextarea
          label={label}
          value={cell.text}
          readOnly={readOnly || textReadOnly}
          placeholder={
            readOnly
              ? undefined
              : (placeholder ?? '如果是真的，应当出现什么？查到了什么？可先留空。')
          }
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
  const [selectedReason, setReason] = useState(0);
  const [selectedException, setException] = useState(0);
  const reasonPage = Math.min(selectedReason, Math.max(0, value.reasons.length - 1));
  const exceptionPage = Math.min(selectedException, Math.max(0, value.exceptions.length - 1));
  const changeCell = (index: number, cell: Cell) =>
    onChange({ ...value, cells: value.cells.map((item, i) => (i === index ? cell : item)) });
  if (value.kind === 'fact')
    return (
      <section className="analysis-content fact-content" aria-label="核查这句话">
        <p className="hint">
          假设这句话是真的，过去、现在、未来，以及更大环境和组成部分中，应出现什么？将推想与查证写在同一格中。想不出来可以留空。
        </p>
        <div className="table-scroll">
          <div className="matrix fact-matrix">
            <div className="matrix-spacer" aria-hidden="true" />
            {times.map((time) => (
              <div className="matrix-head" key={time} aria-hidden="true">
                {time}
              </div>
            ))}
            {levels.map((level, row) => [
              <div className="matrix-rowhead" key={level}>
                <span>{level}</span>
                <small>{['更大环境', '当前对象', '组成部分'][row]}</small>
              </div>,
              ...times.map((time, col) => {
                const index = row * 3 + col;
                return (
                  <div
                    key={`${level}${time}`}
                    className={index === 4 ? 'matrix-cell central' : 'matrix-cell'}
                  >
                    <CellEditor
                      label={`${level}·${time}`}
                      cell={
                        index === 4
                          ? { ...value.cells[index], text: value.statement }
                          : value.cells[index]
                      }
                      onChange={(cell) => changeCell(index, cell)}
                      readOnly={readOnly}
                      textReadOnly={index === 4}
                      placeholder="推想或查证，可留空。"
                    />
                  </div>
                );
              }),
            ])}
          </div>
        </div>
      </section>
    );

  if (value.kind === 'relation') {
    const labels = ['A 发生，B 发生', 'A 未发生，B 发生', 'A 发生，B 未发生', 'A 未发生，B 未发生'];
    return (
      <section className="analysis-content relation-content" aria-label="判断 A 是否会导致 B">
        <p className="hypothesis">
          要判断的是{' '}
          <strong>
            “{value.a}”会导致“{value.b}”
          </strong>
        </p>
        <p className="hint">
          同时观察四种组合，特别留意“有 A 无 B”和“无 A 有
          B”。填写案例或已知数据，也可以留空。比较对象、时间先后及其他影响因素，也值得继续核查。
        </p>
        <div className="table-scroll">
          <div className="matrix relation-matrix">
            <div className="matrix-spacer" aria-hidden="true" />
            <div className="matrix-head" aria-hidden="true">
              A 发生<small>{value.a}</small>
            </div>
            <div className="matrix-head" aria-hidden="true">
              A 未发生<small>未出现“{value.a}”</small>
            </div>
            {[0, 1].map((row) => [
              <div className="matrix-rowhead" key={row}>
                <span>{row === 0 ? 'B 发生' : 'B 未发生'}</span>
                <small>{row === 0 ? value.b : `未出现“${value.b}”`}</small>
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
                      placeholder="案例或数据，可留空。"
                      hideLabel
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
      <p className="hint">列出事实和理由，补充理由的依据，再找找有哪些例外。</p>
      <div className="graph-scroll">
        <div className="argument">
          <ClaimConnections
            structureKey={`${value.reasons[reasonPage]?.id}|${value.exceptions[exceptionPage]?.id}`}
          />
          <div className="node data-node">
            <CellEditor
              label="事实"
              cell={value.evidence}
              onChange={(evidence) => onChange({ ...value, evidence })}
              readOnly={readOnly}
              placeholder="支持主张的事实，可留空。"
            />
          </div>
          <div className={isPending(value) ? 'node qualifier is-pending' : 'node qualifier'}>
            <span>有多可信</span>
            <strong>{conclusionOf(value)}</strong>
          </div>
          <div className="node claim-node">
            <span>主张</span>
            <p tabIndex={0}>{value.statement}</p>
          </div>
          <div className="reason-column">
            {value.reasons.slice(reasonPage, reasonPage + 1).map((reason) => (
              <div className="reason-group" key={reason.id}>
                <div className="node reason-node">
                  <label>
                    理由 {reasonPage + 1}
                    <AdaptiveTextarea
                      label={`理由${reasonPage + 1}`}
                      value={reason.text}
                      readOnly={readOnly}
                      placeholder={readOnly ? undefined : '为什么能支持主张？'}
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
                        setReason(Math.max(0, reasonPage - 1));
                        onChange({
                          ...value,
                          reasons: value.reasons.filter((item) => item.id !== reason.id),
                        });
                      }}
                    >
                      移除理由 {reasonPage + 1}
                    </button>
                  )}
                </div>
                <div className="node backing">
                  <CellEditor
                    label={`理由${reasonPage + 1}的依据`}
                    cell={reason.backing}
                    readOnly={readOnly}
                    placeholder="理由有什么依据？（选填）"
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
            <div className="node-pagination">
              <Pager
                label="理由"
                page={reasonPage}
                count={value.reasons.length}
                onChange={setReason}
              />
              {!readOnly && (
                <button
                  className="add-button"
                  onClick={() => {
                    setReason(value.reasons.length);
                    onChange({ ...value, reasons: [...value.reasons, newReason()] });
                  }}
                >
                  ＋ 添加理由
                </button>
              )}
            </div>
          </div>
          <div className="exception-column">
            {value.exceptions.slice(exceptionPage, exceptionPage + 1).map((exception) => (
              <div className="node exception" key={exception.id}>
                <label>
                  例外 {exceptionPage + 1}
                  <AdaptiveTextarea
                    label={`例外${exceptionPage + 1}`}
                    value={exception.text}
                    readOnly={readOnly}
                    placeholder={readOnly ? undefined : '什么情况下不成立？'}
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
                      setException(Math.max(0, exceptionPage - 1));
                      onChange({
                        ...value,
                        exceptions: value.exceptions.filter((item) => item.id !== exception.id),
                      });
                    }}
                  >
                    移除例外 {exceptionPage + 1}
                  </button>
                )}
              </div>
            ))}
            <div className="node-pagination">
              <Pager
                label="例外"
                page={exceptionPage}
                count={value.exceptions.length}
                onChange={setException}
              />
              {!readOnly && (
                <button
                  className="add-button"
                  onClick={() => {
                    setException(value.exceptions.length);
                    onChange({
                      ...value,
                      exceptions: [...value.exceptions, { id: crypto.randomUUID(), text: '' }],
                    });
                  }}
                >
                  ＋ 添加例外
                </button>
              )}
            </div>
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
          <label htmlFor="judgment">合理度判断</label>
        ) : (
          <span id="judgment-label">合理度判断</span>
        )}
        <strong aria-live="polite">{conclusionOf(value)}</strong>
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
          <span>0% · 不可能</span>
          <span>50%</span>
          <span>100% · 确定</span>
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
      {percentage && (
        <button className="text-button" onClick={() => onChange({ ...value, percent: null })}>
          设为不清楚
        </button>
      )}
    </section>
  );
}
