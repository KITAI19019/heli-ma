export type Kind = 'fact' | 'relation' | 'claim';
export type Grade = 0 | 1 | 3 | 4 | null;
export interface Source {
  id: string;
  text: string;
}
export interface Cell {
  text: string;
  sources: Source[];
}
export interface Reason {
  id: string;
  text: string;
  backing: Cell;
}
export interface Exception {
  id: string;
  text: string;
}
export interface Analysis {
  schemaVersion: 1;
  id: string;
  kind: Kind;
  statement: string;
  a: string;
  b: string;
  cells: Cell[];
  evidence: Cell;
  reasons: Reason[];
  exceptions: Exception[];
  grade: Grade;
  percent: number | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
export interface Draft {
  analysis: Analysis;
  screen: 'input' | 'analysis';
}
export interface HistoryItem {
  id: string;
  kind: Kind;
  title: string;
  conclusion: string;
  pending: boolean;
  updatedAt: string;
}

export const kindNames: Record<Kind, string> = {
  fact: '事实',
  relation: '因果关系分析',
  claim: '主张',
};
export const grades = ['不合理', '不太合理', '不清楚', '有点道理', '合理'];
export const levels = ['上级', '同级', '下级'];
export const times = ['过去', '现在', '未来'];
export const newCell = (): Cell => ({ text: '', sources: [] });
export const newReason = (): Reason => ({ id: crypto.randomUUID(), text: '', backing: newCell() });

export function newAnalysis(kind: Kind): Analysis {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    kind,
    statement: '',
    a: '',
    b: '',
    cells: Array.from({ length: kind === 'fact' ? 9 : kind === 'relation' ? 4 : 0 }, newCell),
    evidence: newCell(),
    reasons: [newReason()],
    exceptions: [{ id: crypto.randomUUID(), text: '' }],
    grade: null,
    percent: null,
    revision: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function titleOf(record: Analysis): string {
  return record.kind === 'relation' ? `${record.a} → ${record.b}` : record.statement;
}
export function conclusionOf(record: Analysis): string {
  if (record.kind === 'claim') return record.percent === null ? '不清楚' : `${record.percent}%`;
  return grades[record.grade ?? 2];
}
export function isPending(record: Analysis): boolean {
  return record.kind === 'claim' ? record.percent === null : record.grade === null;
}
export function inputError(record: Analysis): string | null {
  if (record.kind === 'relation')
    return record.a.trim() && record.b.trim() ? null : '请分别填写 A 和 B。';
  return record.statement.trim() ? null : '请先写下要分析的内容。';
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isCell = (value: unknown): value is Cell =>
  isObject(value) &&
  typeof value.text === 'string' &&
  Array.isArray(value.sources) &&
  value.sources.every(
    (source) =>
      isObject(source) && typeof source.id === 'string' && typeof source.text === 'string',
  );

// Validate persisted data at the boundary so corrupt records never replace usable records.
export function assertAnalysis(value: unknown): asserts value is Analysis {
  if (
    !isObject(value) ||
    value.schemaVersion !== 1 ||
    !['fact', 'relation', 'claim'].includes(String(value.kind))
  )
    throw new Error('记录版本或类型无法读取。');
  if (
    !['id', 'statement', 'a', 'b', 'createdAt', 'updatedAt'].every(
      (key) => typeof value[key] === 'string',
    )
  )
    throw new Error('记录文字字段不完整。');
  const size = value.kind === 'fact' ? 9 : value.kind === 'relation' ? 4 : 0;
  if (
    !Array.isArray(value.cells) ||
    value.cells.length !== size ||
    !value.cells.every(isCell) ||
    !isCell(value.evidence)
  )
    throw new Error('记录的分析表格不完整。');
  if (
    !Array.isArray(value.reasons) ||
    !value.reasons.every(
      (reason) =>
        isObject(reason) &&
        typeof reason.id === 'string' &&
        typeof reason.text === 'string' &&
        isCell(reason.backing),
    )
  )
    throw new Error('记录的理由无法读取。');
  if (
    !Array.isArray(value.exceptions) ||
    !value.exceptions.every(
      (item) => isObject(item) && typeof item.id === 'string' && typeof item.text === 'string',
    )
  )
    throw new Error('记录的例外无法读取。');
  if (
    ![null, 0, 1, 3, 4].includes(value.grade as Grade) ||
    (value.percent !== null &&
      (!Number.isInteger(value.percent) ||
        Number(value.percent) < 0 ||
        Number(value.percent) > 100))
  )
    throw new Error('记录的合理度无效。');
  if (!Number.isInteger(value.revision) || Number(value.revision) < 0)
    throw new Error('记录的修订号无效。');
}
