import { useState } from 'react';
import { providers, type ProviderId } from './settings';
import type { useAiSettings } from './useAiSettings';
import { OrbFace } from './OrbFace';
import { KeyStorageHint } from './KeyStorageHint';

export function AiSettingsPage({ settings }: { settings: ReturnType<typeof useAiSettings> }) {
  const { value, profile, models, modelError, loadingModels, storageError } = settings;
  const [showKey, setShowKey] = useState(false);
  return (
    <section className="ai-settings" aria-label="AI 配置">
      <label className="ai-toggle">
        <span>
          <strong>启用 AI 助手</strong>
          <small>整理材料、切换页面，协助填写分析。</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="ai-toggle-switch"
          aria-label="启用 AI 助手"
          checked={value.enabled}
          onChange={(event) =>
            settings.update((current) => ({ ...current, enabled: event.target.checked }))
          }
        />
      </label>
      <fieldset className="ai-settings-group">
        <legend>连接服务</legend>
        <label className="ai-field">
          服务商
          <select
            value={value.provider}
            onChange={(event) => {
              setShowKey(false);
              settings.selectProvider(event.target.value as ProviderId);
            }}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </label>
        {value.provider === 'custom' && (
          <label className="ai-field">
            BaseURL
            <input
              type="url"
              aria-label="BaseURL"
              value={profile.baseUrl}
              placeholder="https://example.com/v1"
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => settings.updateProfile({ baseUrl: event.target.value })}
            />
            <small>更换地址后需重新填写密钥。</small>
          </label>
        )}
        <label className="ai-field">
          API Key
          <span className="ai-key-field">
            <input
              aria-label="API Key"
              type={showKey ? 'text' : 'password'}
              value={profile.apiKey}
              placeholder="输入此服务商的 API Key"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => settings.updateProfile({ apiKey: event.target.value })}
            />
            <button
              type="button"
              aria-label={showKey ? '隐藏密钥' : '显示密钥'}
              onClick={() => setShowKey((current) => !current)}
            >
              {showKey ? '隐藏' : '显示'}
            </button>
          </span>
        </label>
        <div className="ai-remember-row">
          <label className="ai-check">
            <input
              type="checkbox"
              checked={profile.rememberKey}
              onChange={(event) => settings.updateProfile({ rememberKey: event.target.checked })}
            />
            在此设备记住密钥
          </label>
          <KeyStorageHint key={value.provider} />
        </div>
        <label className="ai-field">
          模型
          <select
            value={profile.model}
            disabled={loadingModels || !models.length}
            onChange={(event) => settings.updateProfile({ model: event.target.value })}
          >
            <option value="">{loadingModels ? '正在获取模型…' : '请选择模型'}</option>
            {profile.model && !models.includes(profile.model) && (
              <option value={profile.model}>{profile.model}</option>
            )}
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        {modelError && (
          <p className="error" role="alert">
            {modelError}
          </p>
        )}
      </fieldset>
      <fieldset className="ai-settings-group">
        <legend>助手形象</legend>
        <div className="ai-scale-row">
          <span
            className="ai-orb-preview"
            style={{ width: 48 * value.scale, height: 48 * value.scale }}
          >
            <OrbFace />
          </span>
          <label className="ai-field">
            形象大小 · {Math.round(value.scale * 100)}%
            <input
              type="range"
              min="75"
              max="150"
              step="5"
              value={Math.round(value.scale * 100)}
              onChange={(event) =>
                settings.update((current) => ({
                  ...current,
                  scale: Number(event.target.value) / 100,
                }))
              }
            />
          </label>
        </div>
      </fieldset>
      {storageError && (
        <p role="alert" className="error">
          {storageError}
        </p>
      )}
    </section>
  );
}
