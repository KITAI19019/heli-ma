import { flushSync } from 'react-dom';
import type { Analysis, Draft, HistoryItem } from '../model';
import type { Page } from '../navigation';
import {
  changeCollection,
  describeAnalysis,
  fillText,
  type Collection,
  type TextField,
} from './fields';
import { parseRoute, routes, type Route } from './routes';

export type ErrorCode =
  | 'NOT_READY'
  | 'BUSY'
  | 'INVALID_ROUTE'
  | 'INVALID_ARGUMENT'
  | 'NO_DRAFT'
  | 'READ_ONLY'
  | 'UNSAVED_CHANGES'
  | 'STALE_DRAFT'
  | 'FAILED';

export class AppApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface DraftToken {
  id: string;
  version: number;
}

export interface WriteOptions {
  expectedDraft?: DraftToken;
}

export interface NavigateOptions extends WriteOptions {
  discardDraft?: boolean;
}

export interface AppState {
  page: Page;
  path: string;
  busy: boolean;
  overlayOpen: boolean;
  draftToken: DraftToken | null;
  draft: Draft | null;
  result: Analysis | null;
  history: HistoryItem[];
  cacheError: string;
  fields: TextField[];
  collections: Collection[];
}

export type ApiResult =
  | { ok: true; state: AppState; itemId?: string }
  | { ok: false; code: ErrorCode; message: string };

export interface AppHost {
  read: () => Omit<AppState, 'fields' | 'collections'>;
  write: (analysis: Analysis) => void;
  navigate: (route: Route, options: NavigateOptions) => Promise<void>;
  back: () => Promise<void>;
}

let host: AppHost | null = null;
let executing = false;

export function connectAppApi(next: AppHost) {
  host = next;
  window.heliMa = appApi;
  return () => {
    if (host === next) {
      host = null;
      if (window.heliMa === appApi) delete window.heliMa;
    }
  };
}

function snapshot(): AppState | null {
  if (!host) return null;
  const state = structuredClone(host.read());
  state.busy ||= executing;
  const analysis = state.draft?.analysis ?? state.result;
  const readOnly =
    state.busy || state.overlayOpen || !state.draft || !['input', 'analysis'].includes(state.page);
  return {
    ...state,
    ...(analysis ? describeAnalysis(analysis, readOnly) : { fields: [], collections: [] }),
  };
}

function checkOptions(options: WriteOptions) {
  if (!options || typeof options !== 'object' || Array.isArray(options))
    throw new AppApiError('INVALID_ARGUMENT', '选项必须是对象。');
  const expected = options.expectedDraft;
  if (expected !== undefined) {
    if (!expected || typeof expected.id !== 'string' || !Number.isInteger(expected.version))
      throw new AppApiError('INVALID_ARGUMENT', '草稿版本参数无效。');
    const current = host?.read().draftToken;
    if (!current || current.id !== expected.id || current.version !== expected.version)
      throw new AppApiError('STALE_DRAFT', '草稿已经变化，请读取最新状态后重试。');
  }
}

async function run(
  action: (current: AppHost) => Promise<string | void> | string | void,
  allowOverlay = false,
): Promise<ApiResult> {
  if (!host) return { ok: false, code: 'NOT_READY', message: '应用尚未就绪。' };
  const state = host.read();
  if (executing || state.busy || (!allowOverlay && state.overlayOpen))
    return { ok: false, code: 'BUSY', message: '请等待当前操作完成，或先关闭弹窗和侧栏。' };
  executing = true;
  try {
    const itemId = await action(host);
    executing = false;
    const state = snapshot();
    if (!state) throw new AppApiError('NOT_READY', '应用已经关闭。');
    return { ok: true, state, ...(itemId ? { itemId } : {}) };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof AppApiError ? error.code : 'FAILED',
      message: error instanceof Error ? error.message : '操作未完成。',
    };
  } finally {
    executing = false;
  }
}

function edit(
  current: AppHost,
  options: WriteOptions,
  change: (analysis: Analysis) => { analysis: Analysis; itemId?: string },
) {
  checkOptions(options);
  const state = current.read();
  if (!state.draft) throw new AppApiError('NO_DRAFT', '请先新建分析或从结果页进入编辑。');
  if (state.page !== 'input' && state.page !== 'analysis')
    throw new AppApiError('READ_ONLY', '请先返回输入或分析页面。');
  let next: { analysis: Analysis; itemId?: string };
  try {
    next = change(state.draft.analysis);
  } catch (error) {
    throw new AppApiError(
      'INVALID_ARGUMENT',
      error instanceof Error ? error.message : '填写参数无效。',
    );
  }
  flushSync(() => current.write(next.analysis));
  return next.itemId;
}

export const appApi = Object.freeze({
  version: 1,
  routes,
  getState: snapshot,
  navigate(path: string, options: NavigateOptions = {}): Promise<ApiResult> {
    return run(async (current) => {
      checkOptions(options);
      if (options.discardDraft !== undefined && typeof options.discardDraft !== 'boolean')
        throw new AppApiError('INVALID_ARGUMENT', 'discardDraft 必须是布尔值。');
      let route: Route;
      try {
        route = parseRoute(path);
      } catch (error) {
        throw new AppApiError(
          'INVALID_ROUTE',
          error instanceof Error ? error.message : '页面路径无效。',
        );
      }
      await current.navigate(route, options);
    });
  },
  back(): Promise<ApiResult> {
    return run((current) => current.back(), true);
  },
  fill(values: Record<string, string>, options: WriteOptions = {}): Promise<ApiResult> {
    return run((current) =>
      edit(current, options, (analysis) => ({ analysis: fillText(analysis, values) })),
    );
  },
  addItem(collection: string, options: WriteOptions = {}): Promise<ApiResult> {
    return run((current) =>
      edit(current, options, (analysis) => changeCollection(analysis, collection)),
    );
  },
  removeItem(collection: string, id: string, options: WriteOptions = {}): Promise<ApiResult> {
    return run((current) =>
      edit(current, options, (analysis) => {
        if (typeof id !== 'string') throw new Error('项目 ID 必须是字符串。');
        return changeCollection(analysis, collection, id);
      }),
    );
  },
});

declare global {
  interface Window {
    heliMa?: typeof appApi;
  }
}
