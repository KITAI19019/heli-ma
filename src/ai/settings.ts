export const providers = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com' },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  },
  { id: 'custom', name: '自定义', baseUrl: '' },
] as const;

export type ProviderId = (typeof providers)[number]['id'];
export interface ServiceProfile {
  baseUrl: string;
  apiKey: string;
  model: string;
  rememberKey: boolean;
}
export interface AiSettings {
  enabled: boolean;
  provider: ProviderId;
  scale: number;
  position: { x: number; y: number };
  profiles: Record<ProviderId, ServiceProfile>;
}

const SETTINGS_KEY = 'heli-ma-ai-settings-v1';
const SESSION_KEY = 'heli-ma-ai-session-keys-v1';
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const read = (storage: Storage, key: string) => object(JSON.parse(storage.getItem(key) ?? '{}'));

export function readAiSettings(): AiSettings {
  let saved: Record<string, unknown> = {};
  let keys: Record<string, unknown> = {};
  try {
    saved = read(localStorage, SETTINGS_KEY);
  } catch {
    /* Use defaults if unavailable. */
  }
  try {
    keys = read(sessionStorage, SESSION_KEY);
  } catch {
    /* Keys can stay in memory. */
  }
  const storedProfiles = object(saved.profiles);
  const profiles = Object.fromEntries(
    providers.map((provider) => {
      const stored = object(storedProfiles[provider.id]);
      const rememberKey = stored.rememberKey === true;
      const apiKey = rememberKey ? stored.apiKey : keys[provider.id];
      return [
        provider.id,
        {
          baseUrl:
            provider.id === 'custom' && typeof stored.baseUrl === 'string'
              ? stored.baseUrl
              : provider.baseUrl,
          model: typeof stored.model === 'string' ? stored.model : '',
          rememberKey,
          apiKey: typeof apiKey === 'string' ? apiKey : '',
        },
      ];
    }),
  ) as Record<ProviderId, ServiceProfile>;
  const position = object(saved.position);
  return {
    enabled: typeof saved.enabled === 'boolean' ? saved.enabled : true,
    provider: providers.some((p) => p.id === saved.provider)
      ? (saved.provider as ProviderId)
      : 'deepseek',
    scale:
      typeof saved.scale === 'number' && Number.isFinite(saved.scale)
        ? clamp(saved.scale, 0.75, 1.5)
        : 1,
    position: {
      x:
        typeof position.x === 'number' && Number.isFinite(position.x) ? clamp(position.x, 0, 1) : 1,
      y:
        typeof position.y === 'number' && Number.isFinite(position.y)
          ? clamp(position.y, 0, 1)
          : 0.76,
    },
    profiles,
  };
}

export function saveAiSettings(value: AiSettings): string {
  const profiles = Object.fromEntries(
    providers.map(({ id }) => [
      id,
      {
        ...value.profiles[id],
        apiKey: value.profiles[id].rememberKey ? value.profiles[id].apiKey : '',
      },
    ]),
  );
  const keys = Object.fromEntries(
    providers.map(({ id }) => [
      id,
      value.profiles[id].rememberKey ? '' : value.profiles[id].apiKey,
    ]),
  );
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...value, profiles }));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(keys));
    return '';
  } catch {
    return '设置暂时只能保留在当前页面，请检查浏览器存储权限。';
  }
}

export function normalizeBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('请输入完整的 BaseURL，例如 https://example.com/v1。');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('BaseURL 需使用 HTTPS，且不含账号、查询参数或片段；本机服务可使用 HTTP。');
  return url.href.replace(/\/+$/, '');
}
