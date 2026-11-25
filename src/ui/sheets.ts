// Side panels: province, realm, goals, tasks, overseas, chronicle, and the rows they share.
import { GIFT_STEPS } from '../engine/missions';
import { chronicleSection } from './chronicle';
import { ambitionDef } from '../engine/arc';
import { ageOf } from '../engine/ages';
import { yearReport, showTurnReport } from './endturn';
import { showEra } from './app';
import { attitude, goalOf, goalKnown, deedsKnown, TEMPERS, GOAL_MIN, GOAL_YEARS, GOAL_DRIFT, WARNING_VALID } from '../engine/rivals';
import { threatOf, yearsToLand, FOCUS_WORK, diligence } from '../engine/ai';
import { TERRAINS, type Terrain } from '../data/terrain';
import { TRAIT_TACTIC_CHANCE } from '../data/troops';
import { RESERVE_FRESH, RETREAT_COST, ALLY_COMPANIES } from '../engine/battle';
import { shareHistory } from './share';
import { simplify } from './simplify';
import { HAND_LIMITS, RATE_CAP, CARD_BASE } from '../engine/cards';
import { DIFFICULTY } from '../data/difficulty';
import { LOYALTY_LEVELS, DISLOYAL, LEAVES } from '../engine/court';
import { COMMANDER_MIN } from '../engine/commanders';
import { STEWARD_PRICE, STEWARD_SHARES } from '../engine/trade';
import { SKIP_MAX } from '../engine/pace';
import { RANKS } from '../engine/realm';
import { historyOf } from '../engine/chronicle';
import { commanderOf } from '../engine/commanders';
import { sfx } from './sound';
import type { MissionKind, Character, Cat } from '../types';
import { CATS } from '../types';
import { RULER_ARCHS } from '../data/nations';
import { BUILDINGS } from '../data/techs';
import { STARTS } from '../data/starts';
import { goalView, type GoalView } from '../engine/goals';
import { moveCapital, moveCapitalBlocked, capitalMoveCost } from '../engine/government';
import { RARITY, OUTCOME_ODDS, OUTCOMES, TRAITS } from '../data/characters';
import { GOODS } from '../data/goods';
import { workshopCap, provinceOutput, sideOutput } from '../engine/trade';
import { REGIONS, HOME_REGIONS, NATIVE_EMPIRES } from '../data/overseas';
import { NO_STATE } from '../data/nations';
import { colonialYield,
  player, provsOf, playerManpower, getRel, atWar, hasTreaty, enemiesOf, alliesOf, courtCap, courtCount, provinceIncome, buildingAllowed, buildingCost, nationName,
  inTruce, tierOf, TIERS, population, townSlots, ruralSlots, builtAt, ownGoods,
} from '../engine/core';
import { playerDeclareWar, warCost, ranking, powerTable } from '../engine/turn';
import { CARDS, CAT_INFO, handOf, cardRates, npRate, buyCost, cardBlocked, cardFor } from '../engine/cards';
import {
  MISSION_INFO, DIPLO, missionBlocked, cancelMission, missionTurns, techCost, attackRoute, developCost, foundCost, growCost, projectGoods, projectShortfall,
  voyageCost, GRADES, graceCost,
} from '../engine/missions';
import { buyCard, buyBlocked, AMBITIONS } from '../engine/drafts';
import { discoverable, colonyCost, regionKnown, provRegion, regionDef } from '../engine/overseas';
import { getGeo } from '../engine/map';
import { h, $, clear, signed } from './dom';
import { icon } from './icons';
import { troopCard, charCard, handCard } from './cards';
import { warScore } from '../engine/diplo';
import { happinessOf, moodName, CULTURE_NAMES, RELIGION_NAMES, isAccepted } from '../engine/society';
import { troopsNear, nearestGarrison, baseFor } from '../engine/army';
import { S, map, sheet, win, chronTab, shield, setShownRealm, setSheet, setPick, setWin, setForge, setChronTab } from './state';
import { refresh, toast, act, missionTitle, qText, UNDO_SECONDS } from './app';
import { stacks } from './windows/cards';
import { f1, workshopRow } from './windows/economy';
import { armBack, sheetFrom, confirmBox, charDetail, setSheetFrom, openModal, closeModal } from './modal';
import { openCardModal, openPlanner } from './planner';
import { openWin } from './windows/frame';

export function toggleSheet(kind: string, arg?: string) {
  if (sheet && sheet.kind === kind && sheet.arg === arg) closeSheet(); else openSheet(kind, arg);
}
export function openSheet(kind: string, arg?: string) {
  if (win) { setWin(null); setPick({}); $('#win').hidden = true; } // never behind the window
  if (kind !== 'military') setForge([]);
  setSheetFrom(kind === 'nation' && sheet?.kind === 'province' ? sheet.arg ?? null : kind === 'nation' ? sheetFrom : null);
  sheetTall = kind !== 'province' && kind !== 'nation';
  setSheet({ kind, arg });
  $('#sheet').hidden = false;
  armBack();
  refresh();
  if (kind === 'province' && arg && innerWidth <= 760) { // the panel covers the lower part of the map on phones
    const sh = $('#sheet').getBoundingClientRect(), bd = $('#board').getBoundingClientRect();
    map.reveal(arg, Math.max(0, bd.bottom - sh.top));
  }
  if (kind === 'nation' && arg) { const ids = provsOf(S, arg).map(p => p.id); if (ids.length) map.focus(ids, 60); } // show the whole realm
}
export function closeSheet() {
  setSheet(null); setForge([]);
  $('#sheet').hidden = true;
  map.select(null);
  refresh();
}

export function sheetHead(title: string, sub?: string, color?: string) {
  return h('div', { class: 'sh-head', style: color ? `--nc:${color}` : '' },
    h('div', { class: 'sh-titles' }, h('h2', {}, title), sub ? h('p', {}, sub) : null),
    h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeSheet, html: icon('close', 18) }));
}

export function renderSheet() {
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
  for (const part of parts) if (part.classList.contains('sh-body')) simplify(part);
  // phones: a handle to pull the panel up to full height, or back down to half
  if (innerWidth <= 760) {
    const grab = h('button', { class: 'sh-grab', 'aria-label': sheetTall ? 'Show less' : 'Show more', 'aria-expanded': String(sheetTall), onclick: () => setSheetTall(!sheetTall) }, h('i'));
    let y0 = 0;
    grab.addEventListener('pointerdown', e => { y0 = e.clientY; });
    grab.addEventListener('pointerup', e => { const dy = e.clientY - y0; if (dy < -24) setSheetTall(true); else if (dy > 24) { if (sheetTall) setSheetTall(false); else closeSheet(); } });
    el.append(grab);
    // scrolling the half-height panel pulls it up
    body.addEventListener('scroll', () => { if (!sheetTall && body.scrollTop > 40) setSheetTall(true); }, { passive: true });
  }
  el.append(...parts);
  el.dataset.h = sheetTall ? 'full' : 'peek';
  body.scrollTop = scroll;
}
/** Phones: is the panel at full height (or the half height that leaves the map in view)? */
export let sheetTall = false;
export function setSheetTall(v: boolean) {
  sheetTall = v;
  const el = document.getElementById('sheet');
  if (!el) return;
  el.dataset.h = v ? 'full' : 'peek';
  const g = el.querySelector('.sh-grab');
  g?.setAttribute('aria-expanded', String(v)); g?.setAttribute('aria-label', v ? 'Show less' : 'Show more');
}

export const gradeLabel = (g: number) => { const d = GRADES.find(x => x.mult === g); return d && d.mult !== 1 ? ` (${d.name})` : ''; };

export function oddsLine(c?: Character | null) {
  const odds = OUTCOME_ODDS[c?.rarity ?? 'common'];
  return h('div', { class: 'odds' }, ...odds.map((v, i) => h('span', { class: 'odd o' + i, style: `flex:${Math.max(v, 1.5)}`, title: `${OUTCOMES[i].name} ${v}%` }, `${OUTCOMES[i].name} ${v < 1 ? v : Math.round(v)}%`)));
}

export const stat = (label: string, value: string | number | HTMLElement) => h('div', { class: 'stat' }, h('span', {}, label), typeof value === 'object' ? value : h('b', {}, String(value)));

/** Cost and benefit of a building, side by side. */
export function costBenefit(bid: string, provId?: string, ch?: Character): HTMLElement {
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

export function buildRow(bid: string, provId: string, blocked: string | null, onclick: () => void) {
  const b = BUILDINGS[bid];
  // one line; tap to see cost and benefit, then build
  return h('details', { class: `build-row${blocked ? ' blocked' : ''}` },
    h('summary', {}, h('span', { class: 'a-ico', html: icon(b.icon, 20) }), h('span', { class: 'a-t' }, h('b', {}, b.name), h('small', { class: blocked ? 'bad' : '' }, blocked ?? `${buildingCost(S, bid)} ducats · ready to build`)), h('span', { class: 'br-chev', 'aria-hidden': 'true' }, '▾')),
    costBenefit(bid, provId),
    h('button', { class: 'btn primary small' + (blocked ? ' blocked' : ''), onclick: () => (blocked ? toast(blocked, 'bad') : onclick()) }, blocked ? 'Cannot build yet' : `Build ${b.name}`));
}

export function actionRow(ic: string, title: string, sub: string, blocked: string | null, onclick: () => void, tone = '') {
  return h('button', { class: `action ${tone}${blocked ? ' blocked' : ''}`, onclick: () => (blocked ? toast(blocked, 'bad') : onclick()) },
    h('span', { class: 'a-ico', html: icon(ic, 20) }),
    h('span', { class: 'a-t' }, h('b', {}, title), h('small', {}, blocked ?? sub)),
    h('span', { class: 'a-go', html: icon('next', 14) }));
}

/** The card section at the top of every category panel. */
export function cardSection(cat: Cat) {
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

export function peopleSection(roles: Character['role'][], title: string, empty = 'Nobody yet. Play a hiring card to recruit someone.') {
  const ppl = S.characters.filter(c => roles.includes(c.role));
  const grid = h('div', { class: 'cards-row wrap' });
  if (!ppl.length) grid.append(h('p', { class: 'muted' }, empty));
  for (const c of ppl) grid.append(charCard(c, S, { small: true, onclick: () => charDetail(c) }));
  return [h('h3', {}, `${title} (${ppl.length})`), grid];
}

// ---------- province ----------
export function provinceSheet(id: string, body0: HTMLElement) {
  let body = body0;
  const p = S.provinces[id];
  const owner = S.nations[p.owner];
  const mine = p.owner === S.player;
  const g = getGeo();
  const tier = tierOf(p);
  // the realm it belongs to, one tap away
  if (owner && p.owner !== NO_STATE && !mine) body.append(h('button', { class: 'owner-chip', onclick: () => (mine ? openSheet('realm') : openSheet('nation', p.owner)) },
    shield(p.owner, owner.color, true), h('span', {}, h('b', {}, owner.name), h('small', {}, mine ? 'Your realm' : `${atWar(S, S.player, p.owner) ? 'At war with you · ' : ''}relations ${getRel(S, S.player, p.owner)} · all its provinces`)), h('span', { class: 'a-go', html: icon('next', 14) })));
  const site = (sname: 'town' | 'rural', label: string) => {
    const blds = p.buildings.filter(b => BUILDINGS[b]?.site === sname);
    const slots = sname === 'town' ? townSlots(p) : ruralSlots(p);
    return h('div', { class: 'site' }, h('h3', {}, `${label} (${builtAt(p, sname)}/${slots})`),
      h('div', { class: 'tags' }, blds.length ? blds.map(b => h('span', { class: 'tag', html: icon(BUILDINGS[b].icon, 14) + ' ' + BUILDINGS[b].name + gradeLabel(p.grades?.[b] ?? 1) })) : h('span', { class: 'muted' }, 'Nothing built yet')));
  };
  // ---------- the summary: four figures, each one tap from its detail ----------
  const hp = mine ? happinessOf(S, p) : null;
  const detail = h('div', { class: 'ptile-detail', hidden: true });
  let openTile = '';
  const tile = (key: string, label: string, value: string, sub: string, tone: string, more: () => (HTMLElement | string | null)[]) => {
    const b = h('button', { class: 'ptile ' + tone, 'aria-expanded': 'false', onclick: () => {
      for (const x of Array.from(tiles.children)) x.setAttribute('aria-expanded', 'false');
      if (openTile === key) { openTile = ''; detail.hidden = true; return; }
      openTile = key; b.setAttribute('aria-expanded', 'true');
      clear(detail).append(...more().filter(Boolean) as (HTMLElement | string)[]); detail.hidden = false;
    } }, h('b', {}, value), h('span', {}, label), sub ? h('small', {}, sub) : null);
    return b;
  };
  const people = `${(population(S, p) / 1000).toFixed(0)}k`;
  const placeLine = () => h('p', { class: 'muted' }, `${TIERS[tier].name} · development ${p.dev} · ${CULTURE_NAMES[p.culture] ?? p.culture}${mine && !isAccepted(S, p.culture) ? ' (foreign)' : ''} · ${RELIGION_NAMES[p.religion] ?? p.religion}${p.fort ? ` · fort ${p.fort}` : ''}${g.coastal[id] ? ' · coast' : ''}`);
  const tiles = h('div', { class: 'ptiles' },
    hp ? tile('happy', 'Happiness', `${hp.value}%`, moodName(hp.value), hp.value < 35 ? 'bad' : hp.value >= 60 ? 'good' : '',
      () => [h('div', { class: 'ctl-bar' }, h('i', { style: `width:${hp.value}%`, class: hp.value < 35 ? 'low' : '' })),
        h('ul', { class: 'pparts' }, hp.parts.filter(x => x.label !== 'Base').map(x => h('li', { class: x.v < 0 ? 'bad' : 'good' }, h('span', {}, x.label), h('b', {}, signed(x.v)))))]) : null,
    tile('income', 'Income', provinceIncome(S, id).toFixed(1), 'a year', '', () => [h('p', { class: 'muted' }, 'Ducats a year from this province. More development, a town and buildings raise it.')]),
    tile('people', 'People', people, TIERS[tier].name, '', () => [placeLine()]),
    tile('control', 'Control', `${Math.round(p.control)}%`, p.control < 30 ? 'unrest' : '', p.control < 30 ? 'bad' : '', () => [h('p', { class: 'muted' }, 'How firmly your officials hold it. Under 30% it pays less and may rise. A viceroy or a royal tour raises it.')]));
  body.append(tiles, detail);
  // ---------- what the land yields: one row a good ----------
  const out = provinceOutput(S, p), side = sideOutput(S, p);
  const goodsRows = [{ good: p.good, v: out }, ...side.map(x => ({ good: x.good, v: x.v }))];
  const yields = h('div', { class: 'pgoods' }, h('h3', {}, 'Produces'), ...goodsRows.map(r => {
    const gd = GOODS[r.good];
    const best = Object.values(BUILDINGS).filter(b => b.match?.includes(r.good)).map(b => b.name);
    const more = h('small', { class: 'pgood-more', hidden: true }, `${gd?.desc ?? ''}${best.length ? ` ${best.join(' or ')} double${best.length > 1 ? '' : 's'} it.` : ''}`);
    return h('button', { class: 'pgood', onclick: () => { more.hidden = !more.hidden; } },
      h('span', { class: 'gico-in', style: `color:${gd?.color}`, html: icon(gd?.icon ?? 'star', 18) }), h('span', { class: 'pg-n' }, gd?.name ?? r.good), h('b', {}, `${f1(r.v)}/yr`), more);
  }));
  body.append(yields);
  // ---------- the town: what is there, or the one step to make one ----------
  if (mine && !p.settlement) {
    const fc = cardFor(S, 'found');
    const why = fc ? missionBlocked(S, 'found', id) : null;
    body.append(h('div', { class: 'pnext' }, h('span', { class: 'a-ico', html: icon('tower', 22) }),
      h('div', {}, h('b', {}, 'No town yet'), h('small', {}, fc ? (why ?? `Found one: ${foundCost(S)} ducats, an administrator`) : 'Found one with a Found a Settlement card (Internal deck).')),
      fc && !why ? h('button', { class: 'btn primary small', onclick: () => openPlanner('found', id, undefined, fc.uid) }, 'Found')
        : !fc ? h('button', { class: 'btn small', onclick: () => openWin('internal', 'cards') }, 'Get card') : null));
  } else if (p.settlement) {
    const blds = p.buildings.map(b => BUILDINGS[b]).filter(Boolean);
    body.append(h('div', { class: 'pnext' }, h('span', { class: 'a-ico', html: icon('tower', 22) }),
      h('div', {}, h('b', {}, TIERS[tier].name), h('small', {}, blds.length ? blds.map(b => b.name).join(', ') : `Room for ${townSlots(p) + ruralSlots(p)} buildings`))));
  }
  if (mine && workshopCap(S, p) > 0) body.append(workshopRow(p));
  if (mine) {
    const outer = body;
    body = h('div');
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
      if (false) body.append(actionRow('tower', 'Found a settlement', `A village, town or city, depending on your administrator · ${foundCost(S)} ducats`, !fc ? 'Needs a Found a Settlement card (Internal)' : missionBlocked(S, 'found', id), () => openPlanner('found', id, undefined, fc!.uid)));
    } else if (p.settlement < 4) {
      const gc = cardFor(S, 'grow');
      body.append(actionRow('tower', `Grow the ${TIERS[tierOf(p)].name.toLowerCase()}`, `Up to a ${TIERS[(['none', 'village', 'town', 'city', 'metropolis'] as const)[p.settlement + 1]].name.toLowerCase()} · ${growCost(S, id)} ducats`, !gc ? 'Needs a Grow your Settlement card (Internal)' : missionBlocked(S, 'grow', id), () => openPlanner('grow', id, undefined, gc!.uid)));
    }
    const builds: HTMLElement[] = [];
    for (const [siteName, label] of [['town', 'Build in town'], ['rural', 'Build in the countryside']] as const) {
      const rows: HTMLElement[] = []; let ready = 0;
      for (const b of Object.values(BUILDINGS).filter(b => b.site === siteName)) {
        const why = buildingAllowed(S, id, b.id);
        if (b.tech && !S.techs.includes(b.tech)) continue; // not researched yet: not shown
        if (why === 'Coastal provinces only' || why === 'Already built') continue;
        const card = cardFor(S, 'build', { group: b.group });
        const need = b.group === 'internal' ? 'Royal Works (Internal)' : 'Guild Charter (Economy)';
        const block = why ?? (!card ? `Needs a ${need} card` : player(S).gold < buildingCost(S, b.id) ? `Needs ${buildingCost(S, b.id)} ducats` : null);
        if (!block) ready++;
        rows.push(buildRow(b.id, id, block, () => openPlanner('build', id, b.id, card!.uid)));
      }
      // folded by default: the panel stays short until you want to build
      if (rows.length) builds.push(h('details', { class: 'fold' }, h('summary', {}, h('b', {}, label), h('small', {}, ready ? `${ready} ready · ${rows.length} kinds` : `${rows.length} kinds · none ready`), h('span', { class: 'br-chev', 'aria-hidden': 'true' }, '▾')), ...rows));
    }
    // what can be done now comes first; what needs another card waits in a fold
    const all = Array.from(body.children) as HTMLElement[];
    const ready = all.filter(e => !e.classList.contains('blocked')), later = all.filter(e => e.classList.contains('blocked'));
    body = outer;
    if (ready.length) body.append(h('h3', {}, 'You can'), ...ready);
    if (workshopCap(S, p) > 0) builds.unshift(workshopRow(p));
    builds.unshift(site('town', TIERS[tier].name), site('rural', 'Countryside'));
    body.append(h('details', { class: 'fold' }, h('summary', {}, h('b', {}, 'Buildings'), h('small', {}, `${p.buildings.length} built`), h('span', { class: 'caret' }, '▾')), ...builds));
    if (later.length) body.append(h('details', { class: 'fold' }, h('summary', {}, h('b', {}, 'With other cards'), h('small', {}, later.map(e => e.querySelector('b')?.textContent).join(', ')), h('span', { class: 'caret' }, '▾')), ...later));
  } else if (p.owner === NO_STATE) {
    const cc = cardFor(S, 'colonize');
    body.append(h('h3', {}, 'Unclaimed land'));
    body.append(h('p', { class: 'muted' }, `No state rules here. The ${CULTURE_NAMES[p.culture] ?? p.culture} people live by their own ways.`));
    body.append(actionRow('tower', `Colonise ${p.name}`, `${Math.round(colonyCost(S))} ducats and 1 manpower · then pays about ${(provinceIncome(S, id) + colonialYield(S, id, S.player)).toFixed(1)} a year${colonialYield(S, id, S.player) >= 1.5 ? ` (${GOODS[p.good]?.name.toLowerCase()})` : ''}`, !cc ? 'Needs a Colonial Charter card (Internal)' : missionBlocked(S, 'colonize', id), () => openPlanner('colonize', id, undefined, cc!.uid)));
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
    if (!war) body.append(declareWarRow(p.owner));
    body.append(armyIntel(p.owner));
  }
  return [sheetHead(p.name, mine ? `Your province · ${TIERS[tier].name}` : `${owner.name}${p.core !== p.owner ? ` · formerly ${nationName(S, p.core)}` : ''}`, owner.color), body];
}

export function armyIntel(n: string) {
  const nat = S.nations[n];
  if ((nat.spiedUntil ?? 0) > S.year) {
    return h('div', { class: 'intel' }, h('h3', {}, `${nat.adj} army (spies)`), h('div', { class: 'cards-row wrap' }, nat.army.slice(0, 12).map(t => troopCard(t, { small: true }))));
  }
  const n2 = nat.army.length, g = commanderOf(S, n);
  return h('div', { class: 'intel' }, h('h3', {}, `${nat.adj} army`), h('p', { class: 'muted' }, `Scouts count about ${Math.max(0, n2 - 1)}–${n2 + 2} companies. A Spy Network card reveals them.`),
    g ? h('p', {}, h('b', {}, g.name), ` commands them: ${g.traits.map(t => `${TRAITS[t]?.name ?? t} (${TRAITS[t]?.desc ?? ''})`).join(', ') || 'a plain soldier'}.`) : nat.general?.captive ? h('p', {}, `Their general, ${nat.general.name}, is your prisoner.`) : null);
}

export function declareWarRow(n: string) {
  const truce = inTruce(S, S.player, n);
  const cost = warCost(S, n);
  return actionRow('sword', `Declare war on ${nationName(S, n)}`, cost ? `Stability −${cost}${cost > 1 ? ' (breaks your treaty)' : ''}` : 'You hold a claim: no stability loss', truce ? 'A truce is in force' : null,
    () => confirmBox(`Declare war on ${nationName(S, n)}?`, cost ? `Stability falls by ${cost}. Their allies may join them.` : 'Your claim justifies the war.', 'Declare war', () => { sfx('drum'); act(() => playerDeclareWar(S, n), 'War declared'); }), 'danger');
}

export function nationSheet(id: string, body: HTMLElement) {
  const n = S.nations[id];
  const rel = getRel(S, S.player, id);
  const war = atWar(S, S.player, id);
  const tre = ['trade', 'alliance', 'marriage'].filter(k => hasTreaty(S, S.player, id, k));
  // how they stand towards you, in one word, and the currents under it
  const att = attitude(S, id, n.overlord || !provsOf(S, id).length ? undefined : threatOf(S, id));
  const goal = goalOf(S, id), known = goalKnown(S, id);
  body.append(h('div', { class: 'att a-' + att.word.toLowerCase().replace(/ /g, '-') },
    h('div', { class: 'att-h' }, h('b', {}, att.word), h('span', {}, `relations ${rel > 0 ? '+' : rel < 0 ? '−' : ''}${Math.abs(rel)}`)),
    h('div', { class: 'relbar' }, h('i', { style: `left:${(rel + 100) / 2}%` })),
    h('ul', { class: 'att-why' }, att.reasons.map(r => h('li', { class: 't-' + r.tone }, r.text)))));
  body.append(h('div', { class: 'stats' },
    stat('Provinces', provsOf(S, id).length), stat('Ruler', n.ruler.name),
    stat('Status', war ? 'At war with you' : tre.length ? tre.join(', ') : 'Neutral')));
  body.append(h('p', { class: 'temper' }, h('b', {}, TEMPERS[n.personality].name), '. ', TEMPERS[n.personality].text));
  if (goal) body.append(h('p', { class: 'goal' + (goal === S.player ? ' bad' : '') }, h('span', { html: icon('eye', 14) }), ' ',
    known ? (goal === S.player ? 'What it wants: your lands.' : `What it wants: the lands of ${nationName(S, goal)}.`) : 'What it wants is not known to you. An embassy, a spy or an alliance would tell.'));
  if (deedsKnown(S, id) && n.deeds?.length) body.append(h('div', { class: 'deeds' }, h('h3', {}, 'Lately'), h('ul', {}, n.deeds.map(d => h('li', {}, h('b', {}, String(d.year)), ' ', d.text)))));
  // what it is working towards: the same record the realm itself keeps (worksOf in ai.ts)
  if (deedsKnown(S, id) && !n.overlord) {
    const yl = yearsToLand(S, n);
    const pace = diligence(id) > 1.08 ? 'An industrious realm. ' : diligence(id) < 0.92 ? 'A realm slow to mend its land. ' : '';
    body.append(h('p', { class: 'muted works' }, h('b', {}, 'At work. '), pace, yl == null ? 'Its land is as rich as this age allows. ' : `It next improves its land in about ${yl} year${yl === 1 ? '' : 's'}. `, `Every second year it ${FOCUS_WORK[n.personality]}.`));
  }
  const goods = [...ownGoods(S, id)].map(g => GOODS[g]?.name ?? g);
  body.append(h('p', { class: 'muted' }, `Goods: ${goods.join(', ') || 'none'}.`));
  const theirWars = enemiesOf(S, id).filter(e => e !== S.player).map(e => nationName(S, e));
  const theirAllies = alliesOf(S, id).map(e => nationName(S, e));
  if (theirWars.length || theirAllies.length) body.append(h('p', { class: 'muted' }, [theirAllies.length ? `Allies: ${theirAllies.join(', ')}.` : '', theirWars.length ? ` At war with ${theirWars.join(', ')}.` : ''].join('')));
  if (war) body.append(h('div', { class: 'stats' }, stat('War score', `${warScore(S, id) > 0 ? '+' : ''}${warScore(S, id)}`), stat('Meaning', warScore(S, id) > 10 ? 'You are winning' : warScore(S, id) < -10 ? 'You are losing' : 'Even')));
  if (n.overlord) body.append(h('p', { class: 'muted' }, n.overlord === S.player ? `Your ${n.subject === 'union' ? 'personal union' : 'vassal'} since ${n.subjectSince}.` : `Subject of ${nationName(S, n.overlord)}: attacking it means war with its overlord.`));
  // every province of the realm, outlined on the map; tap one to go there
  const ps = provsOf(S, id).sort((a, b) => (b.id === n.capital ? 1 : 0) - (a.id === n.capital ? 1 : 0) || b.dev - a.dev);
  if (ps.length) {
    body.append(h('div', { class: 'np-provh' }, h('h3', {}, `Provinces · ${ps.length}`), h('button', { class: 'btn ghost small', onclick: () => { setShownRealm(id); closeSheet(); map.focus(ps.map(p => p.id), 60); } }, 'Show all on map')));
    body.append(h('div', { class: 'np-provs' }, ps.map(p => h('button', { class: 'np-prov', onclick: () => { map.select(p.id); map.focus([p.id]); openSheet('province', p.id); } },
      h('b', {}, p.name), h('small', {}, [p.id === n.capital ? 'Capital' : '', `dev ${p.dev}`, p.fort ? `fort ${p.fort}` : ''].filter(Boolean).join(' · '))))));
  }
  body.append(h('h3', {}, 'Send a diplomat'));
  for (const k of DIPLO) {
    if (war !== (k === 'peace')) continue;
    if (k === 'integrate' && n.overlord !== S.player) continue;
    if (k === 'vassalize' && n.overlord === S.player) continue;
    const card = cardFor(S, k);
    const why = !card ? `Needs ${/^[AEIOU]/.test(({ relations: 'Embassy', trade: 'Trade Route', alliance: 'Alliance Pact', marriage: 'Royal Marriage', peace: 'Peace Envoy', vassalize: 'Demand Fealty', integrate: 'Integration Treaty' } as Record<string, string>)[k]) ? 'an' : 'a'} ${({ relations: 'Embassy', trade: 'Trade Route', alliance: 'Alliance Pact', marriage: 'Royal Marriage', peace: 'Peace Envoy', vassalize: 'Demand Fealty', integrate: 'Integration Treaty' } as Record<string, string>)[k]} card` : missionBlocked(S, k, id);
    body.append(actionRow(MISSION_INFO[k].icon, MISSION_INFO[k].name, diploHint(k), why, () => openPlanner(k, id, undefined, card!.uid)));
  }
  if (!war) body.append(declareWarRow(id));
  body.append(armyIntel(id));
  return [sheetHead(n.name, `${n.adj} crown`, n.color), body];
}
export function diploHint(k: MissionKind) {
  return ({ relations: 'Relations +25', trade: 'Ducats every year, and import a good', alliance: 'They join your wars', marriage: 'Relations grow every year; a dying king may leave you his crown', peace: 'Come to the table and set terms', vassalize: 'They pay tribute and follow you to war', integrate: 'Their provinces become yours' } as Record<string, string>)[k] ?? '';
}

export function goalRow(v: GoalView): HTMLElement {
  const pct = v.met ? 100 : v.invert ? (v.need === 0 ? Math.max(5, 100 - v.have * 20) : Math.min(95, (v.need / Math.max(1, v.have)) * 100)) : Math.min(100, (v.have / Math.max(1, v.need)) * 100);
  return h('div', { class: 'goal' + (v.met ? ' met' : '') },
    h('span', { class: 'goal-c' }, v.met ? '✓' : ''),
    h('div', { class: 'goal-t' }, h('b', {}, v.title), h('small', {}, v.status), h('i', { class: 'goal-bar' }, h('i', { style: `width:${Math.round(pct)}%` }))));
}

export function goalsSheet(body: HTMLElement) {
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

export function missionsSheet(body: HTMLElement) {
  if (!S.missions.length) body.append(h('p', { class: 'muted' }, 'Nobody is at work. Play a card from any menu, or tap a province or realm on the map.'));
  for (const m of S.missions) {
    const c = S.characters.find(x => x.uid === m.char);
    const info = MISSION_INFO[m.kind];
    const pct = m.kind === 'research' ? Math.min(100, (m.progress / techCost(S, m.target)) * 100) : ((m.total - m.turnsLeft) / Math.max(1, m.total)) * 100;
    body.append(h('div', { class: 'mission k-' + info.role },
      h('span', { class: 'a-ico', html: icon(info.icon, 20) }),
      h('div', { class: 'a-t' }, h('b', {}, missionTitle(m)),
        h('small', {}, `${c?.name ?? '?'}${m.troops.length ? ` with ${m.troops.length} troops` : ''} · ${qText(m.turnsLeft)} left`),
        h('div', { class: 'pbar' }, h('i', { style: `width:${pct}%` }))),
      h('button', { class: 'iconbtn', 'aria-label': 'Recall', title: 'Recall', onclick: () => confirmBox('Recall this mission?', 'The card is lost. Construction refunds half its cost.', 'Recall', () => act(() => cancelMission(S, m.id), undefined, 'Task recalled')), html: icon('close', 16) })));
  }
  return [sheetHead('Tasks', `${S.missions.length} under way`), body];
}

export function overseasSheet(body: HTMLElement) {
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

/** The campaign told as a short history: a chapter a reign, with the moments that mattered. */
export function showHistory() {
  const me = player(S), chapters = historyOf(S);
  // the log speaks to the player; a history speaks of the realm
  const said = (x: string) => x.replace(/^You declare war on /, 'War is declared on ').replace(/^You open the /, `${me.name} opens the `).replace(/ declares war on you!$/, ` declares war on ${me.name}.`).replace(/!$/, '.');
  openModal(h('div', { class: 'mbox history' },
    h('p', { class: 'eyebrow' }, `${S.startYear} – ${S.year}`),
    h('h2', {}, `The History of ${me.name}`),
    chronicleSection(S, !!S.over),
    h('h3', { class: 'hist-h' }, 'The reigns, year by year'),
    chapters.length ? null : h('p', { class: 'muted' }, 'Nothing is written yet. Wars, treaties, great works and new ages will be set down here as they happen.'),
    ...chapters.map(c => h('section', { class: 'hist-ch' },
      h('h3', {}, c.ruler, c.epithet ? h('em', {}, ` ${c.epithet}`) : null, h('small', {}, ` ${c.from} – ${c.to}`)),
      c.moments.length
        ? h('ul', { class: 'hist-list' }, c.moments.map(m => h('li', {}, h('b', {}, String(m.year)), ' ', said(m.text))))
        : h('p', { class: 'muted' }, 'A quiet reign, of which the chroniclers say little.'))),
    h('div', { class: 'mrow' },
      h('button', { class: 'btn ghost', onclick: async () => { const r = await shareHistory(S); if (r === 'saved') toast('The history is saved as a picture', 'good'); else if (r === 'failed') toast('The picture could not be made on this device', 'bad'); } }, 'Share as a picture'),
      h('button', { class: 'btn primary', onclick: closeModal }, 'Close'))));
}

/** The rules, written from the same tables the engine uses, so this page cannot disagree with the game. */
function rulesTab(body: HTMLElement) {
  const table = (head: string[], rows: (string | number)[][]) => h('div', { class: 'tscroll' }, h('table', { class: 'ptable rules' }, h('thead', {}, h('tr', {}, head.map(x => h('th', {}, x)))), h('tbody', {}, rows.map(r => h('tr', {}, r.map(c => h('td', {}, String(c))))))));
  const pct = (v: number) => `${Math.round(v)}%`;
  body.append(
    h('h3', {}, 'Outcomes'),
    h('p', { class: 'muted' }, 'Every task rolls one of five outcomes. The rarity of the person you send sets the odds; some principles and traits roll twice and keep the better.'),
    table(['Sent', ...OUTCOMES.map(o => `${o.name} ×${o.mult}`)], (Object.keys(OUTCOME_ODDS) as (keyof typeof OUTCOME_ODDS)[]).map(r => [RARITY[r].name, ...OUTCOME_ODDS[r].map(pct)])),
    h('h3', {}, 'Cards'),
    h('p', {}, `Each of the six decks draws ${CARD_BASE} cards a year before bonuses, and never more than ${RATE_CAP}. Buildings, research, your monarch, cities and principles add to it: tap a deck's rate to see how. Buying a card costs 3 nation points, and 2 more for each one already bought in that deck this year.`),
    table(['Rank', 'Provinces', 'Cards in a deck', 'Cards in all', 'Tasks a year'], RANKS.map((r, i) => [r.name, `${r.min}+`, HAND_LIMITS[i][0], HAND_LIMITS[i][1], r.missions])),
    h('h3', {}, 'Difficulty'),
    table(['', ...DIFFICULTY.map(d => d.name)], [
      ['A rival declares war on you when stronger by', ...DIFFICULTY.map(d => `×${d.warEdge}`)],
      ['Years between such wars', ...DIFFICULTY.map(d => d.warGap)],
      ['Years of peace at the start', ...DIFFICULTY.map(d => d.grace)],
      ['Starting treasure', ...DIFFICULTY.map(d => `×${d.gold}`)],
      ['Rivals grow', ...DIFFICULTY.map(d => `×${d.aiGrowth}`)],
      ['The steward starts', ...DIFFICULTY.map(d => (d.steward ? 'in office' : 'out of office'))],
    ]),
    h('h3', {}, 'Rivals'),
    h('p', {}, `A realm of ${GOAL_MIN} provinces or more wants the lands of one neighbour and holds to it for ${GOAL_YEARS} years: it likes that neighbour ${-GOAL_DRIFT} less each year and picks it first when it chooses a war. An embassy, a spy or an alliance tells you what a realm wants. No realm declares war on you without warning: the first time it would, a dispatch reaches you and it waits a year. If it is still the stronger and still ill-disposed then, it declares war. A warning holds for ${WARNING_VALID} years.`),
    h('h3', {}, 'The court'),
    h('p', {}, `A servant's loyalty runs from 0 to 100: ${LOYALTY_LEVELS.map(([min, word]) => `${word} from ${min}`).join(', ')}. Below ${DISLOYAL} they listen to other offers; below ${LEAVES} they may leave. A rival realm of ${COMMANDER_MIN} provinces or more is led by a named general, who may fall or be taken when you beat him.`),
    h('h3', {}, 'Battles'),
    h('p', {}, `Three rounds; a side breaks below 35% of its strength (25% under an Inspiring general). The generals choose the tactics, and a general with a character chooses the one that suits him ${pct(TRAIT_TACTIC_CHANCE * 100)} of the time. Before the first round you may hold one company in reserve: it takes no part until you send it in, then strikes at ×${RESERVE_FRESH} for a round. After the first or second round you may withdraw: the battle is lost, each company loses ${RETREAT_COST} strength and no more, and an attack broken off costs no stability. Allies in the same war send up to ${ALLY_COMPANIES} companies from within a quarter's march.`),
    h('p', { class: 'muted' }, 'The ground of the province counts in every battle you fight:'),
    table(['Ground', 'What it does'], (Object.keys(TERRAINS) as Terrain[]).map(k => [TERRAINS[k].name, TERRAINS[k].text])),
    h('h3', {}, 'Goods'),
    h('p', {}, `The steward buys what a need lacks at ${STEWARD_PRICE}× the market price, up to ${STEWARD_SHARES.map(v => pct(v * 100)).join(', ')} of what the provinces pay. Warehouses hold two years of use; the rest sells at home for half the price.`),
    h('h3', {}, 'The ranking'),
    h('p', {}, 'A realm\'s score is half its prestige, plus its development, plus five for every point of development gained since the start, plus two for every point held by its subjects. An open game is won in the top three; a shortened one also by ending higher than it began.'),
    h('h3', {}, 'Turns'),
    h('p', {}, `One turn is a season. Skip plays up to ${SKIP_MAX} quiet seasons and stops when something needs you. Until the season ends, Undo in the top bar (Ctrl+Z or U) takes back sending a task, moving troops, a workshop order, closing a route, recalling a task, selling or discarding cards, disbanding or dismissing: anything that showed you nothing new. Buying or drawing cards, a reveal, a question, a battle or a declaration of war cannot be taken back, and clears what came before.`),
    h('h3', {}, 'The arc of a campaign'),
    h('p', {}, 'An open game always has an ambition in view. When one is fulfilled or fails, you choose the next at once; when a new age opens, a turning point lets you keep yours or reach for a grander one (an empire, first place among the powers, a realm of learning or of cities, a merchant power, an empire overseas, subject kings, undying glory). Each shows how far you have already come. Land won or lost, treaties, trade posts, studies and growing towns are kept as the decisive moments of the reign: the history page and the end of the game tell them with your ambitions and the realm then and now, and the picture you can share carries them too.'),
    h('p', {}, `A diplomatic offer can be sweetened with a gift: ${GIFT_STEPS.slice(1).map(g => `${g.ducats} ducats for +${Math.round(g.bonus * 100)}%`).join(', ')} (in today\'s prices), up to the cap of the odds. The gift is spent whatever the answer.`),
    h('h3', {}, 'After a decision'),
    h('p', {}, 'When a task ends, the map first shows where (a ring on the place), then the result opens with the decision that caused it ("Because you sent … in Spring 1451") and What changed: every number that moved in the realm and at the place, ▴ up, ▾ down, ◆ a change of hands, faith or treaty. See it on the map goes there. A battle names the decision that began it, and its place rings when you continue. Diplomacy → Ambitions says what the great powers are after; a great power\'s aims are plain to all, a smaller realm\'s only once your envoys or spies learn them. A great power that wants your land is on the agenda as a risk.'),
    h('h3', {}, 'Less routine'),
    h('p', {}, 'Tasks worth repeating (relations, development, conversion, the arts, pilgrimages, voyages) and trade routes cut by war are remembered: when you hold the card and someone is free, the agenda offers to do it again, with the planner filled in. In Menu → Settings you can hand the chancellor routines for this campaign: keeping scholars studying, helping the current study, reopening cut routes. They play your cards and use the year\'s tasks like you would, are told at the start of the season, and Undo takes them back. In the Army tab, Select all chooses a whole garrison and Call all here brings every free company to one place.'),
    h('h3', {}, 'Finding your way'),
    h('p', {}, 'The buttons at the right of the map: search, home (your realm and its border), the next danger, the next army and the mission targets. Each press of danger or army moves on to the next one. Agenda lines that are about one place put a pin on it: ! urgent, ✦ an opportunity, ▾ a risk.'),
    h('p', { class: 'muted' }, 'Keys: Ctrl+Z or U undo · / search · H home · T next danger · A next army · G mission targets · Escape goes back one step. In search, a word lists things: idle, war, unrest, short, agenda; a role (merchant, general…) lists everyone of that role.'));
}

export function chronicleSheet(body: HTMLElement) {
  const tabs = h('div', { class: 'seg' }, ...[['powers', 'Powers'], ['generals', 'Generals'], ['kings', 'Monarchs'], ['log', 'Annals'], ['rules', 'Rules']].map(([k, l]) =>
    h('button', { class: 'seg-b' + (chronTab === k ? ' on' : ''), onclick: () => { setChronTab(k); renderSheet(); } }, l)));
  body.append(tabs);
  if (chronTab === 'powers') {
    const a = ambitionDef(S.ambition ?? '');
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
  } else if (chronTab === 'rules') {
    rulesTab(body);
  } else if (chronTab === 'kings') {
    const me = player(S);
    const kings = [...S.stats.kings, { name: me.ruler.name, arch: me.ruler.arch, from: me.ruler.from, to: S.year, prestige: Math.round(me.prestige - (me.ruler.prestigeAtStart ?? 0)) }];
    const t = h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, ...['Monarch', 'Kind', 'Reign', 'Prestige won'].map(x => h('th', {}, x)))));
    const byName = (k: { name: string; epithet?: string }) => (k.epithet ? [k.name, ' ', h('em', {}, k.epithet)] : [k.name]);
    t.append(h('tbody', {}, [...kings].sort((a, b) => b.prestige - a.prestige).map(k => h('tr', { class: k.name === me.ruler.name ? 'me' : '' },
      h('td', {}, ...byName(k)), h('td', {}, RULER_ARCHS[k.arch]?.name ?? k.arch), h('td', {}, `${k.from}–${k.to}`), h('td', {}, String(k.prestige))))));
    body.append(h('div', { class: 'tscroll' }, t));
  } else {
    body.append(h('button', { class: 'btn wide', onclick: () => showHistory() }, 'The history of your realm'));
    body.append(h('ul', { class: 'log' }, S.log.slice(0, 80).map(l => h('li', { class: 't-' + l.tone }, h('span', { class: 'ly' }, String(l.year)), h('span', {}, l.tone === 'neutral' ? null : h('span', { class: 'tm', 'aria-hidden': 'true' }, l.tone === 'good' ? '▴' : '▾'), l.text)))));
  }
  return [sheetHead('Chronicle', 'Rankings, records and history'), body];
}

export function realmSheet(body: HTMLElement) {
  const me = player(S);
  const arch = RULER_ARCHS[me.ruler.arch];
  // everything about the realm as a whole starts here, from the coat of arms
  const link = (ic: string, label: string, f: () => void) => h('button', { class: 'crown-link', onclick: f }, h('span', { html: icon(ic, 20) }), h('b', {}, label));
  body.append(h('div', { class: 'crown-links' },
    S.scenario ? link('star', 'Mission goals', () => openSheet('goals')) : null,
    link('laurel', 'Chronicle', () => openSheet('chronicle')),
    link('book', ageOf(S).name.replace('Age of ', 'The age: '), () => showEra()),
    yearReport ? link('scroll', `The year ${yearReport.year}`, () => showTurnReport()) : null));
  body.append(h('div', { class: 'ruler' },
    shield(S.player, me.color),
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
  return [sheetHead(me.name, `${me.ruler.name} · ${S.year}`, me.color), body];
}
