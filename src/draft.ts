import { assertAnalysis, type Draft } from './model';
const KEY = 'heli-ma-v01-draft';

export function readDraft(): { draft: Draft | null; error: string } {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { draft: null, error: '' };
    const parsed = JSON.parse(raw) as Draft;
    assertAnalysis(parsed.analysis);
    if (!['input', 'analysis'].includes(parsed.screen)) throw new Error();
    return { draft: parsed, error: '' };
  } catch {
    return { draft: null, error: '会话缓存无法读取。历史记录仍可从本地数据库打开。' };
  }
}
export function writeDraft(draft: Draft | null): string {
  try {
    if (draft) sessionStorage.setItem(KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(KEY);
    return '';
  } catch {
    return '会话缓存暂时不可用，请保持页面打开，并点击完成保存到本地数据库。';
  }
}
