export const artworkPresets = [
  { id: 'balance', name: '静衡' },
  { id: 'mountains', name: '山月' },
  { id: 'orbit', name: '回环' },
] as const;

export type ArtworkPreset = typeof artworkPresets[number]['id'];
export const colorModes = [
  { id: 'system', name: '跟随系统' },
  { id: 'light', name: '浅色' },
  { id: 'dark', name: '深色' },
] as const;
export type ColorMode = typeof colorModes[number]['id'];
export type Appearance = {
  version: 1;
  colorMode: ColorMode;
  selected: ArtworkPreset | 'custom';
  custom: { blob: Blob; name: string } | null;
};
export const defaultAppearance: Appearance = { version: 1, colorMode: 'system', selected: 'balance', custom: null };
const supportedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const maxBytes = 10 * 1024 * 1024;

function openStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('heli-ma-appearance', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('settings');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('无法读取主题设置。请检查浏览器的存储权限。'));
    request.onblocked = () => reject(new Error('主题设置暂时无法打开，请关闭其他应用窗口后重试。'));
  });
}

function valid(value: unknown): value is Appearance {
  if (!value || typeof value !== 'object') return false;
  const item = value as Appearance;
  if (item.version !== 1 || !['balance', 'mountains', 'orbit', 'custom'].includes(item.selected)) return false;
  // Records saved before the manual theme controls inherit the system setting.
  if (item.colorMode !== undefined && !colorModes.some(mode => mode.id === item.colorMode)) return false;
  if (item.custom !== null && (!item.custom || !(item.custom.blob instanceof Blob) || !supportedTypes.includes(item.custom.blob.type) || item.custom.blob.size > maxBytes || !item.custom.blob.size || typeof item.custom.name !== 'string')) return false;
  return item.selected !== 'custom' || item.custom !== null;
}

export async function readAppearance(): Promise<Appearance> {
  const db = await openStorage();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings');
    const request = tx.objectStore('settings').get('home-artwork');
    tx.oncomplete = () => {
      db.close();
      if (request.result === undefined) resolve(defaultAppearance);
      else if (valid(request.result)) resolve({ ...request.result, colorMode: request.result.colorMode ?? 'system' });
      else reject(new Error('主题设置无法识别，暂时使用默认设置。可在此重新选择。'));
    };
    tx.onabort = () => { db.close(); reject(new Error('主题设置读取失败，请重新打开应用后重试。')); };
  });
}

export async function saveAppearance(value: Appearance): Promise<void> {
  if (!valid(value)) throw new Error('主题设置无效。');
  const db = await openStorage();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(new Error('主题未保存，原设置仍保留。请检查本机可用空间后重试。')); };
    tx.objectStore('settings').put(value, 'home-artwork');
  });
}

export async function validateImage(file: File): Promise<void> {
  if (!supportedTypes.includes(file.type)) throw new Error('请选择 PNG、JPG、WebP 或 GIF 图片。');
  if (!file.size || file.size > maxBytes) throw new Error('请选择不超过 10 MB 的图片。');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); }
    catch { throw new Error('无法打开这张图片，请选择其他图片。'); }
    if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('图片尺寸过大，请选择不超过 4000 万像素的图片。');
  } finally { URL.revokeObjectURL(url); }
}
