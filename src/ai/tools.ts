import { appApi, type AppState, type ApiResult } from '../api';
import { parseRoute } from '../api/routes';
import { kindNames } from '../model';
import type { ToolCall, ToolDefinition } from './client';

export interface ChangePreview {
  label: string;
  before: string;
  after: string;
}
export interface Approval {
  title: string;
  changes: ChangePreview[];
}
export type Approve = (request: Approval) => Promise<boolean>;

function tool(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[],
): ToolDefinition {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: { type: 'object', properties, required, additionalProperties: false },
    },
  };
}
export const agentTools: ToolDefinition[] = [
  tool(
    'get_current_page',
    '读取当前页面、可用路径、可写字段和条目，不包含设置密钥或其他历史记录。',
    {},
    [],
  ),
  tool(
    'navigate_page',
    '按应用路径跳转页面。主张输入为 /input/claim，分析页为 /analysis。需要放弃草稿时由应用确认。',
    { path: { type: 'string' } },
    ['path'],
  ),
  tool(
    'fill_fields',
    '批量填写当前分析的文字字段。只使用真实字段路径；覆盖已有文字由应用确认。',
    {
      fields: {
        type: 'array',
        minItems: 1,
        maxItems: 30,
        items: {
          type: 'object',
          properties: { path: { type: 'string' }, value: { type: 'string', maxLength: 20000 } },
          required: ['path', 'value'],
          additionalProperties: false,
        },
      },
    },
    ['fields'],
  ),
  tool(
    'add_item',
    '在当前草稿新增一条空白理由、例外或来源。返回真实 ID 和当前字段，后续使用 fill_fields 填写。',
    { collection: { type: 'string' } },
    ['collection'],
  ),
];

function readState(): AppState {
  const state = appApi.getState();
  if (!state) throw new Error('应用尚未就绪。');
  return state;
}
export function pageContext(state = readState()) {
  const visible = ['input', 'analysis', 'result'].includes(state.page);
  return {
    path: state.path,
    routes: appApi.routes,
    hasDraft: !!state.draft,
    kind: visible ? (state.draft?.analysis.kind ?? state.result?.kind ?? null) : null,
    fields: visible ? state.fields : [],
    collections: visible ? state.collections : [],
  };
}
const stamp = (state: AppState) =>
  JSON.stringify([state.path, state.draftToken, state.result?.id, state.overlayOpen]);
function argsObject(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    throw new Error('工具参数不符合约定。');
  return value as Record<string, unknown>;
}

export function createToolSession(
  signal: AbortSignal,
  approve: Approve,
  onAction: (text: string) => void,
) {
  let expected = stamp(readState());
  const handled = new Map<string, { signature: string; value: unknown }>();
  const declined = new Set<string>();
  const check = () => {
    signal.throwIfAborted();
    if (stamp(readState()) !== expected)
      throw new Error('页面或输入已经变化，本轮已停止。请重新发送要求。');
  };
  function applied(result: ApiResult, label: string) {
    if (!result.ok) return result;
    expected = stamp(result.state);
    onAction(label);
    return {
      ok: true,
      ...(result.itemId ? { itemId: result.itemId } : {}),
      cacheError: result.state.cacheError,
      page: pageContext(result.state),
    };
  }
  return {
    check,
    async execute(call: ToolCall): Promise<unknown> {
      check();
      const signature = `${call.function.name}:${call.function.arguments}`;
      const old = handled.get(call.id);
      if (old)
        return old.signature === signature
          ? old.value
          : { ok: false, code: 'DUPLICATE_ID', message: '重复调用 ID 的参数不同。' };
      if (declined.has(signature))
        return { ok: false, code: 'DECLINED', message: '用户已拒绝此操作。' };
      let value: unknown;
      try {
        if (call.function.arguments.length > 100000) throw new Error('工具参数过长。');
        const raw: unknown = JSON.parse(call.function.arguments);
        const state = readState();
        const options = state.draftToken ? { expectedDraft: state.draftToken } : {};
        if (call.function.name === 'get_current_page') {
          argsObject(raw, []);
          value = { ok: true, page: pageContext(state) };
        } else if (call.function.name === 'navigate_page') {
          const args = argsObject(raw, ['path']);
          if (typeof args.path !== 'string') throw new Error('页面路径无效。');
          let result = await appApi.navigate(args.path, options);
          if (!result.ok && result.code === 'UNSAVED_CHANGES') {
            const target = parseRoute(args.path);
            const destination =
              target.page === 'home'
                ? '首页'
                : target.page === 'input'
                  ? `${kindNames[target.kind ?? state.draft!.analysis.kind]}输入页`
                  : target.page === 'history'
                    ? '历史记录'
                    : '这条历史记录';
            const accepted = await approve({
              title: `前往${destination}会放弃当前未保存的输入，是否继续？`,
              changes: [],
            });
            check();
            if (!accepted) {
              declined.add(signature);
              return { ok: false, code: 'DECLINED', message: '用户保留当前草稿。' };
            }
            result = await appApi.navigate(args.path, { ...options, discardDraft: true });
          }
          value = applied(result, '已切换页面');
        } else if (call.function.name === 'fill_fields') {
          const args = argsObject(raw, ['fields']);
          if (!Array.isArray(args.fields) || !args.fields.length || args.fields.length > 30)
            throw new Error('一次填写需包含 1–30 个字段。');
          const values: Record<string, string> = Object.create(null);
          const changes: ChangePreview[] = [];
          for (const item of args.fields) {
            const field = argsObject(item, ['path', 'value']);
            if (
              typeof field.path !== 'string' ||
              typeof field.value !== 'string' ||
              field.value.length > 20000 ||
              Object.hasOwn(values, field.path)
            )
              throw new Error('字段文字、长度或路径重复。');
            const target = state.fields.find((entry) => entry.path === field.path);
            if (!target || target.readOnly) throw new Error('当前页面没有该可写字段。');
            values[field.path] = field.value;
            if (target.value.trim() && target.value !== field.value)
              changes.push({ label: target.label, before: target.value, after: field.value });
          }
          if (changes.length) {
            const accepted = await approve({ title: '应用这些文字修改？', changes });
            check();
            if (!accepted) {
              declined.add(signature);
              return { ok: false, code: 'DECLINED', message: '用户保留原文。' };
            }
          }
          check();
          value = applied(await appApi.fill(values, options), `已填写 ${args.fields.length} 处`);
        } else if (call.function.name === 'add_item') {
          const args = argsObject(raw, ['collection']);
          if (typeof args.collection !== 'string') throw new Error('集合路径无效。');
          const collection = state.collections.find((item) => item.path === args.collection);
          if (!collection || collection.ids.length >= 30)
            throw new Error('集合不存在或条目已达到本轮支持的上限。');
          value = applied(
            await appApi.addItem(args.collection, options),
            `已添加${collection.label}`,
          );
        } else throw new Error('不支持的工具。');
      } catch (error) {
        check();
        value = {
          ok: false,
          code: 'INVALID_ARGUMENT',
          message: error instanceof Error ? error.message : '工具参数无效。',
        };
      }
      handled.set(call.id, { signature, value });
      return value;
    },
  };
}
