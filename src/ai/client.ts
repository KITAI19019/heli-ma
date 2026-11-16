import { normalizeBaseUrl, type ServiceProfile } from './settings';

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
  [key: string]: unknown;
}
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[] | null;
  tool_call_id?: string;
  reasoning_content?: string;
}
export interface ToolDefinition {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

async function request(
  profile: ServiceProfile,
  path: string,
  signal: AbortSignal,
  body?: unknown,
): Promise<unknown> {
  if (!profile.apiKey.trim()) throw new Error('请先填写 API Key。');
  const url = normalizeBaseUrl(profile.baseUrl) + path;
  const timeout = AbortSignal.timeout(body ? 90000 : 20000);
  const combined = AbortSignal.any([signal, timeout]);
  try {
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${profile.apiKey.trim()}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: combined,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) {
      // Do not display raw provider error bodies: they can echo submitted secrets.
      const reasons: Record<number, string> = {
        400: '服务不接受此请求，请确认所选模型支持 Chat Completions 和工具调用。',
        401: 'API Key 无效或已过期。',
        403: '此密钥没有访问权限。',
        404: '接口或模型不存在，请检查 BaseURL 和模型。',
        429: '请求过于频繁或额度不足，请稍后重试。',
      };
      throw new Error(reasons[response.status] ?? `服务暂时不可用（HTTP ${response.status}）。`);
    }
    return await response.json();
  } catch (error) {
    if (signal.aborted) throw new DOMException('请求已取消。', 'AbortError');
    if (timeout.aborted) throw new Error('请求超时，请稍后重试。');
    if (error instanceof TypeError)
      throw new Error('连接失败，请检查网络、BaseURL，以及服务是否允许浏览器跨域访问。');
    if (error instanceof SyntaxError) throw new Error('服务未返回有效的 JSON 数据。');
    throw error;
  }
}

export async function listModels(profile: ServiceProfile, signal: AbortSignal): Promise<string[]> {
  const result = (await request(profile, '/models', signal)) as { data?: unknown };
  if (!result || !Array.isArray(result.data))
    throw new Error('模型列表格式不兼容，需要 OpenAI 格式的 /models 接口。');
  const ids = result.data.flatMap((model: unknown) => {
    const id = model && typeof model === 'object' ? (model as { id?: unknown }).id : null;
    return typeof id === 'string' && id.trim() ? [id] : [];
  });
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

export async function completeChat(
  profile: ServiceProfile,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  signal: AbortSignal,
): Promise<ChatMessage> {
  if (!profile.model) throw new Error('请先在 AI 配置中选择模型。');
  const result = (await request(profile, '/chat/completions', signal, {
    model: profile.model,
    messages,
    tools,
    tool_choice: 'auto',
    stream: false,
  })) as { choices?: { finish_reason?: string; message?: ChatMessage }[] };
  const choice = result?.choices?.[0];
  const message = choice?.message;
  if (choice?.finish_reason === 'length')
    throw new Error('模型输出被截断，这次回复的工具未执行，请缩短材料后重试。');
  if (
    !message ||
    message.role !== 'assistant' ||
    (message.content != null && typeof message.content !== 'string')
  )
    throw new Error('模型回复格式不兼容。');
  if (
    message.tool_calls != null &&
    (!Array.isArray(message.tool_calls) ||
      message.tool_calls.length > 8 ||
      message.tool_calls.some(
        (call) =>
          !call ||
          typeof call.id !== 'string' ||
          !call.id ||
          call.type !== 'function' ||
          typeof call.function?.name !== 'string' ||
          typeof call.function?.arguments !== 'string',
      ))
  )
    throw new Error('模型工具调用格式无效，这次回复的工具未执行。');
  return {
    role: 'assistant',
    content: message.content ?? null,
    ...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}),
    ...(typeof message.reasoning_content === 'string'
      ? { reasoning_content: message.reasoning_content }
      : {}),
  };
}
