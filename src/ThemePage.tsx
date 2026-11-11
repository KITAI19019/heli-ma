import { useRef } from 'react';
import { artworkPresets, colorModes, type ColorMode } from './appearance';
import { Artwork, PresetArtwork } from './Artwork';
import type { useAppearance } from './useAppearance';

function ColorModeIcon({ mode }: { mode: ColorMode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {mode === 'system' && (
        <>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M9 21h6M12 17v4M12 4v13" />
        </>
      )}
      {mode === 'light' && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
        </>
      )}
      {mode === 'dark' && <path d="M20.5 14.2A8.7 8.7 0 0 1 9.8 3.5a8.8 8.8 0 1 0 10.7 10.7Z" />}
    </svg>
  );
}

export function ThemePage({ appearance }: { appearance: ReturnType<typeof useAppearance> }) {
  const input = useRef<HTMLInputElement>(null);
  const { value, customUrl, loading, saving, error } = appearance;
  return (
    <section className="theme-page" aria-label="主题设置">
      <fieldset disabled={loading || saving} className="color-mode-controls">
        <legend>外观</legend>
        <div className="color-mode-options">
          {colorModes.map((mode) => (
            <button
              type="button"
              key={mode.id}
              className="color-mode-option"
              aria-pressed={value.colorMode === mode.id}
              onClick={() => void appearance.setColorMode(mode.id)}
            >
              <ColorModeIcon mode={mode.id} />
              <span>{mode.name}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <h2 id="artwork-title">首页插图</h2>
      <div className="artwork-preview" aria-hidden="true">
        <Artwork value={value} customUrl={customUrl} />
      </div>
      <fieldset disabled={loading || saving} className="artwork-controls">
        <legend>选择预设</legend>
        <div className="artwork-presets">
          {artworkPresets.map((preset) => (
            <button
              type="button"
              className="artwork-option"
              key={preset.id}
              aria-pressed={value.selected === preset.id}
              onClick={() => void appearance.select(preset.id)}
            >
              <span className="artwork-thumbnail">
                <PresetArtwork preset={preset.id} />
              </span>
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
        <div className="artwork-upload">
          <button type="button" onClick={() => input.current?.click()}>
            {value.custom ? '更换自定义图片' : '上传自己的图片'}
          </button>
          <input
            ref={input}
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label="上传首页插图"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) void appearance.upload(file);
            }}
          />
          <p className="hint">PNG、JPG、WebP 或 GIF，最大 10 MB。</p>
          {value.custom && (
            <div className="custom-artwork-choice">
              <button
                type="button"
                className="artwork-option"
                aria-pressed={value.selected === 'custom'}
                onClick={() => void appearance.select('custom')}
              >
                {customUrl && <img src={customUrl} alt="" />}
                <span>我的图片</span>
              </button>
              <div>
                <p className="uploaded-name">{value.custom.name}</p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void appearance.remove()}
                >
                  移除自定义图片
                </button>
              </div>
            </div>
          )}
        </div>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {(loading || saving) && (
        <p className="hint artwork-status" role="status">
          {loading ? '正在读取主题设置…' : '正在保存…'}
        </p>
      )}
    </section>
  );
}
