export async function prepareOffline(onStatus: (status: string) => void) {
  if (!import.meta.env.PROD) { onStatus('开发模式'); return; }
  if (!('serviceWorker' in navigator)) { onStatus('此浏览器暂不支持离线缓存'); return; }
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    onStatus('已准备好离线使用');
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) onStatus('新版本已就绪，关闭所有窗口后重新打开可更新');
      });
    });
  } catch { onStatus('离线缓存失败，联网后重新打开可重试'); }
}

export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
