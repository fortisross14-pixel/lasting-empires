// Storage: old localStorage saves move into IndexedDB, other games' keys are left alone.
// Run with `npm test` (bundled by esbuild, run by node:test, IndexedDB from fake-indexeddb).
import 'fake-indexeddb/auto';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initStorage, kvGet, kvSet, kvRemove, kvKeys, storageKind, exportData, importData, onStorageError, _resetForTests } from '../src/ui/storage';

class MemStorage {
  m = new Map<string, string>();
  quota = Infinity;
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) {
    const size = [...this.m].reduce((n, [a, b]) => n + a.length + b.length, 0) + k.length + v.length;
    if (size > this.quota) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }
    this.m.set(k, String(v));
  }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
const ls = new MemStorage();
// Object.keys(localStorage) must list the stored keys, as in browsers
const proxy = new Proxy(ls, {
  ownKeys: t => [...t.m.keys()],
  getOwnPropertyDescriptor: (t, k) => (typeof k === 'string' && t.m.has(k) ? { value: t.m.get(k), enumerable: true, configurable: true } : undefined),
});
(globalThis as unknown as { localStorage: unknown }).localStorage = proxy;

const flush = () => new Promise(r => setTimeout(r, 20));
async function freshDb() {
  _resetForTests();
  await new Promise<void>(res => { const r = indexedDB.deleteDatabase('lasting-empires'); r.onsuccess = r.onerror = () => res(); });
}
beforeEach(async () => { ls.clear(); ls.quota = Infinity; await freshDb(); });

test('moves this game\'s keys into IndexedDB and frees localStorage', async () => {
  ls.setItem('lasting-empires.slot.1', '{"version":1}');
  ls.setItem('lasting-empires.save.v2', '{"old":true}');
  ls.setItem('lasting-empires.missions-done', '{"m1":{}}');
  ls.setItem('other-game-save', 'keep me');
  ls.setItem('lasting-empiresX', 'not ours');
  await initStorage();
  assert.equal(storageKind(), 'indexeddb');
  assert.equal(kvGet('lasting-empires.slot.1'), '{"version":1}');
  assert.equal(kvGet('lasting-empires.save.v2'), '{"old":true}');
  assert.deepEqual([...ls.m.keys()].sort(), ['lasting-empiresX', 'other-game-save']);
  assert.equal(ls.getItem('other-game-save'), 'keep me');
  // survives a restart
  _resetForTests();
  await initStorage();
  assert.equal(kvGet('lasting-empires.missions-done'), '{"m1":{}}');
});

test('IndexedDB wins when a key is in both', async () => {
  await initStorage();
  kvSet('lasting-empires.slot.2', 'new');
  await flush();
  _resetForTests();
  ls.setItem('lasting-empires.slot.2', 'stale');
  await initStorage();
  assert.equal(kvGet('lasting-empires.slot.2'), 'new');
  assert.equal(ls.getItem('lasting-empires.slot.2'), null);
});

test('saving works with localStorage full, and writes persist', async () => {
  ls.setItem('junk', 'x'.repeat(1000));
  ls.quota = 1000;
  await initStorage();
  assert.equal(kvSet('lasting-empires.slot.1', 'y'.repeat(50000)), true);
  kvSet('lasting-empires.slot.3', 'z');
  kvRemove('lasting-empires.slot.3');
  await flush();
  _resetForTests();
  await initStorage();
  assert.equal(kvGet('lasting-empires.slot.1')?.length, 50000);
  assert.equal(kvGet('lasting-empires.slot.3'), null);
});

test('export and import round trip', async () => {
  await initStorage();
  kvSet('lasting-empires.slot.1', 'a');
  kvSet('lasting-empires.unlock-all', '1');
  const file = exportData();
  kvRemove('lasting-empires.slot.1');
  assert.equal(importData(file), 2);
  assert.equal(kvGet('lasting-empires.slot.1'), 'a');
  assert.equal(typeof importData('{"kind":"other"}'), 'string');
  assert.equal(typeof importData('not json'), 'string');
  assert.deepEqual(kvKeys().sort(), ['lasting-empires.slot.1', 'lasting-empires.unlock-all']);
});

test('without IndexedDB it falls back to localStorage and reports a full store', async () => {
  const idb = globalThis.indexedDB;
  (globalThis as { indexedDB?: unknown }).indexedDB = undefined;
  try {
    _resetForTests();
    await initStorage();
    assert.equal(storageKind(), 'localstorage');
    assert.equal(kvSet('lasting-empires.style', 'chancery'), true);
    assert.equal(ls.getItem('lasting-empires.style'), 'chancery');
    const errors: string[] = [];
    onStorageError(m => errors.push(m));
    ls.quota = 10;
    assert.equal(kvSet('lasting-empires.slot.1', 'big save'), false);
    assert.match(errors[0], /full/);
  } finally { (globalThis as { indexedDB?: unknown }).indexedDB = idb; onStorageError(() => {}); }
});
