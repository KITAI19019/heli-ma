import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { kindNames, type HistoryItem } from './model';
import { Pager } from './Pager';

export function HistoryList({
  items,
  busy,
  onOpen,
  onDelete,
  editing,
  onEditingChange,
}: {
  items: HistoryItem[];
  busy: boolean;
  onOpen: (id: string) => void;
  onDelete: (items: HistoryItem[]) => void;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(3);
  const [selectedPage, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!editing) setSelected(new Set());
  }, [editing]);
  useEffect(() => {
    const remaining = new Set(items.map((item) => item.id));
    setSelected((current) => new Set([...current].filter((id) => remaining.has(id))));
  }, [items]);
  useLayoutEffect(() => {
    const element = list.current!;
    const update = () => {
      const style = getComputedStyle(element);
      const rowHeight = parseFloat(style.gridAutoRows);
      const gap = parseFloat(style.rowGap);
      setSize(
        Math.max(1, Math.min(8, Math.floor((element.clientHeight + gap) / (rowHeight + gap)))),
      );
    };
    const observer = new ResizeObserver(update);
    update();
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const count = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(selectedPage, count - 1);
  const visible = items.slice(page * size, (page + 1) * size);
  const selectedItems = items.filter((item) => selected.has(item.id));
  const allVisibleSelected = visible.length > 0 && visible.every((item) => selected.has(item.id));
  return (
    <div className="history-pages" data-editing={editing || undefined}>
      {items.length > 0 && (
        <div className="history-selection">
          <button
            type="button"
            className="history-edit"
            aria-label={editing ? '完成编辑' : '编辑历史记录'}
            disabled={busy}
            onClick={() => {
              onEditingChange(!editing);
              setSelected(new Set());
            }}
          >
            {editing ? '完成' : '编辑'}
          </button>
          {editing && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setSelected((current) => {
                    const next = new Set(current);
                    visible.forEach((item) => {
                      if (allVisibleSelected) next.delete(item.id);
                      else next.add(item.id);
                    });
                    return next;
                  })
                }
              >
                {allVisibleSelected ? '取消本页选择' : '全选本页'}
              </button>
              <span aria-live="polite">已选 {selectedItems.length} 项</span>
              <button
                type="button"
                className="history-delete"
                disabled={busy || !selectedItems.length}
                onClick={() => onDelete(selectedItems)}
              >
                删除所选
              </button>
            </>
          )}
        </div>
      )}
      <div className="history-list" ref={list}>
        {visible.map((item) => (
          <div
            className="history-row"
            key={item.id}
            role="group"
            aria-label={item.title}
            data-selected={selected.has(item.id) || undefined}
          >
            {editing && (
              <label className="history-checkbox">
                <input
                  type="checkbox"
                  aria-label={`选择记录：${item.title}`}
                  checked={selected.has(item.id)}
                  disabled={busy}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelected((current) => {
                      const next = new Set(current);
                      if (checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    });
                  }}
                />
              </label>
            )}
            <button
              type="button"
              className="history-card"
              disabled={busy}
              aria-pressed={editing ? selected.has(item.id) : undefined}
              onClick={() => {
                if (!editing) onOpen(item.id);
                else
                  setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  });
              }}
            >
              <div className="history-meta">
                <span className="eyebrow">{kindNames[item.kind]}</span>
                <div className="record-status">
                  {item.pending && <span className="pending">待分析</span>}
                  <span>合理度 · {item.conclusion}</span>
                </div>
              </div>
              <strong title={item.title}>{item.title}</strong>
              <small>{new Date(item.updatedAt).toLocaleString('zh-CN')}</small>
            </button>
            {editing && (
              <button
                type="button"
                className="history-delete"
                disabled={busy}
                onClick={() => onDelete([item])}
              >
                删除
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="history-pagination">
        <Pager label="历史记录" page={page} count={count} onChange={setPage} />
      </div>
    </div>
  );
}
