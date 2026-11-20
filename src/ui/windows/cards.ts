// The Cards tab of every deck: buying, the hand, selling, the forge, and tasks under way.
import type { GameState, Character, Cat } from '../../types';
import { RULER_ARCHS } from '../../data/nations';
import { TROOPS } from '../../data/troops';
import { TECH } from '../../data/techs';
import { player, armyPower, armyCap, roleName } from '../../engine/core';
import { typesFor, poolOf, cardType, type CardType } from '../../engine/cards';
import { CARDS, CAT_INFO, handOf, cardRates, buyCost, cardBlocked, handLimit, handTotalLimit, heldOf, heldTotal, handExcess, sellCards } from '../../engine/cards';
import { MISSION_INFO, cancelMission, techCost, cardRoles } from '../../engine/missions';
import { buyCard, buyBlocked, mergePreview, doMerge } from '../../engine/drafts';
import { h, signed } from '../dom';
import { icon } from '../icons';
import { troopCard, charCard, handCard } from '../cards';
import { navyCap } from '../../engine/navy';
import { rankOf, missionCap, missionsLeft, VICEROY_COST } from '../../engine/realm';
import { S, pick, cv, forge, setPick, setCv, setForge, setPreferChar } from '../state';
import { toast, act, missionTitle, qText } from '../app';
import { renderWin, CAT_ROLES, missionsOfCat } from './frame';
import { recipeBook } from './military';
import { confirmBox, charDetail } from '../modal';
import { openCardModal } from '../planner';

// ---------- the Cards tab: everything you hold, with filters, packs, archive, forge and recipes ----------
export function cardsTab(cat: Cat, body: HTMLElement) {
  const mil = cat === 'military';
  const rate = cardRates(S)[cat];
  const hand = handOf(S, cat);
  const pct = Math.round((S.cardAccum[cat] ?? 0) * 100);
  const setMode = (mode: typeof cv.mode) => { setCv({ ...cv, mode: cv.mode === mode ? 'browse' : mode, sel: [], filter: mode === 'select' ? 'hand' : cv.filter }); setForge([]); renderWin(); };
  // 1. get cards: one button per kind of card this deck sells
  const BUY: Record<CardType, { label: string; icon: string }> = {
    people: { label: 'Person', icon: 'people' }, troops: { label: 'Troop', icon: 'helm' },
    improvement: { label: 'Improvement', icon: 'anvil' }, action: { label: 'Action', icon: 'star' }, burden: { label: '', icon: 'star' },
  };
  const shop = h('div', { class: 'shop' });
  for (const ty of typesFor(cat)) {
    const why = buyBlocked(S, cat, ty);
    const pool = poolOf(S, cat, ty);
    const sub = pool.length === 1 ? pool[0].name : 'pick 1 of 3';
    shop.append(h('button', { class: 'shop-b' + (why ? ' blocked' : ''), title: why ?? `${BUY[ty].label} card: ${sub}`, onclick: () => { if (why) return toast(why, 'bad'); const n = S.hand.length; act(() => buyCard(S, cat, ty)); if (S.hand.length > n) toast(`${CARDS[S.hand[S.hand.length - 1].card].name} added to your hand`, 'good'); } },
      h('span', { class: 'shop-i', html: icon(BUY[ty].icon, 18) }), h('span', { class: 'shop-t' }, h('b', {}, BUY[ty].label), h('small', {}, sub)), h('span', { class: 'shop-c' }, `${buyCost(S, cat)}★`)));
  }
  // tasks of this menu that are under way: always first, so you see who is busy
  const now = missionsOfCat(cat);
  if (now.length) { body.append(h('h3', { class: 'sec-h' }, `Under way · ${now.length}`)); for (const m of now) body.append(missionRow(m)); }
  const bar = h('div', { class: 'ctools' },
    h('button', { class: 'btn small' + (cv.mode === 'select' ? ' on' : ''), onclick: () => setMode('select') }, h('span', { html: icon('coin', 14) }), ' Sell cards'),
    mil ? h('button', { class: 'btn small' + (cv.mode === 'forge' ? ' on' : ''), onclick: () => setMode('forge') }, h('span', { html: icon('merge', 14) }), ' Forge') : null,
    mil ? h('button', { class: 'btn small' + (cv.mode === 'recipes' ? ' on' : ''), onclick: () => setMode('recipes') }, h('span', { html: icon('list', 14) }), ' Recipes') : null);
  // 2. what you hold
  const held = heldOf(S, cat), lim = handLimit(S), tot = heldTotal(S), tlim = handTotalLimit(S);
  const ex = handExcess(S);
  body.append(h('div', { class: 'cs-head' }, h('h3', { class: 'sec-h' }, `Your cards `, h('span', { class: 'hlim' + (held > lim ? ' over' : held >= lim ? ' full' : '') }, `${held}/${lim}`)), bar));
  // buying: one compact row; the fine print sits under it
  body.append(h('div', { class: 'shop-row' }, h('span', { class: 'shop-l' }, 'Buy'), shop),
    h('p', { class: 'shop-note', title: rate.parts.map(p => `${p.label} ${signed(p.v)}`).join(', ') }, `${S.np.toFixed(1)}★ nation points · a free card every ${rate.rate > 0 ? (1 / rate.rate).toFixed(1) : '—'} years (next ${pct}%) · tasks this year ${S.launched ?? 0}/${missionCap(S)}${tot > tlim ? ` · ${tot}/${tlim} cards in all decks` : ''}`));
  if (cv.mode === 'forge') return forgeView(body);
  if (cv.mode === 'recipes') { body.append(recipeBook(true)); return; }
  if (ex.total > 0) body.append(h('p', { class: 'hlim-warn' }, ex.byCat[cat] ? `${ex.byCat[cat]} too many ${CAT_INFO[cat].name} cards` : `${ex.total} card${ex.total > 1 ? 's' : ''} over the limit across your decks`, `: sell before you end the turn (½ nation point each). A bigger realm may hold more.`));
  // filters
  const filters: [string, string, number][] = [['all', 'All', 0], ['hand', 'Hand', hand.length], ['people', 'Court', S.characters.filter(c => CAT_ROLES[cat].includes(c.role)).length]];
  if (mil) filters.push(['troops', 'Troops', S.troops.length], ['ships', 'Ships', S.fleet.length], ['equip', 'Improvements', hand.filter(x => cardType(CARDS[x.card]) === 'improvement').length]);
  if (!filters.some(f => f[0] === cv.filter)) cv.filter = 'all';
  body.append(h('div', { class: 'seg cfilter' }, filters.map(([id, label, n]) => h('button', { class: 'seg-b' + (cv.filter === id ? ' on' : ''), onclick: () => { setCv({ ...cv, filter: id }); renderWin(); } }, label, n ? h('small', {}, ` ${n}`) : null))));
  if (cv.mode === 'select') {
    body.append(h('div', { class: 'mcap' }, h('b', {}, `Tap cards to sell (${cv.sel.length} chosen · +${(cv.sel.length / 2).toFixed(1)} nation points)`), h('span', {},
      h('button', { class: 'btn small primary' + (cv.sel.length ? '' : ' blocked'), onclick: () => { if (!cv.sel.length) return; const n = cv.sel.length; act(() => sellCards(S, cv.sel), `${n} card${n > 1 ? 's' : ''} sold: +${(n / 2).toFixed(1)} nation points`); setCv({ ...cv, mode: handExcess(S).total > 0 ? 'select' : 'browse', sel: [] }); renderWin(); } }, 'Sell'),
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
          setCv({ ...cv, sel: next != null ? [...cv.sel, next] : cv.sel.filter(u => !st.uids.includes(u)) }); renderWin(); return;
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
export function forgeView(body: HTMLElement) {
  body.append(h('p', { class: 'muted' }, 'Pick two cards. Two of a kind become one company about 1.8 times as strong. Troops that match a recipe become a better kind, keeping most of their joint strength. Equipment upgrades one troop.'));
  if (forge.length === 2) {
    const r = mergePreview(S, forge[0], forge[1]);
    if ('error' in r) body.append(h('p', { class: 'bad' }, r.error));
    else body.append(h('div', { class: 'forge-res' }, troopCard({ type: r.out, vet: r.vet, str: 100, might: r.might }, {}),
      h('div', {}, h('b', {}, `${TROOPS[r.out].name} ${'★'.repeat(r.vet)}${r.might > 1 ? ` ×${r.might.toFixed(1)}` : ''}`),
        h('p', {}, `Power ${r.before.toFixed(1)} → ${r.after.toFixed(1)} (×${(r.after / Math.max(0.1, r.before)).toFixed(2)})`),
        h('p', { class: 'muted' }, r.tech ? `Needs research: ${TECH[r.tech].name}` : `${r.cost} ducats · frees a company slot`),
        h('button', { class: 'btn primary' + (r.tech || player(S).gold < r.cost ? ' blocked' : ''), onclick: () => { const a = forge[0], b = forge[1]; setForge([]); act(() => doMerge(S, a, b), 'Forged!'); } }, 'Forge'))));
  } else body.append(h('p', { class: 'fact' }, forge.length ? 'Pick a second card' : 'Pick the first card'));
  const pickF = (uid: number) => { setForge(forge.includes(uid) ? forge.filter(x => x !== uid) : [...forge.slice(-1), uid]); renderWin(); };
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
export function stacks(list: { uid: number; card: string }[]) {
  const out: { card: string; uids: number[] }[] = [];
  for (const hc of list) { const st = out.find(x => x.card === hc.card); if (st) st.uids.push(hc.uid); else out.push({ card: hc.card, uids: [hc.uid] }); }
  return out;
}

/** Choose a person then a mission, or a mission then a person. */
export function missionsTab(cat: Cat, body: HTMLElement) {
  const left = missionsLeft(S);
  body.append(h('div', { class: 'mcap' + (left ? '' : ' full') }, h('b', {}, `Missions this year: ${S.launched ?? 0} of ${missionCap(S)}`), h('small', {}, `${rankOf(S).name}${S.viceroys?.length ? ` · ${S.viceroys.length} viceroy${S.viceroys.length > 1 ? 's' : ''} take ${S.viceroys.length * VICEROY_COST}` : ''} · resets in spring`)));
  const people = S.characters.filter(c => CAT_ROLES[cat].includes(c.role) || (cat === 'military' && c.ruler && RULER_ARCHS[player(S).ruler.arch]?.role === 'general'));
  const cards = handOf(S, cat).filter(hc => CARDS[hc.card].kind === 'mission');
  const pc = pick.card != null ? S.hand.find(x => x.uid === pick.card) : undefined;
  const pp = pick.char != null ? S.characters.find(x => x.uid === pick.char) : undefined;
  const canDo = (c: Character, hcId: string) => cardRoles(hcId).includes(c.role) && c.mission == null;
  const go = (cardUid: number, charUid: number) => { setPreferChar(charUid); setPick({}); openCardModal(cardUid); };
  const cols = h('div', { class: 'mcols' });
  const pcol = h('div', { class: 'mcol' }, h('h3', {}, pp ? `${pp.name}` : 'People'), h('p', { class: 'muted small' }, pc ? 'Who will carry it out?' : 'Tap a person, then a mission card'));
  const prow = h('div', { class: 'cards-row wrap' });
  if (!people.length) prow.append(h('p', { class: 'muted' }, 'Nobody yet. Hire people with the hiring cards.'));
  for (const c of people) {
    const busy = c.mission != null;
    const ok = !pc || canDo(c, pc.card);
    prow.append(charCard(c, S, { small: true, selected: pp?.uid === c.uid, dim: busy || !ok, badge: busy ? (c.mission === -1 ? 'viceroy' : c.mission === -4 ? `back in ${c.back}q` : c.mission === -5 ? 'defending' : 'busy') : undefined, onclick: () => {
      if (busy) return toast(c.mission === -1 ? 'Serving as a viceroy' : c.mission === -4 ? `Riding home: back in ${qText(c.back ?? 1)}` : c.mission === -5 ? 'Standing ready to defend' : 'Away on a task');
      if (pc) { if (!ok) return toast('This person cannot do that mission', 'bad'); return go(pc.uid, c.uid); }
      setPick({ char: pp?.uid === c.uid ? undefined : c.uid }); renderWin();
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
      setPick({ card: pc && st.uids.includes(pc.uid) ? undefined : hc.uid }); renderWin();
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

export function missionRow(m: GameState['missions'][number]) {
  const c = S.characters.find(x => x.uid === m.char);
  const info = MISSION_INFO[m.kind];
  const pct = m.kind === 'research' ? Math.min(100, (m.progress / techCost(S, m.target)) * 100) : ((m.total - m.turnsLeft) / Math.max(1, m.total)) * 100;
  return h('div', { class: 'mission k-' + info.role },
    h('span', { class: 'a-ico', html: icon(info.icon, 20) }),
    h('div', { class: 'a-t' }, h('b', {}, missionTitle(m)),
      h('small', {}, `${c?.name ?? '?'}${m.troops.length ? ` with ${m.troops.length} troops` : ''} · ${qText(m.turnsLeft)} left`),
      h('div', { class: 'pbar' }, h('i', { style: `width:${pct}%` }))),
    h('button', { class: 'iconbtn', 'aria-label': 'Recall', title: 'Recall', onclick: () => confirmBox('Recall this task?', 'The card is lost. Construction refunds half its cost.', 'Recall', () => act(() => cancelMission(S, m.id))), html: icon('close', 16) }));
}
