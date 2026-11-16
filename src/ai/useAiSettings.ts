import { useEffect, useRef, useState } from 'react';
import { listModels } from './client';
import {
  normalizeBaseUrl,
  readAiSettings,
  saveAiSettings,
  type AiSettings,
  type ProviderId,
  type ServiceProfile,
} from './settings';

export function useAiSettings(visible: boolean) {
  const [value, setValue] = useState(readAiSettings);
  const [models, setModels] = useState<string[]>([]);
  const [modelError, setModelError] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [storageError, setStorageError] = useState('');
  const latest = useRef(value);
  latest.current = value;
  const profile = value.profiles[value.provider];

  function update(make: (previous: AiSettings) => AiSettings) {
    const next = make(latest.current);
    latest.current = next;
    setValue(next);
    setStorageError(saveAiSettings(next));
  }
  function updateProfile(patch: Partial<ServiceProfile>) {
    update((current) => {
      const old = current.profiles[current.provider];
      const addressChanged = patch.baseUrl !== undefined && patch.baseUrl !== old.baseUrl;
      const connectionChanged =
        (patch.apiKey !== undefined && patch.apiKey !== old.apiKey) || addressChanged;
      return {
        ...current,
        profiles: {
          ...current.profiles,
          [current.provider]: {
            ...old,
            ...patch,
            ...(addressChanged ? { apiKey: '' } : {}),
            ...(connectionChanged ? { model: '' } : {}),
          },
        },
      };
    });
  }

  useEffect(() => {
    setModels([]);
    setModelError('');
    setLoadingModels(false);
    if (!visible || !profile.apiKey.trim()) return;
    try {
      normalizeBaseUrl(profile.baseUrl);
    } catch (error) {
      setModelError((error as Error).message);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoadingModels(true);
      void listModels(profile, controller.signal)
        .then((ids) => {
          if (controller.signal.aborted) return;
          setModels(ids);
          setModelError(ids.length ? '' : '服务未返回可选模型。');
          if (profile.model && !ids.includes(profile.model)) updateProfile({ model: '' });
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted)
            setModelError(error instanceof Error ? error.message : '模型列表读取失败。');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoadingModels(false);
        });
    }, 700);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // Model selection and avatar settings must not trigger another network request.
  }, [visible, value.provider, profile.apiKey, profile.baseUrl]);

  return {
    value,
    profile,
    models,
    modelError,
    loadingModels,
    storageError,
    update,
    updateProfile,
    selectProvider: (provider: ProviderId) => update((current) => ({ ...current, provider })),
  };
}
