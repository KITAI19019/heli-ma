import type { Kind } from '../model';
import type { Page, UtilityPage } from '../navigation';
import type { TutorialKind } from '../tutorials/content';

export const routes = Object.freeze([
  '/',
  '/input',
  '/input/:kind',
  '/analysis',
  '/history',
  '/history/:id',
  '/settings/theme',
  '/settings/language',
  '/settings/ai',
  '/tutorials',
  '/tutorials/:kind',
  '/tutorials/ai',
]);

export type Route =
  | { page: 'home' | 'analysis' | 'history' }
  | { page: 'input'; kind?: Kind }
  | { page: 'result'; id: string }
  | { page: Exclude<UtilityPage, 'tutorial'> }
  | { page: 'tutorial'; kind?: TutorialKind };

export function parseRoute(path: string): Route {
  if (typeof path !== 'string') throw new Error('路径必须是字符串。');
  if (path === '/') return { page: 'home' };
  if (path === '/input') return { page: 'input' };
  if (path === '/analysis') return { page: 'analysis' };
  if (path === '/history') return { page: 'history' };
  if (path === '/settings/theme') return { page: 'theme' };
  if (path === '/settings/language') return { page: 'language' };
  if (path === '/settings/ai') return { page: 'ai' };
  if (path === '/tutorials') return { page: 'tutorial' };
  if (path === '/tutorials/ai') return { page: 'tutorial', kind: 'ai' };
  const kind = /^\/(input|tutorials)\/(fact|relation|claim)$/.exec(path);
  if (kind) return { page: kind[1] === 'input' ? 'input' : 'tutorial', kind: kind[2] as Kind };
  const record = /^\/history\/([^/]+)$/.exec(path);
  if (record) return { page: 'result', id: decodeURIComponent(record[1]) };
  throw new Error(`不支持的页面路径：${path}`);
}

export function pathFor(page: Page, kind: TutorialKind | null, resultId: string | null): string {
  if (page === 'home') return '/';
  if (page === 'input') return kind ? `/input/${kind}` : '/input';
  if (page === 'result') return resultId ? `/history/${encodeURIComponent(resultId)}` : '/history';
  if (page === 'theme' || page === 'language' || page === 'ai') return `/settings/${page}`;
  if (page === 'tutorial') return kind ? `/tutorials/${kind}` : '/tutorials';
  return `/${page}`;
}
