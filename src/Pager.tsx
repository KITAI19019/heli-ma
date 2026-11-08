export function Pager({ label, page, count, onChange }: { label: string; page: number; count: number; onChange: (page: number) => void }) {
  if (count <= 1) return null;
  return <nav className="pager" aria-label={`${label}分页`}>
    <button type="button" aria-label={`上一页${label}`} disabled={page <= 0} onClick={() => onChange(page - 1)}>‹</button>
    <span aria-live="polite">{page + 1} / {count}</span>
    <button type="button" aria-label={`下一页${label}`} disabled={page >= count - 1} onClick={() => onChange(page + 1)}>›</button>
  </nav>;
}
