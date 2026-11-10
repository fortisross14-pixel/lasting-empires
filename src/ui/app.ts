import type { GameState, Province, MissionKind, DraftOption, RevealItem, Battle, Character, Cat, Heir, BattleRecord } from '../types';
import { CATS } from '../types';
import { NATIONS, RULER_ARCHS } from '../data/nations';
import { TROOPS, EQUIPMENT, COUNTER_TEXT } from '../data/troops';
import { TECHS, TECH, BUILDINGS, AGE_NAMES, type TechTrack } from '../data/techs';
import { GOVS, GOV_ORDER } from '../data/governments';
import { STARTS, START_YEARS } from '../data/starts';
import { MISSIONS, GOAL_REGIONS, type MissionDef } from '../data/missions';
import { goalView, type GoalView } from '../engine/goals';
import type { Goal, Scenario } from '../types';
import { revolutionBlocked, revolutionLands, startRevolution, REVOLUTION_YEARS, moveCapital, moveCapitalBlocked, capitalMoveCost } from '../engine/government';
import { TRAITS, RARITY, OUTCOME_ODDS, OUTCOMES } from '../data/characters';
import { GOODS, FOOD, RAW, MADE } from '../data/goods';
import { GENRES, QUALITY } from '../data/culture';
import { churchHead, churchRel, churchMood, giftCost, giftBlocked, artHappy, artGold, displayed, displaySlots, museumsOpen, artCost, acceptBlocked, acceptCap, cultureRows, religionRows, cultureName } from '../engine/culture';
import { hireNeeds, quarterFlow, needs, partners, routeBlocked, postBlocked, routeCap, postCap, postTurns, postCost, distanceTo, price, canMake, workshopCap, provinceOutput, sideOutput, dealFor, merchantFactor, POST_UPKEEP, MAX_ROUTE, materialsFor, stockCap } from '../engine/trade';
import { AGE_TECH, ERA, PIONEER_YEARS } from '../data/eras';
import { ageOf, nextAge } from '../engine/ages';
import { REGIONS, HOME_REGIONS, NATIVE_EMPIRES } from '../data/overseas';
import { NO_STATE } from '../data/nations';
import {
  player, push, pioneerNow, provsOf, incomeOf, playerManpower, getRel, atWar, hasTreaty, enemiesOf, alliesOf, armyPower,
  armyCap, courtCap, courtCount, provinceIncome, buildingAllowed, buildingCost, roleName, nationName, inTruce,
  tierOf, TIERS, population, townSlots, ruralSlots, builtAt, ownGoods, colonyGoods, coreSlots, techFx, ageIndex,
} from '../engine/core';
import { newGame, newMissionGame, endTurn, chooseEventOption, playerDeclareWar, warCost, ranking, powerTable, dismissCharacter, disbandTroop, chooseHeir, SAVE_VERSION, coreBlocked, coreCost, adoptCore, dropCore, migrate } from '../engine/turn';
import { EVENT, eventTitle, upcomingHistory } from '../engine/events';
import { typesFor, poolOf, cardType, cardTroop, unitFor, UNIT_LINES, CLASS_NAME, type CardType, type UnitClass } from '../engine/cards';
import { CARDS, CAT_INFO, handOf, cardRates, npRate, buyCost, playCard, cardBlocked, troopHireCost, discardCard, handLimit, handTotalLimit, heldOf, heldTotal, handExcess, sellCards, cardFor } from '../engine/cards';
import {
  MISSION_INFO, DIPLO, missionBlocked, launchMission, cancelMission, diploChance, missionTurns, techCost, researchRate, attackRoute,
  developCost, foundCost, growCost, projectGoods, projectShortfall, pilgrimageCost, helpersOf, cardRole, cardRoles, becomesOnMission, voyageCost, GRADES,
  graceCost, envoyCost, envoyTravel,
} from '../engine/missions';
import { buyCard, buyBlocked, hireWithCard, takeDraftOption, mergePreview, doMerge, AMBITIONS, officeCost, sellOffices } from '../engine/drafts';
import { discoverable, exploreChance, colonizeChance, conquistaChance, PROMOTION, colonyCost, regionKnown, provRegion, provKnown, regionDef } from '../engine/overseas';
import { playRound, autoResolve, finishBattle, ratio, breakLevel, hp } from '../engine/battle';
import { getGeo } from '../engine/map';
import { h, $, clear, sleep, reduced, fmt, signed } from './dom';
import { icon } from './icons';
import { setCardGame, troopCard, charCard, handCard, tacticCard, backCard, flipCard, coreCard } from './cards';
import { AXES, CORE } from '../data/core';
import { navyCap, transportOf, hireShip, shipHireCost } from '../engine/navy';
import { warScore, peaceTerms, enemyDemands, concludePeace, subjectsOf, integrateBlocked, vassalizeBlocked, tributeShare } from '../engine/diplo';
import { happinessOf, moodName, CULTURE_NAMES, RELIGION_NAMES, isAccepted, nationalHappiness } from '../engine/society';
import { MapView, MAP_MODES, legendFor } from './map';
import { scenarioCastilePortugal } from '../engine/scenarios';
import { troopsNear, setDefence, garrisons, moveTroops, travel, locOf, nearestGarrison, baseFor, READY_STR, HEAL } from '../engine/army';
import { rankOf, nextRank, missionCap, missionsLeft, VICEROY_COST, viceroyBlocked, territoryOf, appointViceroy, recallViceroy, viceroyFocus, FOCUS_TEXT } from '../engine/realm';

const KEY = 'lasting-empires.save.v2';
let S: GameState;
let map: MapView;
let sheet: { kind: string; arg?: string } | null = null;
let win: { cat: Cat; tab: string } | null = null; // the centred window of a core menu
let pick: { char?: number; card?: number } = {};   // the Missions tab: a person and/or a card chosen
let preferChar: number | null = null;              // person chosen first, preselected in the planner
let pendingReport = false;
let cv: { filter: string; mode: 'browse' | 'select' | 'archive' | 'forge' | 'recipes'; sel: number[] } = { filter: 'all', mode: 'browse', sel: [] }; // the Cards tab                          // show the turn report when the queue is empty
let modalOpen = false;
let forge: number[] = [];
let chronTab = 'powers';
void vassalizeBlocked;
const RARITY_ORDER_I = (c: Character) => ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(c.rarity);

// ---------- persistence ----------
// Three save slots. The old single save moves into slot 1 the first time.
const SLOTS = [1, 2, 3];
const slotKey = (n: number) => `lasting-empires.slot.${n}`;
let slot = 1;
let pendingNation: string | null = null;
let wantTutorial = true; // chosen on the title screen while every slot is full
function saveNow() { clearTimeout(saveT); saveT = 0; try { localStorage.setItem(slotKey(slot), JSON.stringify(S)); } catch { /* storage may be blocked */ } }
/** Saving writes the whole game, so it waits a moment after a change; leaving the page saves at once. */
let saveT = 0;
function save() { if (!saveT) saveT = window.setTimeout(saveNow, 1500); }
addEventListener('pagehide', () => { if (saveT) saveNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveT) saveNow(); });
function loadSlot(n: number): GameState | null {
  try {
    const raw = localStorage.getItem(slotKey(n));
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s.version === SAVE_VERSION ? migrate(s) : null;
  } catch { return null; }
}
function clearSlot(n: number) { try { localStorage.removeItem(slotKey(n)); } catch { /* */ } }
function migrateOldSave() {
  try {
    const old = localStorage.getItem(KEY);
    if (old && !localStorage.getItem(slotKey(1))) localStorage.setItem(slotKey(1), old);
    if (old) localStorage.removeItem(KEY);
  } catch { /* */ }
}
function startIn(n: number, s: GameState) { slot = n; pendingNation = null; if (s.tutorial == null) s.tutorial = wantTutorial ? 0 : -1; start(s); saveNow(); }
export function snapshot() { return S ? { save: JSON.stringify(S), slot } : {}; }

// ---------- menu styles ----------
const STYLE_KEY = 'lasting-empires.style';
export const STYLES = [
  { id: 'chancery', name: 'Chancery', desc: 'Letters, wax seals and woodcuts', sw: ['#e9e5da', '#9e1f2a', '#2a4b8c'] },
  { id: 'portolan', name: 'Chart Table', desc: 'Dark sea chart, lacquer and gold', sw: ['#152126', '#d6ad55', '#17333b'] },
  { id: 'heraldic', name: 'Heraldic Court', desc: 'Royal purple, banners, bright gold', sw: ['#1f1638', '#e7b93f', '#1a2546'] },
];
function currentStyle() {
  let v: string | null = null;
  try { v = localStorage.getItem(STYLE_KEY); } catch { /* */ }
  if (!v || v === 'manuscript') v = 'chancery';
  return STYLES.some(x => x.id === v) ? v : 'chancery';
}
export function applyStyle(_id = currentStyle()) {
  // one style only: the Chancery
  document.documentElement.dataset.style = 'chancery';
}
function setStyle(id: string) { try { localStorage.setItem(STYLE_KEY, id); } catch { /* */ } applyStyle(id); }
function stylePicker(onChange: () => void) {
  const cur = currentStyle();
  return h('div', { class: 'stylepick' }, STYLES.map(st => h('button', { class: st.id === cur ? 'on' : '', onclick: () => { setStyle(st.id); onChange(); } },
    h('span', { class: 'sw' }, st.sw.map(c => h('i', { style: `background:${c}` }))), h('b', {}, st.name), h('small', { class: 'muted' }, st.desc))));
}

// ---------- shell ----------
export function boot(data: { save?: string; slot?: number }) {
  applyStyle();
  clear($('#app'));
  let restored: GameState | null = null;
  if (data?.save) { try { restored = JSON.parse(data.save); } catch { /* ignore */ } }
  if (restored && !restored.over && restored.version === SAVE_VERSION) { slot = data.slot ?? 1; start(migrate(restored)); return; }
  showTitle();
}

function slotsSection() {
  const saves = SLOTS.map(n => ({ n, s: loadSlot(n) }));
  const box = h('div', { class: 'slots' });
  if (pendingNation) box.append(h('p', { class: 'slot-note' }, `All three slots are full. Choose one to replace with a new ${NATIONS.find(x => x.id === pendingNation)?.name} campaign, or delete one.`,
    h('button', { class: 'btn ghost small', onclick: () => { pendingNation = null; showTitle(); } }, 'Cancel')));
  for (const { n, s } of saves) {
    const me = s?.nations[s.player];
    const card = h('div', { class: 'slot-card' + (s ? '' : ' empty'), style: me ? `--nc:${me.color}` : '' },
      h('span', { class: 'np-shield sm' }, me ? me.name[0] : String(n)),
      h('div', { class: 'slot-t' }, h('b', {}, me ? `${me.name}, ${s!.year}` : `Slot ${n}`),
        h('small', { class: 'muted' }, s ? `${me!.ruler.name} · ${provsOf(s, s.player).length} provinces${s.over ? ' · finished' : ''}` : 'Empty')));
    const acts = h('div', { class: 'slot-acts' });
    if (pendingNation) acts.append(h('button', { class: 'btn primary small', onclick: () => {
      const go = () => startIn(n, newGame(pendingNation!, undefined, pendingYear));
      if (window.confirm(`Replace ${me?.name ?? 'this'} campaign in slot ${n}? It cannot be recovered.`)) go();
    } }, 'Replace'));
    else if (s && !s.over) acts.append(h('button', { class: 'btn primary small', onclick: () => startIn(n, s) }, 'Continue'));
    if (s) acts.append(h('button', { class: 'btn ghost small', 'aria-label': `Delete slot ${n}`, onclick: () => { if (window.confirm(`Delete the ${me?.name} campaign in slot ${n}?`)) { clearSlot(n); showTitle(); } } }, 'Delete'));
    card.append(acts);
    box.append(card);
  }
  return box;
}

// ---------- mission mode: pick a challenge, or build your own ----------
// The long goal of the game: complete every mission. Completions are kept on this device, across campaigns.
const DONE_KEY = 'lasting-empires.missions-done';
type DoneRec = { nation: string; realm: string; year: number; when: number };
function missionsDone(): Record<string, DoneRec> { try { return JSON.parse(localStorage.getItem(DONE_KEY) ?? '{}'); } catch { return {}; } }
function recordMission() {
  const sc = S?.scenario;
  if (!sc || sc.status !== 'won' || sc.custom || !MISSIONS.some(m => m.id === sc.id)) return;
  const done = missionsDone();
  if (done[sc.id]) return;
  done[sc.id] = { nation: S.player, realm: player(S).name, year: sc.done ?? S.year, when: Date.now() };
  try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch { /* storage may be blocked */ }
  const n = Object.keys(done).filter(id => MISSIONS.some(m => m.id === id)).length;
  toast(`Mission recorded: ${n} of ${MISSIONS.length} completed`, 'good');
}
const doneCount = () => { const d = missionsDone(); return MISSIONS.filter(m => d[m.id]).length; };
// Unlocks: the beginner missions first, then the real ones; the open game after one real mission.
const UNLOCK_KEY = 'lasting-empires.unlock-all';
const unlockAll = () => { try { return localStorage.getItem(UNLOCK_KEY) === '1'; } catch { return false; } };
const BEGINNER = () => MISSIONS.filter(m => m.beginner);
const beginnersDone = () => { const d = missionsDone(); return BEGINNER().filter(m => d[m.id]).length; };
const realUnlocked = () => unlockAll() || beginnersDone() >= BEGINNER().length;
const sandboxUnlocked = () => { const d = missionsDone(); return unlockAll() || MISSIONS.some(m => !m.beginner && d[m.id]); };

const CUSTOM_KEY = 'lasting-empires.custom-missions';
function customMissions(): (Scenario & { nation: string })[] { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]'); } catch { return []; } }
function saveCustom(list: (Scenario & { nation: string })[]) { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list.slice(-12))); } catch { /* */ } }

function startMission(nation: string, mission: string | Scenario) {
  const free = SLOTS.find(n => !loadSlot(n)) ?? (window.confirm('All three campaign slots are full. Replace slot 3?') ? 3 : 0);
  const start = typeof mission === 'string' ? MISSIONS.find(m => m.id === mission)?.start ?? 1451 : (mission as Scenario & { start?: number }).start ?? 1451;
  const g = newMissionGame(nation, mission, start);
  if (g.scenario?.steps?.length) g.tutorial = -1; // the steps teach instead
  if (free) startIn(free, g);
}

const missionPreviews: Record<number, GameState> = {};
const previewFor = (year: number) => { if (!missionPreviews[year]) { missionPreviews[year] = newGame(STARTS[year]?.featured[0] ?? 'castile', 777, year); missionPreviews[year].queue = []; } return missionPreviews[year]; };
const previewState = () => previewFor(missionYear);
const goalTitle = (g: Goal, deadline: number) => goalView(previewState(), g, deadline).title;

function missionCard(m: MissionDef) {
  const done = missionsDone()[m.id];
  const locked = !m.beginner && !realUnlocked();
  return h('div', { class: 'mcard' + (m.wild ? ' wild' : '') + (done ? ' done' : '') + (m.beginner ? ' beginner' : '') + (locked ? ' locked' : '') },
    h('div', { class: 'mc-h' }, h('span', { class: 'mc-i', html: icon(done ? 'laurel' : m.icon, 24) }), h('div', {}, h('b', {}, m.name), h('small', {}, `${m.start} – ${m.deadline} · ${m.deadline - m.start} years`)), m.wild ? h('span', { class: 'mc-wild' }, 'Wild') : null),
    done ? h('div', { class: 'mc-done' }, `✓ Completed with ${done.realm} in ${done.year}`) : null,
    m.beginner ? h('div', { class: 'mc-learn' }, `Learn: ${m.beginner}`) : null,
    h('p', { class: 'mc-t' }, m.text),
    h('ul', { class: 'mc-g' }, m.goals.map(g => h('li', {}, goalTitle(g, m.deadline)))),
    h('div', { class: 'mc-play' }, m.nations.map(n => { const nm = previewFor(m.start).nations[n]?.name ?? n; return h('button', { class: 'btn primary small' + (locked ? ' blocked' : ''), onclick: () => (locked ? toast(`Complete the ${BEGINNER().length} beginner missions first (${beginnersDone()}/${BEGINNER().length})`, 'bad') : startMission(n, m.id)) }, locked ? `Locked · ${nm}` : `Play ${nm}`); })));
}

let missionYear = 1451;
function showMissions() {
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
    h('h2', { class: 'mhead' }, `Beginner missions · ${beginnersDone()}/${BEGINNER().length}`),
    h('p', { class: 'muted' }, realUnlocked() ? 'Done: every other mission is open to you.' : 'Short missions that each teach one part of the game. Complete them all to unlock the historic and wild missions.'),
    h('div', { class: 'mgrid' }, ...BEGINNER().map(missionCard)),
    h('h2', { class: 'mhead' }, realUnlocked() ? 'Missions' : `Missions · locked until the beginner missions are done`),
    h('div', { class: 'seg mfilter' }, START_YEARS.map(y => h('button', { class: 'seg-b' + (y === missionYear ? ' on' : ''), onclick: () => { missionYear = y; showMissions(); } }, `Start ${y}`, h('small', {}, ` ${MISSIONS.filter(m => m.start === y && missionsDone()[m.id]).length}/${MISSIONS.filter(m => m.start === y).length}`)))),
    h('div', { class: 'mgrid' },
      h('button', { class: 'mcard mc-new', onclick: () => showBuilder() }, h('span', { class: 'mc-i', html: icon('plus', 28) }), h('b', {}, 'Create your own mission'), h('small', {}, 'Choose a realm, a deadline and up to 6 goals')),
      ...mine.filter(c => ((c as { start?: number }).start ?? 1451) === missionYear).map(c => h('div', { class: 'mcard mc-custom' },
        h('div', { class: 'mc-h' }, h('span', { class: 'mc-i', html: icon('quill', 24) }), h('div', {}, h('b', {}, c.name), h('small', {}, `Your mission · ${(c as { start?: number }).start ?? 1451} – ${c.deadline}`))),
        h('ul', { class: 'mc-g' }, c.goals.map(g => h('li', {}, goalTitle(g, c.deadline)))),
        h('div', { class: 'mc-play' }, h('button', { class: 'btn primary small', onclick: () => startMission(c.nation, { ...c, status: 'active' }) }, `Play ${NATIONS.find(x => x.id === c.nation)?.name}`),
          h('button', { class: 'btn ghost small', onclick: () => { saveCustom(customMissions().filter(x => x.id !== c.id)); showMissions(); } }, 'Delete')))),
      ...MISSIONS.filter(m => m.start === missionYear && !m.wild && !m.beginner).map(missionCard),
      ...MISSIONS.filter(m => m.start === missionYear && m.wild).map(missionCard)),
    unlockAll() ? null : h('p', { class: 'unlock-all' }, 'Already know the game? ', h('button', { class: 'btn ghost small', onclick: () => { if (window.confirm('Unlock every mission and the open game now?')) { try { localStorage.setItem(UNLOCK_KEY, '1'); } catch { /* */ } showMissions(); } } }, 'Unlock everything'))));
}

/** Goal templates for the builder: a label and how to make the goal from one value. */
const GOAL_KINDS: { id: string; label: string; input: 'n' | 'region' | 'province' | 'gov' | 'none'; def?: number; make: (v: string) => Goal }[] = [
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

function showBuilder() {
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

let pendingYear = 1451;
function chooseNation(id: string, year = 1451) {
  const free = SLOTS.find(n => !loadSlot(n));
  if (free) { startIn(free, newGame(id, undefined, year)); return; }
  pendingNation = id; pendingYear = year; showTitle();
  document.querySelector('.slots')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- realm picker: tap any realm on the world map ----------
const FEATURED = ['castile', 'portugal', 'aragon', 'byzantium', 'ottomans', 'france', 'england', 'austria', 'muscovy', 'venice', 'mamluks', 'vijayanagara', 'ming', 'japan', 'mali', 'aztec', 'inca'];
function difficulty(provs: number, army: number): { label: string; cls: string } {
  const size = provs + army / 3;
  return size >= 14 ? { label: 'Strong start', cls: 'd-easy' } : size >= 6 ? { label: 'Balanced', cls: 'd-mid' } : size >= 3 ? { label: 'Hard start', cls: 'd-hard' } : { label: 'Very hard', cls: 'd-vhard' };
}

let pickYear = 1451;
function showPicker(initial?: string) {
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
        h('span', { class: 'np-shield' }, n.name[0]),
        h('div', { class: 'pick-t' },
          h('b', {}, n.name), h('span', { class: 'np-diff ' + d.cls }, d.label),
          h('small', {}, `${ps.length} province${ps.length > 1 ? 's' : ''} · capital ${cap?.name ?? '?'} · ${RELIGION_NAMES[cap?.religion ?? ''] ?? ''} · ${CULTURE_NAMES[n.culture]}`),
          h('small', { class: 'muted' }, (pickYear === 1451 ? def.blurb : undefined) ?? (near.size ? `Neighbours: ${[...near].slice(0, 5).map(o => preview.nations[o].name).join(', ')}.` : 'No neighbours by land.')))),
      h('label', { class: 'tutopt' }, h('input', { type: 'checkbox', id: 'tutcheck', checked: wantTutorial ? true : undefined, onchange: (e: Event) => { wantTutorial = (e.target as HTMLInputElement).checked; } }), 'Show me how to play'),
      h('button', { class: 'btn primary', onclick: () => chooseNation(id, pickYear) }, `Play as ${n.name} in ${pickYear}`));
  };
  mv.onSelect = pid => { if (pid) { const o = preview.provinces[pid].owner; if (o === NO_STATE) { mv.select(null); toast('Unclaimed land: no state to play here', 'bad'); } else select(o); } };
  mv.render(preview);
  select(initial);
  requestAnimationFrame(() => mv.focus(provsOf(preview, initial!).map(p => p.id), 60));
}

function showTitle() {
  migrateOldSave();
  const root = clear($('#app'));
  root.append(h('div', { class: 'title-screen' },
    h('div', { class: 'title-inner' },
      h('p', { class: 'eyebrow' }, 'Anno Domini 1451 – 1810'),
      h('h1', { class: 'title' }, 'Lasting Empires'),
      h('p', { class: 'lede' }, 'Every action is a card. Gather Military, Diplomacy, Internal, Economy and Research cards each year, then send your people on missions. One turn is one year.'),
      SLOTS.some(n => loadSlot(n)) || pendingNation ? h('h2', { class: 'pick-h' }, 'Campaigns') : null,
      SLOTS.some(n => loadSlot(n)) || pendingNation ? slotsSection() : null,
      h('button', { class: 'btn primary wide newgame missions-b', onclick: () => showMissions() }, h('span', { html: icon('star', 18) }), ` Missions · ${doneCount()} of ${MISSIONS.length} completed`),
      !realUnlocked() ? h('p', { class: 'title-hint' }, `New here? Start with the beginner missions (${beginnersDone()}/${BEGINNER().length}).`) : null,
      h('button', { class: 'btn wide newgame' + (sandboxUnlocked() ? '' : ' blocked'), onclick: () => (sandboxUnlocked() ? showPicker() : toast('The open game unlocks when you complete your first historic mission', 'bad')) }, sandboxUnlocked() ? 'Open game: any realm, any year' : 'Open game · unlocks after your first historic mission'),
      h('details', { class: 'howto' }, h('summary', {}, 'Test scenarios'),
        h('p', { class: 'muted' }, 'Ready-made games to try a system quickly. They use a free campaign slot.'),
        h('button', { class: 'btn wide', onclick: () => { const free = SLOTS.find(n => !loadSlot(n)) ?? (window.confirm('All slots are full. Replace slot 3?') ? 3 : 0); if (free) startIn(free, scenarioCastilePortugal()); } }, 'Battles: Castile at war with Portugal, summer 1467')),
      h('details', { class: 'howto' },
        h('summary', {}, 'How to play'),
        h('ul', {},
          h('li', {}, 'You draw about one card of each kind a year. Buildings, research and your monarch raise those rates. Spend nation points to buy more (pick 1 of 3).'),
          h('li', {}, 'Mission cards need a person: generals, diplomats, administrators, merchants and researchers. Each has a rarity from Common to Legendary.'),
          h('li', {}, 'Manpower is scarce: hiring a troop or a person costs 1. Ducats pay for troops, building salaries and imported goods.'),
          h('li', {}, 'Forge troops in the Military panel: Levy + Long Pikes = Pikemen; Pikemen + Arquebusiers = Tercio.'),
          h('li', {}, 'In battle both sides play a tactic face-down. Counter the enemy and they take extra damage.'),
          h('li', {}, 'Diplomats can become Explorers, generals Conquerors, administrators Colonists, to win lands overseas. There is no going back.'),
        )))));
}

function start(s: GameState) {
  S = s;
  const root = clear($('#app'));
  root.append(
    h('header', { id: 'top' }),
    h('main', { id: 'board' }, h('div', { id: 'timeline' }), h('div', { id: 'zoom' },
      h('button', { class: 'zbtn', 'aria-label': 'Zoom in', onclick: () => map.zoomBy(0.75), html: icon('plus', 18) }),
      h('button', { class: 'zbtn', 'aria-label': 'Zoom out', onclick: () => map.zoomBy(1.33), html: '<svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path d="M5 12 H19"/></svg>' }),
      h('button', { class: 'zbtn', 'aria-label': 'Show my realm', onclick: () => map.focus(provsOf(S, S.player).map(p => p.id)), html: icon('crown', 18) }),
      h('button', { class: 'zbtn', 'aria-label': 'Overseas', title: 'Overseas', onclick: () => toggleSheet('overseas'), html: icon('anchor', 18) }),
    ),
      h('button', { class: 'viewpill', id: 'modebtn', 'aria-label': 'Map view', onclick: () => toggleModes() }, h('span', { html: icon('map', 16) }), h('span', { id: 'modelabel' }, 'Map: Realms'), h('span', { class: 'caret' }, '▾')),
      h('div', { id: 'modes', hidden: true }), h('div', { id: 'legend', hidden: true }),
      h('div', { id: 'tracker' })),
    h('aside', { id: 'sheet', hidden: true }),
    h('section', { id: 'win', hidden: true, role: 'dialog', 'aria-modal': 'false' }),
    h('nav', { id: 'tabs' }),
    h('div', { id: 'modal', hidden: true }),
    h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }),
  );
  map = new MapView($('#board'));
  map.onPick = onMapPick;
  map.onSelect = id => { if (pickHand != null) { if (id) toast('Hold your finger on the province to choose it'); return; } if (id) openSheet('province', id); else if (sheet?.kind === 'province') closeSheet(); };
  document.documentElement.style.setProperty('--me', player(S).color);
  refresh();
  requestAnimationFrame(() => map.focus(provsOf(S, S.player).map(p => p.id), 120));
  processQueue();
}

function toggleModes() {
  const box = $('#modes');
  if (!box.hidden) { box.hidden = true; return; }
  clear(box).append(...MAP_MODES.map(m => h('button', { class: 'mode-b' + (map.mode === m.id ? ' on' : ''), onclick: () => { map.setMode(m.id, S); box.hidden = true; renderLegend(); } }, h('span', { html: icon(m.icon, 16) }), m.name)));
  box.hidden = false;
}

function renderLegend() {
  const lbl = document.getElementById('modelabel');
  if (lbl) lbl.textContent = 'Map: ' + MAP_MODES.find(m => m.id === map.mode)!.name;
  const box = $('#legend');
  const items = legendFor(S, map.mode);
  box.hidden = map.mode === 'political';
  if (box.hidden) return;
  const title = MAP_MODES.find(m => m.id === map.mode)!.name;
  const name = (k: string) => map.mode === 'religion' ? RELIGION_NAMES[k] ?? k : map.mode === 'goods' ? GOODS[k]?.name ?? k : k;
  clear(box).append(h('b', {}, title), ...items.map(i => h('span', { class: 'lg', title: map.mode === 'goods' ? GOODS[i.label]?.desc ?? '' : '', onclick: map.mode === 'goods' ? () => toast(`${GOODS[i.label].name}: ${GOODS[i.label].desc}`) : undefined },
    i.icon ? h('i', { class: 'lg-ic', style: `background:${i.color}`, html: icon(i.icon, 12) }) : h('i', { style: `background:${i.color}` }), name(i.label))),
    h('button', { class: 'lg-x', 'aria-label': 'Back to realms', onclick: () => { map.setMode('political', S); renderLegend(); }, html: icon('close', 14) }));
}

// ---------- tutorial: a few notes from the chancellor in the first game ----------
interface TutStep { title: string; text: string; done?: () => boolean; next?: boolean; }
const TUTORIAL: TutStep[] = [
  { title: 'Welcome, Majesty', text: 'One turn is one quarter of a year. Everything you do starts with a card: you draw them each quarter in five kinds. Let me show you around.', next: true },
  { title: 'Your treasury', text: 'At the top: ducats, manpower (1 per troop or person you hire), nation points (to buy cards), stability and the people\'s happiness. Tap the year to see the current age.', next: true },
  { title: 'Open a menu', text: 'The five menus are at the bottom. Open Internal.', done: () => win?.cat === 'internal' },
  { title: 'Cards', text: 'The Cards tab starts with Get cards: spend nation points on a person card (to hire someone) or an action card (in Military also troops and improvements). Below are the cards you hold: tap one to use it.', next: true },
  { title: 'Missions', text: 'Open the Missions tab. Tap a person, then a mission card, or the other way round. The better the person, the better the outcome.', done: () => win?.tab === 'missions' },
  { title: 'Send someone out', text: 'Start a mission now if you have a card for it. It takes a few quarters. You can start only so many missions a year; a bigger realm can start more.', done: () => S.missions.length > 0, next: true },
  { title: 'Armies', text: 'Open Military. Troops stand in your capital or in provinces with Barracks, and only those within a quarter\'s march can fight. Cards → Forge merges two companies into a stronger one.', done: () => win?.cat === 'military' },
  { title: 'The map', text: 'Close the menu and tap any province for its details and actions. "Map: Realms" at the bottom right switches to culture, religion, raw materials, happiness or population.', next: true },
  { title: 'End the turn', text: 'Press End Turn at the top right. Every winter you get the year\'s report: money, cards, battles and missions.', done: () => (S.quarter ?? 0) !== 0 || S.year !== S.startYear },
  { title: 'Rule well', text: 'Ages open by research, rivals form coalitions if you conquer too fast, and unhappy provinces may rise. The Chronicle (top right) shows the rankings. Good luck.', next: true },
];
function renderTutorial() {
  let el = document.getElementById('tut');
  const i = S.tutorial ?? -1;
  if (i < 0 || i >= TUTORIAL.length) { el?.remove(); return; }
  const st = TUTORIAL[i];
  if (st.done?.()) { S.tutorial = i + 1; return renderTutorial(); }
  if (!el) { el = h('div', { id: 'tut', role: 'note' }); document.getElementById('app')!.append(el); }
  clear(el).append(h('small', {}, `Chancellor's note ${i + 1}/${TUTORIAL.length}`), h('b', {}, st.title), h('p', {}, st.text),
    h('div', { class: 'tut-acts' },
      h('button', { class: 'btn ghost small', onclick: () => { S.tutorial = -1; renderTutorial(); save(); } }, 'Skip tutorial'),
      st.next ? h('button', { class: 'btn primary small', onclick: () => { S.tutorial = i + 1; renderTutorial(); save(); } }, i === TUTORIAL.length - 1 ? 'Finish' : 'Next') : null));
}

function refresh() {
  setCardGame(S);
  recordMission();
  renderTop(); renderTabs(); map.render(S); renderTimeline(); renderTracker(); renderLegend();
  if (sheet) renderSheet();
  if (win) renderWin();
  renderTutorial();
  save();
}

function toast(msg: string, tone: 'good' | 'bad' | 'neutral' = 'neutral') {
  const t = $('#toast');
  const el = h('div', { class: 'toast-msg t-' + tone }, msg);
  t.append(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3100);
}

function act(fn: () => string | null | void, okMsg?: string) {
  const r = fn();
  if (typeof r === 'string' && r) toast(r, 'bad');
  else if (okMsg) toast(okMsg, 'good');
  refresh();
  processQueue();
}

// ---------- top bar ----------
function showEra() {
  const e = ageOf(S), next = nextAge(S);
  const who = S.age?.pioneer ? (S.age.pioneer === S.player ? 'You opened it' : `Opened by ${nationName(S, S.age.pioneer)}`) : 'The world begins here';
  const items: RevealItem[] = [{ title: `Since ${S.age?.since ?? S.startYear}`, text: `${e.text} ${who}.`, tone: 'neutral', kind: 'star' }, ...e.effects.map(x => ({ title: 'This age', text: x, tone: 'good' as const, kind: e.icon }))];
  if (pioneerNow(S)) items.push({ title: 'Pioneer', text: `+0.4 ${e.focus} cards a year until ${(S.age?.since ?? 0) + PIONEER_YEARS}.`, tone: 'good', kind: 'crown' });
  if (next) items.push({ title: `Next: ${next.name}`, text: `${next.opens?.how ?? ''} The realm that opens it gains prestige, nation points, 2 ${next.focus} cards and a ${PIONEER_YEARS}-year bonus.`, tone: 'neutral', kind: next.icon });
  push(S, { kind: 'reveal', title: e.name, subtitle: 'The ages open by research and events, not by the calendar', items });
  processQueue();
}

function renderTop() {
  const me = player(S);
  const inc = incomeOf(S, S.player);
  const mp = playerManpower(S);
  const top = clear($('#top'));
  top.append(
    h('button', { class: 'crest', onclick: () => toggleSheet('realm'), style: `--nc:${me.color}` },
      h('span', { class: 'np-shield sm' }, me.name[0]),
      h('span', { class: 'crest-t' }, h('b', {}, me.name), h('small', {}, me.ruler.name))),
    h('button', { class: 'year', title: ageOf(S).name, onclick: () => showEra() }, h('span', { class: 'year-n' }, String(S.year)), h('small', {}, `${SEASONS[S.quarter ?? 0]} · ${ageOf(S).name.replace('Age of ', '')}`)),
    h('div', { class: 'res' },
      chip('coin', fmt(me.gold), signed(inc.total), 'Ducats', inc.total < 0 ? 'bad' : ''),
      chip('people', String(Math.floor(me.manpower)), '+' + mp.gain.toFixed(1), 'Manpower'),
      chip('star', S.np.toFixed(1), '+' + npRate(S).rate.toFixed(1), 'Nation points'),
      h('button', { class: 'chip stab', title: 'Stability', onclick: () => toggleSheet('realm') },
        h('span', { html: icon('scales', 16) }),
        h('span', { class: 'pips' }, ...[-3, -2, -1, 0, 1, 2, 3].map(v => h('i', { class: (v === 0 ? 'zero ' : '') + (me.stability >= v && v > 0 ? 'on' : me.stability <= v && v < 0 ? 'neg' : '') }))),
        h('span', { class: 'sr' }, `Stability ${me.stability}`)),
      chip('mood', `${S.happiness ?? 50}%`, moodName(S.happiness ?? 50), 'Happiness'),
      chip('laurel', fmt(me.prestige), '', 'Prestige'),
    ),
    h('div', { class: 'top-btns' },
      S.scenario ? h('button', { class: 'tbtn goals-b' + (sheet?.kind === 'goals' ? ' on' : '') + ' st-' + S.scenario.status, onclick: () => toggleSheet('goals'), title: 'Goals' },
        h('span', { html: icon('star', 18) }), h('span', { class: 'tb-l' }, 'Goals'), h('span', { class: 'badge' }, S.scenario.status === 'active' ? (S.scenario.steps?.length ? `${S.scenario.step ?? 0}/${S.scenario.steps.length}` : `${S.scenario.goals.filter(g => goalView(S, g, S.scenario!.deadline).met).length}/${S.scenario.goals.length}`) : S.scenario.status === 'won' ? '✓' : '✗')) : null,
      h('button', { class: 'tbtn' + (sheet?.kind === 'missions' ? ' on' : ''), onclick: () => toggleSheet('missions'), title: 'Missions' },
        h('span', { html: icon('hourglass', 18) }), h('span', { class: 'tb-l' }, 'Missions'), S.missions.length ? h('span', { class: 'badge' }, String(S.missions.length)) : null),
      h('button', { class: 'tbtn' + (sheet?.kind === 'chronicle' ? ' on' : ''), onclick: () => toggleSheet('chronicle'), title: 'Chronicle' },
        h('span', { html: icon('laurel', 18) }), h('span', { class: 'tb-l' }, 'Chronicle')),
      h('button', { id: 'endturn', class: 'btn primary', onclick: onEndTurn }, h('span', { class: 'et-l' }, 'End Turn'), h('small', {}, `${SEASONS[S.quarter ?? 0]} ${S.year}`))),
  );
}
function chip(ic: string, v: string, sub: string, label: string, tone = '') {
  return h('button', { class: 'chip ' + tone, title: label, onclick: () => toggleSheet('realm') }, h('span', { html: icon(ic, 16) }), h('b', {}, v), sub ? h('small', {}, sub) : null, h('span', { class: 'sr' }, label));
}

function renderTabs() {
  const nav = clear($('#tabs'));
  const rates = cardRates(S);
  for (const c of CATS) {
    const n = handOf(S, c).length;
    nav.append(h('button', { class: 'tab' + (win?.cat === c ? ' on' : ''), onclick: () => toggleWin(c), style: `--cc:${CAT_INFO[c].color}` },
      h('span', { class: 'tab-i', html: icon(CAT_INFO[c].icon, 20) }, n ? h('span', { class: 'tab-c' + (heldOf(S, c) > handLimit(S) ? ' over' : ''), 'aria-label': `${n} cards in hand, limit ${handLimit(S)}` }, String(n)) : null),
      h('span', { class: 'tab-l' }, c === 'diplomacy' ? 'Diplomacy' : CAT_INFO[c].name),
      h('span', { class: 'tab-n', title: 'New cards a year' }, `+${rates[c].rate.toFixed(1)}/yr`)));
  }
}

/** The strip over the map: your wars first, then missions under way. */
function renderTimeline() {
  const tl = clear($('#timeline'));
  // a guided mission: the next step, always in view
  const sc = S.scenario;
  if (sc?.steps?.length && sc.status === 'active' && (sc.step ?? 0) < sc.steps.length) {
    const st = sc.steps[sc.step ?? 0];
    tl.append(h('span', { class: 'tl-h step-h' }, `Step ${(sc.step ?? 0) + 1}/${sc.steps.length}`),
      h('button', { class: 'tl-card tl-step', onclick: () => openSheet('goals') }, h('span', { class: 'tl-rose', html: icon('star', 14) }), h('span', { class: 'tl-t' }, goalView(S, st.g, sc.deadline).title), h('small', {}, 'Tap for how')));
  }
  const foes = enemiesOf(S, S.player);
  const inc = S.incoming ?? [];
  if (foes.length) {
    tl.append(h('span', { class: 'tl-h war' }, 'At war'));
    for (const f of foes) {
      const sc = warScore(S, f);
      const w = S.wars.find(x => (x.a === f && x.b === S.player) || (x.b === f && x.a === S.player));
      const coming = inc.filter(i => i.nation === f).length;
      tl.append(h('button', { class: 'tl-card tl-war', style: `--nc:${S.nations[f].color}`, onclick: () => openWin('military', 'wars') },
        h('span', { class: 'tl-rose', html: icon('sword', 14) }), h('span', { class: 'tl-t' }, S.nations[f].name),
        h('small', {}, coming ? `${coming} attack${coming > 1 ? 's' : ''} coming!` : `score ${sc > 0 ? '+' : ''}${sc} · since ${w?.since ?? S.year}`)));
    }
  }
  const ms = S.missions.filter(m => m.kind !== 'route').slice(0, 6);
  if (ms.length) {
    tl.append(h('span', { class: 'tl-h' }, 'Missions'));
    for (const m of ms) {
      const pct = m.kind === 'research' ? Math.min(100, (m.progress / techCost(S, m.target)) * 100) : ((m.total - m.turnsLeft) / Math.max(1, m.total)) * 100;
      tl.append(h('button', { class: 'tl-card tl-m', onclick: () => openSheet('missions') },
        h('span', { class: 'tl-rose', html: icon(MISSION_INFO[m.kind].icon, 14) }), h('span', { class: 'tl-t' }, missionTitle(m)),
        h('small', {}, h('i', { class: 'tl-bar' }, h('i', { style: `width:${Math.round(pct)}%` })), ` ${qLabel(m.turnsLeft)}`)));
    }
    if (S.missions.length > ms.length) tl.append(h('button', { class: 'tl-card tl-more', onclick: () => openSheet('missions') }, h('span', { class: 'tl-t' }, `+${S.missions.length - ms.length} more`)));
  }
}

function missionTitle(m: GameState['missions'][number]) {
  const study = m.kind === 'assist' ? S.missions.find(x => String(x.id) === m.target) : null;
  const tname = study ? TECH[study.target]?.name ?? '' : m.kind === 'artwork' ? GENRES[m.target]?.name ?? '' : m.kind === 'accept' ? cultureName(m.target) : m.kind === 'route' ? `${GOODS[m.good ?? '']?.name ?? ''} ${m.dir === 'sell' ? 'to' : 'from'} ${nationName(S, m.target)}` : S.provinces[m.target]?.name ?? S.nations[m.target]?.name ?? TECH[m.target]?.name ?? '';
  return `${MISSION_INFO[m.kind].name}${m.kind === 'build' ? ': ' + BUILDINGS[m.building!].name : ''}${tname ? ' · ' + tname : ''}`;
}

function renderTracker() {
  const tr = clear($('#tracker'));
  return; // missions now show in the strip over the map
  for (const m of S.missions.slice(0, 8)) {
    tr.append(h('button', { class: 'trk', onclick: () => openSheet('missions') },
      h('span', { html: icon(MISSION_INFO[m.kind].icon, 14) }), h('span', { class: 'trk-t' }, missionTitle(m)), h('b', {}, qLabel(m.turnsLeft))));
  }
  if (S.missions.length > 8) tr.append(h('button', { class: 'trk', onclick: () => openSheet('missions') }, `+${S.missions.length - 8} more`));
}

// ---------- sheets ----------
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
/** A garrison or base as the player reads it. */
const placeName = (loc: string) => (loc.startsWith('base:') ? `Camp near ${S.provinces[loc.slice(5)]?.name ?? ''}` : S.provinces[loc]?.name ?? loc);
/** Turns are quarters: show them as quarters, or years when long. */
const qLabel = (n: number) => (n >= 8 ? `${Math.round(n / 4)} yr` : `${n} q`);
const qText = (n: number) => (n >= 8 ? `${Math.round(n / 4)} years` : `${n} quarter${n > 1 ? 's' : ''}`);

// ---------- the core menus: a centred window with tabs ----------
const WIN_TABS: Record<Cat, [string, string][]> = {
  military: [['cards', 'Cards'], ['missions', 'Missions'], ['army', 'Army'], ['navy', 'Navy'], ['wars', 'Wars & battles']],
  diplomacy: [['cards', 'Cards'], ['missions', 'Missions'], ['realms', 'Realms'], ['subjects', 'Subjects']],
  internal: [['cards', 'Cards'], ['missions', 'Missions'], ['gov', 'Government'], ['core', 'Core'], ['realm', 'Realm'], ['provinces', 'Provinces']],
  economy: [['cards', 'Cards'], ['missions', 'Missions'], ['goods', 'Goods'], ['trade', 'Trade'], ['ledger', 'Ledger']],
  culture: [['cards', 'Cards'], ['missions', 'Missions'], ['cultures', 'Cultures'], ['religion', 'Religion'], ['arts', 'Arts']],
  research: [['cards', 'Cards'], ['missions', 'Missions'], ['tech', 'Technologies']],
};
function toggleWin(cat: Cat) { if (win?.cat === cat) closeWin(); else openWin(cat); }
function openWin(cat: Cat, tab = win?.cat === cat ? win.tab : 'cards') {
  if (pickHand != null) stopMapPick();
  if (sheet) { sheet = null; $('#sheet').hidden = true; }
  if (win?.cat !== cat) { pick = {}; cv = { filter: 'all', mode: 'browse', sel: [] }; }
  win = { cat, tab };
  $('#win').hidden = false;
  refresh();
}
function closeWin() { win = null; pick = {}; forge = []; $('#win').hidden = true; refresh(); }
function renderWin() {
  if (!win) return;
  const el = clear($('#win'));
  const { cat, tab } = win;
  const prev = document.querySelector('#win .win-body')?.scrollTop ?? 0;
  const body = h('div', { class: 'win-body' });
  const head = h('div', { class: 'win-head', style: `--cc:${CAT_INFO[cat].color}` },
    h('span', { class: 'win-ico', html: icon(CAT_INFO[cat].icon, 22) }),
    h('div', { class: 'win-titles' }, h('h2', {}, CAT_INFO[cat].name), h('p', {}, winSub(cat))),
    h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeWin, html: icon('close', 18) }));
  const tabs = h('div', { class: 'win-tabs', role: 'tablist' }, WIN_TABS[cat].map(([id, label]) =>
    h('button', { class: 'win-tab' + (tab === id ? ' on' : ''), role: 'tab', 'aria-selected': String(tab === id), onclick: () => { win = { cat, tab: id }; renderWin(); } }, label,
      id === 'cards' ? h('span', { class: 'win-n' }, String(handOf(S, cat).length)) : id === 'missions' ? h('span', { class: 'win-n' }, String(missionsOfCat(cat).length)) : null)));
  winTab(cat, tab, body);
  el.append(head, tabs, body);
  body.scrollTop = prev;
}
function winSub(cat: Cat) {
  if (cat === 'military') return `Army power ${Math.round(armyPower(S.troops))} · ${S.troops.length}/${armyCap(S)} companies · ${S.fleet.length} ships`;
  if (cat === 'diplomacy') return `${alliesOf(S, S.player).length} allies · ${enemiesOf(S, S.player).length} wars · ${subjectsOf(S).length} subjects`;
  if (cat === 'internal') return `${rankOf(S).name} · ${provsOf(S, S.player).length} provinces · missions this year ${S.launched ?? 0}/${missionCap(S)}`;
  if (cat === 'economy') return `${signed(incomeOf(S, S.player).total)} ducats a year`;
  if (cat === 'culture') return `Happiness ${nationalHappiness(S)}% · ${cultureRows(S).length} peoples · ${(S.works ?? []).length} works of art · church ${Math.round(churchRel(S))}`;
  return `${S.techs.length} of ${TECHS.length} technologies known`;
}
const CAT_ROLES: Record<Cat, Character['role'][]> = {
  military: ['general', 'conqueror', 'admiral'], diplomacy: ['diplomat', 'explorer'], internal: ['admin', 'colonist'], economy: ['merchant'], research: ['researcher'], culture: ['courtier', 'priest', 'artist', 'leader'],
};
/** Missions shown under a menu: by the person sent (a merchant building is Economy), or the mission's own role. */
const missionsOfCat = (cat: Cat) => S.missions.filter(m => {
  const r = S.characters.find(c => c.uid === m.char)?.role ?? MISSION_INFO[m.kind].role;
  return CAT_ROLES[cat].includes(r as Character['role']) || (cat === 'military' && ['conquer', 'raid', 'conquista'].includes(m.kind));
});

function winTab(cat: Cat, tab: string, body: HTMLElement) {
  if (tab === 'cards') return cardsTab(cat, body);
  if (tab === 'missions') return missionsTab(cat, body);
  const holder = h('div');
  if (cat === 'military') {
    if (tab === 'army') armyTab(body);
    else if (tab === 'navy') navyTab(body);
    else warsTab(body);
  } else if (cat === 'diplomacy') {
    if (tab === 'realms') realmsTab(body); else subjectsTab(body);
  } else if (cat === 'internal') {
    if (tab === 'gov') govTab(body);
    else if (tab === 'core') body.append(coreSection());
    else if (tab === 'realm') realmTab(body);
    else provincesTab(body);
  } else if (cat === 'economy') {
    if (tab === 'ledger') ledgerTab(body); else if (tab === 'trade') tradeTab(body); else goodsTab(body);
  } else if (cat === 'culture') {
    if (tab === 'religion') religionTab(body); else if (tab === 'arts') artsTab(body); else culturesTab(body);
  } else techTab(body);
  void holder;
}

// ---------- government and revolution ----------
function govCard(id: string, current: boolean): HTMLElement {
  const g = GOVS[id];
  const why = current ? null : revolutionBlocked(S, id);
  const box = h('div', { class: 'gov' + (current ? ' now' : '') + (!current && why ? ' locked' : '') },
    h('div', { class: 'gov-h' }, h('span', { class: 'gov-i', html: icon(g.icon, 26) }), h('div', {}, h('b', {}, g.name), h('small', {}, current ? 'Your government' : g.tech ? `Needs ${TECH[g.tech].name}${S.techs.includes(g.tech) ? ' ✓' : ''}` : 'The old way'))),
    h('p', { class: 'gov-t' }, g.text),
    h('ul', { class: 'gov-b' }, g.buffs.map(b => h('li', {}, b))));
  if (!current) box.append(h('button', { class: 'btn' + (why ? ' blocked' : ' primary'), onclick: () => (why ? toast(why, 'bad') : confirmRevolution(id)) }, why ?? 'Start a revolution'));
  return box;
}

function confirmRevolution(to: string) {
  const lands = revolutionLands(S);
  const front = lands.filter(id => (getGeo().adj[id] ?? []).some(nb => S.provinces[nb]?.owner === S.player && !lands.includes(nb)));
  const cap = [...(front.length ? front : lands)].sort((a, b) => S.provinces[b].dev - S.provinces[a].dev)[0];
  const turn = S.troops.filter(t => t.mission == null && t.loc && lands.includes(t.loc)).length;
  confirmBox(`Revolution towards ${GOVS[to].name}?`,
    `${lands.length} province${lands.length > 1 ? 's' : ''} will rise for the old order: ${lands.map(id => S.provinces[id].name).join(', ')}. Their capital will be ${S.provinces[cap].name}. They raise about ${Math.max(4, Math.round(S.troops.length * 0.6 + lands.length * 0.5))} companies${turn ? `, and ${turn} of your companies stationed there change sides` : ''}. Take ${S.provinces[cap].name}, or destroy all their troops, within ${REVOLUTION_YEARS} years to win; if they take ${S.provinces[player(S).capital].name} first, the revolution fails and you lose 40% of your treasure, 3 cards and 2 stability.`,
    'Start the revolution', () => { act(() => startRevolution(S, to)); processQueue(); });
}

function govTab(body: HTMLElement) {
  const r = S.revolution;
  if (r) {
    const n = S.nations[r.rebel];
    const mine = Math.round(armyPower(S.troops)), theirs = Math.round(armyPower(n?.army ?? []));
    body.append(h('div', { class: 'gov revo' },
      h('div', { class: 'gov-h' }, h('span', { class: 'gov-i', html: icon('torch', 26) }), h('div', {}, h('b', {}, `Revolution towards ${GOVS[r.to].name}`), h('small', {}, `Year ${S.year - r.since + 1} of ${REVOLUTION_YEARS}`))),
      h('ul', { class: 'gov-b' },
        h('li', {}, `To win: take ${S.provinces[r.rebelCapital].name}, the capital of the ${n?.name ?? 'rebels'}, or destroy all their companies`),
        h('li', {}, `You lose if ${S.provinces[r.myCapital].name} falls, or after ${r.since + REVOLUTION_YEARS}`),
        h('li', {}, `Army strength: yours ${mine}, theirs ${theirs}`),
        h('li', {}, `They hold ${provsOf(S, r.rebel).length} provinces`)),
      h('button', { class: 'btn primary', onclick: () => { closeWin(); map.focus([r.rebelCapital], 200); } }, `Show ${S.provinces[r.rebelCapital].name}`)));
  }
  const cur = S.gov ?? 'feudal';
  body.append(h('h3', {}, 'Your government'), govCard(cur, true));
  body.append(h('h3', {}, 'Other forms of government'), h('p', { class: 'muted' }, 'Changing government takes a Revolution card (Internal deck, once you have researched a new form) and a civil war: the far provinces rise for the old order.'));
  const grid = h('div', { class: 'gov-grid' });
  for (const id of GOV_ORDER) if (id !== cur) grid.append(govCard(id, false));
  body.append(grid);
}

// ---------- the Cards tab: everything you hold, with filters, packs, archive, forge and recipes ----------
function cardsTab(cat: Cat, body: HTMLElement) {
  const mil = cat === 'military';
  const rate = cardRates(S)[cat];
  const hand = handOf(S, cat);
  const pct = Math.round((S.cardAccum[cat] ?? 0) * 100);
  const setMode = (mode: typeof cv.mode) => { cv = { ...cv, mode: cv.mode === mode ? 'browse' : mode, sel: [], filter: mode === 'select' ? 'hand' : cv.filter }; forge = []; renderWin(); };
  // 1. get cards: one button per kind of card this deck sells
  const BUY: Record<CardType, { label: string; icon: string }> = {
    people: { label: 'Buy a person card', icon: 'people' }, troops: { label: 'Buy a troop card', icon: 'helm' },
    improvement: { label: 'Buy an improvement', icon: 'anvil' }, action: { label: 'Buy an action card', icon: 'star' }, burden: { label: '', icon: 'star' },
  };
  const shop = h('div', { class: 'shop' });
  for (const ty of typesFor(cat)) {
    const why = buyBlocked(S, cat, ty);
    const pool = poolOf(S, cat, ty);
    const sub = why ?? (pool.length === 1 ? `${buyCost(S, cat)} NP · ${pool[0].name}` : `${buyCost(S, cat)} NP · 3 shown, keep 1`);
    shop.append(h('button', { class: 'shop-b' + (why ? ' blocked' : ''), onclick: () => { if (why) return toast(why, 'bad'); const n = S.hand.length; act(() => buyCard(S, cat, ty)); if (S.hand.length > n) toast(`${CARDS[S.hand[S.hand.length - 1].card].name} added to your hand`, 'good'); } },
      h('span', { class: 'shop-i', html: icon(BUY[ty].icon, 22) }), h('span', { class: 'shop-t' }, h('b', {}, BUY[ty].label), h('small', {}, sub))));
  }
  body.append(h('div', { class: 'shop-head' }, h('h3', {}, 'Get cards'), h('small', { class: 'muted' }, `You have ${S.np.toFixed(1)} nation points · each purchase this year costs more · free draws: +${rate.rate.toFixed(2)} a year, next card ${pct}%`)), shop);
  const bar = h('div', { class: 'ctools' },
    h('button', { class: 'btn small' + (cv.mode === 'select' ? ' on' : ''), onclick: () => setMode('select') }, h('span', { html: icon('coin', 14) }), ' Sell cards'),
    mil ? h('button', { class: 'btn small' + (cv.mode === 'forge' ? ' on' : ''), onclick: () => setMode('forge') }, h('span', { html: icon('merge', 14) }), ' Forge') : null,
    mil ? h('button', { class: 'btn small' + (cv.mode === 'recipes' ? ' on' : ''), onclick: () => setMode('recipes') }, h('span', { html: icon('list', 14) }), ' Recipes') : null);
  // 2. what you hold
  const held = heldOf(S, cat), lim = handLimit(S), tot = heldTotal(S), tlim = handTotalLimit(S);
  const ex = handExcess(S);
  body.append(h('div', { class: 'cs-head' }, h('h3', {}, `Your cards `, h('span', { class: 'hlim' + (held > lim ? ' over' : held >= lim ? ' full' : '') }, `${held} of ${lim}`), h('small', { class: 'hlim-t' + (tot > tlim ? ' over' : '') }, ` · ${tot} of ${tlim} in all decks`)), h('small', { class: 'muted', title: rate.parts.map(p => `${p.label} ${signed(p.v)}`).join(', ') }, 'Tap a card to use it')), bar);
  if (cv.mode === 'forge') return forgeView(body);
  if (cv.mode === 'recipes') { body.append(recipeBook(true)); return; }
  if (ex.total > 0) body.append(h('p', { class: 'hlim-warn' }, ex.byCat[cat] ? `${ex.byCat[cat]} too many ${CAT_INFO[cat].name} cards` : `${ex.total} card${ex.total > 1 ? 's' : ''} over the limit across your decks`, `: sell before you end the turn (½ nation point each). A bigger realm may hold more.`));
  // filters
  const filters: [string, string, number][] = [['all', 'All', 0], ['hand', 'Cards', hand.length], ['people', 'People', S.characters.filter(c => CAT_ROLES[cat].includes(c.role)).length]];
  if (mil) filters.push(['troops', 'Troops', S.troops.length], ['ships', 'Ships', S.fleet.length], ['equip', 'Improvements', hand.filter(x => cardType(CARDS[x.card]) === 'improvement').length]);
  if (!filters.some(f => f[0] === cv.filter)) cv.filter = 'all';
  body.append(h('div', { class: 'seg cfilter' }, filters.map(([id, label, n]) => h('button', { class: 'seg-b' + (cv.filter === id ? ' on' : ''), onclick: () => { cv = { ...cv, filter: id }; renderWin(); } }, label, n ? h('small', {}, ` ${n}`) : null))));
  if (cv.mode === 'select') {
    body.append(h('div', { class: 'mcap' }, h('b', {}, `Tap cards to sell (${cv.sel.length} chosen · +${(cv.sel.length / 2).toFixed(1)} nation points)`), h('span', {},
      h('button', { class: 'btn small primary' + (cv.sel.length ? '' : ' blocked'), onclick: () => { if (!cv.sel.length) return; const n = cv.sel.length; act(() => sellCards(S, cv.sel), `${n} card${n > 1 ? 's' : ''} sold: +${(n / 2).toFixed(1)} nation points`); cv = { ...cv, mode: handExcess(S).total > 0 ? 'select' : 'browse', sel: [] }; renderWin(); } }, 'Sell'),
      h('button', { class: 'btn small ghost', onclick: () => setMode('select') }, 'Cancel'))));
  }
  const f = cv.filter;
  const show = (id: string) => f === 'all' || f === id;
  const sec = (title: string, els: HTMLElement[], empty: string, wide = false) => { body.append(h('h3', {}, title)); body.append(els.length ? h('div', { class: wide ? 'cards-grid' : 'cards-row wrap' }, els) : h('p', { class: 'muted' }, empty)); };
  if (show('hand') || show('equip')) {
    const list = f === 'equip' ? hand.filter(x => cardType(CARDS[x.card]) === 'improvement') : hand;
    const tile = (st: { card: string; uids: number[] }) => {
      const chosen = st.uids.filter(u => cv.sel.includes(u)).length;
      return handCard(st.card, { wide: true, count: st.uids.length, badge: cv.mode === 'select' && chosen ? `${chosen} chosen` : undefined, selected: chosen > 0, dim: cv.mode !== 'select' && !!cardBlocked(S, CARDS[st.card]) && CARDS[st.card].kind !== 'mission', onclick: () => {
        if (cv.mode === 'select') {
          // each tap picks one more of the stack; past the last, none
          const next = st.uids.find(u => !cv.sel.includes(u));
          cv = { ...cv, sel: next != null ? [...cv.sel, next] : cv.sel.filter(u => !st.uids.includes(u)) }; renderWin(); return;
        }
        openCardModal(st.uids[0]);
      } });
    };
    if (!list.length) sec('Cards in hand', [], 'No cards. You draw them each quarter, or buy a pack.', true);
    const groups: [CardType, string][] = [['people', 'People cards: hire someone'], ['troops', 'Troops: hire a company'], ['improvement', 'Improvements: better troops'], ['action', 'Actions'], ['burden', 'Burdens']];
    for (const [ty, title] of groups) {
      const sts = stacks(list.filter(x => cardType(CARDS[x.card]) === ty));
      if (sts.length) sec(title, sts.map(tile), '', true);
    }
  }
  if (show('people')) {
    const ppl = S.characters.filter(c => CAT_ROLES[cat].includes(c.role));
    sec('Your court', ppl.map(c => charCard(c, S, { wide: true, badge: c.mission === -1 ? 'viceroy' : c.mission != null ? 'busy' : undefined, onclick: () => charDetail(c) })), 'Nobody yet. Play a hiring card to recruit someone.', true);
  }
  if (mil && show('troops')) sec(`Troops (${S.troops.length}/${armyCap(S)})`, [...S.troops].sort((a, b) => armyPower([b]) - armyPower([a])).map(t => troopCard(t, { small: true, onclick: () => toast(`${TROOPS[t.type].name}: power ${armyPower([t]).toFixed(1)}${(t.might ?? 1) > 1 ? ` (forged ×${t.might})` : ''}${t.mission != null ? ' · on a mission' : ''}`) })), 'No troops. Hire them with troop cards.');
  if (mil && show('ships')) sec(`Ships (${S.fleet.length}/${navyCap(S)})`, S.fleet.map(t => troopCard(t, { small: true })), 'No ships.');
}

/** Forge: two troops of a kind, a troop and a matching one, or a troop and equipment. */
function forgeView(body: HTMLElement) {
  body.append(h('p', { class: 'muted' }, 'Pick two cards. Two of a kind become one company about 1.8 times as strong. Troops that match a recipe become a better kind, keeping most of their joint strength. Equipment upgrades one troop.'));
  if (forge.length === 2) {
    const r = mergePreview(S, forge[0], forge[1]);
    if ('error' in r) body.append(h('p', { class: 'bad' }, r.error));
    else body.append(h('div', { class: 'forge-res' }, troopCard({ type: r.out, vet: r.vet, str: 100, might: r.might }, {}),
      h('div', {}, h('b', {}, `${TROOPS[r.out].name} ${'★'.repeat(r.vet)}${r.might > 1 ? ` ×${r.might.toFixed(1)}` : ''}`),
        h('p', {}, `Power ${r.before.toFixed(1)} → ${r.after.toFixed(1)} (×${(r.after / Math.max(0.1, r.before)).toFixed(2)})`),
        h('p', { class: 'muted' }, r.tech ? `Needs research: ${TECH[r.tech].name}` : `${r.cost} ducats · frees a company slot`),
        h('button', { class: 'btn primary' + (r.tech || player(S).gold < r.cost ? ' blocked' : ''), onclick: () => { const a = forge[0], b = forge[1]; forge = []; act(() => doMerge(S, a, b), 'Forged!'); } }, 'Forge'))));
  } else body.append(h('p', { class: 'fact' }, forge.length ? 'Pick a second card' : 'Pick the first card'));
  const pickF = (uid: number) => { forge = forge.includes(uid) ? forge.filter(x => x !== uid) : [...forge.slice(-1), uid]; renderWin(); };
  const partners = forge.length === 1 ? new Set([...S.troops, ...S.fleet].filter(t => t.uid !== forge[0] && !('error' in mergePreview(S, forge[0], t.uid))).map(t => t.uid).concat(S.hand.filter(x => !('error' in mergePreview(S, forge[0], x.uid))).map(x => x.uid))) : null;
  body.append(h('h3', {}, 'Troops at home'));
  body.append(h('div', { class: 'cards-row wrap' }, S.troops.filter(t => t.mission == null).map(t => troopCard(t, { small: true, selected: forge.includes(t.uid), dim: !!partners && !partners.has(t.uid) && !forge.includes(t.uid), onclick: () => pickF(t.uid) }))));
  const eq = S.hand.filter(x => CARDS[x.card].kind === 'equip');
  body.append(h('h3', {}, 'Equipment'));
  body.append(eq.length ? h('div', { class: 'cards-row wrap' }, eq.map(x => handCard(x.card, { small: true, selected: forge.includes(x.uid), dim: !!partners && !partners.has(x.uid) && !forge.includes(x.uid), onclick: () => pickF(x.uid) }))) : h('p', { class: 'muted' }, 'No equipment cards.'));
  if (S.fleet.length) {
    body.append(h('h3', {}, 'Ships in harbour'));
    body.append(h('div', { class: 'cards-row wrap' }, S.fleet.filter(t => t.mission == null).map(t => troopCard(t, { small: true, selected: forge.includes(t.uid), dim: !!partners && !partners.has(t.uid) && !forge.includes(t.uid), onclick: () => pickF(t.uid) }))));
  }
  body.append(h('details', { class: 'recipes' }, h('summary', {}, 'Recipes you know'), recipeBook(true)));
}

/** Identical cards shown once, with a count. */
function stacks(list: { uid: number; card: string }[]) {
  const out: { card: string; uids: number[] }[] = [];
  for (const hc of list) { const st = out.find(x => x.card === hc.card); if (st) st.uids.push(hc.uid); else out.push({ card: hc.card, uids: [hc.uid] }); }
  return out;
}

/** Choose a person then a mission, or a mission then a person. */
function missionsTab(cat: Cat, body: HTMLElement) {
  const left = missionsLeft(S);
  body.append(h('div', { class: 'mcap' + (left ? '' : ' full') }, h('b', {}, `Missions this year: ${S.launched ?? 0} of ${missionCap(S)}`), h('small', {}, `${rankOf(S).name}${S.viceroys?.length ? ` · ${S.viceroys.length} viceroy${S.viceroys.length > 1 ? 's' : ''} take ${S.viceroys.length * VICEROY_COST}` : ''} · resets in spring`)));
  const people = S.characters.filter(c => CAT_ROLES[cat].includes(c.role) || (cat === 'military' && c.ruler && RULER_ARCHS[player(S).ruler.arch]?.role === 'general'));
  const cards = handOf(S, cat).filter(hc => CARDS[hc.card].kind === 'mission');
  const pc = pick.card != null ? S.hand.find(x => x.uid === pick.card) : undefined;
  const pp = pick.char != null ? S.characters.find(x => x.uid === pick.char) : undefined;
  const canDo = (c: Character, hcId: string) => cardRoles(hcId).includes(c.role) && c.mission == null;
  const go = (cardUid: number, charUid: number) => { preferChar = charUid; pick = {}; openCardModal(cardUid); };
  const cols = h('div', { class: 'mcols' });
  const pcol = h('div', { class: 'mcol' }, h('h3', {}, pp ? `${pp.name}` : 'People'), h('p', { class: 'muted small' }, pc ? 'Who will carry it out?' : 'Tap a person, then a mission card'));
  const prow = h('div', { class: 'cards-row wrap' });
  if (!people.length) prow.append(h('p', { class: 'muted' }, 'Nobody yet. Hire people with the hiring cards.'));
  for (const c of people) {
    const busy = c.mission != null;
    const ok = !pc || canDo(c, pc.card);
    prow.append(charCard(c, S, { small: true, selected: pp?.uid === c.uid, dim: busy || !ok, badge: busy ? (c.mission === -1 ? 'viceroy' : c.mission === -4 ? `back in ${c.back}q` : c.mission === -5 ? 'defending' : 'busy') : undefined, onclick: () => {
      if (busy) return toast(c.mission === -1 ? 'Serving as a viceroy' : c.mission === -4 ? `Riding home: back in ${qText(c.back ?? 1)}` : c.mission === -5 ? 'Standing ready to defend' : 'Away on a mission');
      if (pc) { if (!ok) return toast('This person cannot do that mission', 'bad'); return go(pc.uid, c.uid); }
      pick = { char: pp?.uid === c.uid ? undefined : c.uid }; renderWin();
    } }));
  }
  pcol.append(prow);
  const ccol = h('div', { class: 'mcol' }, h('h3', {}, 'Mission cards'), h('p', { class: 'muted small' }, pp ? `What will ${pp.name.split(' ')[0]} do?` : 'Or tap a card, then a person'));
  const crow = h('div', { class: 'cards-grid' });
  if (!cards.length) crow.append(h('p', { class: 'muted' }, 'No mission cards. You draw them each quarter, or buy one in the Cards tab.'));
  for (const st of stacks(cards)) {
    const hc = { uid: st.uids[0], card: st.card };
    const ok = !pp || canDo(pp, hc.card);
    crow.append(handCard(hc.card, { wide: true, count: st.uids.length, selected: !!pc && st.uids.includes(pc.uid), dim: !ok, onclick: () => {
      if (pp) { if (!ok) return toast(`${pp.name} cannot do that: it needs a ${cardRoles(hc.card).map(r => roleName[r].toLowerCase()).join(' or ')}`, 'bad'); return go(hc.uid, pp.uid); }
      pick = { card: pc && st.uids.includes(pc.uid) ? undefined : hc.uid }; renderWin();
    } }));
  }
  ccol.append(crow);
  cols.append(pcol, ccol);
  body.append(cols);
  const now = missionsOfCat(cat);
  body.append(h('h3', {}, `Under way (${now.length})`));
  if (!now.length) body.append(h('p', { class: 'muted' }, 'Nothing under way.'));
  for (const m of now) body.append(missionRow(m));
}

function missionRow(m: GameState['missions'][number]) {
  const c = S.characters.find(x => x.uid === m.char);
  const info = MISSION_INFO[m.kind];
  const pct = m.kind === 'research' ? Math.min(100, (m.progress / techCost(S, m.target)) * 100) : ((m.total - m.turnsLeft) / Math.max(1, m.total)) * 100;
  return h('div', { class: 'mission k-' + info.role },
    h('span', { class: 'a-ico', html: icon(info.icon, 20) }),
    h('div', { class: 'a-t' }, h('b', {}, missionTitle(m)),
      h('small', {}, `${c?.name ?? '?'}${m.troops.length ? ` with ${m.troops.length} troops` : ''} · ${qText(m.turnsLeft)} left`),
      h('div', { class: 'pbar' }, h('i', { style: `width:${pct}%` }))),
    h('button', { class: 'iconbtn', 'aria-label': 'Recall', title: 'Recall', onclick: () => confirmBox('Recall this mission?', 'The card is lost. Construction refunds half its cost.', 'Recall', () => act(() => cancelMission(S, m.id))), html: icon('close', 16) }));
}

function toggleSheet(kind: string, arg?: string) {
  if (sheet && sheet.kind === kind && sheet.arg === arg) closeSheet(); else openSheet(kind, arg);
}
function openSheet(kind: string, arg?: string) {
  if (kind !== 'military') forge = [];
  sheet = { kind, arg };
  $('#sheet').hidden = false;
  refresh();
}
function closeSheet() {
  sheet = null; forge = [];
  $('#sheet').hidden = true;
  map.select(null);
  refresh();
}

function sheetHead(title: string, sub?: string, color?: string) {
  return h('div', { class: 'sh-head', style: color ? `--nc:${color}` : '' },
    h('div', { class: 'sh-titles' }, h('h2', {}, title), sub ? h('p', {}, sub) : null),
    h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeSheet, html: icon('close', 18) }));
}

function renderSheet() {
  if (!sheet) return;
  const el = clear($('#sheet'));
  const body = h('div', { class: 'sh-body' });
  const k = sheet.kind;
  const scroll = $('#sheet .sh-body')?.scrollTop ?? 0;
  let parts: HTMLElement[] = [];
  if (k === 'province') parts = provinceSheet(sheet.arg!, body);
  else if (k === 'nation') parts = nationSheet(sheet.arg!, body);
  else if (k === 'missions') parts = missionsSheet(body);
  else if (k === 'goals') parts = goalsSheet(body);
  else if (k === 'chronicle') parts = chronicleSheet(body);
  else if (k === 'realm') parts = realmSheet(body);
  else if (k === 'overseas') parts = overseasSheet(body);
  el.append(...parts);
  body.scrollTop = scroll;
}

const gradeLabel = (g: number) => { const d = GRADES.find(x => x.mult === g); return d && d.mult !== 1 ? ` (${d.name})` : ''; };

function oddsLine(c?: Character | null) {
  const odds = OUTCOME_ODDS[c?.rarity ?? 'common'];
  return h('div', { class: 'odds' }, ...odds.map((v, i) => h('span', { class: 'odd o' + i, style: `flex:${Math.max(v, 1.5)}`, title: `${OUTCOMES[i].name} ${v}%` }, `${OUTCOMES[i].name} ${v < 1 ? v : Math.round(v)}%`)));
}

const stat = (label: string, value: string | number | HTMLElement) => h('div', { class: 'stat' }, h('span', {}, label), typeof value === 'object' ? value : h('b', {}, String(value)));

/** Cost and benefit of a building, side by side. */
function costBenefit(bid: string, provId?: string, ch?: Character): HTMLElement {
  const b = BUILDINGS[bid];
  const mats = projectGoods('build', bid).materials ?? 0;
  const have = S.stock.materials ?? 0;
  const extra = projectShortfall(S, 'build', bid);
  const q = ch ? missionTurns(S, 'build', ch, provId ?? '', bid) : b.turns * 3;
  const cost: (string | HTMLElement)[] = [
    `${buildingCost(S, bid)} ducats`,
    h('span', { class: have >= mats ? '' : 'bad' }, `${mats} construction materials (you have ${have.toFixed(1)})${have >= mats ? '' : `: the rest bought for +${extra} ducats`}`),
    `Takes ${qText(q)}`,
    `Upkeep ${b.salary} ducats a year`,
  ];
  const gives = [...b.gives];
  const p = provId ? S.provinces[provId] : undefined;
  if (p && b.match?.includes(p.good)) gives.unshift(`${p.name} makes ${GOODS[p.good]?.name.toLowerCase() ?? p.good}: output doubled here`);
  return h('div', { class: 'cb' },
    h('div', { class: 'cb-col cb-cost' }, h('h4', {}, 'Cost'), h('ul', {}, cost.map(c => h('li', {}, c)))),
    h('div', { class: 'cb-col cb-gain' }, h('h4', {}, 'Benefit'), h('ul', {}, gives.map(g => h('li', {}, g)))));
}

function buildRow(bid: string, provId: string, blocked: string | null, onclick: () => void) {
  const b = BUILDINGS[bid];
  return h('button', { class: `action build-row${blocked ? ' blocked' : ''}`, onclick: () => (blocked ? toast(blocked, 'bad') : onclick()) },
    h('span', { class: 'br-head' }, h('span', { class: 'a-ico', html: icon(b.icon, 20) }), h('b', {}, b.name), blocked ? h('small', { class: 'bad' }, blocked) : null),
    costBenefit(bid, provId));
}

function actionRow(ic: string, title: string, sub: string, blocked: string | null, onclick: () => void, tone = '') {
  return h('button', { class: `action ${tone}${blocked ? ' blocked' : ''}`, onclick: () => (blocked ? toast(blocked, 'bad') : onclick()) },
    h('span', { class: 'a-ico', html: icon(ic, 20) }),
    h('span', { class: 'a-t' }, h('b', {}, title), h('small', {}, blocked ?? sub)),
    h('span', { class: 'a-go', html: icon('next', 14) }));
}

/** The card section at the top of every category panel. */
function cardSection(cat: Cat) {
  const rate = cardRates(S)[cat];
  const hand = handOf(S, cat);
  const pct = Math.round((S.cardAccum[cat] ?? 0) * 100);
  const wrap = h('div', { class: 'cardsec', style: `--cc:${CAT_INFO[cat].color}` });
  wrap.append(h('div', { class: 'cs-head' },
    h('b', {}, `Your ${CAT_INFO[cat].name.toLowerCase()} cards (${hand.length})`),
    h('small', { title: rate.parts.map(p => `${p.label} ${signed(p.v)}`).join(', ') }, `+${rate.rate.toFixed(2)} a year · next card ${pct}%`)));
  const row = h('div', { class: 'cards-row wrap' });
  if (!hand.length) row.append(h('p', { class: 'muted' }, 'No cards yet. You draw them every year, or buy one below.'));
  for (const st of stacks(hand)) row.append(handCard(st.card, { small: true, count: st.uids.length, dim: !!cardBlocked(S, CARDS[st.card]) && CARDS[st.card].kind !== 'mission', onclick: () => openCardModal(st.uids[0]) }));
  wrap.append(row);
  const why = buyBlocked(S, cat);
  wrap.append(h('button', { class: 'btn buy' + (why ? ' blocked' : ''), onclick: () => act(() => buyCard(S, cat)) },
    h('span', { html: icon('star', 16) }), h('b', {}, `Buy a card · ${buyCost(S, cat)} nation points`), h('small', {}, why ?? 'Three are revealed, you keep one')));
  return wrap;
}

function peopleSection(roles: Character['role'][], title: string, empty = 'Nobody yet. Play a hiring card to recruit someone.') {
  const ppl = S.characters.filter(c => roles.includes(c.role));
  const grid = h('div', { class: 'cards-row wrap' });
  if (!ppl.length) grid.append(h('p', { class: 'muted' }, empty));
  for (const c of ppl) grid.append(charCard(c, S, { small: true, onclick: () => charDetail(c) }));
  return [h('h3', {}, `${title} (${ppl.length})`), grid];
}

// ---------- province ----------
function provinceSheet(id: string, body: HTMLElement) {
  const p = S.provinces[id];
  const owner = S.nations[p.owner];
  const mine = p.owner === S.player;
  const g = getGeo();
  const tier = tierOf(p);
  body.append(h('div', { class: 'stats' },
    stat(TIERS[tier].name, `${(population(S, p) / 1000).toFixed(0)}k people`), stat('Development', p.dev),
    stat('Control', `${Math.round(p.control)}%`), stat('Raw material', GOODS[p.good]?.name ?? p.good),
    stat('Income', provinceIncome(S, id).toFixed(1)), stat('Fort', p.fort ? '▮'.repeat(p.fort) : 'none'),
    g.coastal[id] ? stat('Coast', 'yes') : null,
    stat('Culture', `${CULTURE_NAMES[p.culture] ?? p.culture}${mine && !isAccepted(S, p.culture) ? ' (foreign)' : ''}`), stat('Faith', RELIGION_NAMES[p.religion] ?? p.religion)));
  if (mine) {
    const hp = happinessOf(S, p);
    body.append(h('div', { class: 'mood' }, h('div', { class: 'mood-h' }, h('b', {}, `Happiness ${hp.value}%`), h('small', {}, moodName(hp.value))),
      h('div', { class: 'ctl-bar' }, h('i', { style: `width:${hp.value}%`, class: hp.value < 35 ? 'low' : '' })),
      h('div', { class: 'tags' }, hp.parts.filter(x => x.label !== 'Base').map(x => h('span', { class: 'tag ' + (x.v < 0 ? 'war' : 'ally') }, `${x.label} ${signed(x.v)}`)))));
  }
  const site = (sname: 'town' | 'rural', label: string) => {
    const blds = p.buildings.filter(b => BUILDINGS[b]?.site === sname);
    const slots = sname === 'town' ? townSlots(p) : ruralSlots(p);
    return h('div', { class: 'site' }, h('h3', {}, `${label} (${builtAt(p, sname)}/${slots})`),
      h('div', { class: 'tags' }, blds.length ? blds.map(b => h('span', { class: 'tag', html: icon(BUILDINGS[b].icon, 14) + ' ' + BUILDINGS[b].name + gradeLabel(p.grades?.[b] ?? 1) })) : h('span', { class: 'muted' }, sname === 'town' && !p.settlement ? 'No town yet. Found a settlement to build here.' : 'Nothing built yet')));
  };
  body.append(site('town', TIERS[tier].name), site('rural', 'Countryside'));
  const best = Object.values(BUILDINGS).filter(b => b.match?.includes(p.good)).map(b => b.name);
  const out = provinceOutput(S, p), side = sideOutput(S, p);
  body.append(h('p', { class: 'muted' }, h('span', { class: 'gico-in', style: `color:${GOODS[p.good]?.color}`, html: icon(GOODS[p.good]?.icon ?? 'star', 14) }),
    ` Makes ${f1(out)} ${GOODS[p.good]?.name.toLowerCase() ?? p.good} a year${side.length ? ` and ${side.map(x => `${f1(x.v)} ${GOODS[x.good].name.toLowerCase()}`).join(', ')}` : ''}. ${GOODS[p.good]?.desc ?? ''}${best.length ? ` ${best.join(' or ')} double it.` : ''}`));
  if (mine && workshopCap(S, p) > 0) body.append(workshopRow(p));
  if (mine) {
    body.append(h('h3', {}, 'Actions'));
    const devCard = cardFor(S, 'develop');
    body.append(actionRow('wheat', 'Develop', `+1 development · ${developCost(S, id)} ducats · uses Settlers or Irrigation`, !devCard ? 'Needs a Settlers (Internal) or Irrigation (Economy) card' : missionBlocked(S, 'develop', id), () => openPlanner('develop', id, undefined, devCard!.uid)));
    if (p.religion !== S.stateReligion) {
      const rc = cardFor(S, 'convert');
      body.append(actionRow('church', 'Religious mission', `Convert to the ${RELIGION_NAMES[S.stateReligion]} faith · 2–6 years, faster with a rarer administrator`, !rc ? 'Needs a Religious Mission card (Internal)' : missionBlocked(S, 'convert', id), () => openPlanner('convert', id, undefined, rc!.uid)));
    }
    if (!isAccepted(S, p.culture)) {
      const ac = cardFor(S, 'assimilate');
      body.append(actionRow('scroll', 'Cultural integration', `Bring the ${CULTURE_NAMES[p.culture] ?? p.culture} people into your ways · 3–7 years, faster with a rarer administrator`, !ac ? 'Needs a Cultural Integration card (Internal)' : missionBlocked(S, 'assimilate', id), () => openPlanner('assimilate', id, undefined, ac!.uid)));
    }
    if (player(S).capital !== id) body.append(actionRow('crown', 'Move the capital here', `Your court moves to ${p.name} · ${capitalMoveCost(S)} ducats, 1 stability`, moveCapitalBlocked(S, id), () => confirmBox(`Move the capital to ${p.name}?`, `The court leaves ${S.provinces[player(S).capital].name}. Costs ${capitalMoveCost(S)} ducats and 1 stability.`, 'Move the court', () => { act(() => moveCapital(S, id), `${p.name} is your new capital`); })));
    const gr = cardFor(S, 'grace');
    body.append(actionRow('mood', 'Royal grace', `Raise happiness here (+4 to +28, fading 1 a year) · ${graceCost(S)} ducats · 1–3 years`, !gr ? 'Needs a Royal Grace card (Internal)' : missionBlocked(S, 'grace', id), () => openPlanner('grace', id, undefined, gr!.uid)));
    if (!p.settlement) {
      const fc = cardFor(S, 'found');
      body.append(actionRow('tower', 'Found a settlement', `A village, town or city, depending on your administrator · ${foundCost(S)} ducats`, !fc ? 'Needs a Found a Settlement card (Internal)' : missionBlocked(S, 'found', id), () => openPlanner('found', id, undefined, fc!.uid)));
    } else if (p.settlement < 4) {
      const gc = cardFor(S, 'grow');
      body.append(actionRow('tower', `Grow the ${TIERS[tierOf(p)].name.toLowerCase()}`, `Up to a ${TIERS[(['none', 'village', 'town', 'city', 'metropolis'] as const)[p.settlement + 1]].name.toLowerCase()} · ${growCost(S, id)} ducats`, !gc ? 'Needs a Grow your Settlement card (Internal)' : missionBlocked(S, 'grow', id), () => openPlanner('grow', id, undefined, gc!.uid)));
    }
    for (const [siteName, label] of [['town', 'Build in town'], ['rural', 'Build in the countryside']] as const) {
      body.append(h('h3', {}, label));
      for (const b of Object.values(BUILDINGS).filter(b => b.site === siteName)) {
        const why = buildingAllowed(S, id, b.id);
        if (b.tech && !S.techs.includes(b.tech)) continue; // not researched yet: not shown
        if (why === 'Coastal provinces only' || why === 'Already built') continue;
        const card = cardFor(S, 'build', { group: b.group });
        const need = b.group === 'internal' ? 'Royal Works (Internal)' : 'Guild Charter (Economy)';
        const block = why ?? (!card ? `Needs a ${need} card` : player(S).gold < buildingCost(S, b.id) ? `Needs ${buildingCost(S, b.id)} ducats` : null);
        body.append(buildRow(b.id, id, block, () => openPlanner('build', id, b.id, card!.uid)));
      }
    }
  } else if (p.owner === NO_STATE) {
    const cc = cardFor(S, 'colonize');
    body.append(h('h3', {}, 'Unclaimed land'));
    body.append(h('p', { class: 'muted' }, `No state rules here. The ${CULTURE_NAMES[p.culture] ?? p.culture} people live by their own ways.`));
    body.append(actionRow('tower', `Colonise ${p.name}`, `${Math.round(colonyCost(S))} ducats and 1 manpower · a colonist settles it`, !cc ? 'Needs a Colonial Charter card (Internal)' : missionBlocked(S, 'colonize', id), () => openPlanner('colonize', id, undefined, cc!.uid)));
    return [sheetHead(p.name, 'Unclaimed land', '#b9ad8e'), body];
  } else {
    const war = atWar(S, S.player, p.owner);
    if (NATIVE_EMPIRES.includes(p.owner)) {
      const kc = cardFor(S, 'conquista');
      body.append(actionRow('sword', `Conquista: ${p.name}`, 'A conqueror and troops take it, with plunder', !kc ? 'Needs a Conquista card (Military)' : missionBlocked(S, 'conquista', id), () => openPlanner('conquista', id, undefined, kc!.uid)));
    }
    if (war) {
      const route = attackRoute(S, id);
      const card = cardFor(S, 'conquer');
      body.append(h('h3', {}, 'At war'));
      const block = !card ? 'Needs a March Orders card (Military)' : null;
      if (route || baseFor(S, id)) {
        body.append(actionRow('sword', `Conquer ${p.name}`, route ? `${route.naval ? 'By sea' : 'Over land'} · ${qText(route.turns)} · ${troopsNear(S, S.player, id).length} of your companies within reach` : 'From your base', block ?? missionBlocked(S, 'conquer', id), () => openPlanner('conquer', id, undefined, card!.uid)));
        body.append(actionRow('torch', `Raid ${p.name}`, 'Plunder ducats, take no land', block ?? missionBlocked(S, 'raid', id), () => openPlanner('raid', id, undefined, card!.uid)));
      } else {
        const ng = nearestGarrison(S, id);
        body.append(actionRow('tower', `Invasion base near ${p.name}`, `Your nearest troops are ${ng ? qText(ng.t) : 'far'} away. A general sets up a camp first: half strength for a quarter, then strike at full strength.`, block ?? missionBlocked(S, 'base', id), () => openPlanner('base', id, undefined, card!.uid)));
      }
      if ((S.nations[p.owner].spiedUntil ?? 0) > S.year) body.append(h('p', { class: 'muted' }, `Spies report ${troopsNear(S, p.owner, id).length} enemy companies within a quarter of ${p.name}.`));
    }
    body.append(actionRow('hands', owner.name, `Relations ${getRel(S, S.player, p.owner)} · open diplomacy`, null, () => openSheet('nation', p.owner)));
    if (!war) body.append(declareWarRow(p.owner));
    body.append(armyIntel(p.owner));
  }
  return [sheetHead(p.name, mine ? `Your province · ${TIERS[tier].name}` : `${owner.name}${p.core !== p.owner ? ` · formerly ${nationName(S, p.core)}` : ''}`, owner.color), body];
}

function armyIntel(n: string) {
  const nat = S.nations[n];
  if ((nat.spiedUntil ?? 0) > S.year) {
    return h('div', { class: 'intel' }, h('h3', {}, `${nat.adj} army (spies)`), h('div', { class: 'cards-row wrap' }, nat.army.slice(0, 12).map(t => troopCard(t, { small: true }))));
  }
  const n2 = nat.army.length;
  return h('div', { class: 'intel' }, h('h3', {}, `${nat.adj} army`), h('p', { class: 'muted' }, `Scouts count about ${Math.max(0, n2 - 1)}–${n2 + 2} companies. A Spy Network card reveals them.`));
}

function declareWarRow(n: string) {
  const truce = inTruce(S, S.player, n);
  const cost = warCost(S, n);
  return actionRow('sword', `Declare war on ${nationName(S, n)}`, cost ? `Stability −${cost}${cost > 1 ? ' (breaks your treaty)' : ''}` : 'You hold a claim: no stability loss', truce ? 'A truce is in force' : null,
    () => confirmBox(`Declare war on ${nationName(S, n)}?`, cost ? `Stability falls by ${cost}. Their allies may join them.` : 'Your claim justifies the war.', 'Declare war', () => act(() => playerDeclareWar(S, n), 'War declared')), 'danger');
}

function nationSheet(id: string, body: HTMLElement) {
  const n = S.nations[id];
  const rel = getRel(S, S.player, id);
  const war = atWar(S, S.player, id);
  const tre = ['trade', 'alliance', 'marriage'].filter(k => hasTreaty(S, S.player, id, k));
  body.append(h('div', { class: 'relbar' }, h('i', { style: `left:${(rel + 100) / 2}%` }), h('span', {}, `Relations ${rel}`)));
  body.append(h('div', { class: 'stats' },
    stat('Provinces', provsOf(S, id).length), stat('Ruler', n.ruler.name), stat('Temper', n.personality),
    stat('Status', war ? 'At war with you' : tre.length ? tre.join(', ') : 'Neutral')));
  const goods = [...ownGoods(S, id)].map(g => GOODS[g]?.name ?? g);
  body.append(h('p', { class: 'muted' }, `Goods: ${goods.join(', ') || 'none'}.`));
  const theirWars = enemiesOf(S, id).filter(e => e !== S.player).map(e => nationName(S, e));
  const theirAllies = alliesOf(S, id).map(e => nationName(S, e));
  if (theirWars.length || theirAllies.length) body.append(h('p', { class: 'muted' }, [theirAllies.length ? `Allies: ${theirAllies.join(', ')}.` : '', theirWars.length ? ` At war with ${theirWars.join(', ')}.` : ''].join('')));
  if (war) body.append(h('div', { class: 'stats' }, stat('War score', `${warScore(S, id) > 0 ? '+' : ''}${warScore(S, id)}`), stat('Meaning', warScore(S, id) > 10 ? 'You are winning' : warScore(S, id) < -10 ? 'You are losing' : 'Even')));
  if (n.overlord) body.append(h('p', { class: 'muted' }, n.overlord === S.player ? `Your ${n.subject === 'union' ? 'personal union' : 'vassal'} since ${n.subjectSince}.` : `Subject of ${nationName(S, n.overlord)}: attacking it means war with its overlord.`));
  body.append(h('h3', {}, 'Send a diplomat'));
  for (const k of DIPLO) {
    if (war !== (k === 'peace')) continue;
    if (k === 'integrate' && n.overlord !== S.player) continue;
    if (k === 'vassalize' && n.overlord === S.player) continue;
    const card = cardFor(S, k);
    const why = !card ? `Needs a ${({ relations: 'Embassy', trade: 'Trade Route', alliance: 'Alliance Pact', marriage: 'Royal Marriage', peace: 'Peace Envoy', vassalize: 'Demand Fealty', integrate: 'Integration Treaty' } as Record<string, string>)[k]} card` : missionBlocked(S, k, id);
    body.append(actionRow(MISSION_INFO[k].icon, MISSION_INFO[k].name, diploHint(k), why, () => openPlanner(k, id, undefined, card!.uid)));
  }
  if (!war) body.append(declareWarRow(id));
  body.append(armyIntel(id));
  return [sheetHead(n.name, `${n.adj} crown`, n.color), body];
}
function diploHint(k: MissionKind) {
  return ({ relations: 'Relations +25', trade: 'Ducats every year, and import a good', alliance: 'They join your wars', marriage: 'Relations grow every year; a dying king may leave you his crown', peace: 'Come to the table and set terms', vassalize: 'They pay tribute and follow you to war', integrate: 'Their provinces become yours' } as Record<string, string>)[k] ?? '';
}

// ---------- category panels ----------
/** What each troop card hires now, and what research brings next. */
function unitsPanel() {
  const box = h('div', { class: 'units' });
  for (const cls of ['levy', 'inf', 'shot', 'cav', 'art'] as UnitClass[]) {
    const now = unitFor(S, cls);
    const line = UNIT_LINES[cls];
    const next = line.slice(line.indexOf(now) + 1)[0];
    const d = TROOPS[now];
    box.append(h('div', { class: 'unit-row' },
      troopCard({ type: now, vet: 0, str: 100 }, { small: true }),
      h('div', { class: 'g-t' }, h('b', {}, CLASS_NAME[cls]), h('small', {}, `${d.name} · melee ${d.melee}, fire ${d.fire}, defence ${d.def} · upkeep ${d.upkeep}`),
        h('small', { class: 'muted' }, next ? `Next: ${TROOPS[next].name} with ${TECH[TROOPS[next].tech!]?.name ?? 'research'}` : 'The best of its kind'))));
  }
  return box;
}

function armyTab(body: HTMLElement) {
  const gs = garrisons(S);
  body.append(h('h3', {}, 'Your units'), h('p', { class: 'muted small' }, 'Troop cards hire the best unit of their kind you have researched. Better kinds (Tercios, Knights, Cuirassiers, Galleons…) come from the recipes in the Forge: two companies, or a company and an improvement card.'), unitsPanel());
  body.append(h('p', { class: 'muted' }, 'Troops stand in the capital, in provinces with Barracks, or at an invasion base. Only troops within a quarter\'s march can attack or defend a province. Tap troops to select them, then move them.'));
  body.append(h('h3', {}, `Armies (${S.troops.length}/${armyCap(S)}) · upkeep ${incomeOf(S, S.player).upkeep.toFixed(1)} a year`));
  const sel = forge.filter(u => S.troops.some(t => t.uid === u));
  const toggle = (uid: number) => { forge = forge.includes(uid) ? forge.filter(x => x !== uid) : [...forge, uid]; renderWin(); };
  const groups: [string, typeof S.troops][] = gs.map(g => [g, S.troops.filter(t => t.loc === g && !t.moving)]);
  const moving = S.troops.filter(t => t.moving), away = S.troops.filter(t => t.mission != null && !t.moving);
  for (const [g, ts] of groups) {
    body.append(h('div', { class: 'garrison' }, h('b', {}, placeName(g)), h('small', {}, `${g === player(S).capital ? 'capital · ' : g.startsWith('base:') ? '' : 'barracks · '}${ts.filter(t => t.mission == null).length} companies · power ${Math.round(armyPower(ts.filter(t => t.mission == null)))}`)));
    const row = h('div', { class: 'cards-row wrap' });
    if (!ts.length) row.append(h('p', { class: 'muted' }, 'Empty.'));
    for (const t of ts) row.append(troopCard(t, { small: true, selected: sel.includes(t.uid), dim: t.mission != null || t.str < 100, badge: t.mission === -5 ? 'defending' : t.str < 100 ? `resting ${Math.ceil((100 - t.str) / 20)}q` : undefined, onclick: () => t.mission === -5 ? toast('Standing ready to defend') : t.mission != null ? toast('Away on a mission') : toggle(t.uid) }));
    body.append(row);
  }
  if (moving.length) {
    body.append(h('h3', {}, 'On the march'));
    body.append(h('div', { class: 'cards-row wrap' }, moving.map(t => troopCard(t, { small: true, badge: `${placeName(t.moving!.to)} · ${t.moving!.eta} q` }))));
  }
  if (away.length) body.append(h('p', { class: 'muted' }, `${away.length} companies are away on missions.`));
  if (sel.length) {
    const from = S.troops.find(t => t.uid === sel[0])!;
    body.append(h('div', { class: 'mcap' }, h('b', {}, `${sel.length} selected · move to:`),
      h('div', { class: 'targets' }, gs.filter(g => g !== from.loc).map(g => { const q = travel(locOf(S, from), g); return h('button', { class: 'tchip', onclick: () => { const ids = [...sel]; forge = []; act(() => moveTroops(S, ids, g), q ? `On the march: ${qText(q)}` : 'Moved'); } }, `${placeName(g)} · ${q ? qText(q) : 'now'}`); }),
        sel.length === 1 ? h('button', { class: 'btn ghost danger small', onclick: () => confirmBox(`Disband ${TROOPS[from.type].name}?`, 'The troop is removed for good.', 'Disband', () => { forge = []; act(() => disbandTroop(S, from.uid)); }) }, 'Disband') : null)));
  }
  if (gs.length < 2) body.append(h('p', { class: 'muted' }, 'Build Barracks in a province (Internal) to station troops there, for example near a frontier or overseas.'));
}

function navyTab(body: HTMLElement) {
  body.append(h('h3', {}, `Fleet (${S.fleet.length}/${navyCap(S)}) · carries ${transportOf(S, S.fleet.map(t => t.uid))} companies`));
  const fl = h('div', { class: 'cards-grid' });
  if (!S.fleet.length) fl.append(h('p', { class: 'muted' }, 'No ships. Ship cards come with Military draws; hiring one turns a general into an admiral.'));
  [...S.fleet].sort((a, b) => TROOPS[b.type].tier - TROOPS[a.type].tier).forEach(t =>
    fl.append(troopCard(t, { small: true, selected: forge.includes(t.uid), onclick: () => {
      if (t.mission != null) return toast('This ship is at sea on a mission');
      forge = forge.includes(t.uid) ? forge.filter(x => x !== t.uid) : [...forge.slice(-1), t.uid];
      renderWin();
    } })));
  body.append(fl);
  body.append(...peopleSection(['admiral'], 'Admirals', 'No admirals yet. A general who leads an attack with ships becomes one, for good.'));
}

function warsTab(body: HTMLElement) {
  const wars = S.wars.filter(w => w.a === S.player || w.b === S.player);
  body.append(h('h3', {}, `Wars (${wars.length})`));
  if (!wars.length) body.append(h('p', { class: 'muted' }, 'At peace. Declare war from a province or a realm in Diplomacy.'));
  for (const w of wars) {
    const foe = w.a === S.player ? w.b : w.a;
    const n = S.nations[foe];
    const mine = w.a === S.player ? (w.winsA ?? 0) : (w.winsB ?? 0), theirs = w.a === S.player ? (w.winsB ?? 0) : (w.winsA ?? 0);
    const score = warScore(S, foe);
    body.append(h('button', { class: 'nrow war', onclick: () => { closeWin(); openSheet('nation', foe); } },
      h('span', { class: 'swatch', style: `background:${n?.color}` }),
      h('span', { class: 'nr-name' }, n?.name ?? foe, h('small', {}, `since ${w.since} · battles ${mine}–${theirs}${S.flags['faction_' + foe] ? ' · civil war' : ''}`)),
      h('span', { class: 'nr-badges' }, h('span', { class: 'tag ' + (score >= 0 ? 'ally' : 'war') }, `War score ${signed(Math.round(score))}`)),
      h('span', { class: 'a-go', html: icon('next', 14) })));
  }
  const log = [...(S.battleLog ?? [])].reverse();
  body.append(h('h3', {}, `Your battles (${log.length})`));
  if (!log.length) body.append(h('p', { class: 'muted' }, 'No battles fought yet.'));
  const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, ...['When', 'Where', 'Against', 'Odds', 'Result'].map(x => h('th', {}, x)))));
  t.append(h('tbody', {}, log.slice(0, 60).map(r => {
    const meAtt = r.att === S.player;
    const foe = meAtt ? r.def : r.att;
    const odds = Math.round(100 * (meAtt ? r.attPower : r.defPower) / Math.max(1, r.attPower + r.defPower));
    return h('tr', {}, h('td', {}, `${SEASONS[r.quarter]} ${r.year}`), h('td', {}, `${S.provinces[r.province]?.name ?? r.province}${r.naval ? ' (sea)' : ''}`),
      h('td', {}, nationName(S, foe) === foe && foe === 'rebels' ? 'Rebels' : nationName(S, foe)), h('td', {}, `${odds}%`), h('td', { class: r.player === 'won' ? 'good' : 'bad' }, r.player === 'won' ? 'Victory' : 'Defeat'));
  })));
  if (log.length) body.append(h('div', { class: 'tscroll' }, t));
}

function realmTab(body: HTMLElement) {
  const r = rankOf(S), nx = nextRank(S), k = provsOf(S, S.player).length;
  body.append(h('div', { class: 'coresec' },
    h('div', { class: 'cs-head' }, h('b', {}, `${player(S).name}: ${r.name}`), h('small', {}, nx ? `${nx.name} at ${nx.min} provinces (you have ${k})` : 'The highest rank')),
    h('div', { class: 'stats' }, stat('Missions a year', `${missionCap(S)}`), stat('Started this year', `${S.launched ?? 0}`), stat('Viceroys', `${S.viceroys?.length ?? 0}/${r.viceroys}`), stat('Provinces', k)),
    h('p', { class: 'muted' }, 'Small Kingdom 6 missions a year · Kingdom (5+ provinces) 9 · Great Kingdom (13+) 12 and 1 viceroy · Empire (30+) 15 and 3 viceroys. Each viceroy takes 2 of your yearly missions.')));
  // viceroys
  body.append(h('h3', {}, 'Viceroys'));
  if (!r.viceroys) body.append(h('p', { class: 'muted' }, 'A Great Kingdom or an Empire can hand distant provinces to a viceroy. They govern them for you: a better viceroy raises control, happiness and development faster, but the very able grow ambitious and may crown themselves.'));
  for (const v of S.viceroys ?? []) {
    const c = S.characters.find(x => x.uid === v.char);
    body.append(h('div', { class: 'vrow' }, c ? charCard(c, S, { small: true }) : null,
      h('div', { class: 'a-t' }, h('b', {}, `${c?.name ?? '?'} · Viceroy of ${S.provinces[v.seat]?.name}`), h('small', {}, `${v.provinces.length} provinces · since ${v.since}${c ? ' · ' + FOCUS_TEXT[viceroyFocus(c.role)] : ''}`),
        h('div', { class: 'ctl' }, h('span', {}, 'Loyalty'), h('span', { class: 'ctl-bar' }, h('i', { style: `width:${v.loyalty}%`, class: v.loyalty < 40 ? 'low' : '' })), h('b', {}, `${Math.round(v.loyalty)}`))),
      h('button', { class: 'btn small', onclick: () => confirmBox('Recall the viceroy?', v.loyalty < 40 ? 'They are disloyal: stability falls by 1.' : 'They return to court.', 'Recall', () => act(() => recallViceroy(S, v.char))) }, 'Recall')));
  }
  if (r.viceroys && (S.viceroys?.length ?? 0) < r.viceroys) {
    const seats = provsOf(S, S.player).filter(p => !viceroyBlocked(S, p.id)).sort((a, b) => territoryOf(S, b.id).length - territoryOf(S, a.id).length).slice(0, 8);
    const free = S.characters.filter(c => c.mission == null && !c.ruler);
    if (!seats.length) body.append(h('p', { class: 'muted' }, 'No province can seat a viceroy: it needs 3 of your provinces within two marches, away from the capital.'));
    else if (!free.length) body.append(h('p', { class: 'muted' }, 'Nobody free at court to send.'));
    else {
      body.append(h('p', { class: 'muted' }, 'Name a viceroy: choose a seat, then a person.'));
      let seat = pick.card != null ? null : seats[0].id;
      const sel = h('div', { class: 'targets' }, seats.map(p => h('button', { class: 'tchip' + (p.id === seat ? ' sel' : ''), onclick: (e: Event) => { seat = p.id; (e.currentTarget as HTMLElement).parentElement!.querySelectorAll('.tchip').forEach(x => x.classList.remove('sel')); (e.currentTarget as HTMLElement).classList.add('sel'); } }, `${p.name} (${territoryOf(S, p.id).length} provinces)`)));
      body.append(h('p', { class: 'muted small' }, 'The person shapes the viceroyalty: a general (forts, manpower), an administrator (control, growth), a merchant (buildings, ducats), a diplomat (happiness), a researcher (research). A big, unhappy viceroyalty, or a very able viceroy under a weak crown, may break away.'));
      const pr = h('div', { class: 'cards-row wrap' }, free.map(c => charCard(c, S, { small: true, badge: viceroyFocus(c.role), onclick: () => seat && confirmBox(`Make ${c.name} viceroy?`, `${c.name} will govern ${territoryOf(S, seat).length} provinces from ${S.provinces[seat].name} for good. ${c.skill >= 5 ? 'Very able: watch their loyalty.' : ''}`, 'Appoint', () => act(() => appointViceroy(S, seat!, c.uid), 'Viceroy appointed')) })));
      body.append(sel, pr);
    }
  }
  // the people and civil wars
  body.append(peopleMood());
  const factions = Object.values(S.nations).filter(n => n.alive && S.flags['faction_' + n.id] === 1);
  body.append(h('h3', {}, 'Civil wars'));
  if (!factions.length) body.append(h('p', { class: 'muted' }, 'None. Provinces below 30% happiness may rise; if rebels beat your troops they take the province and start a civil war that spreads to unhappy provinces of the same faith or culture.'));
  for (const f of factions) body.append(h('button', { class: 'nrow war', onclick: () => { closeWin(); openSheet('nation', f.id); } }, h('span', { class: 'swatch', style: `background:${f.color}` }), h('span', { class: 'nr-name' }, f.name, h('small', {}, `${provsOf(S, f.id).length} provinces · ${f.army.length} companies`)), h('span', { class: 'a-go', html: icon('next', 14) })));
  const angry = provsOf(S, S.player).filter(p => happinessOf(S, p).value < 30);
  if (angry.length) body.append(h('p', { class: 'bad' }, `At risk of rising: ${angry.map(p => `${p.name} (${happinessOf(S, p).value}%)`).join(', ')}.`));
}

function recipeBook(knownOnly = false) {
  const d: HTMLElement = knownOnly ? h('div', { class: 'recipes' }) : h('details', { class: 'recipes' }, h('summary', {}, 'Recipe book'));
  const rows: [string, string, string, string?][] = [
    ['Levy Infantry', 'Long Pikes', 'Pikemen', 'pike_square'], ['Levy Infantry', 'Plate Armour', 'Men-at-Arms'], ['Levy or Crossbow', 'Arquebuses', 'Arquebusiers', 'firearms'],
    ['Jinetes', 'Plate Armour', 'Knights'], ['Men-at-Arms', 'Warhorses', 'Knights'], ['Pikemen', 'Arquebusiers', 'Tercio', 'tercio_doctrine'],
    ['Bombard', 'Bronze Casting', 'Field Cannon', 'bronze_cannon'], ['Jinetes', 'Pistols', 'Reiters', 'wheellock'], ['Knights', 'Pistols', 'Cuirassiers', 'wheellock'],
    ['Arquebusiers', 'Muskets', 'Musketeers', 'musket'], ['Tercio', 'Muskets', 'Tercio Viejo', 'musket'], ['Reiters', 'Muskets', 'Dragoons', 'military_drill'],
    ['Musketeers', 'Bayonets', 'Line Infantry', 'bayonet'], ['Two of the same troop', '', '×1.8 strength in one company'], ['Any troop', 'Regimental Colours', '+1 star'],
  ];
  const shown = knownOnly ? rows.filter(([, , , t]) => !t || S.techs.includes(t)) : rows;
  if (knownOnly && shown.length < rows.length) d.append(h('p', { class: 'muted' }, `${rows.length - shown.length} more recipes unlock with research.`));
  d.append(h('table', { class: 'rtable' }, h('tbody', {}, shown.map(([a, b, c, t]) => h('tr', { class: t && !S.techs.includes(t) ? 'locked' : '' },
    h('td', {}, a), h('td', {}, b ? '+ ' + b : ''), h('td', {}, '= ', h('b', {}, c)), h('td', { class: 'muted' }, t && !S.techs.includes(t) ? TECH[t].name : ''))))));
  return d;
}

function subjectsTab(body: HTMLElement) {
  const subs = subjectsOf(S);
  body.append(h('h3', {}, `Subjects (${subs.length})`));
  if (!subs.length) body.append(h('p', { class: 'muted' }, 'No vassals or unions yet. Demand fealty from a weak crown, win one in a peace, or inherit one through a royal marriage.'));
  for (const x of subs) {
    const yrs = S.year - (x.subjectSince ?? S.year);
    const trib = provsOf(S, x.id).reduce((a, p) => a + p.dev * 0.6, 0) * tributeShare(x);
    const why = integrateBlocked(S, x.id);
    body.append(h('button', { class: 'nrow', onclick: () => openSheet('nation', x.id) },
      h('span', { class: 'swatch', style: `background:${x.color}` }),
      h('span', { class: 'nr-name' }, x.name, h('small', {}, `${x.subject === 'union' ? 'Personal union' : 'Vassal'} · ${yrs} yrs · tribute ${trib.toFixed(1)}/yr`)),
      h('span', { class: 'nr-badges' }, h('span', { class: 'tag ' + (why ? '' : 'ally') }, why ? 'Loyal' : 'Ready to integrate')),
      h('span', { class: 'nr-rel ' + (getRel(S, S.player, x.id) < 0 ? 'bad' : 'good') }, signed(getRel(S, S.player, x.id)))));
  }
}

function realmsTab(body: HTMLElement) {
  body.append(h('p', { class: 'muted' }, 'Every realm you know of, friends first. Tap one for treaties, envoys and war.'));
  const list = Object.values(S.nations).filter(n => n.alive && n.id !== S.player && provsOf(S, n.id).some(p => provKnown(S, p.id))).sort((a, b) => getRel(S, S.player, b.id) - getRel(S, S.player, a.id));
  for (const n of list) {
    const rel = getRel(S, S.player, n.id);
    const war = atWar(S, S.player, n.id);
    const badges = [war ? 'War' : '', hasTreaty(S, S.player, n.id, 'alliance') ? 'Ally' : '', hasTreaty(S, S.player, n.id, 'trade') ? 'Trade' : '', hasTreaty(S, S.player, n.id, 'marriage') ? 'Wed' : ''].filter(Boolean);
    body.append(h('button', { class: 'nrow' + (war ? ' war' : ''), onclick: () => openSheet('nation', n.id) },
      h('span', { class: 'swatch', style: `background:${n.color}` }),
      h('span', { class: 'nr-name' }, n.name, h('small', {}, `${provsOf(S, n.id).length} provinces`)),
      h('span', { class: 'nr-badges' }, badges.map(b => h('span', { class: 'tag ' + b.toLowerCase() }, b))),
      h('span', { class: 'nr-rel ' + (rel >= 30 ? 'good' : rel <= -30 ? 'bad' : '') }, signed(rel))));
  }
}

function coreSection() {
  const slots = coreSlots(S);
  const wrap = h('div', { class: 'coresec' });
  wrap.append(h('div', { class: 'cs-head' }, h('b', {}, `Core cards (${S.core.length}/${slots} slots)`),
    h('small', {}, `Adopting costs ${coreCost(S)} nation points. Setting one aside costs 1 stability. One change every 5 years.`)));
  const row = h('div', { class: 'cards-row wrap' });
  for (let i = 0; i < 4; i++) {
    const id = S.core[i];
    if (id) row.append(coreCard(id, { slotted: true, onclick: () => confirmBox(`Set aside ${CORE[id].name}?`, 'Stability falls by 1, and the realm returns to the middle on this axis.', 'Set aside', () => act(() => dropCore(S, id))) }));
    else if (i < slots) row.append(h('div', { class: 'card slot-open' }, h('span', {}, 'Empty slot'), h('small', {}, 'Adopt a core card below')));
    else row.append(h('div', { class: 'card slot-locked' }, h('span', { html: icon('chain', 18) }), h('small', {}, ['', 'Bureaucracy or 40 development', 'Absolutism', 'Enlightened Government'][i])));
  }
  wrap.append(row);
  for (const ax of AXES) {
    const cur = S.core.find(c => CORE[c].axis === ax.id);
    const side = (id: string) => {
      const why = coreBlocked(S, id);
      return h('div', { class: 'ax-side' + (cur === id ? ' on' : '') }, coreCard(id, { small: true }),
        h('div', { class: 'ax-txt' }, h('b', {}, CORE[id].name), h('small', { class: 'good' }, CORE[id].pros.join(' · ')), h('small', { class: 'bad' }, CORE[id].cons.join(' · ')),
          cur === id ? h('span', { class: 'tag ally' }, 'Adopted') : h('button', { class: 'btn small' + (why ? ' blocked' : ''), onclick: () => (why ? toast(why, 'bad') : act(() => adoptCore(S, id), `${CORE[id].name} adopted`)) }, why ?? `Adopt · ${coreCost(S)} NP`)));
    };
    wrap.append(h('div', { class: 'axis' }, h('div', { class: 'ax-h' }, h('b', {}, ax.name), h('span', { class: 'ax-meter' }, h('i', { style: `left:${cur === ax.left ? 8 : cur === ax.right ? 92 : 50}%` }))), side(ax.left), side(ax.right)));
  }
  return wrap;
}

function peopleMood() {
  const ps = provsOf(S, S.player);
  const avg = S.happiness ?? 50;
  const cap = S.provinces[player(S).capital] ?? ps[0];
  const parts = cap ? happinessOf(S, cap).parts.filter(x => !['Base', 'Buildings', 'Recently conquered', 'Weak royal control'].includes(x.label) && !x.label.includes('faith') && !x.label.includes('culture') && !x.label.includes('minority')) : [];
  const minorities = ps.filter(p => p.religion !== S.stateReligion).length, foreign = ps.filter(p => !isAccepted(S, p.culture)).length;
  return h('div', { class: 'mood coresec' },
    h('div', { class: 'cs-head' }, h('b', {}, `The people: ${moodName(avg)} (${avg}%)`), h('small', {}, avg >= 65 ? 'Stability tends to rise' : avg < 40 ? 'Stability tends to fall; revolts may break out' : 'Stability holds')),
    h('div', { class: 'ctl-bar' }, h('i', { style: `width:${avg}%`, class: avg < 35 ? 'low' : '' })),
    h('div', { class: 'stats' }, stat('Faith', `${RELIGION_NAMES[S.stateReligion]} · ${minorities} other`), stat('Cultures', `${S.accepted.map(c => CULTURE_NAMES[c] ?? c).join(', ')} · ${foreign} foreign`), stat('Arts', `${Math.round(S.art)}/100`), stat('Tax burden', `${Math.round(S.taxBurden)}`)),
    parts.length ? h('div', { class: 'tags' }, parts.map(x => h('span', { class: 'tag ' + (x.v < 0 ? 'war' : 'ally') }, `${x.label} ${signed(x.v)}`))) : null,
    h('p', { class: 'muted' }, 'Raise it with Patronage of the Arts, Royal Festivals, Religious Missions, Cultural Integration, Charters and temples. Taxes and long wars lower it.'));
}

function provincesTab(body: HTMLElement) {
  const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, h('th', {}, 'Province'), h('th', {}, 'Settlement'), h('th', {}, 'People'), h('th', {}, 'Happy'), h('th', {}, 'Culture'), h('th', {}, 'Faith'), h('th', {}, 'Dev'), h('th', {}, 'Control'))));
  const tb = h('tbody');
  for (const p of provsOf(S, S.player).sort((a, b) => b.dev - a.dev)) {
    tb.append(h('tr', { onclick: () => { closeWin(); map.select(p.id); map.focus([p.id]); openSheet('province', p.id); } },
      h('td', {}, p.name), h('td', {}, TIERS[tierOf(p)].name), h('td', {}, `${Math.round(population(S, p) / 1000)}k`),
      h('td', { class: happinessOf(S, p).value < 35 ? 'bad' : '' }, `${happinessOf(S, p).value}%`), h('td', { class: isAccepted(S, p.culture) ? '' : 'bad' }, CULTURE_NAMES[p.culture] ?? p.culture),
      h('td', { class: p.religion === S.stateReligion ? '' : 'bad' }, RELIGION_NAMES[p.religion] ?? p.religion), h('td', {}, String(p.dev)),
      h('td', { class: p.control < 30 ? 'bad' : '' }, `${Math.round(p.control)}%`)));
  }
  t.append(tb);
  body.append(h('div', { class: 'tscroll' }, t));
  body.append(actionRow('anchor', 'Overseas lands', 'Discoveries and colonies', null, () => openSheet('overseas')));
}

function ledgerTab(body: HTMLElement) {
  const inc = incomeOf(S, S.player);
  body.append(h('h3', {}, 'Income and expenses'));
  body.append(h('table', { class: 'ledger' }, h('tbody', {},
    h('tr', {}, h('td', {}, 'Provinces (after control)'), h('td', {}, inc.provinces.toFixed(1))),
    h('tr', {}, h('td', {}, 'Trade treaties'), h('td', {}, inc.trade.toFixed(1))),
    h('tr', {}, h('td', {}, 'Goods sold (routes and local markets)'), h('td', {}, inc.goods.toFixed(1))),
    h('tr', {}, h('td', {}, 'Colonies and overseas'), h('td', {}, inc.other.toFixed(1))),
    h('tr', {}, h('td', {}, `Stability ×${inc.stabMult.toFixed(2)}`), h('td', {}, '')),
    h('tr', {}, h('td', {}, 'Troop upkeep'), h('td', { class: 'bad' }, '−' + inc.upkeep.toFixed(1))),
    h('tr', {}, h('td', {}, 'Building salaries'), h('td', { class: 'bad' }, '−' + inc.salaries.toFixed(1))),
    h('tr', {}, h('td', {}, 'Goods bought and trade posts'), h('td', { class: 'bad' }, '−' + inc.imports.toFixed(1))),
    h('tr', {}, h('td', {}, 'Administration (grows with the realm)'), h('td', { class: 'bad' }, '−' + inc.admin.toFixed(1))),
    h('tr', { class: 'total' }, h('td', {}, 'Each year'), h('td', {}, signed(inc.total))))));
  body.append(h('h3', {}, 'Control and unrest'));
  for (const p of provsOf(S, S.player).sort((a, b) => a.control - b.control)) {
    body.append(h('div', { class: 'ctl' }, h('span', {}, p.name), h('span', { class: 'ctl-bar' }, h('i', { style: `width:${p.control}%`, class: p.control < 30 ? 'low' : '' })), h('b', {}, `${Math.round(p.control)}%`)));
  }
  body.append(h('p', { class: 'muted' }, 'Low control cuts income and can spark revolts. Temples, courthouses, stability and Royal Progress raise it. Newly conquered lands start low.'));
  body.append(actionRow('scales', 'Sell offices', `${officeCost(S)} ducats for 2 nation points · the price doubles, triples… each time this year`, player(S).gold < officeCost(S) ? `Needs ${officeCost(S)} ducats` : null, () => act(() => sellOffices(S), '+2 nation points')));
}

const DIST_NAME = ['next door', 'near', 'far', 'overseas'];
/** The trade card for buying or selling, if you hold one. */
const tradeCard = (dir: 'buy' | 'sell') => S.hand.find(h => CARDS[h.card].missions?.includes('route') && (CARDS[h.card].trade ?? dir) === dir);
const TRADE_CARD_NAME = { buy: 'Import Contract', sell: 'Export Contract' };
const countCards = (id: string) => S.hand.filter(h => h.card === id).length;
/** "Uses 1 weapons (you have 0.4): the rest bought at double price." */
function goodsNote(need: Record<string, number>) {
  const lack = Object.entries(need).filter(([g, n]) => (S.stock[g] ?? 0) < n);
  return h('p', { class: lack.length ? 'bad small' : 'muted small' }, 'Uses ' + Object.entries(need).map(([g, n]) => `${n} ${GOODS[g].name.toLowerCase()} (you have ${(S.stock[g] ?? 0).toFixed(1)})`).join(', ') + (lack.length ? '. What is missing is bought at double price, included above.' : ' from your warehouses.'));
}
const f1 = (v: number) => (Math.abs(v) < 0.05 ? '0' : v.toFixed(1));

/** The goods ledger: what you make, use and have in store, good by good. */
function goodsTab(body: HTMLElement) {
  const f = quarterFlow(S);
  const need = needs(S);
  const yr = (r: Record<string, number>, g: string) => (r[g] ?? 0) * 4;
  const hunger = S.short.food ?? 0;
  const foodIn = FOOD.reduce((a, g) => a + yr(f.made, g) + yr(f.bought, g), 0);
  body.append(h('p', { class: hunger >= 0.05 ? 'bad small' : 'muted small' }, `Food: the people eat ${f1(need.food)} a year and your lands and routes bring ${f1(foodIn)}. ` + (hunger >= 0.05 ? `Hunger, ${Math.round(hunger * 100)}% short: unhappy people, fewer recruits.` : 'Three or more kinds of food in store make people happier.')));
  const canBuy = !!tradeCard('buy'), canSell = !!tradeCard('sell');
  body.append(h('p', { class: 'muted small' }, `Buying and selling abroad takes a card: Import Contracts ${countCards('import_contract')}, Export Contracts ${countCards('export_contract')}, Trade Post Charters ${countCards('trading_post')}. Draw them in the Economy deck or buy a pack.`));
  const row = (g: string) => {
    const d = GOODS[g];
    const inflow = yr(f.made, g) + yr(f.bought, g);
    const outflow = yr(f.used, g) + yr(f.input, g) + yr(f.sold, g);
    const net = inflow - outflow;
    const short = d.food ? 0 : S.short[g] ?? 0;
    const left = net < -0.05 ? Math.floor((S.stock[g] ?? 0) / (-net / 4)) : 99;
    const status = short >= 0.05 ? h('span', { class: 'gchip bad' }, `short ${Math.round(short * 100)}%`)
      : left < 8 ? h('span', { class: 'gchip warn' }, left <= 0 ? 'runs out' : `lasts ${left} qtr`)
      : (f.overflow[g] ?? 0) > 0 ? h('span', { class: 'gchip over' }, 'surplus')
      : need[g] ? h('span', { class: 'gchip ok' }, 'enough') : h('span', { class: 'gchip ok' }, net > 0.05 ? 'spare' : '—');
    const tip = `${d.name}: ${d.desc}${d.recipe ? ` Made from ${Object.entries(d.recipe).map(([i, a]) => `${a} ${GOODS[i].name.toLowerCase()}`).join(' + ')}.` : ''}${d.tech && !canMake(S, g) ? ` Needs ${TECH[d.tech].name}.` : ''} In ${f1(inflow)} a year, out ${f1(outflow)}.`;
    return h('tr', { class: short >= 0.05 ? 'short' : '' },
      h('td', { class: 'g-n', onclick: () => toast(tip) }, h('span', { class: 'gico', style: `color:${d.color}`, html: icon(d.icon, 18) }), h('span', {}, d.name, h('small', {}, ` ${price(S, g).toFixed(1)}`))),
      h('td', { class: 'num' }, f1(S.stock[g] ?? 0)),
      h('td', { class: 'num ' + (net < -0.05 ? 'dn' : net > 0.05 ? 'up' : 'muted') }, `${net > 0.05 ? '+' : ''}${f1(net)}`),
      h('td', {}, status),
      h('td', { class: 'g-acts' },
        h('button', { class: 'btn small ghost' + (canBuy ? '' : ' blocked'), title: canBuy ? '' : 'Needs an Import Contract card', onclick: () => openRouteDialog(g, 'buy') }, 'Buy'),
        h('button', { class: 'btn small ghost' + (canSell ? '' : ' blocked'), title: canSell ? '' : 'Needs an Export Contract card', onclick: () => openRouteDialog(g, 'sell') }, 'Sell')));
  };
  const table = (title: string, list: string[]) => {
    body.append(h('h3', {}, title));
    body.append(h('table', { class: 'gtable' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Good'), h('th', { class: 'num' }, 'Stock'), h('th', { class: 'num' }, '± a year'), h('th', {}, ''), h('th', {}, ''))),
      h('tbody', {}, list.map(row))));
  };
  table('Food', FOOD);
  table('Raw materials', RAW.filter(g => !GOODS[g].food));
  table('Made goods', MADE);
  body.append(h('p', { class: 'muted small' }, 'Tap a good for what it does and what it is made from. Price is per load. Full warehouses sell the rest at home for half the price.'));
  body.append(h('h3', {}, 'Workshops'));
  const shops = provsOf(S, S.player).filter(p => workshopCap(S, p) > 0);
  if (!shops.length) body.append(h('p', { class: 'muted' }, 'No workshops yet. Build one with a Guild Charter (Economy) in any town: it makes 2 loads a year of the good you choose.'));
  for (const p of shops) body.append(workshopRow(p, f));
}

/** Trade: routes, and posts with the routes that run through them. */
function tradeTab(body: HTMLElement) {
  const inc = incomeOf(S, S.player);
  body.append(h('div', { class: 'stats' },
    stat('Sold a year', '+' + inc.goods.toFixed(1)), stat('Bought a year', '−' + inc.imports.toFixed(1)),
    stat('Trade routes', `${S.routes.length}/${routeCap(S)}`), stat('Trade posts', `${S.posts.length}/${postCap(S)}`)));
  body.append(h('p', { class: 'muted small' }, 'Each route takes a card (Import or Export Contract) and a merchant for one quarter; it does not use up a mission. Buying directly is dear; found a Trade Post (Trade Post Charter card) and every route with that realm buys at 90% and sells at 120% of the price. Start a route from Buy or Sell in the Goods tab.'));
  const routeRow = (r: GameState['routes'][number]) => {
    const each = price(S, r.good) * dealFor(S, r.partner, r.dir, r.deal);
    return h('div', { class: 'grow-row' },
      h('span', { class: 'gico', style: `color:${GOODS[r.good].color}`, html: icon(GOODS[r.good].icon, 20) }),
      h('div', { class: 'g-t' }, h('b', {}, `${r.dir === 'buy' ? 'Buy' : 'Sell'} ${r.amount} ${GOODS[r.good].name.toLowerCase()} a year`), h('small', {}, `${r.dir === 'buy' ? 'from' : 'to'} ${nationName(S, r.partner)} · ${each.toFixed(1)} each · `, h('span', { class: r.dir === 'buy' ? 'bad' : 'good' }, `${r.dir === 'buy' ? '−' : '+'}${(each * r.amount).toFixed(1)}/yr`))),
      h('div', { class: 'g-acts' }, h('button', { class: 'btn small ghost', onclick: () => confirmBox('Close this route?', 'Opening it again takes a merchant another quarter.', 'Close route', () => act(() => { S.routes = S.routes.filter(x => x !== r); }, 'Route closed')) }, 'Close')));
  };
  const pending = S.missions.filter(m => m.kind === 'route' || m.kind === 'post');
  if (pending.length) { body.append(h('h3', {}, 'Being set up')); for (const m of pending) body.append(missionRow(m)); }
  body.append(h('h3', {}, `Trade posts (${S.posts.length}/${postCap(S)})`));
  if (!S.posts.length) body.append(h('p', { class: 'muted' }, 'None yet.'));
  for (const p of S.posts) {
    const rs = S.routes.filter(r => r.partner === p.nation);
    const n = S.nations[p.nation];
    body.append(h('div', { class: 'post' }, h('div', { class: 'post-h' }, h('span', { class: 'swatch', style: `background:${n?.color}` }), h('b', {}, nationName(S, p.nation)), h('small', {}, ` since ${p.since} · upkeep ${POST_UPKEEP}/yr · ${rs.length} route${rs.length === 1 ? '' : 's'}`)),
      rs.length ? h('div', { class: 'glist' }, rs.map(routeRow)) : h('p', { class: 'muted small' }, 'No routes through this post yet.')));
  }
  body.append(actionRow('anchor', 'Found a trade post', `Uses a Trade Post Charter (you hold ${countCards('trading_post')}) · 2 quarters next door, up to 6 overseas · every route with that realm cheaper, +1 route`, !cardFor(S, 'post') ? 'Needs a Trade Post Charter card (Economy deck)' : S.posts.length >= postCap(S) ? `You can keep ${postCap(S)} trade post${postCap(S) > 1 ? 's' : ''}` : null, openPostPicker));
  const direct = S.routes.filter(r => !S.posts.some(p => p.nation === r.partner));
  body.append(h('h3', {}, `Direct routes (${direct.length})`));
  if (!direct.length) body.append(h('p', { class: 'muted' }, 'None.'));
  body.append(h('div', { class: 'glist' }, direct.map(routeRow)));
}

function workshopRow(p: Province, f = quarterFlow(S)) {
  const cap = workshopCap(S, p);
  const made = f.factories.find(x => x.prov === p.id)?.made ?? 0;
  const chips = h('div', { class: 'tags' }, MADE.map(g => {
    const ok = canMake(S, g);
    return h('button', { class: 'tchip small' + (p.make === g ? ' sel' : '') + (ok ? '' : ' blocked'), title: GOODS[g].desc, onclick: () => { if (!ok) return toast(`Needs ${TECH[GOODS[g].tech!].name}`, 'bad'); p.make = g; refresh(); }, html: icon(GOODS[g].icon, 14) + ' ' + GOODS[g].name });
  }));
  const rec = p.make ? GOODS[p.make]?.recipe : null;
  const note = !p.make ? 'Choose what it makes.' : made + 0.05 < cap ? `Makes ${f1(made)} of ${f1(cap)} a year: short of ${Object.keys(rec!).map(i => GOODS[i].name.toLowerCase()).join(' or ')}.` : `Makes ${f1(cap)} ${GOODS[p.make].name.toLowerCase()} a year from ${Object.entries(rec!).map(([i, a]) => `${f1(a * cap)} ${GOODS[i].name.toLowerCase()}`).join(' + ')}.`;
  return h('div', { class: 'wshop' }, h('b', {}, `${p.name} · ${[p.buildings.includes('workshop') ? 'Workshop' : '', p.buildings.includes('manufactory') ? 'Manufactory' : ''].filter(Boolean).join(' + ')}`), h('small', { class: made + 0.05 < cap && p.make ? 'bad' : 'muted' }, note), chips);
}

/** Pick a realm to buy from or sell to. */
function openRouteDialog(g: string, dir: 'buy' | 'sell') {
  const card = tradeCard(dir);
  if (!card) return toast(`Needs an ${TRADE_CARD_NAME[dir]} card (Economy deck)`, 'bad');
  const d = GOODS[g];
  let amount = 2;
  const box = h('div', { class: 'mbox narrow' });
  const draw = () => {
    clear(box);
    box.append(h('h2', { html: icon(d.icon, 22) + ` ${dir === 'buy' ? 'Buy' : 'Sell'} ${d.name}` }),
      h('p', { class: 'muted' }, `Market price ${price(S, g).toFixed(1)} a load. ${dir === 'buy' ? 'Bought directly it costs 125–140% (more the farther it comes); through your trade post there, 90%.' : 'Sold directly it fetches 70–85%; through your trade post there, 120%.'} A trade treaty adds 10%; a skilled merchant a little more.`));
    box.append(h('div', { class: 'targets' }, h('span', { class: 'muted' }, 'Loads a year: '), ...[1, 2, 3, MAX_ROUTE].map(a => h('button', { class: 'tchip' + (a === amount ? ' sel' : ''), onclick: () => { amount = a; draw(); } }, String(a)))));
    const list = h('div', { class: 'tlist' });
    const ps = partners(S, g, dir).slice(0, 14);
    if (!ps.length) list.append(h('p', { class: 'muted' }, dir === 'buy' ? `Nobody you know has ${d.name.toLowerCase()} to sell.` : `Everyone you know makes their own ${d.name.toLowerCase()}.`));
    for (const pt of ps) {
      const n = S.nations[pt.nation];
      const each = price(S, g) * pt.deal;
      const why = pt.why ?? routeBlocked(S, g, dir, pt.nation, amount);
      list.append(h('div', { class: 'trow' }, h('span', { class: 'swatch', style: `background:${n.color}` }),
        h('div', { class: 'a-t' }, h('b', {}, n.name, pt.post ? h('small', {}, ' · trade post') : null), h('small', {}, `${DIST_NAME[pt.dist]} · ${each.toFixed(1)} each · ${dir === 'buy' ? '−' : '+'}${(each * amount).toFixed(1)} a year`)),
        h('div', { class: 'r-acts' }, h('button', { class: 'btn small' + (why ? ' blocked' : ''), title: why ?? '', onclick: () => { if (why) return toast(why, 'bad'); closeModal(); openPlanner('route', pt.nation, undefined, card.uid, { good: g, dir, amount }); } }, 'Choose'))));
    }
    box.append(list, h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Close')));
  };
  draw();
  openModal(box);
}

/** Pick where to found a trade post. */
function openPostPicker() {
  const card = cardFor(S, 'post');
  if (!card) return toast('Needs a Trade Post Charter card (Economy deck)', 'bad');
  const lacking = Object.keys(GOODS).filter(g => (S.short[g] ?? 0) >= 0.05 || S.routes.some(r => r.good === g && r.dir === 'buy'));
  const rows = Object.values(S.nations).filter(n => n.alive && n.id !== S.player && n.capital && provsOf(S, n.id).length && provKnown(S, n.capital))
    .map(n => ({ n, routes: S.routes.filter(r => r.partner === n.id).length, has: lacking.filter(g => partners(S, g, 'buy').some(p => p.nation === n.id)), dist: distanceTo(S, n.id) }))
    .sort((a, b) => b.routes - a.routes || b.has.length - a.has.length || a.dist - b.dist).slice(0, 30);
  const list = h('div', { class: 'tlist' });
  for (const r of rows) {
    const why = postBlocked(S, r.n.id);
    list.append(h('div', { class: 'trow' }, h('span', { class: 'swatch', style: `background:${r.n.color}` }),
      h('div', { class: 'a-t' }, h('b', {}, r.n.name), h('small', {}, `${DIST_NAME[r.dist]} · ${qText(postTurns(S, r.n.id))} · ${postCost(S, r.n.id)} ducats${r.routes ? ` · ${r.routes} route${r.routes > 1 ? 's' : ''} already` : ''}${r.has.length ? ` · sells you ${r.has.map(g => GOODS[g].name.toLowerCase()).join(', ')}` : ''}`)),
      h('div', { class: 'r-acts' }, h('button', { class: 'btn small' + (why ? ' blocked' : ''), title: why ?? '', onclick: () => { if (why) return toast(why, 'bad'); closeModal(); openPlanner('post', r.n.id, undefined, card.uid); } }, 'Found'))));
  }
  openModal(h('div', { class: 'mbox narrow' }, h('h2', { html: icon('anchor', 22) + ' Found a trade post' }),
    h('p', { class: 'muted' }, 'A merchant travels there and sets up: 2 quarters next door, 3 near, 4 far, 6 overseas. Then every route with that realm buys at 90% of the market price and sells 20% above it, and you can keep one more route.'),
    list, h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Close'))));
}

// ---------- People: cultures, religion, arts ----------
function culturesTab(body: HTMLElement) {
  const rows = cultureRows(S);
  body.append(h('p', { class: 'muted small' }, `Embraced cultures count as your own people; others are unhappy (−12) until a cultural leader embraces them (${S.accepted.length}/${acceptCap(S)} embraced) or integrates their provinces one by one.`));
  body.append(h('table', { class: 'gtable' },
    h('thead', {}, h('tr', {}, h('th', {}, 'People'), h('th', { class: 'num' }, 'Provinces'), h('th', { class: 'num' }, 'People'), h('th', { class: 'num' }, 'Happy'), h('th', {}, ''))),
    h('tbody', {}, rows.map(r => h('tr', {},
      h('td', {}, h('b', {}, cultureName(r.culture)), r.accepted ? h('small', { class: 'muted' }, ' · your own') : null),
      h('td', { class: 'num' }, String(r.provinces)), h('td', { class: 'num' }, `${(r.people / 1000).toFixed(0)}k`),
      h('td', { class: 'num ' + (r.happy < 35 ? 'dn' : r.happy >= 60 ? 'up' : '') }, `${r.happy}%`),
      h('td', { class: 'g-acts' }, r.accepted ? null : peopleAction('accept', r.culture, 'Embrace')))))));
  body.append(h('h3', {}, 'What makes them happy'));
  const hp = nationalHappiness(S);
  body.append(h('p', {}, `Across the realm ${hp}% (${moodName(hp)}). Works of art add ${artHappy(S).toFixed(1)} everywhere now; Royal Grace and Integration work province by province.`));
  const worst = [...provsOf(S, S.player)].map(p => ({ p, v: happinessOf(S, p).value })).sort((a, b) => a.v - b.v).slice(0, 5);
  for (const { p, v } of worst) body.append(h('div', { class: 'ctl' }, h('span', {}, `${p.name} (${cultureName(p.culture)})`), h('span', { class: 'ctl-bar' }, h('i', { style: `width:${v}%`, class: v < 35 ? 'low' : '' })), h('b', {}, `${v}%`)));
}

/** A shortcut from a People tab to the planner, if you hold the card. */
function peopleAction(kind: MissionKind, target: string, label: string) {
  const card = cardFor(S, kind);
  const why = !card ? `Needs a ${kind === 'accept' ? 'Embrace a Culture' : kind === 'pilgrimage' ? 'Mission to the Church' : kind === 'convert' ? 'Religious Mission' : 'Work of Art'} card` : missionBlocked(S, kind, target);
  return h('button', { class: 'btn small ghost' + (why ? ' blocked' : ''), title: why ?? '', onclick: () => (why ? toast(why, 'bad') : openPlanner(kind, target, undefined, card!.uid)) }, label);
}

function religionTab(body: HTMLElement) {
  const head = churchHead(S), rel = churchRel(S), mood = churchMood(S);
  body.append(h('div', { class: 'stats' }, stat('State faith', RELIGION_NAMES[S.stateReligion] ?? S.stateReligion), stat('Leaders', head.name), stat('Their favour', `${Math.round(rel)}`), stat('Standing', mood === 'blessed' ? 'Blessed' : mood === 'censured' ? 'Censured' : 'Tolerated')));
  body.append(h('div', { class: 'ctl' }, h('span', {}, 'Favour'), h('span', { class: 'ctl-bar' }, h('i', { style: `width:${(rel + 100) / 2}%`, class: rel <= -40 ? 'low' : '' })), h('b', {}, `${Math.round(rel)}`)));
  body.append(h('p', { class: 'muted small' }, `At 50 or more you are blessed: +3 happiness in provinces of your faith and +1 prestige a year, and at 80 they may send missionaries. At −40 or less you are censured: −5 happiness there and stability may fall. Favour drifts back towards 20${S.stateReligion === 'catholic' ? ' (your standing with the Papal States)' : ''}. Converting provinces and sacred art please them.`));
  const gift = S.hand.find(h => h.card === 'church_gift');
  body.append(actionRow('coin', 'Send a gift', `Uses a Gift to the Church card (you hold ${countCards('church_gift')}) · ${giftCost(S)} ducats · favour +10`, !gift ? 'Needs a Gift to the Church card (People deck)' : giftBlocked(S), () => act(() => { const r = playCard(S, gift!.uid, ''); if (r.startsWith('!')) toast(r.slice(1), 'bad'); }, 'Gift sent')));
  body.append(actionRow('church', 'Mission to the Church', `A churchman wins favour: +3 to +40 · ${pilgrimageCost(S)} ducats`, !cardFor(S, 'pilgrimage') ? 'Needs a Mission to the Church card' : missionBlocked(S, 'pilgrimage', ''), () => openPlanner('pilgrimage', '', undefined, cardFor(S, 'pilgrimage')!.uid)));
  body.append(h('h3', {}, 'Faiths of the realm'));
  body.append(h('table', { class: 'gtable' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Faith'), h('th', { class: 'num' }, 'Provinces'), h('th', { class: 'num' }, 'People'), h('th', { class: 'num' }, 'Happy'), h('th', {}, ''))),
    h('tbody', {}, religionRows(S).map(r => h('tr', {},
      h('td', {}, h('b', {}, RELIGION_NAMES[r.religion] ?? r.religion), r.religion === S.stateReligion ? h('small', { class: 'muted' }, ' · state faith') : null),
      h('td', { class: 'num' }, String(r.provinces)), h('td', { class: 'num' }, `${(r.people / 1000).toFixed(0)}k`),
      h('td', { class: 'num ' + (r.happy < 35 ? 'dn' : r.happy >= 60 ? 'up' : '') }, `${r.happy}%`),
      h('td', { class: 'g-acts' }, r.religion === S.stateReligion ? null : h('small', { class: 'muted' }, 'convert province by province')))))));
  const others = provsOf(S, S.player).filter(p => p.religion !== S.stateReligion).slice(0, 8);
  if (others.length) {
    body.append(h('h3', {}, 'Provinces of other faiths'));
    for (const p of others) body.append(h('div', { class: 'grow-row' }, h('span', { class: 'gico', html: icon('church', 18) }), h('div', { class: 'g-t' }, h('b', {}, p.name), h('small', {}, `${RELIGION_NAMES[p.religion] ?? p.religion} · happiness ${happinessOf(S, p).value}%`)), h('div', { class: 'g-acts' }, peopleAction('convert', p.id, 'Convert'))));
  }
}

function artsTab(body: HTMLElement) {
  const works = [...(S.works ?? [])].sort((a, b) => b.year - a.year);
  const g = artGold(S);
  body.append(h('div', { class: 'stats' }, stat('Works', String(works.length)), stat('Happiness now', '+' + artHappy(S).toFixed(1)), stat('Ducats a year', (g.fees + g.visitors).toFixed(1)), stat('On show', `${displayed(S).length}/${displaySlots(S)}`)));
  body.append(h('p', { class: 'muted small' }, `An artist makes one work per mission. Quality is the outcome: the better it is, the longer it cheers the people; admired works pay fees for a few years, celebrated ones bring a free card of their kind and masterpieces may carry a famous name. Libraries show 1 work, universities 2, museums 4; ${museumsOpen(S) ? 'in this Age of Enlightenment visitors pay for them.' : 'from the Age of Enlightenment visitors will pay to see them.'}`));
  body.append(h('h3', {}, 'Commission a work'), h('p', { class: countCards('patronage') ? 'muted small' : 'bad small' }, `Each work takes a Commission a Work of Art card (you hold ${countCards('patronage')}) and a free artist or courtier. Draw them in the People deck or buy a pack.`));
  const list = h('div', { class: 'tlist' });
  for (const gd of Object.values(GENRES)) list.append(h('div', { class: 'trow' }, h('span', { class: 'gico', html: icon(gd.icon, 20) }), h('div', { class: 'a-t' }, h('b', {}, gd.name), h('small', {}, `${artCost(S, gd.id)} ducats · ${gd.desc}`)), h('div', { class: 'r-acts' }, peopleAction('artwork', gd.id, 'Commission'))));
  body.append(list);
  body.append(h('h3', {}, `The crown's collection (${works.length})`));
  if (!works.length) body.append(h('p', { class: 'muted' }, 'Nothing yet. Invite an artist or send a courtier with a Commission card.'));
  const shown = new Set(displayed(S).map(w => w.id));
  const now = S.year + (S.quarter ?? 0) / 4;
  for (const w of works.slice(0, 40)) {
    const left = Math.max(0, w.until - now);
    const q = QUALITY[w.quality];
    body.append(h('div', { class: 'grow-row work q' + w.quality }, h('span', { class: 'gico', html: icon(GENRES[w.genre]?.icon ?? 'star', 20) }),
      h('div', { class: 'g-t' }, h('b', {}, w.name), h('small', {}, `${q.name} ${GENRES[w.genre]?.name.toLowerCase() ?? ''} · ${w.artist}, ${Math.floor(w.year)}${left > 0 ? ` · +${(w.happy * Math.min(1, left / Math.max(0.25, w.until - w.year))).toFixed(1)} happiness, ${left >= 1 ? Math.ceil(left) + ' yr' : 'fading'}` : ''}${w.goldUntil > S.year ? ` · ${w.gold} ducats/yr to ${w.goldUntil}` : ''}`)),
      shown.has(w.id) ? h('span', { class: 'gchip over' }, 'on show') : null));
  }
}

// Research tab filters: which age and which field are shown.
let techAge: number | 'all' | null = null;
let techTrack: TechTrack | 'all' = 'all';
const TRACK_NAME: Record<TechTrack, string> = { military: 'Military', economy: 'Economy', state: 'Statecraft' };
const TRACK_ICON: Record<TechTrack, string> = { military: 'sword', economy: 'coin', state: 'crown' };

/** What a technology lets you build, draft or make. */
function techUnlocks(id: string): string[] {
  const out: string[] = [];
  for (const b of Object.values(BUILDINGS)) if (b.tech === id) out.push(b.name);
  for (const t of Object.values(TROOPS)) if (t.tech === id) out.push(t.name);
  for (const e of Object.values(EQUIPMENT)) if (e.tech === id) out.push(e.name);
  for (const g of Object.values(GOODS)) if (g.tech === id) out.push(g.name);
  return [...new Set(out)];
}

/** About how many years a study takes: with your best free scholar, or the range for a new one. */
function techYears(id: string): string {
  const cost = techCost(S, id);
  const free = S.characters.filter(c => c.role === 'researcher' && c.mission == null);
  if (free.length) {
    const best = free.reduce((a, c) => (researchRate(S, c, TECH[id].track) > researchRate(S, a, TECH[id].track) ? c : a));
    const y = cost / researchRate(S, best, TECH[id].track);
    return `about ${y < 1.5 ? Math.max(1, Math.round(y * 4)) + ' quarters' : Math.round(y) + ' years'} with ${best.name}`;
  }
  const lo = cost / (8 + techFx(S, 'research')), hi = cost / (4 + techFx(S, 'research'));
  return `about ${Math.max(1, Math.round(lo))}–${Math.max(1, Math.round(hi))} years`;
}

function techCard(t: (typeof TECHS)[number]): HTMLElement {
  const known = S.techs.includes(t.id);
  const m = S.missions.find(x => x.kind === 'research' && x.target === t.id);
  const why = known ? null : missionBlocked(S, 'research', t.id);
  const card = cardFor(S, 'research', { track: t.track });
  const cost = techCost(S, t.id);
  const status = known ? 'Known' : m ? `Studying · ${Math.floor(m.progress)}/${cost} points · ${qLabel(m.turnsLeft)} left` : `${cost} research points · ${techYears(t.id)}`;
  const unlocks = techUnlocks(t.id);
  const tap = () => known ? toast(t.desc) : m ? toast(`Being studied: ${qText(m.turnsLeft)} left`) : why ? toast(why, 'bad') : !card ? toast(`Needs a ${TRACK_NAME[t.track]} study card (buy one in the Cards tab)`, 'bad') : openPlanner('research', t.id, undefined, card.uid);
  return h('button', { class: `tcard tr-${t.track}${known ? ' known' : m ? ' active' : why ? ' locked' : ''}`, onclick: tap },
    h('span', { class: 'tc-side' }, h('span', { class: 'tc-ico', html: icon(TRACK_ICON[t.track], 26) }), h('b', { class: 'tc-pts' }, known ? '✓' : String(cost)), h('small', {}, known ? 'known' : 'points')),
    h('span', { class: 'tc-body' },
      h('b', { class: 'tc-name' }, t.name),
      h('small', { class: 'tc-status' }, status),
      h('span', { class: 'tc-desc' }, t.desc),
      unlocks.length ? h('span', { class: 'tc-unl' }, h('small', {}, 'Unlocks'), unlocks.map(u => h('i', {}, u))) : null,
      !known && t.req?.length ? h('small', { class: 'tc-req' + (t.req.every(r => S.techs.includes(r)) ? '' : ' bad') }, 'Needs ' + t.req.map(r => TECH[r].name + (S.techs.includes(r) ? ' ✓' : '')).join(', ')) : null,
      AGE_TECH[t.id] ? h('span', { class: 'tech-age' }, `Opens the ${ERA[AGE_TECH[t.id]].name} for the whole world`) : null,
      !known && !m && why && !why.startsWith('Needs ') ? h('small', { class: 'bad' }, why) : null));
}

function techTab(body: HTMLElement) {
  const now = ageIndex(S);
  if (techAge == null || (techAge !== 'all' && techAge > now)) techAge = now;
  const inAge = (a: number) => TECHS.filter(t => t.age === a);
  const ages = h('div', { class: 'seg tfilter' },
    AGE_NAMES.map((name, i) => i > now
      ? h('button', { class: 'seg-b locked', onclick: () => toast(`The Age of ${name} has not begun. Its research stays hidden until then.`) }, name)
      : h('button', { class: 'seg-b' + (techAge === i ? ' on' : ''), onclick: () => { techAge = i; renderWin(); } }, name, h('small', {}, ` ${inAge(i).filter(t => S.techs.includes(t.id)).length}/${inAge(i).length}`))),
    h('button', { class: 'seg-b' + (techAge === 'all' ? ' on' : ''), onclick: () => { techAge = 'all'; renderWin(); } }, 'All'));
  const tracks = h('div', { class: 'seg tfilter' }, (['all', 'military', 'economy', 'state'] as const).map(tr =>
    h('button', { class: 'seg-b' + (techTrack === tr ? ' on' : ''), onclick: () => { techTrack = tr; renderWin(); } }, tr === 'all' ? 'All fields' : TRACK_NAME[tr])));
  body.append(ages, tracks);
  const list = TECHS.filter(t => t.age <= now && (techAge === 'all' || t.age === techAge) && (techTrack === 'all' || t.track === techTrack));
  // studies under way first, then what you can start, then the rest, then what you know
  const rank = (t: (typeof TECHS)[number]) => S.techs.includes(t.id) ? 3 : S.missions.some(x => x.kind === 'research' && x.target === t.id) ? 0 : missionBlocked(S, 'research', t.id) ? 2 : 1;
  list.sort((a, b) => rank(a) - rank(b) || a.age - b.age || a.cost - b.cost);
  const grid = h('div', { class: 'tgrid' });
  for (const t of list) grid.append(techCard(t));
  body.append(grid);
  if (now < AGE_NAMES.length - 1) body.append(h('p', { class: 'muted' }, `The research of the Age of ${AGE_NAMES[now + 1]} opens with that age.`));
}

function goalRow(v: GoalView): HTMLElement {
  const pct = v.met ? 100 : v.invert ? (v.need === 0 ? Math.max(5, 100 - v.have * 20) : Math.min(95, (v.need / Math.max(1, v.have)) * 100)) : Math.min(100, (v.have / Math.max(1, v.need)) * 100);
  return h('div', { class: 'goal' + (v.met ? ' met' : '') },
    h('span', { class: 'goal-c' }, v.met ? '✓' : ''),
    h('div', { class: 'goal-t' }, h('b', {}, v.title), h('small', {}, v.status), h('i', { class: 'goal-bar' }, h('i', { style: `width:${Math.round(pct)}%` }))));
}

function goalsSheet(body: HTMLElement) {
  const sc = S.scenario!;
  const left = sc.deadline - S.year;
  const views = sc.goals.map(g => goalView(S, g, sc.deadline));
  body.append(h('p', { class: 'goal-intro' }, sc.text));
  body.append(h('div', { class: 'goal-dl ' + sc.status }, sc.status === 'won' ? `Accomplished in ${sc.done}` : sc.status === 'lost' ? `Failed: the deadline of ${sc.deadline} passed` : `Deadline ${sc.deadline} · ${left > 0 ? `${left} year${left > 1 ? 's' : ''} left` : 'this is the last year'} · ${sc.steps?.length ? `step ${Math.min((sc.step ?? 0) + 1, sc.steps.length)} of ${sc.steps.length}` : `${views.filter(v => v.met).length} of ${views.length} goals met`}`));
  if (sc.steps?.length) {
    const at = sc.step ?? 0;
    sc.steps.forEach((st, i) => {
      const v = goalView(S, st.g, sc.deadline);
      const state = i < at ? 'done' : i === at && sc.status === 'active' ? 'now' : 'later';
      body.append(h('div', { class: `step ${state}` },
        h('span', { class: 'step-n' }, i < at ? '✓' : String(i + 1)),
        h('div', { class: 'goal-t' }, h('b', {}, v.title), state === 'now' ? h('small', { class: 'step-hint' }, st.hint) : null, state === 'now' ? h('small', {}, v.status) : null)));
    });
  } else for (const v of views) body.append(goalRow(v));
  body.append(h('p', { class: 'muted' }, sc.steps?.length ? 'Steps are done in order and checked every season. Finish them all before the deadline; either way the game goes on.' : 'Goals are checked every season. Meet them all before the deadline to win; either way the game goes on.'));
  return [sheetHead(sc.name, 'Mission goals', player(S).color), body];
}

function missionsSheet(body: HTMLElement) {
  if (!S.missions.length) body.append(h('p', { class: 'muted' }, 'No missions under way. Play a mission card from any panel, or tap a province or nation.'));
  for (const m of S.missions) {
    const c = S.characters.find(x => x.uid === m.char);
    const info = MISSION_INFO[m.kind];
    const pct = m.kind === 'research' ? Math.min(100, (m.progress / techCost(S, m.target)) * 100) : ((m.total - m.turnsLeft) / Math.max(1, m.total)) * 100;
    body.append(h('div', { class: 'mission k-' + info.role },
      h('span', { class: 'a-ico', html: icon(info.icon, 20) }),
      h('div', { class: 'a-t' }, h('b', {}, missionTitle(m)),
        h('small', {}, `${c?.name ?? '?'}${m.troops.length ? ` with ${m.troops.length} troops` : ''} · ${qText(m.turnsLeft)} left`),
        h('div', { class: 'pbar' }, h('i', { style: `width:${pct}%` }))),
      h('button', { class: 'iconbtn', 'aria-label': 'Recall', title: 'Recall', onclick: () => confirmBox('Recall this mission?', 'The card is lost. Construction refunds half its cost.', 'Recall', () => act(() => cancelMission(S, m.id))), html: icon('close', 16) })));
  }
  return [sheetHead('Missions', `${S.missions.length} under way`), body];
}

function overseasSheet(body: HTMLElement) {
  const exp = cardFor(S, 'explore');
  body.append(actionRow('anchor', 'Voyage of discovery', `An explorer sails out · ${voyageCost(S)} ducats · ${discoverable(S).length} lands within reach`, !exp ? 'Needs a Voyage of Discovery card (Diplomacy)' : missionBlocked(S, 'explore', ''), () => openPlanner('explore', '', undefined, exp!.uid)));
  body.append(h('p', { class: 'muted' }, 'Explorers reveal a region on the map. Then tap an empty native land to settle it with a colonist, or a native empire to take it with a conquistador. A diplomat sent to explore becomes an explorer, an administrator who founds a colony a colonist, a general on a conquista a conqueror. For good.'));
  const groups: Record<string, string[]> = {};
  for (const r of [...Object.values(HOME_REGIONS), ...Object.values(REGIONS)]) (groups[r.where] ??= []).push(r.id);
  for (const [where, ids] of Object.entries(groups)) {
    body.append(h('h3', {}, where));
    for (const id of ids) {
      const r = regionDef(id);
      if (!regionKnown(S, id)) {
        const can = discoverable(S).some(x => x.id === id);
        body.append(h('div', { class: 'region unknown' }, h('span', { class: 'a-ico', html: icon('star', 18) }), h('div', { class: 'a-t' }, h('b', {}, 'Uncharted'), h('small', {}, can ? 'An explorer could reach it' : 'Too far for now'))));
        continue;
      }
      const ps = Object.values(S.provinces).filter(p => provRegion(p.id) === id);
      const mine = ps.filter(p => p.owner === S.player).length, free = ps.filter(p => p.owner === NO_STATE);
      const others = [...new Set(ps.map(p => p.owner).filter(o => o !== S.player && o !== NO_STATE))];
      const status = `${mine ? `${mine} yours · ` : ''}${free.length} unclaimed${others.length ? ' · ' + others.slice(0, 3).map(o => nationName(S, o)).join(', ') : ''}`;
      const row = h('div', { class: 'region' + (mine ? ' mine' : '') }, h('span', { class: 'a-ico', html: icon('anchor', 18) }),
        h('div', { class: 'a-t' }, h('b', {}, r.name), h('small', {}, status), h('small', { class: 'muted' }, r.text)));
      const acts = h('div', { class: 'r-acts' });
      acts.append(h('button', { class: 'btn small', onclick: () => { closeSheet(); map.focus(ps.map(p => p.id)); } }, 'Show'));
      row.append(acts);
      body.append(row);
    }
  }
  return [sheetHead('Overseas', 'The wider world'), body];
}

function chronicleSheet(body: HTMLElement) {
  const tabs = h('div', { class: 'seg' }, ...[['powers', 'Powers'], ['generals', 'Generals'], ['kings', 'Monarchs'], ['log', 'Chronicle']].map(([k, l]) =>
    h('button', { class: 'seg-b' + (chronTab === k ? ' on' : ''), onclick: () => { chronTab = k; renderSheet(); } }, l)));
  body.append(tabs);
  if (chronTab === 'powers') {
    const a = AMBITIONS.find(x => x.id === S.ambition);
    if (a) body.append(h('div', { class: 'ambition' + (S.ambitionDone ? ' done' : '') }, h('span', { html: icon('crown', 20) }), h('div', {}, h('b', {}, `Ambition: ${a.name}`), h('small', {}, `${a.text} Reward: ${a.reward} prestige.${S.ambitionDone ? ' Resolved.' : ''}`))));
    const score = Object.fromEntries(ranking(S).map(r => [r.id, r.score]));
    const rows = powerTable(S).sort((x, y) => (score[y.id] ?? 0) - (score[x.id] ?? 0));
    const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, ...['Nation', 'Score', 'Army', 'Income', 'Dev', 'Battles'].map(x => h('th', {}, x)))));
    const tb = h('tbody');
    for (const r of rows) {
      const tot = r.won + r.lost;
      tb.append(h('tr', { class: r.id === S.player ? 'me' : '' }, h('td', {}, h('span', { class: 'swatch', style: `background:${r.color}` }), ' ', r.name),
        h('td', {}, String(score[r.id] ?? 0)), h('td', {}, String(r.military)), h('td', {}, String(r.economy)), h('td', {}, String(r.dev)),
        h('td', {}, tot ? `${r.won}–${r.lost} (${Math.round((r.won / tot) * 100)}%)` : '—')));
    }
    t.append(tb);
    body.append(h('div', { class: 'tscroll' }, t));
    body.append(h('p', { class: 'muted' }, `Score = half your prestige + ${STARTS[S.startYear]?.devWeight ?? 1} per development point you own + 5 per point gained since ${S.startYear} + 2 per point in your subjects. Wars you won: ${S.stats.wars.won}, lost: ${S.stats.wars.lost}. The game ends in ${S.endYear}.`));
  } else if (chronTab === 'generals') {
    const gens = [
      ...S.characters.filter(c => c.role === 'general' || c.role === 'conqueror' || (c.wins ?? 0) + (c.losses ?? 0) > 0).map(c => ({ name: c.name, rarity: c.rarity as string, wins: c.wins ?? 0, losses: c.losses ?? 0, note: 'Serving' })),
      ...S.stats.fallen.map(f => ({ name: f.name, rarity: '', wins: f.wins, losses: f.losses, note: `Until ${f.until}` })),
    ].sort((a, b) => b.wins - a.wins);
    const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, ...['General', 'Won', 'Lost', '%', ''].map(x => h('th', {}, x)))));
    t.append(h('tbody', {}, gens.map(g => h('tr', {}, h('td', {}, g.name, g.rarity ? h('small', { class: 'muted' }, ' ' + RARITY[g.rarity as Character['rarity']].name) : null), h('td', {}, String(g.wins)), h('td', {}, String(g.losses)),
      h('td', {}, g.wins + g.losses ? `${Math.round((g.wins / (g.wins + g.losses)) * 100)}%` : '—'), h('td', { class: 'muted' }, g.note)))));
    body.append(h('div', { class: 'tscroll' }, t));
  } else if (chronTab === 'kings') {
    const me = player(S);
    const kings = [...S.stats.kings, { name: me.ruler.name, arch: me.ruler.arch, from: me.ruler.from, to: S.year, prestige: Math.round(me.prestige - (me.ruler.prestigeAtStart ?? 0)) }];
    const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, ...['Monarch', 'Kind', 'Reign', 'Prestige won'].map(x => h('th', {}, x)))));
    t.append(h('tbody', {}, [...kings].sort((a, b) => b.prestige - a.prestige).map(k => h('tr', { class: k.name === me.ruler.name ? 'me' : '' },
      h('td', {}, k.name), h('td', {}, RULER_ARCHS[k.arch]?.name ?? k.arch), h('td', {}, `${k.from}–${k.to}`), h('td', {}, String(k.prestige))))));
    body.append(h('div', { class: 'tscroll' }, t));
  } else {
    body.append(h('ul', { class: 'log' }, S.log.slice(0, 80).map(l => h('li', { class: 't-' + l.tone }, h('span', { class: 'ly' }, String(l.year)), l.text))));
  }
  return [sheetHead('Chronicle', 'Rankings, records and history'), body];
}

function realmSheet(body: HTMLElement) {
  const me = player(S);
  const arch = RULER_ARCHS[me.ruler.arch];
  body.append(h('div', { class: 'ruler' },
    h('span', { class: 'np-shield', style: `--nc:${me.color}` }, me.name[0]),
    h('div', {}, h('b', {}, me.ruler.name), h('p', { class: 'muted' }, `${arch?.name ?? ''} monarch · reigns since ${me.ruler.from}`), h('p', {}, arch?.desc ?? ''))));
  const rates = cardRates(S);
  body.append(h('h3', {}, 'Cards each year'));
  body.append(h('table', { class: 'ledger' }, h('tbody', {}, CATS.map(c => h('tr', {}, h('td', {}, CAT_INFO[c].name, h('small', { class: 'muted' }, ' ' + rates[c].parts.map(p => `${p.label} ${signed(p.v)}`).join(' · '))), h('td', {}, rates[c].rate.toFixed(2)))))));
  const np = npRate(S);
  body.append(h('h3', {}, 'Nation points each year'));
  body.append(h('p', {}, `${np.rate.toFixed(1)} · ${np.parts.map(p => `${p.label} ${signed(p.v)}`).join(' · ')}`));
  const mp = playerManpower(S);
  body.append(h('div', { class: 'stats' },
    stat('Manpower', `${Math.floor(me.manpower)}/${mp.max} (+${mp.gain.toFixed(1)})`), stat('Stability', me.stability),
    stat('Court', `${courtCount(S)}/${courtCap(S)}`), stat('Provinces', provsOf(S, S.player).length)));
  body.append(h('p', { class: 'muted' }, 'Stability from −3 to +3 changes income by 6% a step and nation points by 0.5. At −2 or lower, revolts break out and you draw fewer cards.'));
  body.append(h('button', { class: 'btn ghost', onclick: () => confirmBox('Leave this campaign?', `It stays saved in slot ${slot}. You can continue it from the title screen.`, 'Back to title', () => { closeModal(); showTitle(); }) }, 'Back to title screen'));
  return [sheetHead(me.name, `${me.ruler.name} · ${S.year}`, me.color), body];
}

// ---------- modals ----------
function openModal(content: HTMLElement) {
  const m = clear($('#modal'));
  content.prepend(h('div', { class: 'seal', 'aria-hidden': 'true' }, h('i'), h('i'), h('b')));
  m.append(h('div', { class: 'scrim' }), content);
  m.hidden = false;
  modalOpen = true;
}
function closeModal() {
  const m = $('#modal');
  m.hidden = true; clear(m);
  modalOpen = false;
}
function confirmBox(title: string, text: string, okLabel: string, ok: () => void) {
  if (modalOpen) return ok();
  openModal(h('div', { class: 'mbox narrow' }, h('h2', {}, title), h('p', {}, text),
    h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Cancel'), h('button', { class: 'btn primary', onclick: () => { closeModal(); ok(); } }, okLabel))));
}

function charDetail(c: Character) {
  const m = c.mission != null ? S.missions.find(x => x.id === c.mission) : null;
  const to = PROMOTION[c.role];
  openModal(h('div', { class: 'mbox narrow' },
    h('div', { class: 'center' }, charCard(c, S)),
    h('h2', {}, c.name),
    h('p', { class: 'muted' }, `${c.ruler ? 'Monarch acting as ' : ''}${roleName[c.role]} · ${RARITY[c.rarity].name} (traits ×${RARITY[c.rarity].mult}) · experience ${c.xp}/3 · age ${S.year - c.born}`),
    h('ul', { class: 'traits' }, c.traits.map(t => h('li', {}, h('b', {}, TRAITS[t]?.name ?? t), ' ', TRAITS[t]?.desc ?? ''))),
    (c.wins ?? 0) + (c.losses ?? 0) ? h('p', {}, `Battles: ${c.wins ?? 0} won, ${c.losses ?? 0} lost.`) : null,
    m ? h('p', {}, `On a mission: ${missionTitle(m)}, ${m.turnsLeft} year(s) left.`) : null,
    to ? h('p', { class: 'muted promo' }, ({ diplomat: `Send ${c.name.split(' ')[0]} on a Voyage of Discovery and they become an explorer for good.`, general: `Lead an attack with ships to become an admiral, or a conquista to become a conqueror. Both are for good.`, admin: `Send ${c.name.split(' ')[0]} to found a colony and they become a colonist for good.`, courtier: `The first mission decides: a Religious Mission or Mission to the Church makes a churchman, a Work of Art an artist, Royal Grace, Integration or Embrace a Culture a cultural leader. For good.` } as Record<string, string>)[c.role]) : null,
    h('div', { class: 'mrow' },
      h('button', { class: 'btn ghost', onclick: closeModal }, 'Close'),
      !m && !c.ruler ? h('button', { class: 'btn ghost danger', onclick: () => { closeModal(); confirmBox(`Dismiss ${c.name}?`, 'This frees a seat at court.', 'Dismiss', () => act(() => dismissCharacter(S, c.uid))); } }, 'Dismiss') : null)));
}

interface TargetRow { label: string; sub: string; color?: string; acts: { label: string; kind: MissionKind; target: string; building?: string; why: string | null }[]; }

/** Targets a mission card can be used on. */
/** Why March Orders finds nothing to strike, in plain words. */
function noTargetReason(): string {
  const foes = enemiesOf(S, S.player);
  if (!foes.length) return 'You are not at war. Declare war from a province or the Diplomacy panel.';
  const names = foes.map(f => nationName(S, f)).join(', ');
  const free = S.troops.filter(t => t.mission == null);
  if (!free.length) return `You are at war with ${names}, but all your troops are away on missions.`;
  const hurt = free.filter(t => t.str < READY_STR);
  const moving = free.filter(t => t.moving);
  if (hurt.length === free.length - moving.length) return `You are at war with ${names}, but your troops are still recovering from battle (below ${READY_STR}% strength). They heal about ${HEAL}% a quarter in garrison.`;
  if (moving.length) return `You are at war with ${names}, but your free troops are still marching. Try again next quarter.`;
  return `You are at war with ${names}, but none of their land is within reach of your troops. Move troops to a garrison near the front.`;
}

function missionTargets(handUid: number, all = false): TargetRow[] {
  const hc = S.hand.find(x => x.uid === handUid)!;
  const d = CARDS[hc.card];
  const kind = d.missions![0];
  const rows: TargetRow[] = [];
  if (kind === 'conquer') {
    const far: TargetRow[] = [];
    for (const p of Object.values(S.provinces)) {
      if (p.owner === S.player || !atWar(S, S.player, p.owner) || !provKnown(S, p.id)) continue;
      const route = attackRoute(S, p.id);
      const foes = troopsNear(S, p.owner, p.id).length;
      const intel = (S.nations[p.owner].spiedUntil ?? 0) > S.year ? ` · ${foes} enemy companies nearby` : '';
      if (route) rows.push({ label: p.name, sub: `${nationName(S, p.owner)} · fort ${p.fort} · dev ${p.dev} · ${route.naval ? 'by sea' : 'by land'}, ${qText(route.turns)}${intel}`, color: S.nations[p.owner].color,
        acts: [{ label: 'Conquer', kind: 'conquer', target: p.id, why: missionBlocked(S, 'conquer', p.id) }, { label: 'Raid', kind: 'raid', target: p.id, why: missionBlocked(S, 'raid', p.id) }] });
      else {
        const ng = nearestGarrison(S, p.id);
        if (ng && ng.t >= 2 && !baseFor(S, p.id)) far.push({ label: p.name, sub: `${nationName(S, p.owner)} · ${ng.t} quarters from ${placeName(ng.at)} · needs a base first${intel}`, color: S.nations[p.owner].color,
          acts: [{ label: 'Invasion base', kind: 'base', target: p.id, why: missionBlocked(S, 'base', p.id) }] });
      }
    }
    rows.push(...(all ? far : far.slice(0, 12)));
  } else if (DIPLO.includes(kind)) {
    for (const n of Object.values(S.nations).filter(n => n.alive && n.id !== S.player)) {
      const why = missionBlocked(S, kind, n.id);
      if (why && (why.startsWith('You are') || why.includes('already') || why === 'Not your subject' || why.startsWith('Already a subject') || why.startsWith('Too large'))) continue;
      rows.push({ label: n.name, sub: `Relations ${getRel(S, S.player, n.id)}`, color: n.color, acts: [{ label: MISSION_INFO[kind].name, kind, target: n.id, why }] });
    }
  } else if (kind === 'research') {
    for (const t of TECHS.filter(t => t.track === d.track && !S.techs.includes(t.id) && t.age <= ageIndex(S))) rows.push({ label: t.name, sub: `${techCost(S, t.id)} points · ${techYears(t.id)} · ${t.desc}`, acts: [{ label: 'Study', kind, target: t.id, why: missionBlocked(S, 'research', t.id) }] });
  } else if (kind === 'build') {
    for (const p of provsOf(S, S.player)) {
      const acts = Object.values(BUILDINGS).filter(b => b.group === d.group && (!b.tech || S.techs.includes(b.tech))).map(b => ({ label: b.name, kind, target: p.id, building: b.id, why: missionBlocked(S, 'build', p.id, b.id) })).filter(a => !a.why || a.why.startsWith('Needs') && !a.why.startsWith('Needs Ocean') || a.why.startsWith('No free'));
      if (acts.length) rows.push({ label: p.name, sub: `${TIERS[tierOf(p)].name} · town ${builtAt(p, 'town')}/${townSlots(p)} · countryside ${builtAt(p, 'rural')}/${ruralSlots(p)}`, acts });
    }
  } else if (kind === 'grace') {
    for (const p of provsOf(S, S.player).sort((a, b) => happinessOf(S, a).value - happinessOf(S, b).value)) {
      rows.push({ label: p.name, sub: `happiness ${happinessOf(S, p).value}%${p.favor ? ` · favour ${Math.round(p.favor)}` : ''}`, acts: [{ label: 'Grace', kind, target: p.id, why: missionBlocked(S, kind, p.id) }] });
    }
  } else if (kind === 'assist') {
    for (const m of S.missions.filter(m => m.kind === 'research')) {
      const lead = S.characters.find(c => c.uid === m.char);
      rows.push({ label: TECH[m.target].name, sub: `${lead?.name ?? '?'} · ${qText(m.turnsLeft)} left · ${helpersOf(S, m.id).length} helping`, acts: [{ label: 'Join', kind, target: String(m.id), why: missionBlocked(S, 'assist', String(m.id)) }] });
    }
  } else if (kind === 'artwork') {
    for (const g of Object.values(GENRES)) rows.push({ label: g.name, sub: `${artCost(S, g.id)} ducats · ${g.desc}`, acts: [{ label: 'Commission', kind, target: g.id, why: missionBlocked(S, 'artwork', g.id) }] });
  } else if (kind === 'pilgrimage') {
    rows.push({ label: churchHead(S).name, sub: `in ${churchHead(S).seat} · favour now ${Math.round(churchRel(S))} · ${pilgrimageCost(S)} ducats`, acts: [{ label: 'Send', kind, target: '', why: missionBlocked(S, 'pilgrimage', '') }] });
  } else if (kind === 'accept') {
    for (const r of cultureRows(S).filter(r => !r.accepted)) rows.push({ label: cultureName(r.culture), sub: `${r.provinces} province${r.provinces > 1 ? 's' : ''} · ${(r.people / 1000).toFixed(0)}k people · happiness ${r.happy}%`, acts: [{ label: 'Embrace', kind, target: r.culture, why: acceptBlocked(S, r.culture) }] });
  } else if (kind === 'convert' || kind === 'assimilate') {
    for (const p of provsOf(S, S.player)) {
      const why = missionBlocked(S, kind, p.id);
      if (why && (why.startsWith('Already') || why.includes('already accepted'))) continue;
      rows.push({ label: p.name, sub: `${CULTURE_NAMES[p.culture] ?? p.culture} · ${RELIGION_NAMES[p.religion] ?? p.religion} · happiness ${happinessOf(S, p).value}%`, acts: [{ label: kind === 'convert' ? 'Convert' : 'Integrate', kind, target: p.id, why }] });
    }
  } else if (kind === 'develop' || kind === 'found' || kind === 'grow') {
    for (const p of provsOf(S, S.player)) {
      const why = missionBlocked(S, kind, p.id);
      if (kind !== 'develop' && why && (why.startsWith('There is already') || why.startsWith('No settlement') || why.startsWith('Already a'))) continue;
      rows.push({ label: p.name, sub: `dev ${p.dev} · ${TIERS[tierOf(p)].name}`, acts: [{ label: kind === 'develop' ? `Develop (${developCost(S, p.id)})` : kind === 'found' ? `Found (${foundCost(S)})` : `Grow (${growCost(S, p.id)})`, kind, target: p.id, why }] });
    }
  } else if (kind === 'colonize' || kind === 'conquista') {
    const list = Object.values(S.provinces).filter(p => provKnown(S, p.id) && (kind === 'colonize' ? p.owner === NO_STATE : NATIVE_EMPIRES.includes(p.owner)));
    const scored = list.map(p => ({ p, why: missionBlocked(S, kind, p.id) })).sort((x, y) => (x.why ? 1 : 0) - (y.why ? 1 : 0) || y.p.dev - x.p.dev).slice(0, 30);
    for (const { p, why } of scored) rows.push({ label: p.name, sub: `${regionDef(provRegion(p.id)).name} · ${GOODS[p.good]?.name ?? p.good} · dev ${p.dev}${kind === 'conquista' ? ' · ' + nationName(S, p.owner) : ''}`, acts: [{ label: kind === 'colonize' ? 'Settle' : 'Conquer', kind, target: p.id, why }] });
  } else {
    rows.push({ label: MISSION_INFO[kind].name, sub: MISSION_INFO[kind].verb, acts: [{ label: 'Start', kind, target: '', why: missionBlocked(S, kind, '') }] });
  }
  return rows;
}

function openCardModal(handUid: number) {
  if (S.hand.find(x => x.uid === handUid)?.card === 'revolution') { openWin('internal', 'gov'); return; }
  if (S.hand.find(x => x.uid === handUid)?.card === 'move_capital') { closeWin(); toast('Tap one of your towns on the map, then choose Move the capital here'); return; }
  const hc = S.hand.find(x => x.uid === handUid);
  if (!hc) return;
  const def = CARDS[hc.card];
  const blocked = cardBlocked(S, def);
  const body = h('div', { class: 'targets-wrap' });
  const done = (msg: string) => { closeModal(); if (msg.startsWith('!')) toast(msg.slice(1), 'bad'); else toast(msg, 'good'); refresh(); processQueue(); };
  const footer = h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Keep it'),
    !def.burden ? h('button', { class: 'btn ghost', onclick: () => { closeModal(); act(() => discardCard(S, handUid), 'Discarded: +0.5 nation points'); } }, 'Discard (+0.5 NP)') : null);

  if (def.kind === 'troop') {
    const unit = cardTroop(S, def);
    body.append(h('p', {}, `${def.cls ? `Hires your best ${CLASS_NAME[def.cls].toLowerCase()}: ${TROOPS[unit].name}. ` : ''}1 manpower and ${troopHireCost(S, unit)} ducats. Upkeep ${TROOPS[unit].upkeep} a year. A better general trains better troops: veteran stars depend on the outcome.`), goodsNote(hireNeeds(unit, TROOPS[unit].kind)));
    const gens = S.characters.filter(c => (c.role === 'general' || c.role === 'conqueror') && c.mission == null);
    let gsel: Character | null = [...gens].sort((a, b) => RARITY_ORDER_I(b) - RARITY_ORDER_I(a))[0] ?? null;
    const gl = h('div', { class: 'cards-row wrap' });
    const oddsBox = h('div');
    const drawG = () => {
      clear(gl); clear(oddsBox);
      for (const c of gens) gl.append(charCard(c, S, { small: true, selected: gsel?.uid === c.uid, onclick: () => { gsel = c; drawG(); } }));
      if (!gens.length) gl.append(h('p', { class: 'muted' }, 'No free general: recruits get Common odds.'));
      oddsBox.append(h('small', { class: 'muted' }, gsel ? `Trained by ${gsel.name}:` : 'Without a general:'), oddsLine(gsel));
    };
    drawG();
    body.append(h('h3', {}, 'Choose who trains them'), gl, oddsBox);
    footer.append(h('button', { class: 'btn primary' + (blocked ? ' blocked' : ''), onclick: () => (blocked ? toast(blocked, 'bad') : done(playCard(S, handUid, gsel ? String(gsel.uid) : ''))) }, blocked ?? 'Hire'));
  } else if (def.kind === 'ship') {
    body.append(goodsNote(hireNeeds(def.troop!, 'ship')));
    body.append(h('p', {}, `Fit out for 1 manpower and ${shipHireCost(S, def.troop!)} ducats. Upkeep ${TROOPS[def.troop!].upkeep} a year. Carries ${TROOPS[def.troop!].transport} companies. Navy ${S.fleet.length}/${navyCap(S)}.`));
    const crew = S.characters.filter(c => (c.role === 'admiral' || c.role === 'general') && c.mission == null);
    let csel: Character | null = crew.find(c => c.role === 'admiral') ?? crew[0] ?? null;
    const cl = h('div', { class: 'cards-row wrap' });
    const note = h('div');
    const drawC = () => {
      clear(cl); clear(note);
      for (const c of crew) cl.append(charCard(c, S, { small: true, selected: csel?.uid === c.uid, onclick: () => { csel = csel?.uid === c.uid ? null : c; drawC(); } }));
      if (!crew.length) cl.append(h('p', { class: 'muted' }, 'No free general or admiral: the crew gets Common odds.'));
      note.append(h('small', { class: 'muted' }, csel ? `Crew trained by ${csel.name}:` : 'Without a trainer:'), oddsLine(csel));
    };
    drawC();
    body.append(h('h3', {}, 'Who trains the crew (optional)'), cl, note, h('p', { class: 'muted small' }, 'A general who leads an attack with ships becomes an admiral for good.'));
    footer.append(h('button', { class: 'btn primary' + (blocked ? ' blocked' : ''), onclick: () => { if (blocked) return toast(blocked, 'bad'); done(hireShip(S, handUid, csel?.uid)); } }, blocked ?? 'Fit out the ship'));
  } else if (def.kind === 'hire') {
    body.append(h('p', {}, `Costs 1 manpower. Three candidates are revealed; you keep one. Court ${courtCount(S)}/${courtCap(S)}.`));
    footer.append(h('button', { class: 'btn primary' + (blocked ? ' blocked' : ''), onclick: () => { if (blocked) return toast(blocked, 'bad'); closeModal(); act(() => hireWithCard(S, handUid)); } }, blocked ?? 'Hire'));
  } else if (def.kind === 'equip') {
    body.append(h('h3', {}, 'Fit to a troop at home'));
    const row = h('div', { class: 'cards-row wrap' });
    let any = false;
    for (const t of S.troops.filter(t => t.mission == null)) {
      const r = mergePreview(S, t.uid, handUid);
      if ('error' in r) continue;
      any = true;
      row.append(h('div', { class: 'fit' }, troopCard(t, { small: true }), h('span', { class: 'arrow' }, '→'), troopCard({ type: r.out, vet: r.vet, str: 100 }, { small: true }),
        h('button', { class: 'btn small' + (r.tech || player(S).gold < r.cost ? ' blocked' : ''), onclick: () => { if (r.tech) return toast(`Needs ${TECH[r.tech].name}`, 'bad'); const e = doMerge(S, t.uid, handUid); done(e ? '!' + e : `Forged ${TROOPS[r.out].name}`); } }, r.tech ? `Needs ${TECH[r.tech].name}` : `Forge · ${r.cost}`)));
    }
    if (!any) row.append(h('p', { class: 'muted' }, 'None of your troops at home can use this. Check the recipe book in the Military panel.'));
    body.append(row);
  } else if (def.kind === 'mission' && (def.missions![0] === 'route' || def.missions![0] === 'post')) {
    body.append(h('p', {}, def.text));
    footer.append(h('button', { class: 'btn primary', onclick: () => { closeModal(); if (def.missions![0] === 'route') { openWin('economy', 'goods'); toast(def.trade === 'sell' ? 'Choose a good and press Sell' : 'Choose a good and press Buy'); } else openPostPicker(); } }, def.missions![0] === 'route' ? 'Choose the good' : 'Choose where'));
  } else if (def.kind === 'mission') {
    const role = cardRole(def.id);
    body.append(h('p', { class: 'muted' }, `Needs a free ${roleName[role].toLowerCase()}. Choose where to send them.`));
    const rows = missionTargets(handUid);
    if (!rows.length) body.append(h('p', { class: 'bad' }, def.missions![0] === 'conquer' ? noTargetReason() : def.missions![0] === 'colonize' || def.missions![0] === 'conquista' ? 'No land discovered yet. Send an explorer first.' : 'No valid target right now.'));
    const list = h('div', { class: 'tlist' });
    for (const r of rows) {
      list.append(h('div', { class: 'trow' }, r.color ? h('span', { class: 'swatch', style: `background:${r.color}` }) : null,
        h('div', { class: 'a-t' }, h('b', {}, r.label), h('small', {}, r.sub)),
        h('div', { class: 'r-acts' }, r.acts.map(a => h('button', { class: 'btn small' + (a.why ? ' blocked' : ''), title: a.why ?? '', onclick: () => { if (a.why) return toast(a.why, 'bad'); closeModal(); openPlanner(a.kind, a.target, a.building, handUid); } }, a.label)))));
    }
    body.append(list);
    if (def.missions![0] === 'conquer' && rows.length) {
      body.insertBefore(h('button', { class: 'btn pickmap', onclick: () => { closeModal(); startMapPick(handUid); } }, '🗺 Select province on the map'), list);
    }
  } else {
    let target = '';
    const targets = h('div', { class: 'targets' });
    const playBtn = h('button', { class: 'btn primary' }, def.burden ? 'Pay it off' : 'Play card');
    const setBtn = () => playBtn.classList.toggle('blocked', !!blocked || (!!def.target && def.target !== 'none' && !target));
    playBtn.onclick = () => {
      if (blocked) return toast(blocked, 'bad');
      if (def.target && def.target !== 'none' && !target) return toast('Choose a target first', 'bad');
      done(playCard(S, handUid, target));
    };
    const pickT = (val: string, el: HTMLElement) => { target = val; targets.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel'); setBtn(); };
    if (!blocked && def.target === 'nation') {
      for (const n of Object.values(S.nations).filter(n => n.alive && n.id !== S.player && def.targetOk!(S, n.id))) {
        const b: HTMLElement = h('button', { class: 'tchip', onclick: () => pickT(n.id, b) }, h('span', { class: 'swatch', style: `background:${n.color}` }), n.name);
        targets.append(b);
      }
    } else if (!blocked && def.target === 'mission') {
      for (const m of S.missions.filter(m => def.targetOk!(S, String(m.id)))) {
        const b: HTMLElement = h('button', { class: 'tchip', onclick: () => pickT(String(m.id), b) }, `${missionTitle(m)} (${m.turnsLeft} yr)`);
        targets.append(b);
      }
    } else if (!blocked && def.target === 'troop') {
      const g = h('div', { class: 'cards-row wrap' });
      for (const t of S.troops.filter(t => def.targetOk!(S, String(t.uid)))) { const c: HTMLElement = troopCard(t, { small: true, onclick: () => pickT(String(t.uid), c) }); g.append(c); }
      targets.append(g);
    }
    setBtn();
    if (blocked) body.append(h('p', { class: 'bad' }, blocked)); else if (def.target && def.target !== 'none') body.append(h('h3', {}, 'Choose a target'));
    body.append(targets);
    footer.append(playBtn);
  }
  openModal(h('div', { class: 'mbox narrow' }, handCard(hc.card, { wide: true, cls: 'modal-card' }), body, footer));
}

// ---------- choosing a target on the map ----------
let pickHand: number | null = null;

/** Hold (touch) or click (mouse) an enemy province to pick it as the target of an attack card. */
function startMapPick(handUid: number) {
  const rows = missionTargets(handUid, true);
  const ids = rows.flatMap(r => r.acts.map(a => a.target));
  pickHand = handUid;
  if (win) closeWin();
  closeSheet();
  map.setPick(true, ids);
  // frame the targets that can be reached now (the far ones are a base away) together with home
  const near = rows.filter(r => r.acts.some(a => a.kind !== 'base')).flatMap(r => r.acts.map(a => a.target));
  map.focus([...new Set(near.length ? near : ids)].concat(provsOf(S, S.player).map(p => p.id)), 60);
  document.getElementById('pickbar')?.remove();
  const touch = matchMedia('(pointer: coarse)').matches;
  document.body.append(h('div', { id: 'pickbar' },
    h('span', {}, h('b', {}, 'Pick a target: '), touch ? 'hold a highlighted province.' : 'click a highlighted province.'),
    h('button', { class: 'btn small ghost', onclick: stopMapPick }, 'Cancel')));
}

function stopMapPick() {
  pickHand = null;
  map.setPick(false);
  document.getElementById('pickbar')?.remove();
}

function onMapPick(id: string) {
  if (pickHand == null) return;
  const handUid = pickHand;
  if (!S.hand.some(x => x.uid === handUid)) { stopMapPick(); return; }
  const p = S.provinces[id];
  const row = missionTargets(handUid, true).find(r => r.acts.some(a => a.target === id));
  if (!row) {
    const why = !p ? 'Not a province' : p.owner === S.player ? `${p.name} is already yours` : !provKnown(S, id) ? 'You have not mapped that land' : !atWar(S, S.player, p.owner) ? `You are not at war with ${nationName(S, p.owner)}` : `${p.name} is out of reach`;
    toast(why, 'bad');
    return;
  }
  const acts = row.acts.filter(a => a.target === id);
  openModal(h('div', { class: 'mbox narrow' },
    h('h2', {}, row.label), h('p', { class: 'muted' }, row.sub),
    h('div', { class: 'mrow' },
      h('button', { class: 'btn ghost', onclick: closeModal }, 'Back to map'),
      acts.map(a => h('button', { class: 'btn primary' + (a.why ? ' blocked' : ''), title: a.why ?? '', onclick: () => {
        if (a.why) return toast(a.why, 'bad');
        closeModal(); stopMapPick(); openPlanner(a.kind, a.target, a.building, handUid);
      } }, a.why ? `${a.label}: ${a.why}` : a.label)))));
}

// ---------- mission planner ----------
function openPlanner(kind: MissionKind, target: string, building: string | undefined, cardUid: number, trade?: { good: string; dir: 'buy' | 'sell'; amount: number }) {
  const card = S.hand.find(x => x.uid === cardUid);
  if (!card) { toast('That card is gone', 'bad'); return; }
  const role = cardRole(card.card);
  const roles = cardRoles(card.card);
  const info = MISSION_INFO[kind];
  const chars = S.characters.filter(c => roles.includes(c.role) && !(c.ruler && c.role !== role && roles[0] !== 'general'));
  const free = chars.filter(c => c.mission == null);
  const who = roles.map(r => roleName[r].toLowerCase()).join(' or ');
  if (!chars.length) { toast(`You need a ${who}. Play a hiring card.`, 'bad'); return; }
  if (!free.length) { toast(`Every ${who} is busy`, 'bad'); return; }
  const military = kind === 'conquer' || kind === 'raid' || kind === 'conquista' || kind === 'base';
  let ch = free.find(c => c.uid === preferChar) ?? [...free].sort((a, b) => b.skill - a.skill)[0];
  preferChar = null;
  const home = (kind === 'conquer' || kind === 'raid' ? troopsNear(S, S.player, target) : S.troops.filter(t => t.mission == null && !t.moving && t.str >= 100)).filter(t => t.str >= 30).sort((a, b) => armyPower([b]) - armyPower([a]));
  const maxTroops = () => ch.skill + 3;
  let picked: number[] = military ? home.slice(0, maxTroops()).map(t => t.uid) : [];
  const naval = ((kind === 'conquer' || kind === 'raid') && !!attackRoute(S, target)?.naval) || (kind === 'base' && home.some(t => travel(locOf(S, t), target) >= 1 && S.provinces[target] && getGeo().land[S.provinces[target].id] !== getGeo().land[locOf(S, t).replace('base:', '')]));
  const harbourShips = S.fleet.filter(t => t.mission == null && t.str >= 30);
  let ships: number[] = naval ? harbourShips.map(t => t.uid) : [];
  const good: string | undefined = trade?.good;

  const tname = kind === 'assist' ? TECH[S.missions.find(x => String(x.id) === target)?.target ?? '']?.name ?? 'a study' : kind === 'artwork' ? GENRES[target]?.name.toLowerCase() ?? 'a work' : kind === 'accept' ? `${cultureName(target)} people` : kind === 'pilgrimage' ? churchHead(S).name : S.provinces[target]?.name ?? S.nations[target]?.name ?? TECH[target]?.name ?? 'the realm';
  const box = h('div', { class: 'mbox planner' });
  const draw = () => {
    clear(box);
    box.append(h('div', { class: 'pl-head' }, h('span', { class: 'a-ico', html: icon(info.icon, 22) }),
      h('div', {}, h('h2', {}, `${info.name}${kind === 'build' ? ': ' + BUILDINGS[building!].name : ''}`), h('p', { class: 'muted' }, `${info.verb} ${tname} · uses ${CARDS[card.card].name}`))));
    box.append(h('h3', {}, `Choose ${/^[aeiou]/i.test(roleName[role]) ? 'an' : 'a'} ${roleName[role].toLowerCase()}`));
    const row = h('div', { class: 'cards-row' });
    for (const c of chars) {
      const busy = c.mission != null;
      let sub = qLabel(missionTurns(S, kind, c, target, building));
      if (DIPLO.includes(kind)) sub = `${Math.round(diploChance(S, kind, c, target) * 100)}%`;
      if (kind === 'explore') sub = `${Math.round(exploreChance(S, c) * 100)}%`;
      if (kind === 'colonize') sub = `${Math.round(colonizeChance(S, target, c) * 100)}%`;
      if (!DIPLO.includes(kind) && kind !== 'explore' && kind !== 'colonize') sub = `${OUTCOME_ODDS[c.rarity][3] + OUTCOME_ODDS[c.rarity][4] < 1 ? '<1' : Math.round(OUTCOME_ODDS[c.rarity][3] + OUTCOME_ODDS[c.rarity][4])}% great`;
      if (!busy && c.role !== role && role !== 'general') sub = `→ ${roleName[role]}`;
      row.append(charCard(c, S, { small: true, selected: c.uid === ch.uid, dim: busy, badge: busy ? 'busy' : sub, onclick: () => { if (busy) return toast('Busy on another mission'); ch = c; if (military) picked = picked.slice(0, maxTroops()); draw(); } }));
    }
    box.append(row);
    const turnsInto = becomesOnMission(kind, ch, naval && ships.length > 0);
    if (turnsInto) box.append(h('p', { class: 'bad' }, `${ch.name} will become ${/^[aeiou]/i.test(turnsInto) ? 'an' : 'a'} ${roleName[turnsInto].toLowerCase()} for good: new skills, no going back.`));
    if (!['conquer', 'raid'].includes(kind)) box.append(h('div', { class: 'oddsbox' }, h('small', { class: 'muted' }, `Outcome odds with a ${RARITY[ch.rarity].name} ${roleName[ch.role].toLowerCase()}:`), oddsLine(ch)));
    const turns = missionTurns(S, kind, ch, target, building);
    const facts: (string | HTMLElement)[] = [qText(turns)];
    if (DIPLO.includes(kind)) facts.push(`${Math.round(diploChance(S, kind, ch, target) * 100)}% chance`, `Journey ${envoyCost(S, target)} ducats · back at court ${qText(Math.max(1, envoyTravel(S, target)))} after`, CARDS[card.card].permanent ? 'The card stays in your hand' : 'The card is used up');
    if (kind === 'research') facts.push(`${researchRate(S, ch, TECH[target]?.track)} research a year · ${techCost(S, target)} needed`);
    facts.push(kind === 'route' ? 'A quick errand: does not use up one of the year\'s missions' : `Missions left this year: ${missionsLeft(S)}`);
    const pgKey = kind === 'artwork' ? target : building;
    const pg = kind === 'build' ? {} : projectGoods(kind, pgKey);
    if (kind === 'build') box.append(costBenefit(building!, target, ch));
    for (const [g, n] of Object.entries(pg)) {
      const have = S.stock[g] ?? 0, extra = projectShortfall(S, kind, pgKey);
      facts.push(h('span', { class: have >= n ? '' : 'bad' }, `Uses ${n} ${GOODS[g].name.toLowerCase()} (you have ${have.toFixed(1)})${have >= n ? '' : ` · the rest bought at double price: +${extra} ducats`}`));
    }
    if (kind === 'route' && trade) {
      const d = dealFor(S, target, trade.dir, merchantFactor(ch.skill));
      const each = price(S, trade.good) * d;
      facts.push(`${trade.dir === 'buy' ? 'Buys' : 'Sells'} ${trade.amount} ${GOODS[trade.good].name.toLowerCase()} a year at ${each.toFixed(1)} each (${Math.round(d * 100)}% of the market price)`, `${trade.dir === 'buy' ? 'Costs' : 'Earns'} ${(each * trade.amount).toFixed(1)} ducats a year, every quarter, until you close it`, `Trade routes ${S.routes.length}/${routeCap(S)}`);
    }
    if (kind === 'artwork') facts.push(`${artCost(S, target)} ducats now`, 'Forgettable +1 happiness for a year · Fine +2 for 2 years · Admired +3 for 3, 2 ducats a year · Celebrated +5 for 5, 4 ducats a year, a free card · Masterpiece +6 for 8, 6 ducats a year, 2 cards');
    if (kind === 'pilgrimage') facts.push(`${pilgrimageCost(S)} ducats now · favour +3 to +40 by outcome · now ${Math.round(churchRel(S))}`);
    if (kind === 'accept') facts.push(`Then ${cultureName(target)} provinces lose the −12 for a foreign culture · embraced ${S.accepted.length}/${acceptCap(S)}`);
    if (kind === 'post') facts.push(`${postCost(S, target)} ducats now · upkeep ${POST_UPKEEP} a year`, `Routes with ${nationName(S, target)} then buy at 90% of the market price and sell 20% above it`, `Trade posts ${S.posts.length}/${postCap(S)}`);
    if (kind === 'develop') facts.push(`${developCost(S, target)} ducats now`);
    if (kind === 'found') facts.push(`${foundCost(S)} ducats now · Poor/Standard: village · Good: town · Great/Exceptional: city`);
    if (kind === 'grow') facts.push(`${growCost(S, target)} ducats now · Poor: no growth · Exceptional: two steps`);
    if (kind === 'build') facts.push('Quality: Shoddy ×0.75 · Standard · Fine ×1.25 · Grand ×1.5 · Wonder ×2');
    if (kind === 'explore') facts.push(`${Math.round(exploreChance(S, ch) * 100)}% chance of a discovery · ${voyageCost(S)} ducats`);
    if (kind === 'colonize') facts.push(`${Math.round(colonizeChance(S, target, ch) * 100)}% chance · ${colonyCost(S)} ducats and 1 manpower`);
    if (military) {
      box.append(h('h3', {}, `Troops (${picked.length}/${maxTroops()})`));
      const tr = h('div', { class: 'cards-row wrap' });
      if (!home.length) tr.append(h('p', { class: 'muted' }, kind === 'conquer' || kind === 'raid' ? 'No free troops within a quarter\'s march of here.' : 'No free troops.'));
      for (const t of home) tr.append(troopCard(t, { small: true, badge: placeName(locOf(S, t)), selected: picked.includes(t.uid), onclick: () => {
        if (picked.includes(t.uid)) picked = picked.filter(x => x !== t.uid);
        else if (picked.length < maxTroops()) picked = [...picked, t.uid]; else toast(`${ch.name} can lead ${maxTroops()} troops`);
        draw();
      } }));
      box.append(tr);
      if (naval) {
        const cap = transportOf(S, ships, ch);
        box.append(h('h3', {}, `Ships (carry ${cap} of ${picked.length} companies)`));
        const sr = h('div', { class: 'cards-row wrap' });
        if (!harbourShips.length) sr.append(h('p', { class: 'bad' }, 'This attack goes by sea and you have no ships in harbour.'));
        for (const t of harbourShips) sr.append(troopCard(t, { small: true, selected: ships.includes(t.uid), onclick: () => { ships = ships.includes(t.uid) ? ships.filter(x => x !== t.uid) : [...ships, t.uid]; draw(); } }));
        box.append(sr);
        const foeFleet = S.nations[S.provinces[target].owner].fleet ?? [];
        facts.push(foeFleet.length ? `Their fleet (${foeFleet.length} ships) may intercept: a sea battle comes first` : 'No enemy fleet seen');
      }
      if (kind === 'base') facts.push(`Marches ${qText(missionTurns(S, 'base', ch, target))} to a camp near ${S.provinces[target].name}; then one quarter at half strength while it is built, and the enemy is warned`);
      if (kind === 'base') { /* no odds: the attack comes later */ }
      else if (kind === 'conquista') facts.push(`${Math.round(conquistaChance(S, target, ch, picked) * 100)}% chance against the ${nationName(S, S.provinces[target].owner)}`);
      else {
        const prov = S.provinces[target];
        const enemy = S.nations[prov.owner];
        const mine = Math.round(armyPower(S.troops.filter(t => picked.includes(t.uid))) * (1 + 0.07 * ch.skill));
        const spied = (enemy.spiedUntil ?? 0) > S.year;
        const theirs = Math.round(armyPower([...enemy.army].sort((a, b) => armyPower([b]) - armyPower([a])).slice(0, kind === 'raid' ? 3 : 6)));
        facts.push(h('span', {}, `Your strength ${mine} vs `, h('b', {}, spied ? `${theirs}` : `~${Math.round(theirs * 0.8)}–${Math.round(theirs * 1.25)}`), ` · fort ${prov.fort}`));
      }
      if (!S.troops.some(t => t.mission == null && !picked.includes(t.uid))) facts.push(h('span', { class: 'bad' }, 'No troops left at home to defend'));
    }
    box.append(h('div', { class: 'facts' }, facts.map(f => h('span', { class: 'fact' }, f))));
    const why = (kind === 'route' && trade ? routeBlocked(S, trade.good, trade.dir, target, trade.amount) : missionBlocked(S, kind, target, building)) ?? (military && !picked.length ? 'Choose at least one troop' : null) ?? (naval && transportOf(S, ships, ch) < picked.length ? 'Not enough ships to carry these troops' : null);
    box.append(h('div', { class: 'mrow' },
      h('button', { class: 'btn ghost', onclick: closeModal }, 'Cancel'),
      h('button', { class: 'btn primary' + (why ? ' blocked' : ''), onclick: () => {
        if (why) return toast(why, 'bad');
        const r = launchMission(S, kind, ch.uid, target, picked, building, cardUid, good, ships, trade ? { dir: trade.dir, amount: trade.amount } : undefined);
        if (r) return toast(r, 'bad');
        closeModal();
        toast(`${ch.name} sets out`, 'good');
        refresh();
      } }, 'Launch mission')));
  };
  draw();
  openModal(box);
}

// ---------- end turn & prompt queue ----------
async function onEndTurn() {
  if (pickHand != null) stopMapPick();
  if (modalOpen) return;
  if (S.queue.length) { processQueue(); return; }
  const ex = handExcess(S);
  if (ex.total > 0) {
    // too many cards: choose what to sell before the turn ends
    const cat = (Object.keys(ex.byCat) as Cat[])[0] ?? [...CATS].sort((a, b) => heldOf(S, b) - heldOf(S, a))[0];
    win = { cat, tab: 'cards' }; cv = { filter: 'hand', mode: 'select', sel: [] };
    openWin(cat, 'cards');
    toast(`Your hand is over the limit: sell ${ex.total} card${ex.total > 1 ? 's' : ''} to end the turn`, 'bad');
    return;
  }
  const rep = endTurn(S);
  saveNow();
  if (sheet?.kind === 'province' && !S.provinces[sheet.arg!]) closeSheet();
  refresh();
  if (rep) {
    lastReport = rep;
    if ((S.quarter ?? 0) === 0) { pendingReport = true; yearReport = S.turnLog ?? null; await yearFlash(S.year, ageOf(S).name); }
    else toast(`${SEASONS[S.quarter ?? 0]} ${S.year} · ${signed(Math.round(rep.gold))} ducats${CATS.some(c => rep.cards[c]) ? ' · cards: ' + CATS.filter(c => rep.cards[c]).map(c => `${rep.cards[c]} ${CAT_INFO[c].name}`).join(', ') : ''}`);
  }
  processQueue();
}

async function yearFlash(year: number, line: string) {
  if (reduced()) { toast(`${year}: ${line}`); return; }
  const f = h('div', { class: 'yearflash' }, h('span', {}, String(year)), h('small', {}, line));
  document.body.append(f);
  await sleep(1100);
  f.classList.add('out');
  setTimeout(() => f.remove(), 400);
}

let lastReport: { gold: number; np: number; cards: Record<string, number> } | null = null;
let yearReport: GameState['turnLog'] | null = null;

/** End of turn: what happened this quarter, with the battles played out. */
function showTurnReport() {
  pendingReport = false;
  const tl = yearReport;
  if (!tl) return;
  const box = h('div', { class: 'mbox report' });
  box.append(h('h2', {}, `The year ${tl.year}`), h('p', { class: 'muted' }, `Four quarters played. Now: ${SEASONS[S.quarter ?? 0]} ${S.year}`));
  const cards = tl.cards ?? {};
  const got = CATS.filter(c => cards[c]).map(c => `${cards[c]} ${CAT_INFO[c].name}`).join(', ');
  box.append(h('div', { class: 'facts' }, h('span', { class: 'fact' }, `${signed(Math.round(tl.gold ?? 0))} ducats`), h('span', { class: 'fact' }, `+${(tl.np ?? 0).toFixed(1)} nation points`), got ? h('span', { class: 'fact' }, `Cards: ${got}`) : null));
  if (tl.battles.length) {
    box.append(h('h3', {}, `Battles this year (${tl.battles.length})`));
    const list = h('div', { class: 'blist' });
    tl.battles.forEach((r, i) => list.append(battleRow(r, i)));
    box.append(list);
  }
  if (tl.done.length) {
    box.append(h('h3', {}, 'Missions completed this year'));
    box.append(h('ul', { class: 'rlist' }, tl.done.map(d => h('li', {}, h('span', { html: icon(MISSION_INFO[d.kind as MissionKind]?.icon ?? 'star', 14) }), d.title))));
  }
  box.append(h('h3', {}, `Under way (${S.missions.length})`));
  if (!S.missions.length) box.append(h('p', { class: 'muted' }, 'No missions under way. Open a menu and send someone out.'));
  for (const m of S.missions.slice(0, 6)) box.append(missionRow(m));
  if (S.missions.length > 6) box.append(h('p', { class: 'muted' }, `+${S.missions.length - 6} more in the Missions tabs.`));
  box.append(h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: () => { closeModal(); refresh(); } }, 'Continue')));
  openModal(box);
}

/** One battle, sports-results style: the odds first, a few seconds of fighting, then the winner. */
function battleRow(r: BattleRecord, i: number) {
  const a = S.nations[r.att], d = S.nations[r.def];
  const pA = r.attPower / Math.max(1, r.attPower + r.defPower);
  const name = (n: string) => (n === 'rebels' ? 'Rebels' : nationName(S, n));
  const mine = r.att === S.player || r.def === S.player;
  const row = h('div', { class: 'brow' + (mine ? ' mine' : '') });
  const bar = h('div', { class: 'bbar' }, h('i', { class: 'ba', style: `width:${pA * 100}%; background:${a?.color ?? '#7a2e26'}` }), h('i', { class: 'bd', style: `background:${d?.color ?? '#555'}` }), h('b', { class: 'bmark', style: `left:${pA * 100}%` }));
  const res = h('span', { class: 'bres' }, `${Math.round(pA * 100)}% – ${Math.round((1 - pA) * 100)}%`);
  row.append(h('div', { class: 'bnames' }, h('span', {}, name(r.att)), h('small', {}, `${SEASONS[r.quarter]} · ${r.naval ? 'at sea off ' : ''}${S.provinces[r.province]?.name ?? ''}`), h('span', {}, name(r.def))), bar, res);
  const end = r.winner === 'att' ? 100 : 0;
  const steps = reduced() ? [] : [pA * 100 + 12, pA * 100 - 10, pA * 100 + 6, (pA * 100 + end) / 2];
  const mark = bar.querySelector('.bmark') as HTMLElement, fill = bar.querySelector('.ba') as HTMLElement;
  const set = (v: number) => { const x = Math.max(2, Math.min(98, v)); mark.style.left = x + '%'; fill.style.width = x + '%'; };
  let t = 400 + i * 500;
  for (const v of steps) { setTimeout(() => set(v), t); t += 420; }
  setTimeout(() => {
    set(end);
    const won = r.winner === 'att' ? name(r.att) : name(r.def);
    res.textContent = mine ? (r.player === 'won' ? `Victory: ${won}` : `Defeat: ${won} win`) : `${won} win`;
    res.classList.add(mine ? (r.player === 'won' ? 'good' : 'bad') : 'done');
  }, t);
  return row;
}

function processQueue() {
  if (!modalOpen && !S.queue.length && pendingReport) { showTurnReport(); return; }
  if (modalOpen || !S.queue.length) return;
  const p = S.queue[0];
  if (p.kind === 'reveal') showReveal(p.title, p.subtitle, p.items, () => { S.queue.shift(); afterPrompt(); }, p.alarm);
  else if (p.kind === 'event') showEvent();
  else if (p.kind === 'draft') showDraft(p.draft, p.options);
  else if (p.kind === 'battle') showBattle(p.battle);
  else if (p.kind === 'succession') showSuccession(p.heirs, p.old);
  else if (p.kind === 'peace') showPeace(p.enemy, p.offered);
  else if (p.kind === 'incoming') showIncoming(p.id);
  else if (p.kind === 'gameover') showGameOver(p.victory, p.reason);
  else if (p.kind === 'mission_end') showMissionEnd(p.won);
}
function afterPrompt() { closeModal(); refresh(); setTimeout(processQueue, 60); }

function infoCard(it: RevealItem) {
  return h('div', { class: `card k-info tone-${it.tone}${/ outcome$/.test(it.title) ? ' is-outcome' : ''}` },
    h('div', { class: 'c-art', html: icon(it.kind ?? 'star', 30) }),
    h('div', { class: 'c-name c-title' }, it.title),
    h('div', { class: 'c-text' }, it.text));
}

async function flipAll(flips: { flip: () => void }[], delay = 380) {
  for (const f of flips) { await sleep(reduced() ? 0 : delay); f.flip(); }
}

function showReveal(title: string, subtitle: string | undefined, items: RevealItem[], done: () => void, alarm = false) {
  const row = h('div', { class: 'reveal-row' });
  const flips = items.map(it => { const f = flipCard(infoCard(it), ''); row.append(f.el); return f; });
  openModal(h('div', { class: 'mbox reveal' + (alarm ? ' alarm' : '') }, alarm ? h('div', { class: 'alarm-band', html: icon('sword', 28) }) : null, h('h2', {}, title), subtitle ? h('p', { class: 'muted' }, subtitle) : null, row, h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: done }, 'Continue'))));
  flipAll(flips);
}

function showEvent() {
  const p = S.queue[0];
  if (p.kind !== 'event') return;
  const e = EVENT[p.eventId];
  const front = h('div', { class: 'card k-event' },
    h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, e.history ? 'History' : 'Event')),
    h('div', { class: 'c-art', html: icon(e.art, 40) }),
    h('div', { class: 'c-name c-title' }, eventTitle(S, p.eventId, p.vars)),
    h('div', { class: 'c-text' }, e.text(S, p.vars)));
  const f = flipCard(front, e.history ? 'History' : 'Event', true);
  const opts = h('div', { class: 'ev-opts hidden-opts' });
  e.options.forEach((o, i) => {
    const why = o.can?.(S, p.vars) ?? null;
    opts.append(h('button', { class: 'btn opt' + (why ? ' blocked' : ''), onclick: () => {
      if (why) return toast(why, 'bad');
      const res = chooseEventOption(S, i);
      if (typeof res === 'string') return toast(res, 'bad');
      closeModal(); refresh();
      showReveal(eventTitle(S, p.eventId, p.vars), 'What came of it', res, afterPrompt);
    } }, h('b', {}, o.label), why ? h('small', {}, why) : o.hint ? h('small', {}, o.hint) : null));
  });
  openModal(h('div', { class: 'mbox event' }, f.el, opts));
  setTimeout(() => { f.flip(); setTimeout(() => opts.classList.remove('hidden-opts'), reduced() ? 0 : 450); }, reduced() ? 0 : 350);
}

function draftFront(o: DraftOption) {
  if (o.t === 'troop') return troopCard({ type: o.type, vet: o.vet, str: 100 });
  if (o.t === 'char') return charCard(o.ch, S);
  if (o.t === 'card') return handCard(o.card);
  if (o.t === 'equip') return handCard('eq_' + o.type);
  const a = AMBITIONS.find(x => x.id === o.id)!;
  return h('div', { class: 'card k-event' }, h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, 'Ambition')),
    h('div', { class: 'c-art', html: icon('crown', 34) }), h('div', { class: 'c-name c-title' }, a.name), h('div', { class: 'c-text' }, a.text), h('div', { class: 'c-text gold' }, `+${a.reward} prestige`));
}

function optName(o: DraftOption) {
  return o.t === 'troop' ? TROOPS[o.type].name : o.t === 'equip' ? EQUIPMENT[o.type].name : o.t === 'char' ? o.ch.name : o.t === 'card' ? CARDS[o.card].name : AMBITIONS.find(a => a.id === o.id)!.name;
}

function showDraft(kind: string, options: DraftOption[]) {
  const titles: Record<string, [string, string]> = {
    buy: ['A new card', 'Three cards are revealed. Keep one.'], gift: ['A gift of fortune', 'Keep one.'],
    court: ['An audience at court', 'Three candidates seek your favour. Keep one.'], ambition: ['Your ambition', 'Choose the goal your crown will pursue. Fulfil it for great prestige.'],
  };
  const [t, sub] = titles[kind] ?? titles.buy;
  const row = h('div', { class: 'reveal-row' });
  let ready = false;
  const flips = options.map(o => {
    const f = flipCard(draftFront(o), kind === 'ambition' ? 'Ambition' : kind === 'court' ? 'Court' : 'Card');
    f.el.addEventListener('click', () => {
      if (!ready) return;
      takeDraftOption(S, o);
      S.queue.shift();
      toast(`${optName(o)} chosen`, 'good');
      afterPrompt();
    });
    if (o.t === 'char' && (o.ch.rarity === 'legendary' || o.ch.rarity === 'epic')) f.el.classList.add('legend');
    row.append(f.el);
    return f;
  });
  const hint = h('p', { class: 'muted center' }, 'Revealing…');
  openModal(h('div', { class: 'mbox reveal' }, h('h2', {}, t), h('p', { class: 'muted' }, sub), row, hint));
  flipAll(flips, 450).then(() => { ready = true; hint.textContent = 'Tap a card to keep it.'; });
}

function heirCard(hr: Heir) {
  const a = RULER_ARCHS[hr.arch];
  return h('div', { class: 'card k-event heir' },
    h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, hr.historical ? 'Heir of history' : 'Heir')),
    h('div', { class: 'c-art', html: icon(a.role ? ({ general: 'helm', diplomat: 'scroll', admin: 'quill', merchant: 'coin', researcher: 'book' } as Record<string, string>)[a.role] : 'crown', 30) }),
    h('div', { class: 'c-name c-title' }, hr.name),
    h('div', { class: 'c-rarity' }, `${a.name} · skill ${hr.skill}`),
    h('div', { class: 'c-text' }, a.desc),
    h('div', { class: 'c-text muted' }, `Likely reign: ~${hr.reign} years`));
}

function showSuccession(heirs: Heir[], old: string) {
  const row = h('div', { class: 'reveal-row' });
  let ready = false;
  const flips = heirs.map((hr, i) => {
    const f = flipCard(heirCard(hr), 'Heir');
    f.el.classList.add('heirflip');
    f.el.addEventListener('click', () => { if (!ready) return; chooseHeir(S, i); toast(`Long live ${player(S).ruler.name}!`, 'good'); afterPrompt(); });
    row.append(f.el);
    return f;
  });
  const hint = h('p', { class: 'muted center' }, 'Revealing the heirs…');
  openModal(h('div', { class: 'mbox reveal' }, h('h2', {}, `${old} is dead`), h('p', { class: 'muted' }, 'Choose who takes the crown. Their talents shape the cards you draw.'), row, hint));
  flipAll(flips, 450).then(() => { ready = true; hint.textContent = 'Tap an heir to crown them.'; });
}

// ---------- battle ----------
function unitChip(u: { type: string; vet: number; str: number; start: number; garrison?: boolean }) {
  const d = TROOPS[u.type];
  return h('div', { class: 'uchip' + (u.str <= 0 ? ' dead' : '') },
    h('span', { html: icon(d.icon, 16) }), h('span', { class: 'u-n' }, d.name + (u.vet ? ' ' + '★'.repeat(u.vet) : '')),
    h('span', { class: 'u-bar' }, h('i', { style: `width:${Math.max(0, u.str)}%` })));
}

function showBattle(b: Battle) {
  const me = b.playerSide === 'att' ? b.att : b.def;
  const foe = b.playerSide === 'att' ? b.def : b.att;
  const prov = S.provinces[b.province];
  const box = h('div', { class: 'mbox battle' });
  const draw = (last?: { mine: string; theirs: string; myC: boolean; theirC: boolean; dmgMe: number; dmgThem: number }) => {
    clear(box);
    const foeName = foe.nation === 'rebels' ? 'Rebels' : nationName(S, foe.nation);
    const ctx = { conquer: 'Siege of', defend: 'Defence of', raid: 'Raid on', rebels: 'Fighting at', sea: 'Sea battle off' }[b.context];
    box.append(h('div', { class: 'b-head' }, h('h2', {}, `${ctx} ${prov.name}`), h('p', { class: 'muted' }, `Round ${Math.min(3, b.round + (b.done ? 0 : 1))} of 3 · ${foeName}${foe.fort ? ` · fort ${foe.fort}` : me.fort ? ` · your fort ${me.fort}` : ''}`)));
    const side = (sd: typeof me, label: string, cls: string) => h('div', { class: 'b-side ' + cls },
      h('div', { class: 'b-label' }, h('b', {}, label), h('small', {}, sd.general ? `${sd.general.name}` : 'No general'),
        h('span', { class: 'hpbar' }, h('i', { style: `width:${Math.round(ratio(sd) * 100)}%` }), h('em', { style: `left:${breakLevel(sd) * 100}%`, title: 'Breaking point' }), h('span', {}, `${Math.round(ratio(sd) * 100)}%`))),
      h('div', { class: 'uchips' }, sd.units.map(unitChip)));
    box.append(side(foe, foeName, 'foe'));
    const slotFoe = h('div', { class: 'slot' }), slotMe = h('div', { class: 'slot' });
    if (last) {
      slotFoe.append(tacticCard(last.theirs, { small: true, cls: last.theirC ? 'countered' : '' }));
      slotMe.append(tacticCard(last.mine, { small: true, cls: last.myC ? 'countered' : '' }));
    } else if (!b.done) {
      slotFoe.append(b.scout ? tacticCard(b.enemyNext, { small: true, cls: 'scouted' }) : backCard('?', { small: true }));
      slotMe.append(backCard('?', { small: true }));
    }
    box.append(h('div', { class: 'b-mid' }, slotFoe, h('div', { class: 'vs' }, last ? h('div', { class: 'dmg' },
      h('span', { class: 'good' }, `You deal ${last.dmgThem}`), h('span', { class: 'bad' }, `You take ${last.dmgMe}`),
      last.theirC ? h('span', { class: 'good' }, 'Their tactic was countered!') : null, last.myC ? h('span', { class: 'bad' }, 'Your tactic was countered!') : null) : 'vs'), slotMe));
    box.append(side(me, 'Your army', 'mine'));
    if (b.done) {
      const out = b.result ?? (b.result = finishBattle(S, b));
      save();
      box.append(h('div', { class: 'b-result ' + (out.good ? 'win' : 'loss') }, h('h3', {}, out.title), ...out.lines.map(l => h('p', {}, l))),
        h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); afterPrompt(); } }, 'Continue')));
      return;
    }
    // the generals fight it out: you watch
    box.append(h('p', { class: 'muted center' }, me.general ? `${me.general.name} commands. Each round both sides commit a tactic.` : 'No general: your captains do what they can.'));
    box.append(h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: () => { stop = true; autoResolve(S, b); draw(); } }, 'Skip to the result')));
    if (!stop) timer = setTimeout(() => commit(), reduced() ? 300 : 1700);
  };
  let stop = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  void timer;
  const commit = () => {
    if (b.done || !document.body.contains(box)) return;
    const beforeMe = hp(me), beforeFoe = hp(foe);
    const lg = playRound(S, b, null);
    const att = b.playerSide === 'att';
    draw({ mine: att ? lg.attTactic : lg.defTactic, theirs: att ? lg.defTactic : lg.attTactic, myC: att ? lg.attCountered : lg.defCountered, theirC: att ? lg.defCountered : lg.attCountered, dmgMe: Math.round(beforeMe - hp(me)), dmgThem: Math.round(beforeFoe - hp(foe)) });
    box.querySelectorAll('.slot .card').forEach(c => c.classList.add('slam'));
  };
  draw();
  openModal(box);
}

/** An enemy army is on its way: choose who defends. The battle comes next quarter and plays itself. */
function showIncoming(id: number) {
  const inc = S.incoming?.find(x => x.id === id);
  const done = () => { S.queue.shift(); afterPrompt(); };
  if (!inc) return done();
  const n = S.nations[inc.nation], prov = S.provinces[inc.target];
  const force = n.army.filter(t => inc.force.includes(t.uid));
  const spied = (n.spiedUntil ?? 0) > S.year;
  const near = troopsNear(S, S.player, prov.id);
  let picked = near.map(t => t.uid);
  const gens = S.characters.filter(c => (c.role === 'general' || c.role === 'conqueror' || (c.ruler && RULER_ARCHS[player(S).ruler.arch]?.role === 'general')) && c.mission == null);
  let gen: number | undefined = [...gens].sort((a, b) => b.skill - a.skill)[0]?.uid;
  const box = h('div', { class: 'mbox planner' });
  const draw = () => {
    clear(box);
    const mine = armyPower(S.troops.filter(t => picked.includes(t.uid))), theirs = armyPower(force);
    box.append(h('h2', {}, `${n.name} marches on ${prov.name}`), h('p', { class: 'muted' }, `They arrive when you end this turn, with ${spied ? force.length : `about ${Math.max(1, force.length - 1)}–${force.length + 2}`} companies. Choose who stands to meet them; the battle then plays itself.`));
    if (spied) box.append(h('div', { class: 'cards-row wrap' }, force.map(t => troopCard(t, { small: true }))));
    box.append(h('h3', {}, 'General'));
    const gr = h('div', { class: 'cards-row wrap' });
    if (!gens.length) gr.append(h('p', { class: 'muted' }, 'No free general: your captains lead.'));
    for (const c of gens) gr.append(charCard(c, S, { small: true, selected: gen === c.uid, onclick: () => { gen = gen === c.uid ? undefined : c.uid; draw(); } }));
    box.append(gr);
    box.append(h('h3', {}, `Troops within reach (${picked.length}/${near.length})`));
    const tr = h('div', { class: 'cards-row wrap' });
    if (!near.length) tr.append(h('p', { class: 'bad' }, 'None of your troops can get there in time. The walls and local militia must hold. Move troops to a garrison nearby for next time.'));
    for (const t of near) tr.append(troopCard(t, { small: true, selected: picked.includes(t.uid), onclick: () => { picked = picked.includes(t.uid) ? picked.filter(x => x !== t.uid) : [...picked, t.uid]; draw(); } }));
    box.append(tr);
    box.append(h('div', { class: 'facts' }, h('span', { class: 'fact' }, `Your strength ${Math.round(mine)} + fort ${prov.fort}`), h('span', { class: 'fact' }, `Theirs ${spied ? Math.round(theirs) : `~${Math.round(theirs * 0.8)}–${Math.round(theirs * 1.25)}`}`)));
    box.append(h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: () => { setDefence(S, id, picked, gen); closeModal(); done(); } }, 'Hold the line')));
  };
  draw();
  openModal(box);
}

function showPeace(enemy: string, offered: boolean) {
  const n = S.nations[enemy];
  if (!n?.alive || !atWar(S, S.player, enemy)) { S.queue.shift(); afterPrompt(); return; }
  const score = warScore(S, enemy);
  const box = h('div', { class: 'mbox narrow peace' });
  let chosen: string[] = [];
  const draw = () => {
    clear(box);
    if (offered) box.append(h('div', { class: 'alarm-band peace-band', html: icon('dove', 28) }));
    box.append(h('h2', {}, offered ? `${n.name} offers peace` : `Peace with ${n.name}`), h('p', { class: 'muted' }, `${offered ? 'Accept their terms, or fight on. ' : ''}War score ${score > 0 ? '+' : ''}${score}: ${score > 10 ? 'you are winning and set the terms.' : score < -10 ? 'they are winning and set the terms.' : 'neither side has the upper hand.'}`));
    if (score > 10) {
      const spent = peaceTerms(S, enemy).filter(t => chosen.includes(t.id)).reduce((a, t) => a + t.cost, 0);
      box.append(h('h3', {}, `Your demands (${spent}/${score} points)`));
      const list = h('div', { class: 'tlist' });
      for (const t of peaceTerms(S, enemy)) {
        const on = chosen.includes(t.id);
        const goldClash = t.id.startsWith('gold') && chosen.some(c => c.startsWith('gold') && c !== t.id);
        const tooMuch = !on && spent + t.cost > score;
        list.append(h('button', { class: 'trow term' + (on ? ' on' : '') + (tooMuch || goldClash ? ' blocked' : ''), onclick: () => {
          if (on) chosen = chosen.filter(c => c !== t.id); else if (goldClash) chosen = [...chosen.filter(c => !c.startsWith('gold')), t.id]; else if (tooMuch) return toast('Not enough war score for that', 'bad'); else chosen = [...chosen, t.id];
          draw();
        } }, h('span', { class: 'chk' }, on ? '✓' : ''), h('div', { class: 'a-t' }, h('b', {}, t.label), h('small', {}, t.detail)), h('b', { class: 'cost' }, String(t.cost))));
      }
      box.append(list);
      box.append(h('div', { class: 'mrow' },
        offered ? h('button', { class: 'btn ghost', onclick: () => { S.queue.shift(); toast('The war goes on'); afterPrompt(); } }, 'Fight on') : null,
        h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); const items = concludePeace(S, enemy, chosen); closeModal(); refresh(); showReveal(`Peace with ${n.name}`, 'The treaty is sealed', items, afterPrompt); } }, chosen.length ? 'Sign the treaty' : 'Sign a white peace')));
    } else if (score < -10) {
      const dem = enemyDemands(S, enemy);
      box.append(h('h3', {}, 'They demand'));
      box.append(h('ul', { class: 'traits' }, dem.length ? dem.map(t => h('li', {}, t.label)) : h('li', {}, 'Nothing more than peace')));
      box.append(h('div', { class: 'mrow' },
        h('button', { class: 'btn ghost', onclick: () => { S.queue.shift(); toast('The war goes on'); afterPrompt(); } }, 'Refuse and fight on'),
        h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); const items = concludePeace(S, enemy, dem.map(t => t.id), true); closeModal(); refresh(); showReveal(`Peace with ${n.name}`, 'You accept their terms', items, afterPrompt); } }, 'Accept their terms')));
    } else {
      box.append(h('div', { class: 'mrow' },
        offered ? h('button', { class: 'btn ghost', onclick: () => { S.queue.shift(); toast('The war goes on'); afterPrompt(); } }, 'Fight on') : null,
        h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); const items = concludePeace(S, enemy, []); closeModal(); refresh(); showReveal(`Peace with ${n.name}`, 'A white peace', items, afterPrompt); } }, 'Sign a white peace')));
    }
  };
  draw();
  openModal(box);
}

/** The end of a mission: a celebration, or a defeat. Either way the game can go on for fun. */
function showMissionEnd(won: boolean) {
  recordMission();
  const sc = S.scenario!;
  const views = sc.goals.map(g => goalView(S, g, sc.deadline));
  const def = MISSIONS.find(m => m.id === sc.id);
  const next = () => { S.queue.shift(); closeModal(); refresh(); afterPrompt(); };
  const toMissions = () => { S.queue.shift(); closeModal(); saveNow(); missionYear = def?.start ?? S.startYear; showMissions(); };
  const retry = () => { S.queue.shift(); closeModal(); const fresh = newMissionGame(S.player, sc.custom ? { ...sc, status: 'active', done: undefined } : sc.id, S.startYear); if (fresh.scenario?.steps?.length) fresh.tutorial = -1; startIn(slot, fresh); };
  const box = won
    ? h('div', { class: 'mbox celebrate' },
      h('div', { class: 'cel-rays' }), h('div', { class: 'cel-laurel', html: icon('laurel', 72) }),
      h('p', { class: 'eyebrow' }, 'Mission accomplished'),
      h('h2', {}, sc.name),
      h('p', { class: 'cel-sub' }, `${player(S).name}, ${S.year}${sc.deadline > S.year ? ` · ${sc.deadline - S.year} years before the deadline` : ''}`),
      h('ul', { class: 'cel-goals' }, views.map(v => h('li', {}, h('span', {}, '✓'), v.title))),
      sc.custom ? null : h('p', { class: 'cel-count' }, `You have completed ${doneCount()} of ${MISSIONS.length} missions`),
      h('p', { class: 'muted' }, 'The world goes on: keep playing for fun, or take on the next mission.'),
      h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: toMissions }, 'Back to missions'), h('button', { class: 'btn primary', onclick: next }, 'Keep playing for fun')))
    : h('div', { class: 'mbox narrow alarm' }, h('div', { class: 'alarm-band', html: icon('twist', 28) }),
      h('h2', {}, 'Mission failed'),
      h('p', { class: 'muted' }, `${sc.name}: ${provsOf(S, S.player).length ? `the deadline of ${sc.deadline} has passed` : 'your realm has fallen'}.`),
      h('ul', { class: 'cel-goals miss' }, views.map(v => h('li', { class: v.met ? 'ok' : 'no' }, h('span', {}, v.met ? '✓' : '✗'), h('div', {}, h('b', {}, v.title), h('small', {}, v.status))))),
      h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: toMissions }, 'Missions'), h('button', { class: 'btn ghost', onclick: retry }, 'Try again'), provsOf(S, S.player).length ? h('button', { class: 'btn primary', onclick: next }, 'Keep playing') : null));
  openModal(box);
}

function showGameOver(victory: boolean, reason: string) {
  const r = ranking(S);
  const sc = S.scenario;
  openModal(h('div', { class: 'mbox narrow' },
    h('h2', {}, sc ? (sc.status === 'won' ? 'Mission accomplished' : 'The end of an age') : victory ? 'A lasting empire' : 'The end of an age'), h('p', {}, reason),
    h('ol', { class: 'rank' }, r.slice(0, 8).map(x => h('li', { class: x.id === S.player ? 'me' : '' }, h('span', {}, x.name), h('b', {}, String(x.score))))),
    h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: () => { S.queue.shift(); closeModal(); refresh(); } }, 'Look at the map'),
      h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); closeModal(); clearSlot(slot); showTitle(); } }, 'New campaign'))));
}
