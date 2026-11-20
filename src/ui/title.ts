// Before a game: the title screen, campaign slots, missions and their builder, and the realm picker.
import { stopMusic } from './music';
import type { GameState } from '../types';
import { NATIONS } from '../data/nations';
import { GOVS, GOV_ORDER } from '../data/governments';
import { STARTS, START_YEARS } from '../data/starts';
import { MISSIONS, GOAL_REGIONS, type MissionDef } from '../data/missions';
import { goalView } from '../engine/goals';
import type { Goal, Scenario } from '../types';
import { NO_STATE } from '../data/nations';
import { player, provsOf } from '../engine/core';
import { newGame, newMissionGame, canLoad, migrate } from '../engine/turn';
import { regionDef } from '../engine/overseas';
import { getGeo } from '../engine/map';
import { h, $, clear } from './dom';
import { icon } from './icons';
import { CULTURE_NAMES, RELIGION_NAMES } from '../engine/society';
import { MapView } from './map';
import { scenarioCastilePortugal } from '../engine/scenarios';
import { DIFFICULTY, LENGTHS, STANDARD } from '../data/difficulty';
import { settings, setSetting, applySettings } from './settings';
import {
  S, SLOTS, pending, confirmBtn, startFresh, wantTutorial, shield, loadSlot, clearSlot, migrateOldSave, startIn, applyStyle, setSlot, setPending, setWantTutorial,
} from './state';
import { start, toast, SEASONS } from './app';
import { armBack, setScreenBack } from './modal';

// ---------- shell ----------
export function boot(data: { save?: string; slot?: number }) {
  applyStyle();
  applySettings();
  clear($('#app'));
  let restored: GameState | null = null;
  if (data?.save) { try { restored = JSON.parse(data.save); } catch { /* ignore */ } }
  if (restored && !restored.over && canLoad(restored.version)) { setSlot(data.slot ?? 1); start(migrate(restored)); return; }
  showTitle();
}

export function slotsSection() {
  const saves = SLOTS.map(n => ({ n, s: loadSlot(n) }));
  const box = h('div', { class: 'slots' });
  if (pending) box.append(h('p', { class: 'slot-note' }, `All three slots are full. Choose one to replace with ${pending.label}, or delete one.`,
    h('button', { class: 'btn ghost small', onclick: () => { setPending(null); showTitle(); } }, 'Cancel')));
  for (const { n, s } of saves) {
    const me = s?.nations[s.player];
    const card = h('div', { class: 'slot-card' + (s ? '' : ' empty'), style: me ? `--nc:${me.color}` : '' },
      me ? shield(s!.player, me.color, true) : h('span', { class: 'np-shield sm' }, String(n)),
      h('div', { class: 'slot-t' }, h('b', {}, me ? `${me.name}, ${s!.year}` : `Slot ${n}`),
        h('small', { class: 'muted' }, s ? `${me!.ruler.name} · ${provsOf(s, s.player).length} provinces${s.over ? ' · finished' : ''}` : 'Empty')));
    const acts = h('div', { class: 'slot-acts' });
    if (pending) { const p = pending; acts.append(confirmBtn('Replace', 'Tap again to replace', () => startIn(n, p.make()), 'btn primary small')); }
    else if (s && !s.over) acts.append(h('button', { class: 'btn primary small', onclick: () => startIn(n, s) }, 'Continue'));
    if (s) acts.append(confirmBtn('Delete', 'Tap again to delete', () => { clearSlot(n); showTitle(); }));
    card.append(acts);
    box.append(card);
  }
  return box;
}

// ---------- mission mode: pick a challenge, or build your own ----------
// The long goal of the game: complete every mission. Completions are kept on this device, across campaigns.
export const DONE_KEY = 'lasting-empires.missions-done';
export type DoneRec = { nation: string; realm: string; year: number; when: number };
export function missionsDone(): Record<string, DoneRec> { try { return JSON.parse(localStorage.getItem(DONE_KEY) ?? '{}'); } catch { return {}; } }
export function recordMission() {
  const sc = S?.scenario;
  if (!sc || sc.status !== 'won' || sc.custom || !MISSIONS.some(m => m.id === sc.id)) return;
  const done = missionsDone();
  if (done[sc.id]) return;
  done[sc.id] = { nation: S.player, realm: player(S).name, year: sc.done ?? S.year, when: Date.now() };
  try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch { /* storage may be blocked */ }
  const n = Object.keys(done).filter(id => MISSIONS.some(m => m.id === id)).length;
  toast(`Mission recorded: ${n} of ${MISSIONS.length} completed`, 'good');
}
export const doneCount = () => { const d = missionsDone(); return MISSIONS.filter(m => d[m.id]).length; };
// Unlocks: the beginner missions first, then the real ones; the open game after one real mission.
export const UNLOCK_KEY = 'lasting-empires.unlock-all';
export const unlockAll = () => { try { return localStorage.getItem(UNLOCK_KEY) === '1'; } catch { return false; } };
export const BEGINNER = () => MISSIONS.filter(m => m.beginner);
export const beginnersDone = () => { const d = missionsDone(); return BEGINNER().filter(m => d[m.id]).length; };
export const realUnlocked = () => unlockAll() || beginnersDone() >= BEGINNER().length;
export const sandboxUnlocked = () => { const d = missionsDone(); return unlockAll() || MISSIONS.some(m => !m.beginner && d[m.id]); };

export const CUSTOM_KEY = 'lasting-empires.custom-missions';
export function customMissions(): (Scenario & { nation: string })[] { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]'); } catch { return []; } }
export function saveCustom(list: (Scenario & { nation: string })[]) { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list.slice(-12))); } catch { /* */ } }

export function startMission(nation: string, mission: string | Scenario) {
  const start = typeof mission === 'string' ? MISSIONS.find(m => m.id === mission)?.start ?? 1451 : (mission as Scenario & { start?: number }).start ?? 1451;
  const beginner = typeof mission === 'string' && !!MISSIONS.find(m => m.id === mission)?.beginner; // lessons are always played as designed
  const g = newMissionGame(nation, mission, start, { difficulty: beginner ? STANDARD : settings().difficulty });
  if (g.scenario?.steps?.length) g.tutorial = -1; // the steps teach instead
  startFresh(`the mission “${g.scenario?.name ?? 'Mission'}”`, () => g);
}

export const missionPreviews: Record<number, GameState> = {};
export const previewFor = (year: number) => { if (!missionPreviews[year]) { missionPreviews[year] = newGame(STARTS[year]?.featured[0] ?? 'castile', 777, year); missionPreviews[year].queue = []; } return missionPreviews[year]; };
export const previewState = () => previewFor(missionYear);
export const goalTitle = (g: Goal, deadline: number) => goalView(previewState(), g, deadline).title;

export function missionCard(m: MissionDef) {
  const done = missionsDone()[m.id];
  const locked = !m.beginner && !realUnlocked();
  const pv = previewFor(m.start);
  return h('button', { type: 'button', class: 'mcard' + (m.wild ? ' wild' : '') + (done ? ' done' : '') + (m.beginner ? ' beginner' : '') + (locked ? ' locked' : ''), onclick: () => showMissionDetail(m) },
    h('div', { class: 'mc-h' }, h('span', { class: 'mc-i', html: icon(done ? 'laurel' : locked ? 'lock' : m.icon, 24) }), h('div', {}, h('b', {}, m.name), h('small', {}, `${m.start} – ${m.deadline} · ${m.deadline - m.start} years`)), m.wild ? h('span', { class: 'mc-wild' }, 'Wild') : null),
    h('div', { class: 'mc-foot' },
      h('span', { class: 'mc-realms' }, ...m.nations.map(n => { const nn = pv.nations[n]; return h('span', { class: 'mc-realm' }, nn ? shield(n, nn.color, true) : null, nn?.name ?? n); })),
      h('span', { class: 'mc-state' }, done ? '✓ Done' : locked ? 'Locked' : 'Details ›')));
}

/** A mission's full briefing, with the button that starts it. */
export function showMissionDetail(m: MissionDef) {
  setScreenBack(showMissions); armBack();
  const done = missionsDone()[m.id];
  const locked = !m.beginner && !realUnlocked();
  const pv = previewFor(m.start);
  const root = clear($('#app'));
  root.append(h('div', { class: 'missions-screen mdetail' },
    h('header', { class: 'pick-top' }, h('button', { class: 'btn ghost small', onclick: () => showMissions() }, '← Missions'), h('h1', {}, m.name)),
    h('div', { class: 'md-body' },
      h('p', { class: 'md-meta' }, `${m.start} – ${m.deadline} · ${m.deadline - m.start} years`, m.wild ? ' · Wild' : m.beginner ? ' · Beginner' : ' · Historic'),
      done ? h('div', { class: 'mc-done' }, done.realm ? `✓ Completed with ${done.realm} in ${done.year}` : '✓ Completed') : null,
      m.beginner ? h('div', { class: 'mc-learn' }, `You learn: ${m.beginner}`) : null,
      h('p', { class: 'mc-t' }, m.text),
      h('h2', { class: 'mhead' }, m.steps?.length ? 'Steps, in order' : 'Goals'),
      m.steps?.length
        ? h('ol', { class: 'md-steps' }, m.steps.map(st => h('li', {}, h('b', {}, goalTitle(st.g, m.deadline)), h('small', {}, st.hint))))
        : h('ul', { class: 'mc-g' }, m.goals.map(g => h('li', {}, goalTitle(g, m.deadline)))),
      m.cards?.length || m.gold ? h('p', { class: 'muted' }, 'You start with: ', [m.cards?.length ? `${m.cards.length} extra card${m.cards.length > 1 ? 's' : ''}` : '', m.gold ? `${m.gold} ducats` : ''].filter(Boolean).join(' and ')) : null,
      locked ? h('p', { class: 'md-lock' }, `Locked: complete the ${BEGINNER().length} beginner missions first (${beginnersDone()}/${BEGINNER().length}).`) : null,
      m.beginner || locked ? null : h('div', { class: 'pick-opts md-opts' }, difficultySeg()),
      h('div', { class: 'md-play' }, m.nations.map(n => { const nn = pv.nations[n];
        return h('button', { class: 'btn primary' + (locked ? ' blocked' : ''), onclick: () => (locked ? toast(`Complete the ${BEGINNER().length} beginner missions first (${beginnersDone()}/${BEGINNER().length})`, 'bad') : startMission(n, m.id)) },
          nn ? shield(n, nn.color, true) : null, ` ${done ? 'Play again as' : 'Start mission as'} ${nn?.name ?? n}`); })))));
  window.scrollTo(0, 0);
}

/** Collapsible mission sections; the open/closed choice is remembered. */
export const FOLD_KEY = 'lasting-empires.mission-folds';
export function folds(): Record<string, boolean> { try { return JSON.parse(localStorage.getItem(FOLD_KEY) ?? '{}'); } catch { return {}; } }
export function section(key: string, title: string, openByDefault: boolean, ...kids: (HTMLElement | null)[]) {
  const f = folds();
  const d = h('details', { class: 'msec', ...((f[key] ?? openByDefault) ? { open: true } : {}) }, h('summary', { class: 'mhead' }, title), ...kids) as HTMLDetailsElement;
  d.addEventListener('toggle', () => { const x = folds(); x[key] = d.open; try { localStorage.setItem(FOLD_KEY, JSON.stringify(x)); } catch { /* */ } });
  return d;
}

export let missionYear = 1451;
export function showMissions() {
  setScreenBack(showTitle); armBack();
  const root = clear($('#app'));
  const mine = customMissions();
  root.append(h('div', { class: 'missions-screen' },
    h('header', { class: 'pick-top' }, h('button', { class: 'btn ghost small', onclick: () => showTitle() }, '← Back'), h('h1', {}, 'Missions')),
    (() => {
      const all = MISSIONS.length, n = doneCount(), d = missionsDone();
      return h('div', { class: 'mprog' },
        h('div', { class: 'mprog-t' }, h('b', {}, `${n} of ${all} missions completed`), h('small', {}, START_YEARS.map(y => `${y}: ${MISSIONS.filter(m => m.start === y && d[m.id]).length}/${MISSIONS.filter(m => m.start === y).length}`).join(' · '))),
        h('i', { class: 'mprog-bar' }, h('i', { style: `width:${Math.round((n / all) * 100)}%` })),
        h('small', { class: 'muted' }, n === all ? 'Every mission done. A true Lasting Empire!' : 'The great goal: complete every mission, in any order. A realm, a deadline and a few goals each; track them in the Goals window. Win or lose, the world goes on.'));
    })(),
    h('div', { class: 'seg mfilter' }, START_YEARS.map(y => h('button', { class: 'seg-b' + (y === missionYear ? ' on' : ''), onclick: () => { missionYear = y; showMissions(); } }, `Start ${y}`, h('small', {}, ` ${MISSIONS.filter(m => m.start === y && missionsDone()[m.id]).length}/${MISSIONS.filter(m => m.start === y).length}`)))),
    ...(() => {
      const of = (f: (m: typeof MISSIONS[number]) => boolean) => MISSIONS.filter(m => m.start === missionYear && f(m));
      const beg = of(m => !!m.beginner), real = of(m => !m.beginner && !m.wild), wild = of(m => !!m.wild);
      const lockNote = realUnlocked() ? null : h('p', { class: 'muted' }, `Locked until all ${BEGINNER().length} beginner missions are done (${beginnersDone()}/${BEGINNER().length}). Beginner missions are spread across the three starts.`);
      const out: HTMLElement[] = [];
      const begDone = beg.filter(m => missionsDone()[m.id]).length;
      if (beg.length) out.push(section('beg', `Beginner · ${begDone}/${beg.length}`, begDone < beg.length,
        h('p', { class: 'muted' }, 'Short guided missions, each teaching one part of the game.'), h('div', { class: 'mgrid' }, ...beg.map(missionCard))));
      out.push(section('real', `Historic · ${real.filter(m => missionsDone()[m.id]).length}/${real.length}${realUnlocked() ? '' : ' · locked'}`, realUnlocked(), lockNote, h('div', { class: 'mgrid' }, ...real.map(missionCard))));
      if (wild.length) out.push(section('wild', `Wild · ${wild.filter(m => missionsDone()[m.id]).length}/${wild.length}${realUnlocked() ? '' : ' · locked'}`, realUnlocked(), h('p', { class: 'muted' }, 'Alternate history: the lunatic ones.'), h('div', { class: 'mgrid' }, ...wild.map(missionCard))));
      out.push(section('own', 'Your own missions', true, h('div', { class: 'mgrid' },
        h('button', { class: 'mcard mc-new', onclick: () => showBuilder() }, h('span', { class: 'mc-i', html: icon('plus', 28) }), h('b', {}, 'Create your own mission'), h('small', {}, 'Choose a realm, a deadline and up to 6 goals')),
        ...mine.filter(c => ((c as { start?: number }).start ?? 1451) === missionYear).map(c => h('div', { class: 'mcard mc-custom' },
          h('div', { class: 'mc-h' }, h('span', { class: 'mc-i', html: icon('quill', 24) }), h('div', {}, h('b', {}, c.name), h('small', {}, `Your mission · ${(c as { start?: number }).start ?? 1451} – ${c.deadline}`))),
          h('ul', { class: 'mc-g' }, c.goals.map(g => h('li', {}, goalTitle(g, c.deadline)))),
          h('div', { class: 'mc-play' }, h('button', { class: 'btn primary small', onclick: () => startMission(c.nation, { ...c, status: 'active' }) }, `Play ${NATIONS.find(x => x.id === c.nation)?.name}`),
            confirmBtn('Delete', 'Tap again to delete', () => { saveCustom(customMissions().filter(x => x.id !== c.id)); showMissions(); })))))));
      return out;
    })(),
    unlockAll() ? null : h('p', { class: 'unlock-all' }, 'Already know the game? ', confirmBtn('Unlock everything', 'Tap again to unlock all', () => { try { localStorage.setItem(UNLOCK_KEY, '1'); } catch { /* */ } showMissions(); }))));
}

/** Goal templates for the builder: a label and how to make the goal from one value. */
export const GOAL_KINDS: { id: string; label: string; input: 'n' | 'region' | 'province' | 'gov' | 'none'; def?: number; make: (v: string) => Goal }[] = [
  { id: 'provinces', label: 'Hold at least N provinces', input: 'n', def: 20, make: v => ({ k: 'provinces', n: +v }) },
  { id: 'own', label: 'Take a province', input: 'province', make: v => ({ k: 'own', provinces: [v] }) },
  { id: 'colonies', label: 'N colonies overseas', input: 'n', def: 5, make: v => ({ k: 'colonies', n: +v }) },
  { id: 'holdIn', label: 'Hold 3 provinces in a region', input: 'region', make: v => ({ k: 'holdIn', regions: [v], n: 3 }) },
  { id: 'discover', label: 'Discover a region', input: 'region', make: v => ({ k: 'discover', regions: [v] }) },
  { id: 'posts', label: 'N trade posts', input: 'n', def: 3, make: v => ({ k: 'posts', n: +v }) },
  { id: 'techs', label: 'Know N technologies', input: 'n', def: 15, make: v => ({ k: 'techs', n: +v }) },
  { id: 'rank', label: 'Be among the top N powers', input: 'n', def: 3, make: v => ({ k: 'rank', top: +v }) },
  { id: 'army', label: 'An army in the top N', input: 'n', def: 3, make: v => ({ k: 'army', top: +v }) },
  { id: 'navy', label: 'A navy in the top N', input: 'n', def: 3, make: v => ({ k: 'navy', top: +v }) },
  { id: 'income', label: 'An income in the top N', input: 'n', def: 5, make: v => ({ k: 'income', top: +v }) },
  { id: 'gov', label: 'Change your government', input: 'gov', make: v => ({ k: 'gov', gov: v }) },
  { id: 'capital', label: 'Keep your capital to the end', input: 'none', make: () => ({ k: 'capital' }) },
  { id: 'independent', label: 'Be free of any overlord', input: 'none', make: () => ({ k: 'independent' }) },
];

export function showBuilder() {
  setScreenBack(showMissions); armBack();
  const root = clear($('#app'));
  let startY = missionYear;
  const realmsOf = (y: number) => Object.values(previewFor(y).nations).filter(n => n.alive && !['natives', 'tribes', 'bedouins'].includes(n.id)).sort((a, b) => a.name.localeCompare(b.name));
  let realms = realmsOf(startY);
  const provs = getGeo().seeds.map(x => ({ id: x.id, name: x.name })).sort((a, b) => a.name.localeCompare(b.name));
  let nation = realms.some(r => r.id === 'venice') ? 'venice' : realms[0].id, deadline = Math.min(STARTS[startY]?.end ?? 1750, startY + 100), name = '';
  let goals: Goal[] = [];
  const form = h('div', { class: 'builder' });
  const draw = () => {
    clear(form);
    const sel = (opts: [string, string][], val: string, on: (v: string) => void) => { const e = h('select', { onchange: (ev: Event) => on((ev.target as HTMLSelectElement).value) }, opts.map(([v, l]) => h('option', { value: v, ...(v === val ? { selected: 'selected' } : {}) }, l))) as HTMLSelectElement; return e; };
    form.append(h('label', {}, h('span', {}, 'Start'), sel(START_YEARS.map(y => [String(y), String(y)]), String(startY), v => { startY = +v; realms = realmsOf(startY); if (!realms.some(r => r.id === nation)) nation = realms[0].id; deadline = Math.min(STARTS[startY]?.end ?? 1750, startY + 100); draw(); })));
    form.append(h('label', {}, h('span', {}, 'Realm'), sel(realms.map(r => [r.id, r.name]), nation, v => { nation = v; })));
    const endY = STARTS[startY]?.end ?? 1750;
    const dl = h('input', { type: 'number', min: String(startY + 5), max: String(endY), value: String(deadline), onchange: (e: Event) => { deadline = Math.max(startY + 5, Math.min(endY, +(e.target as HTMLInputElement).value || startY + 100)); } });
    form.append(h('label', {}, h('span', {}, 'Deadline (year)'), dl));
    const nm = h('input', { type: 'text', placeholder: 'e.g. Venice discovers America', value: name, oninput: (e: Event) => { name = (e.target as HTMLInputElement).value; } });
    form.append(h('label', {}, h('span', {}, 'Name'), nm));
    form.append(h('h3', {}, `Goals (${goals.length}/6)`));
    const pv = previewState();
    goals.forEach((g, i) => form.append(h('div', { class: 'bgoal' }, h('span', {}, goalView(pv, g, deadline).title), h('button', { class: 'btn ghost small', onclick: () => { goals.splice(i, 1); draw(); } }, 'Remove'))));
    if (goals.length < 6) {
      let kind = GOAL_KINDS[0];
      const valBox = h('span', { class: 'bval' });
      let value = '';
      const drawVal = () => {
        clear(valBox); value = '';
        if (kind.input === 'n') { value = String(kind.def ?? 1); valBox.append(h('input', { type: 'number', min: '1', max: '200', value, oninput: (e: Event) => { value = (e.target as HTMLInputElement).value; } })); }
        else if (kind.input === 'region') { value = GOAL_REGIONS[0]; valBox.append(sel(GOAL_REGIONS.map(r => [r, regionDef(r).name]), value, v => { value = v; })); }
        else if (kind.input === 'gov') { value = 'absolutism'; valBox.append(sel(GOV_ORDER.filter(g => g !== 'feudal').map(g => [g, GOVS[g].name]), value, v => { value = v; })); }
        else if (kind.input === 'province') { value = provs[0].id; valBox.append(sel(provs.map(p => [p.id, p.name]), value, v => { value = v; })); }
      };
      drawVal();
      form.append(h('div', { class: 'badd' }, sel(GOAL_KINDS.map(k => [k.id, k.label]), kind.id, v => { kind = GOAL_KINDS.find(k => k.id === v)!; drawVal(); }), valBox,
        h('button', { class: 'btn small', onclick: () => { if (kind.input === 'n' && !(+value > 0)) return toast('Enter a number', 'bad'); goals.push(kind.make(value)); draw(); } }, 'Add goal')));
    }
    form.append(h('div', { class: 'mrow' },
      h('button', { class: 'btn ghost', onclick: () => showMissions() }, 'Cancel'),
      h('button', { class: 'btn primary' + (goals.length ? '' : ' blocked'), onclick: () => {
        if (!goals.length) return toast('Add at least one goal', 'bad');
        const realm = realms.find(r => r.id === nation)!;
        const sc = { id: 'custom_' + Date.now(), name: name.trim() || `${realm.name}'s mission`, text: `Your own mission for ${realm.name}, from ${startY}.`, deadline, goals, status: 'active', custom: true, nation, start: startY } as Scenario & { nation: string };
        saveCustom([...customMissions(), sc]);
        startMission(nation, sc);
      } }, 'Save and play')));
  };
  draw();
  root.append(h('div', { class: 'missions-screen' },
    h('header', { class: 'pick-top' }, h('button', { class: 'btn ghost small', onclick: () => showMissions() }, '← Back'), h('h1', {}, 'Your own mission')),
    h('p', { class: 'muted' }, 'Pick a start year, a realm and a deadline, then add goals.'), form));
}

export function chooseNation(id: string, year = 1451) {
  const opts = { difficulty: settings().difficulty, length: settings().length };
  startFresh(`a new ${NATIONS.find(x => x.id === id)?.name ?? id} campaign`, () => newGame(id, undefined, year, opts));
}

/** A labelled choice of a few options with one line of explanation under it; the last choice is remembered. */
export function optSeg(label: string, options: { id: string; name: string; text: string }[], current: string, onPick: (id: string) => void) {
  const hint = h('small', { class: 'opt-hint' }, options.find(o => o.id === current)?.text ?? '');
  const seg = h('div', { class: 'seg opt-seg', role: 'radiogroup', 'aria-label': label });
  for (const o of options) seg.append(h('button', { class: 'seg-b' + (o.id === current ? ' on' : ''), role: 'radio', 'aria-checked': String(o.id === current), onclick: () => {
    onPick(o.id);
    for (const b of Array.from(seg.children)) { const on = b.textContent === o.name; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
    hint.textContent = o.text;
  } }, o.name));
  return h('div', { class: 'sopt' }, h('span', { class: 'opt-l' }, label), seg, hint);
}
export const difficultySeg = () => optSeg('Difficulty', DIFFICULTY.map(d => ({ id: String(d.id), name: d.name, text: d.text })), String(settings().difficulty), id => setSetting('difficulty', Number(id)));
export const lengthSeg = () => optSeg('Length', LENGTHS.map(l => ({ id: l.id, name: l.name, text: l.text })), settings().length, id => setSetting('length', id));

// ---------- realm picker: tap any realm on the world map ----------
export const FEATURED = ['castile', 'portugal', 'aragon', 'byzantium', 'ottomans', 'france', 'england', 'austria', 'muscovy', 'venice', 'mamluks', 'vijayanagara', 'ming', 'japan', 'mali', 'aztec', 'inca'];
export function difficulty(provs: number, army: number): { label: string; cls: string } {
  const size = provs + army / 3;
  return size >= 14 ? { label: 'Strong start', cls: 'd-easy' } : size >= 6 ? { label: 'Balanced', cls: 'd-mid' } : size >= 3 ? { label: 'Hard start', cls: 'd-hard' } : { label: 'Very hard', cls: 'd-vhard' };
}

export let pickYear = 1451;
export function showPicker(initial?: string) {
  setScreenBack(showTitle); armBack();
  const root = clear($('#app'));
  const later = STARTS[pickYear];
  const featured = later?.featured ?? FEATURED;
  initial = initial ?? featured[0];
  const preview = newGame(initial, 12345, pickYear);
  preview.queue = [];
  const panel = h('div', { class: 'pick-panel' });
  const board = h('div', { class: 'pick-map' });
  root.append(h('div', { class: 'picker' },
    h('header', { class: 'pick-top' },
      h('button', { class: 'btn ghost small', onclick: () => showTitle() }, '← Back'),
      h('h1', {}, 'Choose your realm'),
      h('div', { class: 'seg pick-year' }, START_YEARS.map(y => h('button', { class: 'seg-b' + (y === pickYear ? ' on' : ''), onclick: () => { if (y !== pickYear) { pickYear = y; showPicker(); } } }, String(y)))),
      h('span', { class: 'muted pick-hint' }, 'Tap any realm on the map')),
    later ? h('p', { class: 'pick-era' }, h('b', {}, `${pickYear}: ${later.name}. `), later.text, ` The game runs to ${later.end}.`) : null,
    h('div', { class: 'pick-feat' }, featured.filter(id => preview.nations[id]?.alive).map(id => h('button', { class: 'tchip', onclick: () => select(id, true) }, h('i', { class: 'swatch', style: `background:${preview.nations[id].color}` }), preview.nations[id].name))),
    board, panel, h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' })));
  const mv = new MapView(board);
  mv.revealAll = true;
  const select = (id: string, focus = false) => {
    const n = preview.nations[id];
    if (!n || id === NO_STATE || !n.alive) return;
    mv.picked = id; mv.render(preview);
    const ps = provsOf(preview, id);
    if (focus) mv.focus(ps.map(p => p.id), 60);
    const def = NATIONS.find(d => d.id === id) ?? { army: n.army.map(t => t.type), blurb: undefined };
    const d = difficulty(ps.length, pickYear > 1451 ? Math.min(def.army.length, n.army.length) : def.army.length);
    const near = new Set<string>();
    for (const p of ps) for (const nb of getGeo().adj[p.id]) { const o = preview.provinces[nb].owner; if (o !== id && o !== NO_STATE) near.add(o); }
    const cap = preview.provinces[n.capital];
    clear(panel).append(
      h('div', { class: 'pick-card', style: `--nc:${n.color}` },
        shield(id, n.color),
        h('div', { class: 'pick-t' },
          h('b', {}, n.name), h('span', { class: 'np-diff ' + d.cls }, d.label),
          h('small', {}, `${ps.length} province${ps.length > 1 ? 's' : ''} · capital ${cap?.name ?? '?'} · ${RELIGION_NAMES[cap?.religion ?? ''] ?? ''} · ${CULTURE_NAMES[n.culture]}`),
          h('small', { class: 'muted' }, (pickYear === 1451 ? def.blurb : undefined) ?? (near.size ? `Neighbours: ${[...near].slice(0, 5).map(o => preview.nations[o].name).join(', ')}.` : 'No neighbours by land.')))),
      h('div', { class: 'pick-opts' }, difficultySeg(), lengthSeg()),
      h('label', { class: 'tutopt' }, h('input', { type: 'checkbox', id: 'tutcheck', checked: wantTutorial ? true : undefined, onchange: (e: Event) => { setWantTutorial((e.target as HTMLInputElement).checked); } }), 'Show me how to play'),
      h('button', { class: 'btn primary', onclick: () => chooseNation(id, pickYear) }, `Play as ${n.name} in ${pickYear}`));
  };
  mv.onSelect = pid => { if (pid) { const o = preview.provinces[pid].owner; if (o === NO_STATE) { mv.select(null); toast('Unclaimed land: no state to play here', 'bad'); } else select(o); } };
  mv.render(preview);
  select(initial);
  requestAnimationFrame(() => mv.focus(provsOf(preview, initial!).map(p => p.id), 60));
}

export function showTitle() {
  stopMusic();
  setScreenBack(null);
  migrateOldSave();
  const root = clear($('#app'));
  // the council table: a painted scene behind the page (wide on a tablet, tall on a phone), the name over it
  root.append(h('div', { class: 'title-screen has-scene' },
    h('div', { class: 'title-bg', 'aria-hidden': 'true' }),
    h('div', { class: 'title-inner' },
      h('div', { class: 'title-head' },
        h('p', { class: 'eyebrow' }, 'Anno Domini 1451 – 1810'),
        h('h1', { class: 'title' }, 'Lasting Empires')),
      h('div', { class: 'title-sheet' },
      h('p', { class: 'lede' }, 'Rule a realm from 1451 to 1810. Every action is a card; every card needs the right person. One turn is one season.'),
      (() => { // the game you were playing: one tap to go back in
        if (pending) return null;
        const cur = SLOTS.map(n => ({ n, s: loadSlot(n) })).filter(x => x.s && !x.s.over).sort((a, b) => (b.s!.savedAt ?? 0) - (a.s!.savedAt ?? 0))[0];
        if (!cur) return null;
        const me = cur.s!.nations[cur.s!.player];
        return h('button', { class: 'btn primary wide newgame continue-b', onclick: () => startIn(cur.n, cur.s!) }, shield(cur.s!.player, me.color, true), h('span', { class: 'cb-t' }, h('b', {}, `Continue ${me.name}`), h('small', {}, `${SEASONS[cur.s!.quarter ?? 0]} ${cur.s!.year}${cur.s!.scenario ? ` · ${cur.s!.scenario.name}` : ''}`)));
      })(),
      h('button', { class: 'btn wide newgame missions-b' + (SLOTS.some(n => { const x = loadSlot(n); return x && !x.over; }) && !pending ? '' : ' primary'), onclick: () => showMissions() }, h('span', { html: icon('star', 18) }), ` Missions · ${doneCount()} of ${MISSIONS.length} completed`),
      !realUnlocked() ? h('p', { class: 'title-hint' }, `New here? Start with the beginner missions (${beginnersDone()}/${BEGINNER().length}).`) : null,
      h('button', { class: 'btn wide newgame' + (sandboxUnlocked() ? '' : ' blocked'), onclick: () => (sandboxUnlocked() ? showPicker() : toast('The open game unlocks when you complete your first historic mission', 'bad')) }, sandboxUnlocked() ? 'Open game: any realm, any year' : 'Open game · unlocks after your first historic mission'),
      SLOTS.some(n => loadSlot(n)) || pending ? h('h2', { class: 'pick-h' }, 'Your campaigns') : null,
      SLOTS.some(n => loadSlot(n)) || pending ? slotsSection() : null,
      h('details', { class: 'howto' }, h('summary', {}, 'Test scenarios'),
        h('p', { class: 'muted' }, 'Ready-made games to try a system quickly. They use a free campaign slot.'),
        h('button', { class: 'btn wide', onclick: () => startFresh('the battle test', scenarioCastilePortugal) }, 'Battles: Castile at war with Portugal, summer 1467')),
      h('details', { class: 'howto' },
        h('summary', {}, 'How to play'),
        h('ul', {},
          h('li', {}, 'You draw about one card of each kind a year. Buildings, research and your monarch raise those rates. Spend nation points to buy more (pick 1 of 3).'),
          h('li', {}, 'Most cards are tasks for a person: generals, diplomats, administrators, merchants and researchers. Each has a rarity from Common to Legendary.'),
          h('li', {}, 'Manpower is scarce: hiring a troop or a person costs 1. Ducats pay for troops, building salaries and imported goods.'),
          h('li', {}, 'Forge troops in the Military panel: Levy + Long Pikes = Pikemen; Pikemen + Arquebusiers = Tercio.'),
          h('li', {}, 'In battle both sides play a tactic face-down. Counter the enemy and they take extra damage.'),
          h('li', {}, 'Diplomats can become Explorers, generals Conquerors, administrators Colonists, to win lands overseas. There is no going back.'),
        ))))));
}

// Setters: other modules import these variables read-only, so they change them here.
export const setMissionYear = (v: number) => (missionYear = v);
