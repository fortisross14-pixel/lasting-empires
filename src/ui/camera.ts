// Finding your way on the map: camera buttons (home, the current threat, your armies, the goal), the agenda's pins,
// the command search, and the keys that go with them. The places come from src/engine/search.ts.
import { S, map, todo, sheet, win, modalOpen } from './state';
import { h, clear } from './dom';
import { icon } from './icons';
import { homeView, threatPlaces, armyPlaces, placeOf, search, SEARCH_WORDS, type Hit } from '../engine/search';
import { openSheet } from './sheets';
import { openPage, closeModal, charDetail } from './modal';
import { jumpTo } from './agenda';
import { sfx } from './sound';
import { toast, undoLast, undoCount } from './app';

/** Each button steps through its places on every press; reset when the places change. */
const step: Record<string, { key: string; i: number }> = {};
function cycle(name: string, ids: string[]): string | null {
  if (!ids.length) return null;
  const key = ids.join(',');
  const st = step[name] && step[name].key === key ? step[name] : (step[name] = { key, i: -1 });
  st.i = (st.i + 1) % ids.length;
  return ids[st.i];
}

/** Frame home and its frontier. */
export function goHome() { const ids = homeView(S); if (ids.length) map.focus(ids, 30); }
/** The next place in danger: the map frames it and opens its panel. */
export function goThreat() {
  const id = cycle('threat', threatPlaces(S));
  if (!id) { toast('No danger on your lands right now', 'good'); return; }
  showPlace(id);
}
export function goArmy() {
  const id = cycle('army', armyPlaces(S));
  if (!id) { toast('No companies in garrison'); return; }
  showPlace(id);
}
/** The provinces the mission's goals name, all at once. */
const goalPlaces = () => (S.scenario?.status === 'active' ? map.goalPinIds() : []);
export function goGoal() { const ids = goalPlaces(); if (ids.length) map.focus(ids, 60); }

function showPlace(id: string) {
  sfx('flip');
  map.focus([id], 90);
  map.select(id);
  openSheet('province', id);
}

/** The column of camera buttons over the map, at the right. Icons only: the map stays a map. */
export function renderCamera() {
  const box = document.getElementById('cam');
  if (!box || !S) return;
  clear(box);
  const threats = threatPlaces(S).length, armies = armyPlaces(S).length, goals = goalPlaces().length;
  const btn = (ic: string, label: string, go: () => void, badge?: number, cls = '') => h('button', { class: 'cam-b ' + cls, onclick: go, title: label, 'aria-label': label + (badge ? ` (${badge})` : '') },
    h('span', { html: icon(ic, 18) }), badge ? h('i', { class: 'cam-n' }, String(badge)) : null);
  box.append(...[
    btn('search', 'Search provinces, realms and people  ( / )', openSearch, 0, 'cam-search'),
    btn('crown', 'Home: your realm and its border  ( H )', goHome),
    threats ? btn('sword', 'Next danger  ( T )', goThreat, threats, 'cam-threat') : null,
    armies ? btn('banner', 'Next army  ( A )', goArmy) : null,
    goals ? btn('star', 'Mission targets  ( G )', goGoal) : null].filter((x): x is HTMLElement => !!x));
}

/** Pins on the map for each agenda line that is about one place. */
export function agendaPins() {
  const pins: { id: string; tier: string }[] = [];
  for (const a of todo) { const id = placeOf(S, a); if (id && !pins.some(p => p.id === id)) pins.push({ id, tier: a.tier }); }
  map.setAgendaPins(pins);
}

// ---------- the command search ----------
const KIND_ICON: Record<Hit['kind'], string> = { province: 'map', nation: 'shield', person: 'people', agenda: 'list' };
const KIND_NAME: Record<Hit['kind'], string> = { province: 'Province', nation: 'Realm', person: 'Person', agenda: 'Agenda' };

function follow(hit: Hit) {
  closeModal();
  if (hit.kind === 'province') showPlace(hit.id);
  else if (hit.kind === 'nation') openSheet('nation', hit.id);
  else if (hit.kind === 'person') { const c = S.characters.find(x => String(x.uid) === hit.id); if (c) charDetail(c); }
  else { const a = todo.find(x => x.id === hit.id); if (a) jumpTo(a); }
}

/** Search: type a name, or a word that lists things. Enter goes to the first result; arrows move between them. */
export function openSearch() {
  let hits: Hit[] = [];
  let at = 0;
  const input = h('input', { type: 'search', class: 'srch-in', placeholder: 'Toledo, France, a person, or: idle, war, unrest, short', 'aria-label': 'Search', autocomplete: 'off', spellcheck: 'false' }) as HTMLInputElement;
  const list = h('div', { class: 'gm-list srch-list', role: 'listbox' });
  const draw = () => {
    clear(list);
    if (!input.value.trim()) {
      list.append(h('p', { class: 'muted small' }, 'Words that list things: ', ...SEARCH_WORDS.flatMap((w, i) => [i ? ' · ' : '', h('button', { class: 'linkish', onclick: () => { input.value = w.words[0]; run(); input.focus(); } }, w.words[0]), ` (${w.what})`])), h('p', { class: 'muted small' }, 'A role (merchant, general…) lists everyone of that role.'));
      return;
    }
    if (!hits.length) { list.append(h('p', { class: 'muted' }, 'Nothing by that name that you know of.')); return; }
    hits.forEach((x, i) => list.append(h('button', { class: 'gm-row srch-row' + (i === at ? ' on' : ''), role: 'option', 'aria-selected': String(i === at), onclick: () => follow(x) },
      h('span', { class: 'gm-i', html: icon(KIND_ICON[x.kind], 18) }), h('span', { class: 'gm-t' }, h('b', {}, x.title), h('small', {}, `${KIND_NAME[x.kind]} · ${x.sub}`)), h('span', { class: 'a-go', html: icon('next', 14) }))));
  };
  const run = () => { hits = search(S, input.value); at = 0; draw(); };
  input.addEventListener('input', run);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { at = Math.min(hits.length - 1, at + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { at = Math.max(0, at - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && hits[at]) { follow(hits[at]); e.preventDefault(); }
  });
  openPage(h('div', { class: 'mbox narrow gmenu srch' },
    h('div', { class: 'gm-head' }, h('h2', {}, 'Search'), h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeModal, html: icon('close', 18) })),
    input, list,
    h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Close'))));
  draw();
  requestAnimationFrame(() => input.focus());
}

// ---------- keys (desktop) ----------
// Ctrl+Z or U undo · / search · H home · T next danger · A next army · G mission targets · Escape closes the top layer (modal.ts).
addEventListener('keydown', e => {
  if (!S) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (!document.getElementById('board')) return; // not in a game
  // Ctrl+Z (or U): take back the last step of this season, when nothing is open on top
  if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) || (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'u')) {
    if (!modalOpen && undoCount()) { e.preventDefault(); undoLast(); }
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); if (!modalOpen) openSearch(); return; }
  if (modalOpen || win || (sheet && sheet.kind !== 'province' && sheet.kind !== 'nation')) return;
  const k = e.key.toLowerCase();
  if (k === 'h') goHome(); else if (k === 't') goThreat(); else if (k === 'a') goArmy(); else if (k === 'g') goGoal();
});
