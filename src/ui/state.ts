// Shared state of the screens (the game in play, what is open), saving and loading, and small helpers used everywhere.
import type { GameState, Character, Cat } from '../types';
import { canLoad, migrate } from '../engine/turn';
import { h, clear } from './dom';
import { kvGet, kvSet, kvRemove, exportData, onStorageError } from './storage';
import { vassalizeBlocked } from '../engine/diplo';
import { MapView } from './map';
import { armsSvg } from './banners';
import { type Attention } from '../engine/pace';
import { showTitle } from './title';
import { start } from './app';

export const KEY = 'lasting-empires.save.v2';
export let S: GameState;
export let map: MapView;
/** A realm kept outlined on the map after its sheet closes (Show all on map); cleared on the next tap. */
export let shownRealm: string | null = null;
export let sheet: { kind: string; arg?: string } | null = null;
export let win: { cat: Cat; tab: string } | null = null; // the centred window of a core menu
export let pick: { char?: number; card?: number } = {};   // the Missions tab: a person and/or a card chosen
export let preferChar: number | null = null;              // person chosen first, preselected in the planner
export let pendingReport = false;
export let cv: { filter: string; mode: 'browse' | 'select' | 'archive' | 'forge' | 'recipes'; sel: number[] } = { filter: 'all', mode: 'browse', sel: [] }; // the Cards tab                          // show the turn report when the queue is empty
export let modalOpen = false;
/** A card, a task or a person shown as a page inside the deck window, in place of a dialog over it. */
export let winPage: HTMLElement | null = null;
export let forge: number[] = [];
export let chronTab = 'powers';
/** What is still open this turn (worked out once per refresh), and what the player has already been told about. */
export let todo: Attention[] = [];
export const seenTodo = new Set<string>();
void vassalizeBlocked;
export const RARITY_ORDER_I = (c: Character) => ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(c.rarity);

// ---------- persistence ----------
// Three save slots. The old single save moves into slot 1 the first time.
export const SLOTS = [1, 2, 3];
export const slotKey = (n: number) => `lasting-empires.slot.${n}`;
export let slot = 1;
/** A new campaign waiting for a slot when all three are full. */
export let pending: { label: string; make: () => GameState } | null = null;

/** A button that asks for a second tap before a destructive action (browser confirm pop-ups are blocked inside the artifact frame). */
export function confirmBtn(label: string, ask: string, act: () => void, cls = 'btn ghost small') {
  let armed = 0;
  const b = h('button', { class: cls, onclick: () => {
    if (armed) { clearTimeout(armed); act(); return; }
    b.textContent = ask; b.classList.add('armed');
    armed = window.setTimeout(() => { armed = 0; b.textContent = label; b.classList.remove('armed'); }, 3500);
  } }, label);
  return b;
}

/** Start a new campaign in a free slot, or ask which slot to replace. */
export function startFresh(label: string, make: () => GameState) {
  const free = SLOTS.find(n => !loadSlot(n));
  if (free) { startIn(free, make()); return; }
  pending = { label, make }; showTitle();
  document.querySelector('.slots')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
export let wantTutorial = true; // chosen on the title screen while every slot is full
/** The realm's coat of arms. */
export function shield(id: string, color: string, small = false) {
  const el = h('span', { class: 'np-shield arms' + (small ? ' sm' : '') });
  el.innerHTML = armsSvg(id, color);
  return el;
}

export function saveNow() { clearTimeout(saveT); saveT = 0; if (!S) return; S.savedAt = Date.now(); kvSet(slotKey(slot), JSON.stringify(S)); }
/** Saving writes the whole game, so it waits a moment after a change; leaving the page saves at once. */
export let saveT = 0;
export function save() { if (!saveT) saveT = window.setTimeout(saveNow, 1500); }
addEventListener('pagehide', () => { if (saveT) saveNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveT) saveNow(); });
export function loadSlot(n: number): GameState | null {
  try {
    const raw = kvGet(slotKey(n));
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return canLoad(s.version) ? migrate(s) : null;
  } catch { return null; }
}
export function clearSlot(n: number) { kvRemove(slotKey(n)); }
export function migrateOldSave() {
  const old = kvGet(KEY);
  if (old && !kvGet(slotKey(1))) kvSet(slotKey(1), old);
  if (old) kvRemove(KEY);
}
/** Saving problems stay on screen until dismissed: a lost save must never be silent. */
function showStorageError(msg: string) {
  let el = document.getElementById('save-err');
  if (!el) { el = h('div', { id: 'save-err', role: 'alert' }); document.body.append(el); }
  clear(el).append(h('p', {}, h('b', {}, msg), ' Your latest progress may not be kept. Export a save file (title screen or Settings) to keep a copy.'),
    h('button', { class: 'btn ghost small', onclick: () => el!.remove() }, 'Dismiss'));
}
onStorageError(showStorageError);
/** Download everything the game keeps as one file; returns a reason if the browser refused. */
export function exportSaveFile(): string | null {
  try {
    const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
    const a = h('a', { href: url, download: `lasting-empires-save-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return null;
  } catch { return 'This browser could not create the file'; }
}
export function startIn(n: number, s: GameState) { slot = n; pending = null; if (s.tutorial == null) s.tutorial = wantTutorial ? 0 : -1; start(s); saveNow(); }
export function snapshot() { return S ? { save: JSON.stringify(S), slot } : {}; }

// ---------- menu styles ----------
export const STYLE_KEY = 'lasting-empires.style';
export const STYLES = [
  { id: 'chancery', name: 'Chancery', desc: 'Letters, wax seals and woodcuts', sw: ['#e9e5da', '#9e1f2a', '#2a4b8c'] },
  { id: 'portolan', name: 'Chart Table', desc: 'Dark sea chart, lacquer and gold', sw: ['#152126', '#d6ad55', '#17333b'] },
  { id: 'heraldic', name: 'Heraldic Court', desc: 'Royal purple, banners, bright gold', sw: ['#1f1638', '#e7b93f', '#1a2546'] },
];
export function currentStyle() {
  let v = kvGet(STYLE_KEY);
  if (!v || v === 'manuscript') v = 'chancery';
  return STYLES.some(x => x.id === v) ? v : 'chancery';
}
export function applyStyle(_id = currentStyle()) {
  // one style only: the Chancery
  document.documentElement.dataset.style = 'chancery';
}
export function setStyle(id: string) { kvSet(STYLE_KEY, id); applyStyle(id); }
export function stylePicker(onChange: () => void) {
  const cur = currentStyle();
  return h('div', { class: 'stylepick' }, STYLES.map(st => h('button', { class: st.id === cur ? 'on' : '', onclick: () => { setStyle(st.id); onChange(); } },
    h('span', { class: 'sw' }, st.sw.map(c => h('i', { style: `background:${c}` }))), h('b', {}, st.name), h('small', { class: 'muted' }, st.desc))));
}

// Setters: other modules import these variables read-only, so they change them here.
export const setSlot = (v: number) => (slot = v);
export const setPending = (v: { label: string; make: () => GameState } | null) => (pending = v);
export const setWantTutorial = (v: boolean) => (wantTutorial = v);
export const setS = (v: GameState) => (S = v);
export const setMap = (v: MapView) => (map = v);
export const setShownRealm = (v: string | null) => (shownRealm = v);
export const setTodo = (v: Attention[]) => (todo = v);
export const setSheet = (v: { kind: string; arg?: string } | null) => (sheet = v);
export const setPick = (v: { char?: number; card?: number }) => (pick = v);
export const setCv = (v: { filter: string; mode: 'browse' | 'select' | 'archive' | 'forge' | 'recipes'; sel: number[] }) => (cv = v);
export const setWin = (v: { cat: Cat; tab: string } | null) => (win = v);
export const setForge = (v: number[]) => (forge = v);
export const setPreferChar = (v: number | null) => (preferChar = v);
export const setChronTab = (v: string) => (chronTab = v);
export const setModalOpen = (v: boolean) => (modalOpen = v);
export const setWinPage = (v: HTMLElement | null) => (winPage = v);
export const setPendingReport = (v: boolean) => (pendingReport = v);
