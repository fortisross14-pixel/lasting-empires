// What everything does. Hover anything (a card, a troop, a person, a study, a building) for a short tip; right-click
// it, press I while hovering, or use its ⓘ button for the full page: cost, time, upkeep, effects and what it needs.
// The screens stay short (the word cap); the explanation is always one gesture away. Everything here is read from
// the game's own data, so a new card or building explains itself.
import type { Character } from '../types';
import { S } from './state';
import { h } from './dom';
import { icon } from './icons';
import { artName } from './art';
import { openPage, closeModal, charDetail } from './modal';
import { CARDS, CAT_INFO, troopHireCost, buyCost, cardTroop } from '../engine/cards';
import { MISSION_INFO, techCost } from '../engine/missions';
import { TROOPS, EQUIPMENT, RECIPES } from '../data/troops';
import { TECH, BUILDINGS } from '../data/techs';
import { GOODS } from '../data/goods';
import { buildingCost, roleName } from '../engine/core';
import { hireNeeds } from '../engine/trade';
import { unitNeeds, canRecruitUnit, researchBlock } from '../engine/technology';
import { CAPABILITIES } from '../data/heritage';
import { exposureLine, missingChain } from '../engine/diffusion';

/** What each role does, in a line. */
export const ROLE_TEXT: Record<string, string> = {
  general: 'Leads armies: conquests, raids and the defence of your provinces. A better general fights better.',
  diplomat: 'Embassies, treaties, marriages, peace and claims abroad. Sent on a voyage, becomes an explorer.',
  admin: 'Builds, develops provinces, grows towns and collects taxes at home. Founding a colony makes a colonist.',
  merchant: 'Opens trade routes and trade posts, and runs contracts. A good merchant earns more on each.',
  researcher: 'Studies technologies. Skill and traits decide how fast.',
  explorer: 'Voyages of discovery to new regions of the world.',
  conqueror: 'Conquests overseas, far from home.',
  colonist: 'Founds and grows colonies.',
  admiral: 'Commands fleets in battle and on landings.',
  courtier: 'Serves at court; the first task decides: churchman, artist or cultural leader.',
  priest: 'Conversion, missions to the church, the faith of your provinces.',
  artist: 'Makes works of art: happiness, prestige and ducats.',
  leader: 'Royal grace, integration and the cultures of your realm.',
};
const KIND_NAME: Record<string, string> = { levy: 'Levy', inf: 'Infantry', shot: 'Missile troops', cav: 'Cavalry', art: 'Artillery', ship: 'Ship' };
const CARD_KIND: Record<string, string> = { troop: 'Raises a company', ship: 'Builds a ship', equip: 'Equipment to forge with', hire: 'Brings a person to court', mission: 'Starts a task', instant: 'Takes effect at once' };
const capName = (c: string) => CAPABILITIES.find(x => x.id === c)?.name ?? c;
const goodsText = (g: Record<string, number>) => Object.entries(g).map(([k, n]) => `${n} ${GOODS[k]?.name.toLowerCase() ?? k}`).join(', ');

// ---------- the short tip: one line, for hover ----------
export function tipText(el: HTMLElement): { title: string; text: string } | null {
  const d = el.dataset;
  if (d.card && CARDS[d.card]) { const c = CARDS[d.card]; return { title: c.name, text: c.text }; }
  if (d.troop && TROOPS[d.troop]) { const t = TROOPS[d.troop]; return { title: t.name, text: `${KIND_NAME[t.kind] ?? t.kind} · melee ${t.melee}, fire ${t.fire}, defence ${t.def} · upkeep ${t.upkeep} a year. ${t.desc}` }; }
  if (d.char && S) { const c = S.characters.find(x => String(x.uid) === d.char); if (c) return { title: c.name, text: `${roleName[c.role]}, skill ${c.skill}. ${ROLE_TEXT[c.role] ?? ''}` }; }
  if (d.tech && TECH[d.tech]) return { title: TECH[d.tech].name, text: TECH[d.tech].desc };
  if (d.bld && BUILDINGS[d.bld]) { const b = BUILDINGS[d.bld]; return { title: b.name, text: `${buildingCost(S, b.id)} ducats · ${b.turns} year${b.turns > 1 ? 's' : ''} · ${b.gives.slice(0, 2).join('; ')}` }; }
  return null;
}
const TIP_SEL = '[data-card], [data-troop], [data-char], [data-tech], [data-bld]';

// ---------- the full page ----------
type Row = [string, string | HTMLElement | null | undefined];
function page(o: { title: string; sub: string; pic?: string | null; ic?: string; lede?: string; rows: Row[]; lists?: [string, string[]][]; extra?: HTMLElement | null }) {
  const pic = o.pic ? artName(o.pic) : null;
  openPage(h('div', { class: 'mbox narrow explain' },
    h('div', { class: 'ex-head' },
      pic ? h('img', { class: 'ex-pic', src: `art/${pic}.webp`, alt: '', width: '96', height: '96' }) : h('span', { class: 'ex-ico', html: icon(o.ic ?? 'book', 34) }),
      h('div', {}, h('h2', {}, o.title), h('small', { class: 'muted' }, o.sub)),
      h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeModal, html: icon('close', 18) })),
    o.lede ? h('p', { class: 'ex-lede' }, o.lede) : null,
    h('dl', { class: 'ex-rows' }, ...o.rows.filter(r => r[1]).flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v as string | HTMLElement)])),
    ...(o.lists ?? []).filter(([, l]) => l.length).map(([k, l]) => h('div', { class: 'ex-list' }, h('h3', {}, k), h('ul', {}, l.map(x => h('li', {}, x))))),
    o.extra ?? null,
    h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: closeModal }, 'Close'))));
}

export function explainBuilding(id: string) {
  const b = BUILDINGS[id];
  if (!b) return;
  page({ title: b.name, sub: `Building · ${b.site === 'town' ? 'in a town' : 'in the countryside'}${b.only ? ' · a national tradition' : ''}`, pic: 'bld_' + id, ic: b.icon,
    rows: [
      ['Cost', `${buildingCost(S, id)} ducats, and construction materials from your warehouses`],
      ['Time', `${b.turns} year${b.turns > 1 ? 's' : ''} (an architect or guildmaster builds faster)`],
      ['Upkeep', `${b.salary} ducats a year once built`],
      ['Needs', b.tech ? `the study ${TECH[b.tech]?.name ?? b.tech}${S.techs.includes(b.tech) ? ' ✓' : ''}` : 'nothing to study'],
      ['How', `send an administrator with a ${CAT_INFO[b.group as keyof typeof CAT_INFO]?.name ?? ''} building card (Royal Works, Guild Charter…)`],
    ],
    lists: [['Once built', b.gives]] });
}

export function explainTroop(type: string) {
  const t = TROOPS[type];
  if (!t) return;
  const can = S ? canRecruitUnit(S, S.player, type) : null;
  const makes = RECIPES.filter(r => r.out === type).map(r => `${TROOPS[r.a]?.name ?? EQUIPMENT[r.a]?.name ?? r.a} + ${TROOPS[r.b]?.name ?? EQUIPMENT[r.b]?.name ?? r.b} (${r.cost} ducats)`);
  const into = RECIPES.filter(r => r.a === type || r.b === type).map(r => `with ${TROOPS[r.a === type ? r.b : r.a]?.name ?? EQUIPMENT[r.a === type ? r.b : r.a]?.name ?? '?'} → ${TROOPS[r.out]?.name ?? r.out}`);
  page({ title: t.name, sub: `${KIND_NAME[t.kind] ?? t.kind} · tier ${t.tier}`, pic: 'unit_' + type, ic: t.icon, lede: t.desc,
    rows: [
      ['Strength', `melee ${t.melee} · fire ${t.fire} · defence ${t.def}${t.siege ? ` · siege ${t.siege}` : ''}${t.transport ? ` · carries ${t.transport} companies` : ''}`],
      ['Cost', S && t.draftable ? `${troopHireCost(S, type)} ducats and 1 manpower, with ${goodsText(hireNeeds(type, t.kind))}` : 'made by forging or by events, not hired'],
      ['Upkeep', `${t.upkeep} ducats a year`],
      ['Needs', [t.tech ? `the study ${TECH[t.tech]?.name ?? t.tech}` : '', ...unitNeeds(type).map(capName)].filter(Boolean).join(', ') || 'nothing'],
      ['For you', can ? (can.ok ? 'You can raise these' : can.why ?? '') : null],
    ],
    lists: [['Forged from', makes], ['Forges into', into]] });
}

export function explainCard(id: string) {
  const c = CARDS[id];
  if (!c) return;
  const kinds = (c.missions ?? []).map(k => `${MISSION_INFO[k]?.name ?? k}: sends a ${roleName[MISSION_INFO[k]?.role] ?? 'person'}`);
  // a troop or ship card raises the best of its kind you can field now (cards.ts)
  const unit = S && (c.kind === 'troop' || c.kind === 'ship') ? cardTroop(S, c) : c.troop ?? null;
  const troop = unit ? TROOPS[unit] : null, eq = c.equip ? EQUIPMENT[c.equip] : null;
  page({ title: c.name, sub: `${CAT_INFO[c.cat]?.name ?? c.cat} card · ${CARD_KIND[c.kind] ?? c.kind}`, pic: 'card_' + id, ic: c.icon, lede: c.text,
    rows: [
      ['Played on', c.target === 'troop' ? 'one of your companies' : c.target === 'mission' ? 'a task under way' : c.target === 'nation' ? 'a realm you know' : c.kind === 'mission' ? 'a task you start from the map or a deck' : c.kind === 'troop' || c.kind === 'ship' ? 'nothing: the company joins at once (a general present trains it better)' : c.kind === 'hire' ? 'nothing: the person joins your court' : 'nothing: it acts at once'],
      ['Raises', troop ? `${troop.name}: melee ${troop.melee}, fire ${troop.fire}, defence ${troop.def}` : null],
      ['Cost', troop && S ? `${troopHireCost(S, unit!)} ducats${c.kind === 'troop' ? ' and 1 manpower' : ''}, with ${goodsText(hireNeeds(unit!, troop.kind))}` : null],
      ['Upkeep', troop ? `${troop.upkeep} ducats a year` : null],
      ['Role', c.kind === 'hire' && c.role ? `${roleName[c.role]}: ${ROLE_TEXT[c.role] ?? ''}` : null],
      ['Time', c.kind === 'mission' ? 'depends on the task and the person you send: the planner shows it before you confirm' : c.kind === 'instant' ? 'at once' : null],
      ['Kept', c.permanent ? 'stays in your hand after use: the task costs ducats only' : 'used up when played'],
      ['Buy another', S ? `${buyCost(S, c.cat)} nation points in the ${CAT_INFO[c.cat]?.name ?? ''} deck` : null],
      ['Equipment', eq ? eq.desc : null],
    ],
    lists: [['Tasks it can start', kinds]] });
}

export function explainTech(id: string) {
  const t = TECH[id];
  if (!t) return;
  const known = S.techs.includes(id);
  const opens = [...Object.values(BUILDINGS).filter(b => b.tech === id).map(b => `Building: ${b.name}`), ...Object.values(TROOPS).filter(x => x.tech === id).map(x => `Troop: ${x.name}`), ...Object.values(EQUIPMENT).filter(e => e.tech === id).map(e => `Equipment: ${e.name}`)];
  const why = known ? null : researchBlock(S, id);
  page({ title: t.name, sub: `Study · ${t.track === 'state' ? 'statecraft' : t.track} · dated ${t.year}`, ic: 'book', lede: t.desc,
    rows: [
      ['Cost', known ? 'known' : `${techCost(S, id)} research points (a scholar makes 2–8 a year)`],
      ['Needs', [...(t.req ?? []).map(r => `${TECH[r]?.name ?? r}${S.techs.includes(r) ? ' ✓' : ''}`), ...(t.needs ?? []).map(capName)].join(', ') || 'nothing'],
      ['Path', known ? null : missingChain(S, id).map(r => TECH[r]?.name ?? r).join(' → ') || null],
      ['Abroad', exposureLine(S, id)],
      ['Blocked', why],
    ],
    lists: [['Opens', opens]] });
}

export function explainPerson(c: Character) { charDetail(c); }

/** Open the full page for whatever this element shows. */
export function explainEl(el: HTMLElement): boolean {
  const d = el.dataset;
  if (d.card && CARDS[d.card]) { explainCard(d.card); return true; }
  if (d.troop && TROOPS[d.troop]) { explainTroop(d.troop); return true; }
  if (d.char && S) { const c = S.characters.find(x => String(x.uid) === d.char); if (c) { explainPerson(c); return true; } }
  if (d.tech && TECH[d.tech]) { explainTech(d.tech); return true; }
  if (d.bld && BUILDINGS[d.bld]) { explainBuilding(d.bld); return true; }
  return false;
}

/** A small ⓘ button that opens the full page (for rows that have no card to right-click). */
export function infoBtn(kind: 'bld' | 'troop' | 'card' | 'tech', id: string, label = 'What it does') {
  return h('button', { class: 'ex-btn', type: 'button', 'aria-label': label, title: label, onclick: (e: Event) => { e.stopPropagation(); e.preventDefault(); if (kind === 'bld') explainBuilding(id); else if (kind === 'troop') explainTroop(id); else if (kind === 'card') explainCard(id); else explainTech(id); }, html: icon('info', 16) });
}

// ---------- the hover tip (laptop) ----------
let tipEl: HTMLElement | null = null, tipTimer = 0, hovered: HTMLElement | null = null;
/** How long the pointer rests before the tip shows, in milliseconds. */
export const TIP_MS = 350;
function hideTip() { clearTimeout(tipTimer); tipEl?.remove(); tipEl = null; }
function showTip(el: HTMLElement, x: number, y: number) {
  const t = tipText(el);
  if (!t) return;
  hideTip();
  tipEl = h('div', { id: 'tip', role: 'tooltip' }, h('b', {}, t.title), h('span', {}, t.text), h('small', {}, 'Right-click or press I for everything it does'));
  document.body.append(tipEl);
  const w = tipEl.offsetWidth, hh = tipEl.offsetHeight;
  tipEl.style.left = `${Math.min(innerWidth - w - 8, x + 14)}px`;
  tipEl.style.top = `${y + 18 + hh > innerHeight ? y - hh - 10 : y + 18}px`;
}
if (typeof document !== 'undefined') {
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = (e.target as Element)?.closest?.(TIP_SEL) as HTMLElement | null;
    if (el === hovered) return;
    hovered = el; hideTip();
    if (el) { const { clientX: x, clientY: y } = e; tipTimer = window.setTimeout(() => showTip(el, x, y), TIP_MS); }
  });
  document.addEventListener('pointerdown', () => hideTip(), { capture: true });
  document.addEventListener('scroll', () => hideTip(), { capture: true, passive: true });
  document.addEventListener('contextmenu', e => {
    const el = (e.target as Element)?.closest?.(TIP_SEL) as HTMLElement | null;
    if (el && explainEl(el)) { e.preventDefault(); hideTip(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'i' || e.ctrlKey || e.metaKey || e.altKey || !hovered || !document.body.contains(hovered)) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (explainEl(hovered)) { e.preventDefault(); hideTip(); }
  });
}
