import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { assertAnalysis, conclusionOf, inputError, isPending, titleOf, type Analysis, type HistoryItem } from './model';

let engine: Promise<SqlJsStatic> | undefined;
function loadEngine() {
  engine ??= initSqlJs({ locateFile: () => wasmUrl }).catch(error => { engine = undefined; throw error; });
  return engine;
}
function openStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('heli-ma-v01', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sqlite');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('无法打开本地数据库。请检查浏览器的站点存储权限。'));
    request.onblocked = () => reject(new Error('本地数据库升级被另一个窗口阻塞，请关闭旧窗口后重试。'));
  });
}
function migrate(db: Database) {
  const version = Number(db.exec('PRAGMA user_version')[0].values[0][0]);
  if (version > 1) throw new Error('数据库来自较新的应用版本，请更新应用后再打开。');
  if (version === 0) {
    db.run(`CREATE TABLE analyses (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL,
      conclusion TEXT NOT NULL, pending INTEGER NOT NULL CHECK(pending IN (0, 1)),
      payload TEXT NOT NULL, revision INTEGER NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    ); CREATE INDEX analyses_updated ON analyses(updated_at DESC);
    PRAGMA user_version = 1;`);
  }
}

// Each write reads the latest SQLite file inside ONE serialized IndexedDB transaction.
// No await is allowed in onsuccess. SQL mutation + file replacement commit atomically,
// including writes from other tabs. Failed writes leave the old database untouched.
async function access<T>(write: boolean, operation: (db: Database) => T): Promise<T> {
  const SQL = await loadEngine();
  const storage = await openStorage();
  return new Promise<T>((resolve, reject) => {
    const tx = storage.transaction('sqlite', write ? 'readwrite' : 'readonly');
    const store = tx.objectStore('sqlite');
    let result: T;
    let failure: unknown;
    tx.oncomplete = () => { storage.close(); resolve(result); };
    tx.onabort = () => {
      storage.close();
      reject(failure ?? new Error('保存未成功。请保留当前页面，检查本地存储空间后重试。'));
    };
    const request = store.get('main');
    request.onsuccess = () => {
      let db: Database | undefined;
      try {
        db = new SQL.Database(request.result as Uint8Array | undefined);
        migrate(db);
        result = operation(db);
        if (write) store.put(db.export(), 'main');
      } catch (error) {
        failure = error;
        tx.abort();
      } finally { db?.close(); }
    };
  });
}

export function listAnalyses(): Promise<HistoryItem[]> {
  return access(false, db => {
    const rows = db.exec('SELECT id, kind, title, conclusion, pending, updated_at FROM analyses ORDER BY updated_at DESC, id')[0]?.values ?? [];
    return rows.map(row => ({
      id: String(row[0]), kind: row[1] as Analysis['kind'], title: String(row[2]),
      conclusion: String(row[3]), pending: row[4] === 1, updatedAt: String(row[5]),
    }));
  });
}
export function getAnalysis(id: string): Promise<Analysis> {
  return access(false, db => {
    const statement = db.prepare('SELECT payload FROM analyses WHERE id = ?');
    try {
      statement.bind([id]);
      if (!statement.step()) throw new Error('这条记录已不存在。');
      const record: unknown = JSON.parse(String(statement.get()[0]));
      assertAnalysis(record);
      return record;
    } finally { statement.free(); }
  });
}
export function deleteAnalyses(ids: readonly string[]): Promise<void> {
  if (!ids.length) return Promise.resolve();
  return access(true, db => {
    for (const id of new Set(ids)) db.run('DELETE FROM analyses WHERE id = ?', [id]);
  });
}
export function saveAnalysis(record: Analysis): Promise<Analysis> {
  assertAnalysis(record);
  const invalid = inputError(record);
  if (invalid) return Promise.reject(new Error(invalid));
  return access(true, db => {
    const statement = db.prepare('SELECT revision FROM analyses WHERE id = ?');
    let current = 0;
    try { statement.bind([record.id]); if (statement.step()) current = Number(statement.get()[0]); }
    finally { statement.free(); }
    if (!current && record.revision > 0) throw new Error('这条记录已被删除。当前输入仍在，请先复制需要保留的内容，再新建分析。');
    if (current !== record.revision) throw new Error('另一窗口已更新这条记录。当前输入仍在，请先复制需要保留的内容，再从历史打开最新记录。');
    const saved = { ...record, revision: current + 1, updatedAt: new Date().toISOString() };
    db.run(`INSERT INTO analyses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title=excluded.title, conclusion=excluded.conclusion,
      pending=excluded.pending, payload=excluded.payload, revision=excluded.revision, updated_at=excluded.updated_at`,
    [saved.id, saved.kind, titleOf(saved), conclusionOf(saved), Number(isPending(saved)), JSON.stringify(saved), saved.revision, saved.createdAt, saved.updatedAt]);
    return saved;
  });
}
