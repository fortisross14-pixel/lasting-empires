/*
 * Key-value storage for everything the game keeps: save slots, finished missions,
 * unlocks, custom missions and small settings.
 *
 * All of the owner's GitHub Pages games share one origin (fortisross14-pixel.github.io),
 * and with it one ~5 MB localStorage quota that the other games keep full. So the game
 * keeps its data in IndexedDB (a share of the disk), with an in-memory copy so the rest
 * of the code can stay synchronous. On first start, this game's own `lasting-empires.*`
 * keys are moved from localStorage into IndexedDB and then removed from localStorage.
 * Where IndexedDB isn't available (old browsers, node, sandboxed frames) it falls back
 * to localStorage.
 *
 * Never call localStorage directly anywhere else.
 */

/** Every key this game has ever written starts with this. Other games' keys are never touched. */
export const PREFIX = 'lasting-empires.';
const DB_NAME = 'lasting-empires';
const STORE = 'kv';

let db: IDBDatabase | null = null;
const mem = new Map<string, string>();
let onError: (msg: string) => void = msg => console.error(msg);
let lastError = '';

/** Called with a short message whenever the browser refuses to store something. */
export function onStorageError(fn: (msg: string) => void) { onError = fn; if (lastError) fn(lastError); }
function fail(e: unknown) { lastError = describe(e); console.error(lastError, e); onError(lastError); }
export function storageKind(): 'indexeddb' | 'localstorage' { return db ? 'indexeddb' : 'localstorage'; }

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
function done(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error ?? new Error('aborted')); });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('IndexedDB blocked'));
    setTimeout(() => rej(new Error('IndexedDB did not open in time')), 4000);
  });
}

function lsKeys(): string[] {
  try { return Object.keys(localStorage).filter(k => k.startsWith(PREFIX)); } catch { return []; }
}

/** Call once (and await it) before the app loads a save or renders. */
export async function initStorage(): Promise<void> {
  if (db) return;
  try {
    if (typeof indexedDB === 'undefined') return;
    const d = await openDb();
    const rtx = d.transaction(STORE, 'readonly').objectStore(STORE);
    const [keys, vals] = await Promise.all([req(rtx.getAllKeys()), req(rtx.getAll())]);
    keys.forEach((k, i) => mem.set(String(k), String(vals[i])));
    // move this game's keys still in localStorage over (IndexedDB wins if both exist)
    const moved: string[] = [];
    const wtx = d.transaction(STORE, 'readwrite');
    for (const k of lsKeys()) {
      let v: string | null = null;
      try { v = localStorage.getItem(k); } catch { /* */ }
      if (v === null) continue;
      if (!mem.has(k)) { mem.set(k, v); wtx.objectStore(STORE).put(v, k); }
      moved.push(k);
    }
    await done(wtx);
    // only now that IndexedDB holds them: free the shared localStorage for the other games
    for (const k of moved) { try { localStorage.removeItem(k); } catch { /* the copy in IndexedDB is what counts */ } }
    db = d;
    d.onversionchange = () => d.close();
  } catch (e) {
    console.warn('IndexedDB unavailable, saving in localStorage', e);
    db = null;
    for (const k of [...mem.keys()]) mem.delete(k);
  }
  // ask the browser not to evict the saves under storage pressure
  try { void navigator.storage?.persist?.().catch(() => {}); } catch { /* optional */ }
}

export function kvGet(key: string): string | null {
  if (db) return mem.get(key) ?? null;
  try { return localStorage.getItem(key); } catch { return null; }
}

/** All of this game's keys. */
export function kvKeys(): string[] {
  return db ? [...mem.keys()].filter(k => k.startsWith(PREFIX)) : lsKeys();
}

function write(key: string, value: string | null) {
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const st = tx.objectStore(STORE);
    if (value === null) st.delete(key); else st.put(value, key);
    tx.onabort = () => fail(tx.error);
    tx.onerror = e => { e.preventDefault(); fail(tx.error); };
  } catch (e) { fail(e); }
}

export function describe(e: unknown): string {
  const name = (e as { name?: string } | null)?.name ?? '';
  if (name === 'QuotaExceededError') return 'Could not save: browser storage is full';
  if (name === 'SecurityError') return 'Could not save: browser storage is blocked for this site';
  return 'Could not save the game';
}

/** Returns false if the browser refused to store it (the player is told through onStorageError). */
export function kvSet(key: string, value: string): boolean {
  if (db) { mem.set(key, value); write(key, value); return true; }
  try { localStorage.setItem(key, value); return true; } catch (e) { fail(e); return false; }
}

export function kvRemove(key: string) {
  if (db) { mem.delete(key); write(key, null); return; }
  try { localStorage.removeItem(key); } catch (e) { fail(e); }
}

/** A JSON value, or the fallback if missing or unreadable. */
export function kvJson<T>(key: string, fallback: T): T {
  const raw = kvGet(key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

// ---------- save file: export and import ----------
const FILE_KIND = 'lasting-empires-save';

/** Everything the game keeps, as the text of a save file. */
export function exportData(): string {
  const data: Record<string, string> = {};
  for (const k of kvKeys().sort()) { const v = kvGet(k); if (v != null) data[k] = v; }
  return JSON.stringify({ kind: FILE_KIND, exported: new Date().toISOString(), data });
}

/** Reads a save file; returns how many entries were restored, or a reason it could not be read. */
export function importData(text: string): number | string {
  let f: { kind?: string; data?: Record<string, unknown> };
  try { f = JSON.parse(text); } catch { return 'This is not a Lasting Empires save file'; }
  if (!f || f.kind !== FILE_KIND || typeof f.data !== 'object' || !f.data) return 'This is not a Lasting Empires save file';
  const entries = Object.entries(f.data).filter((e): e is [string, string] => e[0].startsWith(PREFIX) && typeof e[1] === 'string');
  if (!entries.length) return 'The save file is empty';
  for (const [k, v] of entries) if (!kvSet(k, v)) return 'Could not store the save file';
  return entries.length;
}

/** For tests: forget the open database and the in-memory copy. */
export function _resetForTests() { db?.close(); db = null; mem.clear(); lastError = ''; }
