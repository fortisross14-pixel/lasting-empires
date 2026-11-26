// Using a card: where it can go, picking a target on the map, and the planner that sends a person out.
import { needsBridge } from '../engine/techgroups';
import { terrainOf } from '../data/terrain';
import { alliedHelp } from '../engine/battle';
import { groundLine } from './prompts';
import { sfx, buzz } from './sound';
import type { MissionKind, Character } from '../types';
import { TROOPS } from '../data/troops';
import { TECHS, TECH, BUILDINGS } from '../data/techs';
import { RARITY, OUTCOME_ODDS, commandOf, GENERIC_COMMAND } from '../data/characters';
import { GOODS } from '../data/goods';
import { GENRES } from '../data/culture';
import { churchHead, churchRel, artCost, acceptBlocked, acceptCap, cultureRows, cultureName } from '../engine/culture';
import { hireNeeds, routeBlocked, routeCap, postCap, postCost, price, dealFor, merchantFactor, POST_UPKEEP } from '../engine/trade';
import { NATIVE_EMPIRES } from '../data/overseas';
import { NO_STATE } from '../data/nations';
import {
  player, provsOf, getRel, atWar, enemiesOf, armyPower, courtCap, courtCount, roleName, nationName, tierOf, TIERS, townSlots, ruralSlots, builtAt, ageIndex,
} from '../engine/core';
import { cardTroop, CLASS_NAME } from '../engine/cards';
import { CARDS, playCard, cardBlocked, troopHireCost, discardCard } from '../engine/cards';
import {
  MISSION_INFO, DIPLO, missionBlocked, launchMission, diploChance, missionTurns, techCost, researchRate, attackRoute, developCost, foundCost, growCost, projectGoods,
  projectShortfall, pilgrimageCost, helpersOf, cardRole, cardRoles, becomesOnMission, voyageCost, envoyCost, envoyTravel, GIFT_STEPS, giftCost,
} from '../engine/missions';
import { hireWithCard, mergePreview, doMerge } from '../engine/drafts';
import { exploreChance, colonizeChance, conquistaChance, colonyCost, provRegion, provKnown, regionDef } from '../engine/overseas';
import { getGeo } from '../engine/map';
import { h, $, clear, reduced } from './dom';
import { artName } from './art';
import { icon } from './icons';
import { troopCard, charCard, handCard, troopDetails } from './cards';
import { navyCap, transportOf, hireShip, shipHireCost } from '../engine/navy';
import { happinessOf, CULTURE_NAMES, RELIGION_NAMES } from '../engine/society';
import { troopsNear, travel, locOf, nearestGarrison, baseFor, READY_STR } from '../engine/army';
import { missionsLeft } from '../engine/realm';
import { S, map, win, preferChar, RARITY_ORDER_I, setPreferChar } from './state';
import { refresh, toast, act, missionTitle, placeName, qLabel, qText, offerUndo, undoBegin, SEASONS } from './app';
import { taskPreview } from '../engine/preview';
import { openWin, closeWin } from './windows/frame';
import { closeSheet, oddsLine, costBenefit } from './sheets';
import { goodsNote, openPostPicker } from './windows/economy';
import { techYears } from './windows/research';
import { openModal, openPage, closeModal } from './modal';
import { processQueue } from './prompts';
import { nationKnown } from '../engine/overseas';

export interface TargetRow { label: string; sub: string; color?: string; acts: { label: string; kind: MissionKind; target: string; building?: string; why: string | null }[]; }

/** Targets a mission card can be used on. */
/** Why March Orders finds nothing to strike, in plain words. */
export function noTargetReason(): string {
  const foes = enemiesOf(S, S.player);
  if (!foes.length) return 'You are not at war. Declare war from a province or the Diplomacy panel.';
  const names = foes.map(f => nationName(S, f)).join(', ');
  const free = S.troops.filter(t => t.mission == null);
  if (!free.length) return `You are at war with ${names}, but all your troops are away on missions.`;
  const hurt = free.filter(t => t.str < READY_STR);
  const moving = free.filter(t => t.moving);
  if (hurt.length === free.length - moving.length) return `You are at war with ${names}, but your troops are still recovering from battle (below ${READY_STR}% strength). They heal every season, fastest in a province with Barracks.`;
  if (moving.length) return `You are at war with ${names}, but your free troops are still marching. Try again next quarter.`;
  return `You are at war with ${names}, but none of their land is within reach of your troops. Move troops to a garrison near the front.`;
}

export function missionTargets(handUid: number, all = false): TargetRow[] {
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
    for (const n of Object.values(S.nations).filter(n => n.alive && n.id !== S.player && nationKnown(S, n.id))) {
      const why = missionBlocked(S, kind, n.id);
      if (why && (why.startsWith('You are') || why.includes('already') || why === 'Not your subject' || why.startsWith('Already a subject') || why.startsWith('Too large'))) continue;
      rows.push({ label: n.name, sub: `Relations ${getRel(S, S.player, n.id)}`, color: n.color, acts: [{ label: MISSION_INFO[kind].name, kind, target: n.id, why }] });
    }
  } else if (kind === 'research') {
    for (const t of TECHS.filter(t => (!d.track || t.track === d.track) && (!t.bridge || needsBridge(S, t.id)) && !S.techs.includes(t.id) && t.age <= ageIndex(S))) rows.push({ label: t.name, sub: `${techCost(S, t.id)} points · ${techYears(t.id)} · ${t.desc}`, acts: [{ label: 'Study', kind, target: t.id, why: missionBlocked(S, 'research', t.id) }] });
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

export function openCardModal(handUid: number) {
  if (S.hand.find(x => x.uid === handUid)?.card === 'revolution') { openWin('internal', 'gov'); return; }
  if (S.hand.find(x => x.uid === handUid)?.card === 'move_capital') { closeWin(); toast('Tap one of your towns on the map, then choose Move the capital here'); return; }
  const hc = S.hand.find(x => x.uid === handUid);
  if (!hc) return;
  const def = CARDS[hc.card];
  const blocked = cardBlocked(S, def);
  const body = h('div', { class: 'targets-wrap' });
  const done = (msg: string) => { closeModal(); if (msg.startsWith('!')) toast(msg.slice(1), 'bad'); else { sfx('play'); buzz(); toast(msg, 'good'); } refresh(); processQueue(); };
  const footer = h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Keep it'),
    !def.burden ? h('button', { class: 'btn ghost', onclick: () => { closeModal(); act(() => discardCard(S, handUid), 'Discarded: +0.5 nation points', 'Card discarded'); } }, 'Discard (+0.5 NP)') : null);

  if (def.kind === 'troop' && !cardTroop(S, def)) {
    body.append(h('p', { class: 'bad' }, 'Your people raise no soldiers of this kind. Sell the card, or keep it for the day they do.'));
  } else if (def.kind === 'troop') {
    const unit = cardTroop(S, def)!;
    body.append(h('p', {}, `${def.cls ? `Hires your best ${CLASS_NAME[def.cls].toLowerCase()}: ${TROOPS[unit].name}. ` : ''}1 manpower and ${troopHireCost(S, unit)} ducats. Upkeep ${TROOPS[unit].upkeep} a year. A better general trains better troops: veteran stars depend on the outcome.`), goodsNote(hireNeeds(unit, TROOPS[unit].kind)), troopDetails(unit));
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
    if (rows.some(r => r.acts.some(a => S.provinces[a.target]))) {
      body.insertBefore(h('button', { class: 'btn pickmap', onclick: () => { closeModal(); startMapPick(handUid); } }, '🗺 See the choices on the map'), list);
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
  openPage(h('div', { class: 'mbox narrow' }, handCard(hc.card, { wide: true, cls: 'modal-card' }), body, footer));
}

// ---------- choosing a target on the map ----------
export let pickHand: number | null = null;

/** Hold (touch) or click (mouse) an enemy province to pick it as the target of an attack card. */
export function startMapPick(handUid: number) {
  const rows = missionTargets(handUid, true);
  const attack = ['conquer', 'raid', 'conquista'].includes(CARDS[S.hand.find(x => x.uid === handUid)?.card ?? '']?.missions?.[0] ?? '');
  // a card aimed at a realm lights every known province of it: tap any of them to choose the realm
  const lands = (t: string) => (S.provinces[t] ? [t] : S.nations[t] ? provsOf(S, t).filter(p => provKnown(S, p.id)).map(p => p.id) : []);
  const ids = rows.flatMap(r => r.acts.filter(a => attack || !a.why).flatMap(a => lands(a.target)));
  if (!attack && !ids.length) { toast('Nowhere to play this card right now', 'bad'); return; }
  pickHand = handUid;
  if (win) closeWin();
  closeSheet();
  map.setPick(true, ids);
  // frame the targets that can be reached now (the far ones are a base away) together with home
  const near = rows.filter(r => r.acts.some(a => a.kind !== 'base')).flatMap(r => r.acts.flatMap(a => (S.provinces[a.target] ? [a.target] : S.nations[a.target] && S.provinces[S.nations[a.target].capital]?.owner === a.target ? [S.nations[a.target].capital] : [])));
  const valid = ids.filter(id => S.provinces[id]);
  map.focus([...new Set(near.length ? near : valid)].concat(provsOf(S, S.player).map(p => p.id)), 60);
  document.getElementById('pickbar')?.remove();
  const touch = matchMedia('(pointer: coarse)').matches;
  document.body.append(h('div', { id: 'pickbar' },
    h('span', {}, h('b', {}, `${CARDS[S.hand.find(x => x.uid === handUid)!.card].name}: `), touch ? 'tap a lit province.' : 'click a lit province.'),
    h('button', { class: 'btn small ghost', onclick: stopMapPick }, 'Cancel')));
}

export function stopMapPick() {
  pickHand = null;
  map.setPick(false);
  document.getElementById('pickbar')?.remove();
}

export function onMapPick(id: string) {
  if (pickHand == null) return;
  const handUid = pickHand;
  if (!S.hand.some(x => x.uid === handUid)) { stopMapPick(); return; }
  const p = S.provinces[id];
  // a province, or the realm it belongs to when the card is aimed at realms
  const owner = p?.owner;
  const row = missionTargets(handUid, true).find(r => r.acts.some(a => a.target === id)) ?? missionTargets(handUid, true).find(r => r.acts.some(a => a.target === owner && !!S.nations[a.target]));
  if (!row) {
    const attack = ['conquer', 'raid', 'conquista'].includes(CARDS[S.hand.find(x => x.uid === handUid)!.card].missions?.[0] ?? '');
    const why = !p ? 'Not a province' : !attack ? `${p.name} is not a choice for this card` : p.owner === S.player ? `${p.name} is already yours` : !provKnown(S, id) ? 'You have not mapped that land' : !atWar(S, S.player, p.owner) ? `You are not at war with ${nationName(S, p.owner)}` : `${p.name} is out of reach`;
    toast(why, 'bad');
    return;
  }
  const acts = row.acts.filter(a => a.target === id || a.target === owner);
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
export function openPlanner(kind: MissionKind, target: string, building: string | undefined, cardUid: number, trade?: { good: string; dir: 'buy' | 'sell'; amount: number }) {
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
  setPreferChar(null);
  const home = (kind === 'conquer' || kind === 'raid' ? troopsNear(S, S.player, target) : S.troops.filter(t => t.mission == null && !t.moving && t.str >= 100)).filter(t => t.str >= 30).sort((a, b) => armyPower([b]) - armyPower([a]));
  const maxTroops = () => commandOf(ch.skill);
  let picked: number[] = military ? home.slice(0, maxTroops()).map(t => t.uid) : [];
  const naval = ((kind === 'conquer' || kind === 'raid') && !!attackRoute(S, target)?.naval) || (kind === 'base' && home.some(t => travel(locOf(S, t), target) >= 1 && S.provinces[target] && getGeo().land[S.provinces[target].id] !== getGeo().land[locOf(S, t).replace('base:', '')]));
  const harbourShips = S.fleet.filter(t => t.mission == null && t.str >= 30);
  let ships: number[] = naval ? harbourShips.map(t => t.uid) : [];
  const good: string | undefined = trade?.good;
  let gift = 0; // sweetening a diplomatic offer: a step of GIFT_STEPS

  const tname = kind === 'assist' ? TECH[S.missions.find(x => String(x.id) === target)?.target ?? '']?.name ?? 'a study' : kind === 'artwork' ? GENRES[target]?.name.toLowerCase() ?? 'a work' : kind === 'accept' ? `${cultureName(target)} people` : kind === 'pilgrimage' ? churchHead(S).name : S.provinces[target]?.name ?? S.nations[target]?.name ?? TECH[target]?.name ?? 'the realm';
  const box = h('div', { class: 'mbox planner' });
  // armies are planned in steps: who leads, who marches, then a last look before they set out
  const STEPS = military ? ['General', kind === 'conquista' ? 'Men' : 'Troops', 'Review'] : null;
  let step = 0;
  const show = (k: number) => !STEPS || step === k;
  const draw = () => {
    clear(box);
    const body = h('div', { class: 'pl-body' });
    box.append(h('div', { class: 'pl-head' }, h('span', { class: 'a-ico', html: icon(info.icon, 22) }),
      h('div', {}, h('h2', {}, `${info.name}${kind === 'build' ? ': ' + BUILDINGS[building!].name : ''}`), h('p', { class: 'muted' }, `${info.verb} ${tname} · uses ${CARDS[card.card].name}`))));
    if (STEPS) box.append(h('ol', { class: 'pl-steps', 'aria-label': 'Steps' }, STEPS.map((l, i) => h('li', { class: i === step ? 'on' : i < step ? 'done' : '', 'aria-current': i === step ? 'step' : undefined }, h('span', { class: 'ps-n' }, i < step ? '✓' : String(i + 1)), l))));
    const cols = h('div', { class: 'pl-cols' }, body);
    box.append(cols);
    const box0 = box; void box0;
    let side: HTMLElement | null = null; // the decision panel, on the last step (laptop: a column at the right)
    let giftEl: HTMLElement | null = null;
    const boxAppend = (...els: (HTMLElement | null)[]) => body.append(...els.filter((e): e is HTMLElement => !!e));
    if (show(0)) boxAppend(h('h3', {}, `Choose ${/^[aeiou]/i.test(roleName[role]) ? 'an' : 'a'} ${roleName[role].toLowerCase()}`));
    const row = h('div', { class: 'cards-row wrap' });
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
    if (show(0)) boxAppend(row);
    const turnsInto = becomesOnMission(kind, ch, naval && ships.length > 0);
    if (turnsInto && show(0)) boxAppend(h('p', { class: 'bad' }, `${ch.name} will become ${/^[aeiou]/i.test(turnsInto) ? 'an' : 'a'} ${roleName[turnsInto].toLowerCase()} for good: new skills, no going back.`));
    if (!['conquer', 'raid'].includes(kind) && !DIPLO.includes(kind) && show(0)) boxAppend(h('div', { class: 'oddsbox' }, h('small', { class: 'muted' }, `Outcome odds with a ${RARITY[ch.rarity].name} ${roleName[ch.role].toLowerCase()}:`), oddsLine(ch)));
    const turns = missionTurns(S, kind, ch, target, building);
    const facts: (string | HTMLElement)[] = [qText(turns)];
    // the one thing that decides this task, said first and large in the decision panel
    let verdict: { big: string; label: string; tone: 'good' | 'bad' | 'neutral' } | null = null;
    const chanceVerdict = (p: number) => ({ big: `${Math.round(p * 100)}% chance`, label: p >= 0.75 ? 'Likely to succeed' : p >= 0.5 ? 'A fair chance' : 'Unlikely to succeed', tone: (p >= 0.75 ? 'good' : p >= 0.5 ? 'neutral' : 'bad') as 'good' | 'bad' | 'neutral' });
    if (DIPLO.includes(kind)) verdict = chanceVerdict(diploChance(S, kind, ch, target, GIFT_STEPS[gift].bonus));
    else if (kind === 'explore') verdict = chanceVerdict(exploreChance(S, ch));
    else if (kind === 'colonize') verdict = chanceVerdict(colonizeChance(S, target, ch));
    else if (!['conquer', 'raid', 'base', 'conquista', 'route'].includes(kind)) {
      const great = OUTCOME_ODDS[ch.rarity][3] + OUTCOME_ODDS[ch.rarity][4], poor = OUTCOME_ODDS[ch.rarity][0];
      verdict = { big: `${Math.round(great)}% a great result`, label: `${Math.round(poor)}% a poor one, with a ${RARITY[ch.rarity].name.toLowerCase()} ${roleName[ch.role].toLowerCase()}`, tone: great >= 30 ? 'good' : poor >= 30 ? 'bad' : 'neutral' };
    }
    if (DIPLO.includes(kind)) facts.push(`${Math.round(diploChance(S, kind, ch, target, GIFT_STEPS[gift].bonus) * 100)}% chance`, `Journey ${envoyCost(S, target)} ducats · back at court ${qText(Math.max(1, envoyTravel(S, target)))} after`, CARDS[card.card].permanent ? 'The card stays in your hand' : 'The card is used up');
    if (kind === 'research') facts.push(`${researchRate(S, ch, TECH[target]?.track)} research a year · ${techCost(S, target)} needed`);
    facts.push(kind === 'route' ? 'A quick errand: does not use up one of the year\'s tasks' : `Tasks left this year: ${missionsLeft(S)}`);
    const pgKey = kind === 'artwork' ? target : building;
    const pg = kind === 'build' ? {} : projectGoods(kind, pgKey);
    if (kind === 'build') boxAppend(costBenefit(building!, target, ch));
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
      if (show(1)) boxAppend(h('h3', {}, `Troops (${picked.length}/${maxTroops()})`));
      if (show(1)) boxAppend(h('p', { class: 'muted small' }, `${ch.name} can lead ${maxTroops()} companies (${RARITY[ch.rarity].name.toLowerCase()} commander). Enemy defenders fight under a captain who leads ${GENERIC_COMMAND}, plus the walls.`));
      const tr = h('div', { class: 'cards-row wrap' });
      if (!home.length) tr.append(h('p', { class: 'muted' }, kind === 'conquer' || kind === 'raid' ? 'No free troops within a quarter\'s march of here.' : 'No free troops.'));
      for (const t of home) tr.append(troopCard(t, { small: true, badge: placeName(locOf(S, t)), selected: picked.includes(t.uid), onclick: () => {
        if (picked.includes(t.uid)) picked = picked.filter(x => x !== t.uid);
        else if (picked.length < maxTroops()) picked = [...picked, t.uid]; else toast(`${ch.name} can lead ${maxTroops()} troops`);
        draw();
      } }));
      if (show(1)) boxAppend(tr);
      if (naval) {
        const cap = transportOf(S, ships, ch);
        if (show(1)) boxAppend(h('h3', {}, `Ships (carry ${cap} of ${picked.length} companies)`));
        const sr = h('div', { class: 'cards-row wrap' });
        if (!harbourShips.length) sr.append(h('p', { class: 'bad' }, 'This attack goes by sea and you have no ships in harbour.'));
        for (const t of harbourShips) sr.append(troopCard(t, { small: true, selected: ships.includes(t.uid), onclick: () => { ships = ships.includes(t.uid) ? ships.filter(x => x !== t.uid) : [...ships, t.uid]; draw(); } }));
        if (show(1)) boxAppend(sr);
        const foeFleet = S.nations[S.provinces[target].owner].fleet ?? [];
        facts.push(foeFleet.length ? `Their fleet (${foeFleet.length} ships) may intercept: a sea battle comes first` : 'No enemy fleet seen');
      }
      if (kind === 'base') facts.push(`Marches ${qText(missionTurns(S, 'base', ch, target))} to a camp near ${S.provinces[target].name}; then one quarter at half strength while it is built, and the enemy is warned`);
      if (kind === 'base') { /* no odds: the attack comes later */ }
      else if (kind === 'conquista') { const c = conquistaChance(S, target, ch, picked); facts.push(`${Math.round(c * 100)}% chance against the ${nationName(S, S.provinces[target].owner)}`); verdict = chanceVerdict(c); }
      else {
        const prov = S.provinces[target];
        const enemy = S.nations[prov.owner];
        const mine = Math.round(armyPower(S.troops.filter(t => picked.includes(t.uid))) * (1 + 0.07 * ch.skill));
        const spied = (enemy.spiedUntil ?? 0) > S.year;
        const theirs = Math.round(armyPower([...enemy.army].sort((a, b) => armyPower([b]) - armyPower([a])).slice(0, kind === 'raid' ? 3 : 6)));
        facts.push(h('span', {}, `Your strength ${mine} vs `, h('b', {}, spied ? `${theirs}` : `~${Math.round(theirs * 0.8)}–${Math.round(theirs * 1.25)}`), ` · fort ${prov.fort}`));
        const edge = mine / Math.max(1, theirs * (1 + 0.25 * prov.fort));
        verdict = { big: `Your ${mine} against ${spied ? theirs : `about ${Math.round(theirs * 0.8)}–${Math.round(theirs * 1.25)}`}`, label: `${edge >= 1.3 ? 'You are clearly stronger' : edge >= 0.95 ? 'An even fight' : 'They are stronger'}${prov.fort ? ` · their walls, level ${prov.fort}` : ''}`, tone: edge >= 1.3 ? 'good' : edge >= 0.95 ? 'neutral' : 'bad' };
        const ground = terrainOf(prov), lent = kind === 'conquer' ? alliedHelp(S, prov.owner, prov.id) : [];
        const bySea = !!attackRoute(S, prov.id)?.naval;
        if (ground !== 'plains' || bySea) facts.push(h('span', { class: 'fact-ground' }, groundLine(ground, bySea)));
        if (lent.length) facts.push(h('span', {}, `${[...new Set(lent.map(u => nationName(S, u.ally!)))].join(' and ')} will send ${lent.length === 1 ? 'a company' : `${lent.length} companies`}`));
      }
      if (!S.troops.some(t => t.mission == null && !picked.includes(t.uid))) facts.push(h('span', { class: 'bad' }, 'No troops left at home to defend'));
    }
    if (STEPS && step === 2) { // the last look: who leads, who goes
      boxAppend(h('h3', {}, 'Your army'), h('div', { class: 'cards-row wrap' }, charCard(ch, S, { small: true }), ...S.troops.filter(t => picked.includes(t.uid)).map(t => troopCard(t, { small: true })), ...S.fleet.filter(t => ships.includes(t.uid)).map(t => troopCard(t, { small: true }))));
    }
    if (DIPLO.includes(kind) && (!STEPS || step === 2)) {
      // a different kind of choice: how much to sweeten the offer, with the odds moving as you choose
      const base = diploChance(S, kind, ch, target, 0);
      giftEl = (h('section', { class: 'gift' }, h('h3', {}, 'Sweeten the offer'),
        h('div', { class: 'seg gift-seg', role: 'radiogroup', 'aria-label': 'Gift' }, GIFT_STEPS.map((g, i) => {
          const cost = giftCost(S, i), p = Math.round(diploChance(S, kind, ch, target, g.bonus) * 100);
          const tooDear = i > 0 && player(S).gold < envoyCost(S, target) + cost;
          const useless = i > 0 && p <= Math.round(base * 100); // the odds are already at their cap: no gift for nothing
          const why = tooDear ? `Not enough ducats for a gift of ${cost}` : useless ? 'The odds are as high as they go: this gift would add nothing' : null;
          return h('button', { class: 'seg-b gift-b' + (i === gift ? ' on' : '') + (why ? ' blocked' : ''), role: 'radio', 'aria-checked': String(i === gift), 'aria-disabled': why ? 'true' : undefined, onclick: () => { if (why) return toast(why, 'bad'); gift = i; draw(); } },
            h('b', {}, i ? `${cost} ducats` : 'No gift'), h('small', {}, `${p}%${i && p > Math.round(base * 100) ? ` (+${p - Math.round(base * 100)})` : ''}`));
        })),
        h('p', { class: 'muted small' }, Math.round(diploChance(S, kind, ch, target, GIFT_STEPS[GIFT_STEPS.length - 1].bonus) * 100) >= Math.round(base * 100) + 1 ? 'A gift travels with the envoy and is spent whatever the answer.' : 'The odds are as high as they go: a gift would add nothing.')));
    }
    if (!STEPS || step === 2) {
      // what sending it commits: the dry run, so these numbers are what launching will do
      const pv = taskPreview(S, { kind, char: ch.uid, target, troops: picked, building, card: cardUid, good, ships, trade: trade ? { dir: trade.dir, amount: trade.amount } : undefined, gift });
      side = decisionPanel(verdict, pv, facts, giftEl);
      cols.classList.add('has-side');
      cols.append(side);
    }
    else if (step === 1) boxAppend(h('div', { class: 'facts' }, h('span', { class: 'fact' }, `${picked.length} of ${maxTroops()} companies chosen`)));
    const why = (kind === 'route' && trade ? routeBlocked(S, trade.good, trade.dir, target, trade.amount) : missionBlocked(S, kind, target, building)) ?? (military && !picked.length ? 'Choose at least one troop' : null) ?? (naval && transportOf(S, ships, ch) < picked.length ? 'Not enough ships to carry these troops' : null);
    // Back goes one step back, or to the card you came from
    const back = () => { if (STEPS && step > 0) { step--; draw(); return; } closeModal(); if (S.hand.some(x => x.uid === cardUid)) openCardModal(cardUid); };
    if (STEPS && step < 2) {
      const stepWhy = step === 1 ? (!picked.length ? 'Choose at least one company' : naval && transportOf(S, ships, ch) < picked.length ? 'Not enough ships to carry them' : null) : null;
      box.append(h('div', { class: 'mrow pl-foot' },
        h('button', { class: 'btn ghost', onclick: back }, '‹ Back'),
        h('button', { class: 'btn primary' + (stepWhy ? ' blocked' : ''), onclick: () => { if (stepWhy) return toast(stepWhy, 'bad'); step++; draw(); box.scrollTop = 0; } }, `Next: ${STEPS[step + 1]}`)));
      return;
    }
    (side ?? box).append(why && side ? h('p', { class: 'pl-why' }, why) : '', h('div', { class: 'mrow pl-foot' },
      h('button', { class: 'btn ghost', onclick: back }, '‹ Back'),
      h('button', { class: 'btn primary' + (why ? ' blocked' : ''), onclick: () => {
        if (why) return toast(why, 'bad');
        const before = undoBegin();
        const r = launchMission(S, kind, ch.uid, target, picked, building, cardUid, good, ships, trade ? { dir: trade.dir, amount: trade.amount } : undefined, gift);
        if (r) return toast(r, 'bad');
        const from = (box.querySelector('.pl-foot .btn.primary') as HTMLElement | null)?.getBoundingClientRect() ?? null;
        closeModal();
        sfx('play'); buzz();
        flyCard(card.card, from, target);
        // sending someone out shows nothing new, so it can be taken back; not if the game answered at once
        offerUndo(before, `${ch.name} sets out`);
        refresh();
      } }, 'Send them')));
  };
  draw();
  openPage(box);
}

/** What sending commits, capped (M8 follow-up): the deciding fact large (the odds, or your strength against
 *  theirs), one line of cost, time, who goes and the card, and only the warnings that change a plan. Everything else
 *  (ground, routes, outcome tables, the year's count of tasks) folds into Details. */
function decisionPanel(verdict: { big: string; label: string; tone: string } | null, pv: ReturnType<typeof taskPreview>, facts: (string | HTMLElement)[], gift: HTMLElement | null) {
  const cost = [pv.ducats > 0 ? `${pv.ducats} ducats` : '', pv.manpower > 0 ? `${pv.manpower} manpower` : '', ...pv.goods.map(g => `${g.n} ${g.name.toLowerCase()}`)].filter(Boolean).join(', ') || 'Nothing to pay';
  const when = pv.turns ? `done by ${SEASONS[pv.endQuarter]} ${pv.endYear}` : 'done this season';
  const who = pv.ties.length > 1 ? `${pv.ties[0].split(',')[0]} and ${pv.ties.slice(1).join(' and ')} go` : `${pv.ties[0]?.split(',')[0] ?? 'Someone'} goes`;
  // only what changes a plan: the year's last task, nobody left to defend, the last card of its kind, debt
  const warn = pv.after.filter(x => /^Your last task|No companies left|^Your last |treasury/.test(x));
  return h('aside', { class: 'pl-side', 'aria-label': 'Your decision' },
    verdict ? h('div', { class: 'pl-verdict t-' + verdict.tone }, h('b', {}, verdict.big), h('span', {}, verdict.label)) : null,
    gift,
    pv.blocked ? null : h('p', { class: 'pl-line' }, `${cost} · ${when} · ${who} · card ${pv.cardKept ? 'kept' : 'used up'}.`),
    warn.length ? h('ul', { class: 'pl-warn' }, warn.map(x => h('li', {}, x))) : null,
    h('details', { class: 'pl-details' }, h('summary', {}, 'Details'),
      h('div', { class: 'facts' }, facts.map(f => h('span', { class: 'fact' }, f))),
      pv.after.length ? h('ul', { class: 'pl-after' }, pv.after.map(x => h('li', {}, x))) : null,
      h('p', { class: 'muted small' }, 'You can take it back until the season ends, unless the game answers at once.')));
}

// ---------- a played card travels (roadmap 2.11) ----------
/** How long the card is in the air, in milliseconds. */
export const FLY_MS = 250;
/** Where a task's target lies on screen: the province, or a realm's capital; null when it is off the board or
 *  hidden under the open window, in which case the card goes to the strip of tasks instead. */
function targetPoint(target: string): { x: number; y: number } | null {
  const n = S.nations[target];
  const prov = S.provinces[target] ? target : n ? (S.provinces[n.capital]?.owner === n.id ? n.capital : provsOf(S, n.id)[0]?.id) : null;
  const c = prov ? getGeo().center[prov] : null, m = map.svg.getScreenCTM(), board = $('#board').getBoundingClientRect();
  if (!c || !m) return null;
  const x = m.a * c[0] + m.c * c[1] + m.e, y = m.b * c[0] + m.d * c[1] + m.f;
  if (x < board.left + 8 || x > board.right - 8 || y < board.top + 8 || y > board.bottom - 8) return null;
  const w = $('#win');
  if (!w.hidden) { const r = w.getBoundingClientRect(); if (x > r.left && x < r.right && y > r.top && y < r.bottom) return null; }
  return { x, y };
}
/** The card just played leaves the hand and flies to where it was sent: a small copy of it crosses the screen and
 *  lands on the province, or on the strip of tasks over the map when the province cannot be seen. Not shown under
 *  reduced motion. Nothing waits for it: the task is already under way. */
export function flyCard(cardId: string, from: DOMRect | null, target: string) {
  if (reduced() || !from) return;
  const to = targetPoint(target) ?? (() => { const r = $('#timeline').getBoundingClientRect(); return { x: r.left + Math.min(r.width, 120) / 2 + 8, y: r.top + 24 }; })();
  const pic = artName('card_' + cardId);
  const ghost = h('div', { class: 'fly-card', 'aria-hidden': 'true', style: pic ? `background-image:url(art/${pic}.webp)` : '' });
  const x0 = from.left + from.width / 2, y0 = from.top + from.height / 2;
  ghost.style.left = `${x0 - 28}px`; ghost.style.top = `${y0 - 38}px`;
  document.body.append(ghost);
  const done = () => ghost.remove();
  if (!ghost.animate) { setTimeout(done, FLY_MS); return; }
  ghost.animate([
    { transform: 'translate(0, 0) scale(1) rotate(-4deg)', opacity: 1 },
    { transform: `translate(${(to.x - x0) * 0.55}px, ${(to.y - y0) * 0.55 - 26}px) scale(.9) rotate(5deg)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${to.x - x0}px, ${to.y - y0}px) scale(.42) rotate(0deg)`, opacity: 0.25 },
  ], { duration: FLY_MS, easing: 'cubic-bezier(.3,.1,.3,1)' }).onfinish = done;
  setTimeout(done, FLY_MS + 200); // in case the animation is never reported as finished
}
