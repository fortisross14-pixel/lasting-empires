// Economy window: the six needs and the steward, goods, trade routes and posts, the ledger.
import { sfx } from '../sound';
import type { GameState, Province } from '../../types';
import { TECH } from '../../data/techs';
import { GOODS, FOOD, RAW, MADE } from '../../data/goods';
import { stewardBudget, stewardPrice, STEWARD_PRICE, STEWARD_SHARES, STEWARD_DEFAULT } from '../../engine/trade';
import { NEED_GROUPS } from '../../data/goods';
import {
  quarterFlow, needs, partners, routeBlocked, postBlocked, routeCap, postCap, postTurns, postCost, distanceTo, price, canMake, workshopCap, dealFor, POST_UPKEEP,
  MAX_ROUTE,
} from '../../engine/trade';
import { player, provsOf, incomeOf, nationName } from '../../engine/core';
import { CARDS, cardFor } from '../../engine/cards';
import { officeCost, sellOffices } from '../../engine/drafts';
import { provKnown } from '../../engine/overseas';
import { h, clear, signed } from '../dom';
import { icon } from '../icons';
import { S } from '../state';
import { refresh, toast, act, qText } from '../app';
import { renderWin } from './frame';
import { missionRow } from './cards';
import { stat, actionRow } from '../sheets';
import { openModal, openPage, closeModal, confirmBox } from '../modal';
import { openPlanner } from '../planner';

export function ledgerTab(body: HTMLElement) {
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
    h('tr', {}, h('td', {}, `Goods bought and trade posts${stewardBudget(S) > 0 ? ` (the steward: ${(quarterFlow(S).stewardCost * 4).toFixed(1)})` : ''}`), h('td', { class: 'bad' }, '−' + inc.imports.toFixed(1))),
    h('tr', {}, h('td', {}, 'Administration (grows with the realm)'), h('td', { class: 'bad' }, '−' + inc.admin.toFixed(1))),
    h('tr', { class: 'total' }, h('td', {}, 'Each year'), h('td', {}, signed(inc.total))))));
  body.append(h('h3', {}, 'Control and unrest'));
  for (const p of provsOf(S, S.player).sort((a, b) => a.control - b.control)) {
    body.append(h('div', { class: 'ctl' }, h('span', {}, p.name), h('span', { class: 'ctl-bar' }, h('i', { style: `width:${p.control}%`, class: p.control < 30 ? 'low' : '' })), h('b', {}, `${Math.round(p.control)}%`)));
  }
  body.append(h('p', { class: 'muted' }, 'Low control cuts income and can spark revolts. Temples, courthouses, stability and Royal Progress raise it. Newly conquered lands start low.'));
  body.append(actionRow('scales', 'Sell offices', `${officeCost(S)} ducats for 2 nation points · the price doubles, triples… each time this year`, player(S).gold < officeCost(S) ? `Needs ${officeCost(S)} ducats` : null, () => { sfx('coin'); act(() => sellOffices(S), '+2 nation points'); }));
}

export const DIST_NAME = ['next door', 'near', 'far', 'overseas'];
/** The trade card for buying or selling, if you hold one. */
export const tradeCard = (dir: 'buy' | 'sell') => S.hand.find(h => CARDS[h.card].missions?.includes('route') && (CARDS[h.card].trade ?? dir) === dir);
export const TRADE_CARD_NAME = { buy: 'Import Contract', sell: 'Export Contract' };
export const countCards = (id: string) => S.hand.filter(h => h.card === id).length;
/** "Uses 1 weapons (you have 0.4): the rest bought at double price." */
export function goodsNote(need: Record<string, number>) {
  const lack = Object.entries(need).filter(([g, n]) => (S.stock[g] ?? 0) < n);
  return h('p', { class: lack.length ? 'bad small' : 'muted small' }, 'Uses ' + Object.entries(need).map(([g, n]) => `${n} ${GOODS[g].name.toLowerCase()} (you have ${(S.stock[g] ?? 0).toFixed(1)})`).join(', ') + (lack.length ? '. What is missing is bought at double price, included above.' : ' from your warehouses.'));
}
export const f1 = (v: number) => (Math.abs(v) < 0.05 ? '0' : v.toFixed(1));

/** The goods ledger: what you make, use and have in store, good by good. */
/** Which of the six needs is opened to show its goods. */
export let needOpen: string | null = null;
export const STEWARD_NAMES = ['Thrifty', 'Prudent', 'Generous'];

/** Goods: the six needs of the realm first, each with a bar and one sentence; the 21 goods are one tap deeper. */
export function goodsTab(body: HTMLElement) {
  const f = quarterFlow(S);
  const need = needs(S);
  const yr = (r: Record<string, number>, g: string) => (r[g] ?? 0) * 4;
  // the steward: one switch and three purses
  const st = S.steward ?? { on: false, share: STEWARD_DEFAULT };
  const purse = Math.round(stewardBudget(S)), spent = Math.round(f.stewardCost * 4);
  const setSteward = (v: { on: boolean; share: number }) => { S.steward = v; refresh(); };
  body.append(h('div', { class: 'steward' + (st.on ? ' on' : '') },
    h('label', { class: 'set-row' },
      h('span', { class: 'gm-i', html: icon('scales', 20) }),
      h('span', { class: 'gm-t' }, h('b', {}, 'Royal steward'), h('small', {}, st.on
        ? `Buys what the realm lacks at ${STEWARD_PRICE}× the price. Up to ${purse} ducats a year; now ${spent}.`
        : 'Switched off: a need you do not meet yourself goes unmet.')),
      h('input', { type: 'checkbox', class: 'set-sw', role: 'switch', 'aria-label': 'Royal steward', checked: st.on ? true : undefined, onchange: (e: Event) => setSteward({ ...st, on: (e.target as HTMLInputElement).checked }) })),
    st.on ? h('div', { class: 'seg steward-seg', role: 'radiogroup', 'aria-label': 'The steward\'s purse' }, STEWARD_SHARES.map((v, i) =>
      h('button', { class: 'seg-b' + (Math.abs(st.share - v) < 1e-9 ? ' on' : ''), role: 'radio', 'aria-checked': String(Math.abs(st.share - v) < 1e-9), onclick: () => setSteward({ ...st, share: v }) }, STEWARD_NAMES[i], h('small', {}, ` ${Math.round(v * 100)}%`)))) : null));
  const canBuy = !!tradeCard('buy'), canSell = !!tradeCard('sell');
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
  const table = (title: string, list: string[], into: HTMLElement = body) => {
    if (title) into.append(h('h3', {}, title));
    into.append(h('table', { class: 'gtable' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Good'), h('th', { class: 'num' }, 'Stock'), h('th', { class: 'num' }, '± a year'), h('th', {}, ''), h('th', {}, ''))),
      h('tbody', {}, list.map(row))));
  };
  // the six needs
  const list = h('div', { class: 'needs' });
  for (const grp of NEED_GROUPS) {
    const want = grp.needs.reduce((a, n) => a + (f.need[n] ?? 0), 0);
    const miss = grp.needs.reduce((a, n) => a + (f.missing[n] ?? 0), 0);
    const bought = grp.needs.reduce((a, n) => a + (f.steward[n] ?? 0), 0);
    const cost = grp.needs.reduce((a, n) => a + (f.steward[n] ?? 0) * stewardPrice(S, n), 0) * 4;
    const met = want > 0 ? Math.max(0, 1 - miss / want) : 1, own = want > 0 ? Math.max(0, 1 - (miss + bought) / want) : 1;
    // a need met only by emptying the warehouses is about to stop being met
    const lasts = Math.min(99, ...grp.needs.flatMap(n => (n === 'food' ? [FOOD] : [[n]])).map(gs => {
      const net = gs.reduce((a, g) => a + yr(f.made, g) + yr(f.bought, g) - yr(f.used, g) - yr(f.input, g) - yr(f.sold, g), 0);
      return net < -0.05 ? Math.floor(gs.reduce((a, g) => a + (S.stock[g] ?? 0), 0) / (-net / 4)) : 99;
    }));
    const short = miss > want * 0.02, helped = bought > want * 0.02, draining = !short && !helped && want > 0 && lasts < 8;
    const text = want <= 0 ? grp.idle
      : short ? `${Math.round((1 - met) * 100)}% missing: ${grp.lack}.${st.on ? ' The steward\'s purse is spent.' : ''}`
      : helped ? `The steward buys ${Math.round((bought / want) * 100)}% of it for ${f1(cost)} ducats a year: a route or a workshop would be cheaper.`
      : draining ? `Met from the warehouses, which last ${lasts <= 0 ? 'no longer' : `${lasts} more season${lasts > 1 ? 's' : ''}`}. ${st.on ? 'Then the steward buys it.' : 'Then it runs short.'}`
      : '';
    const word = want <= 0 ? '' : short ? 'Short' : helped ? 'Bought' : draining ? 'Running down' : 'Met';
    const open = needOpen === grp.id;
    const row = h('button', { class: 'need-row' + (short ? ' short' : draining || helped ? ' warn' : '') + (open ? ' open' : ''), 'aria-expanded': String(open), onclick: () => { needOpen = open ? null : grp.id; renderWin(); } },
      h('span', { class: 'gm-i', html: icon(grp.icon, 20) }),
      h('span', { class: 'need-t' }, h('span', { class: 'need-h' }, h('b', {}, grp.name), word ? h('em', {}, word) : null), text ? h('small', {}, text) : null,
        want > 0 ? h('span', { class: 'need-bar', role: 'img', 'aria-label': `${Math.round(met * 100)}% met` }, h('i', { class: 'own', style: `width:${own * 100}%` }), h('i', { class: 'stew', style: `width:${(met - own) * 100}%` })) : null),
      h('span', { class: 'br-chev', html: icon('next', 14) }));
    list.append(row);
    if (open) { const box = h('div', { class: 'need-goods' }); table('', grp.goods, box); list.append(box); }
  }
  body.append(list);
  body.append(h('p', { class: 'muted small' }, `Buying and selling abroad takes a card: Import Contracts ${countCards('import_contract')}, Export Contracts ${countCards('export_contract')}, Trade Post Charters ${countCards('trading_post')}.`));
  // everything, for those who want the whole ledger
  const all = h('details', { class: 'msec allgoods' }, h('summary', {}, `All ${Object.keys(GOODS).length} goods`));
  table('Food', FOOD, all);
  table('Raw materials', RAW.filter(g => !GOODS[g].food), all);
  table('Made goods', MADE, all);
  all.append(h('p', { class: 'muted small' }, 'Tap a good for what it does and what it is made from. Price is per load. Full warehouses sell the rest at home for half the price.'));
  body.append(all);
  body.append(h('h3', {}, 'Workshops'));
  const shops = provsOf(S, S.player).filter(p => workshopCap(S, p) > 0);
  if (!shops.length) body.append(h('p', { class: 'muted' }, 'No workshops yet. Build one with a Guild Charter (Economy) in any town: it makes 2 loads a year of the good you choose.'));
  for (const p of shops) body.append(workshopRow(p, f));
}

/** Trade: routes, and posts with the routes that run through them. */
export function tradeTab(body: HTMLElement) {
  const inc = incomeOf(S, S.player);
  body.append(h('div', { class: 'stats' },
    stat('Sold a year', '+' + inc.goods.toFixed(1)), stat('Bought a year', '−' + inc.imports.toFixed(1)),
    stat('Trade routes', `${S.routes.length}/${routeCap(S)}`), stat('Trade posts', `${S.posts.length}/${postCap(S)}`)));
  body.append(h('p', { class: 'muted small' }, 'Each route takes a card (Import or Export Contract) and a merchant for one quarter; it does not use up a task. Buying directly is dear; found a Trade Post (Trade Post Charter card) and every route with that realm buys at 90% and sells at 120% of the price. Start a route from Buy or Sell in the Goods tab.'));
  const routeRow = (r: GameState['routes'][number]) => {
    const each = price(S, r.good) * dealFor(S, r.partner, r.dir, r.deal);
    return h('div', { class: 'grow-row' },
      h('span', { class: 'gico', style: `color:${GOODS[r.good].color}`, html: icon(GOODS[r.good].icon, 20) }),
      h('div', { class: 'g-t' }, h('b', {}, `${r.dir === 'buy' ? 'Buy' : 'Sell'} ${r.amount} ${GOODS[r.good].name.toLowerCase()} a year`), h('small', {}, `${r.dir === 'buy' ? 'from' : 'to'} ${nationName(S, r.partner)} · ${each.toFixed(1)} each · `, h('span', { class: r.dir === 'buy' ? 'bad' : 'good' }, `${r.dir === 'buy' ? '−' : '+'}${(each * r.amount).toFixed(1)}/yr`))),
      h('div', { class: 'g-acts' }, h('button', { class: 'btn small ghost', onclick: () => confirmBox('Close this route?', 'Opening it again takes a merchant another quarter.', 'Close route', () => act(() => { S.routes = S.routes.filter(x => x !== r); }, 'Route closed', 'Route closed')) }, 'Close')));
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

export function workshopRow(p: Province, f = quarterFlow(S)) {
  const cap = workshopCap(S, p);
  const made = f.factories.find(x => x.prov === p.id)?.made ?? 0;
  const chips = h('div', { class: 'tags' }, MADE.map(g => {
    const ok = canMake(S, g);
    return h('button', { class: 'tchip small' + (p.make === g ? ' sel' : '') + (ok ? '' : ' blocked'), title: GOODS[g].desc, onclick: () => { if (!ok) return toast(`Needs ${TECH[GOODS[g].tech!].name}`, 'bad'); act(() => { p.make = g; }, undefined, `${p.name} makes ${GOODS[g].name.toLowerCase()}`); }, html: icon(GOODS[g].icon, 14) + ' ' + GOODS[g].name });
  }));
  const rec = p.make ? GOODS[p.make]?.recipe : null;
  const note = !p.make ? 'Choose what it makes.' : made + 0.05 < cap ? `Makes ${f1(made)} of ${f1(cap)} a year: short of ${Object.keys(rec!).map(i => GOODS[i].name.toLowerCase()).join(' or ')}.` : `Makes ${f1(cap)} ${GOODS[p.make].name.toLowerCase()} a year from ${Object.entries(rec!).map(([i, a]) => `${f1(a * cap)} ${GOODS[i].name.toLowerCase()}`).join(' + ')}.`;
  return h('div', { class: 'wshop' }, h('b', {}, `${p.name} · ${[p.buildings.includes('workshop') ? 'Workshop' : '', p.buildings.includes('manufactory') ? 'Manufactory' : ''].filter(Boolean).join(' + ')}`), h('small', { class: made + 0.05 < cap && p.make ? 'bad' : 'muted' }, note), chips);
}

/** Pick a realm to buy from or sell to. */
export function openRouteDialog(g: string, dir: 'buy' | 'sell') {
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
  openPage(box);
}

/** Pick where to found a trade post. */
export function openPostPicker() {
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
  openPage(h('div', { class: 'mbox narrow' }, h('h2', { html: icon('anchor', 22) + ' Found a trade post' }),
    h('p', { class: 'muted' }, 'A merchant travels there and sets up: 2 quarters next door, 3 near, 4 far, 6 overseas. Then every route with that realm buys at 90% of the market price and sells 20% above it, and you can keep one more route.'),
    list, h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: closeModal }, 'Close'))));
}
