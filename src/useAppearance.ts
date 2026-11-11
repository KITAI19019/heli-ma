import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  defaultAppearance,
  readAppearance,
  saveAppearance,
  validateImage,
  type Appearance,
  type ArtworkPreset,
  type ColorMode,
} from './appearance';

export function useAppearance() {
  const [value, setValue] = useState(defaultAppearance);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    void readAppearance()
      .then((next) => {
        if (active) setValue(next);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : '主题设置读取失败。');
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    const system = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme =
        value.colorMode === 'system' ? (system.matches ? 'dark' : 'light') : value.colorMode;
      document.documentElement.dataset.theme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#15130f' : '#f2eee3');
    };
    apply();
    system.addEventListener('change', apply);
    return () => system.removeEventListener('change', apply);
  }, [value.colorMode]);

  useEffect(() => {
    if (!value.custom) {
      setCustomUrl('');
      return;
    }
    const url = URL.createObjectURL(value.custom.blob);
    setCustomUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value.custom]);

  async function change(makeValue: () => Promise<Appearance> | Appearance) {
    if (!loaded || lock.current) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      const next = await makeValue();
      await saveAppearance(next);
      setValue(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '主题保存失败，请重试。');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return {
    value,
    customUrl,
    error,
    loading: !loaded,
    saving,
    setColorMode: (colorMode: ColorMode) => change(() => ({ ...value, colorMode })),
    select: (selected: ArtworkPreset | 'custom') => change(() => ({ ...value, selected })),
    upload: (file: File) =>
      change(async () => {
        await validateImage(file);
        return {
          ...value,
          selected: 'custom',
          custom: { blob: file.slice(0, file.size, file.type), name: file.name },
        };
      }),
    remove: () =>
      change(() => ({
        ...value,
        selected: value.selected === 'custom' ? 'balance' : value.selected,
        custom: null,
      })),
  };
}
