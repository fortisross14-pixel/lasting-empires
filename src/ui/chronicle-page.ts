// The Imperial Chronicle (docs/HISTORY-PLAN.md, phase 4): a full-screen page in seven parts, read from the records
// (engine/records.ts), the annals (engine/chronicle.ts) and the realm as it stands. Laptop first: two columns where
// there is room, one where there is not.
import type { Character } from '../types';
import { h, clear } from './dom';
import { icon } from './icons';
import { S } from './state';
import { openModal, closeModal } from './modal';
import { lineChart, barList, type Series } from './chart';
import { chronicleSection } from './chronicle';
import { ranking, powerTable } from '../engine/turn';
import { player, provsOf, incomeOf, armyPower, roleName } from '../engine/core';
import { recordsOf, mySeries, worldSeries, realmLook, leaders, awards, annalKind, val, FIELD_NAME, type Field, type AnnalKind } from '../engine/records';
import { capsOf, heritageOf } from '../engine/technology';
import { CAPABILITIES, HERITAGES } from '../data/heritage';
import { TROOPS } from '../data/troops';
import { RARITY, RARITY_ORDER } from '../data/characters';
import { RULER_ARCHS } from '../data/nations';
import { rulesTab, showHistory } from './sheets';

type Tab = 'overview' | 'powers' | 'economy' | 'military' | 'civ' | 'fame' | 'annals';
const TABS: [Tab, string, string][] = [['overview', 'Overview', 'laurel'], ['powers', 'World Powers', 'crown'], ['economy', 'Economy', 'coin'], ['military', 'Military', 'sword'], ['civ', 'Civilisation', 'book'], ['fame', 'Hall of Fame', 'star'], ['annals', 'Annals', 'scroll']];
let tab: Tab = 'overview';
let sortBy: Field = 'score', sortUp = false, compare: string[] = [], cmpField: Field = 'score', annalFilter: AnnalKind | 'all' = 'all';

const ord = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const meSeries = (f: Field, name = player(S).name): Series => ({ id: S.player, name, color: player(S).color, points: mySeries(S, f), strong: true });

/** Open the Chronicle, at a part if given. */
export function openChronicle(at?: Tab) {
  if (at) tab = at;
  if (!compare.length) compare = [S.player, ...ranking(S).filter(r => r.id !== S.player).slice(0, 3).map(r => r.id)];
  const root = h('div', { class: 'mbox cpage' });
  const draw = () => {
    clear(root);
    root.append(
      h('div', { class: 'cp-head' }, h('h2', {}, 'The Imperial Chronicle'), h('small', { class: 'muted' }, `${player(S).name}, ${S.startYear}–${S.year}`),
        h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeModal, html: icon('close', 18) })),
      h('div', { class: 'seg cp-tabs', role: 'tablist' }, TABS.map(([k, l, ic]) => h('button', { class: 'seg-b' + (tab === k ? ' on' : ''), role: 'tab', 'aria-selected': String(tab === k), onclick: () => { tab = k; draw(); } }, h('span', { html: icon(ic, 14) }), ' ', l))),
      h('div', { class: 'cp-body' }, ...PARTS[tab](draw)));
  };
  draw();
  openModal(root);
}

/** A small figure: a measure, then and now. */
const tile = (label: string, now: string, then?: string) => h('div', { class: 'cp-tile' }, h('small', {}, label), h('b', {}, now), then ? h('span', { class: 'muted' }, `from ${then}`) : null);

const PARTS: Record<Tab, (redraw: () => void) => (HTMLElement | null)[]> = {
  overview: () => {
    const R = recordsOf(S), first = R.me[0]?.v, now = R.me[R.me.length - 1]?.v;
    const pos = ranking(S).findIndex(x => x.id === S.player) + 1;
    const rivals = ranking(S).filter(r => r.id !== S.player).slice(0, 3).map(r => r.id);
    return [
      h('div', { class: 'cp-tiles' },
        tile('Place among the powers', ord(pos), first ? ord(val(first, 'rank')) : undefined),
        tile('Score', String(val(now, 'score')), first ? String(val(first, 'score')) : undefined),
        tile('Provinces', String(provsOf(S, S.player).length), first ? String(val(first, 'provinces')) : undefined),
        tile('Income a year', String(Math.round(incomeOf(S, S.player).total)), first ? String(val(first, 'income')) : undefined),
        tile('Technologies', String(S.techs.length), first ? String(val(first, 'techs')) : undefined),
        tile('Prestige', String(Math.round(player(S).prestige)), first ? String(val(first, 'prestige')) : undefined)),
      h('div', { class: 'cp-cols' },
        lineChart([meSeries('score'), ...rivals.map(id => ({ id, name: realmLook(S, id)[0], color: realmLook(S, id)[1], points: worldSeries(S, id, 'score') }))], { label: 'Score: you and the three leading powers' }),
        chronicleSection(S, false, false)),
    ];
  },

  powers: redraw => {
    const score = Object.fromEntries(ranking(S).map((r, i) => [r.id, { score: r.score, rank: i + 1 }]));
    const last = recordsOf(S).world.filter(w => w.y < S.year).slice(-1)[0];
    const rows = powerTable(S).filter(r => score[r.id] && (score[r.id].rank <= 30 || r.id === S.player)).map(r => ({
      id: r.id, name: r.name, color: r.color, score: score[r.id].score, rank: score[r.id].rank, prestige: r.prestige, dev: r.dev, provinces: r.provinces, income: r.economy, army: r.military,
      navy: Math.round(armyPower(r.id === S.player ? S.fleet : S.nations[r.id].fleet ?? [])), won: r.won, lost: r.lost, techs: 0, gold: 0,
      was: last?.r[r.id] ? val(last.r[r.id], 'rank') : null,
    }));
    const cols: Field[] = ['rank', 'score', 'prestige', 'dev', 'provinces', 'income', 'army', 'navy', 'won'];
    rows.sort((a, b) => ((a[sortBy] as number) - (b[sortBy] as number)) * (sortUp ? 1 : -1) * (sortBy === 'rank' ? -1 : 1));
    const th = (f: Field) => h('th', {}, h('button', { class: 'linkish' + (sortBy === f ? ' on' : ''), 'aria-sort': sortBy === f ? (sortUp ? 'ascending' : 'descending') : 'none', onclick: () => { if (sortBy === f) sortUp = !sortUp; else { sortBy = f; sortUp = false; } redraw(); } }, f === 'won' ? 'Battles' : FIELD_NAME[f], sortBy === f ? (sortUp ? ' ▲' : ' ▼') : ''));
    type Row = (typeof rows)[number];
    const cell = (r: Row, f: Field) => {
      if (f === 'won') return h('td', {}, r.won + r.lost ? `${r.won}–${r.lost}` : '—');
      if (f !== 'rank') return h('td', {}, String(r[f]));
      const moved = r.was ? r.was - r.rank : 0;
      return h('td', {}, String(r.rank), r.was ? h('small', { class: moved > 0 ? 'up' : moved < 0 ? 'down' : 'muted' }, moved > 0 ? ` ▲${moved}` : moved < 0 ? ` ▼${-moved}` : ' =') : null);
    };
    const tick = (r: Row) => h('input', { type: 'checkbox', 'aria-label': `Compare ${r.name}`, onchange: () => { compare = compare.includes(r.id) ? compare.filter(x => x !== r.id) : [...compare, r.id].slice(-5); redraw(); } }) as HTMLInputElement;
    const table = h('table', { class: 'ptable cp-table' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Compare'), h('th', {}, 'Realm'), ...cols.map(th))),
      h('tbody', {}, rows.map(r => {
        const box = tick(r); box.checked = compare.includes(r.id);
        return h('tr', { class: r.id === S.player ? 'me' : '' }, h('td', {}, box), h('td', {}, h('span', { class: 'swatch', style: `background:${r.color}` }), ' ', r.name), ...cols.map(f => cell(r, f)));
      })));
    const fields: Field[] = ['score', 'rank', 'dev', 'provinces', 'income', 'army', 'prestige'];
    const series: Series[] = compare.map(id => ({ id, name: realmLook(S, id)[0], color: realmLook(S, id)[1], points: id === S.player ? recordsOf(S).world.filter(w => w.r[id]).map(w => ({ y: w.y, v: val(w.r[id], cmpField) })) : worldSeries(S, id, cmpField), strong: id === S.player }));
    return [
      h('div', { class: 'cp-cols' },
        h('div', {}, h('div', { class: 'seg cp-sub' }, fields.map(f => h('button', { class: 'seg-b' + (cmpField === f ? ' on' : ''), onclick: () => { cmpField = f; redraw(); } }, FIELD_NAME[f]))),
          lineChart(series, { label: `${FIELD_NAME[cmpField]} of the realms you compare (every ${10} years)`, invert: cmpField === 'rank' })),
        h('div', {}, h('h3', {}, 'Powers that led the world'), h('ul', { class: 'cp-list' }, leaders(S).slice(0, 10).map(l => h('li', {}, h('span', { class: 'swatch', style: `background:${realmLook(S, l.id)[1]}` }), ' ', realmLook(S, l.id)[0], h('small', { class: 'muted' }, ` best ${ord(l.best)}${S.nations[l.id]?.alive === false ? ' · fallen' : ''}`)))))),
      h('div', { class: 'tscroll' }, table),
      h('p', { class: 'muted small' }, 'Tick up to five realms to compare them. The arrows show the change of place since the last count of the world.'),
    ];
  },

  economy: () => {
    const inc = incomeOf(S, S.player);
    const rows: [string, number][] = [['Provinces', inc.provinces], ['Trade', inc.trade], ['Goods', inc.goods], ['Other', inc.other], ['Upkeep', -inc.upkeep], ['Salaries', -inc.salaries], ['Imports', -inc.imports], ['Administration', -inc.admin]];
    return [h('div', { class: 'cp-cols' },
      lineChart([meSeries('income')], { label: 'Income a year (ducats)' }),
      lineChart([meSeries('gold')], { label: 'Treasury (ducats)' }),
      lineChart([meSeries('dev')], { label: 'Development' }),
      h('div', {}, h('h3', {}, 'This year'), h('table', { class: 'ptable' }, h('tbody', {}, rows.filter(r => Math.round(r[1])).map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', { class: v < 0 ? 'bad' : '' }, String(Math.round(v))))), h('tr', { class: 'me' }, h('td', {}, h('b', {}, 'Total')), h('td', {}, h('b', {}, String(Math.round(inc.total))))))))),
    ];
  },

  military: () => {
    const R = recordsOf(S);
    const byType = new Map<string, number>();
    for (const t of [...S.troops, ...S.fleet]) byType.set(t.type, (byType.get(t.type) ?? 0) + 1);
    const log = S.battleLog ?? [];
    const battlesIn = (foe: string, from: number, to: number) => log.filter(b => (b.att === foe || b.def === foe) && b.year >= from && b.year <= to);
    const wars = [...R.wars].reverse();
    return [h('div', { class: 'cp-cols' },
      lineChart([{ ...meSeries('army', 'Army'), color: player(S).color }, { id: 'navy', name: 'Navy', color: '#5b8fa8', points: mySeries(S, 'navy') }], { label: 'Strength of army and navy' }),
      h('div', {}, h('h3', {}, 'The army now'), byType.size ? barList([...byType.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ name: TROOPS[t]?.name ?? t, n }))) : h('p', { class: 'muted' }, 'No companies under arms.'))),
      h('h3', {}, 'Wars'),
      wars.length ? h('div', { class: 'tscroll' }, h('table', { class: 'ptable' },
        h('thead', {}, h('tr', {}, ...['Against', 'Years', 'Result', 'Provinces', 'Battles'].map(x => h('th', {}, x)))),
        h('tbody', {}, wars.map(w => { const bs = battlesIn(w.foe, w.from, w.to ?? S.year); const won = bs.filter(b => b.player === 'won').length; const d = (w.provs1 ?? provsOf(S, S.player).length) - w.provs0;
          return h('tr', {}, h('td', {}, h('span', { class: 'swatch', style: `background:${realmLook(S, w.foe)[1]}` }), ' ', realmLook(S, w.foe)[0]), h('td', {}, `${w.from}–${w.to ?? 'now'}`),
            h('td', { class: w.result === 'won' ? 'good' : w.result === 'lost' ? 'bad' : '' }, w.result ?? (w.to ? 'ended' : 'under way')), h('td', {}, d > 0 ? `+${d}` : String(d)), h('td', {}, bs.length ? `${won}–${bs.length - won}` : '—')); }))))
        : h('p', { class: 'muted' }, 'No wars yet.'),
      h('p', { class: 'muted small' }, `Battles: ${S.stats.battles[S.player]?.won ?? 0} won, ${S.stats.battles[S.player]?.lost ?? 0} lost. Wars: ${S.stats.wars.won} won, ${S.stats.wars.lost} lost.`),
    ];
  },

  civ: () => {
    const R = recordsOf(S), caps = capsOf(S, S.player), her = HERITAGES[heritageOf(S, S.player)];
    const KIND_ICON = { technology: 'book', contact: 'eye', weapons: 'gun', age: 'star', realm: 'crown' } as const;
    return [h('div', { class: 'cp-cols' },
      lineChart([meSeries('techs')], { label: 'Technologies known' }),
      h('div', {}, h('h3', {}, `${her.name} tradition`), h('p', { class: 'muted' }, her.text),
        h('ul', { class: 'cp-caps' }, CAPABILITIES.map(c => h('li', { class: caps.has(c.id) ? 'good' : 'muted' }, caps.has(c.id) ? '✓ ' : '– ', c.name))),
        h('p', { class: 'muted small' }, `Foreign knowledge seen: ${Object.keys(S.exposed ?? {}).filter(id => !S.techs.includes(id)).length} studies not yet made.`))),
      h('h3', {}, 'Firsts of your civilisation'),
      R.firsts.length ? h('ol', { class: 'cp-annals' }, [...R.firsts].reverse().map(f => h('li', {}, h('span', { class: 'cl-when' }, String(f.year)), h('span', { html: icon(KIND_ICON[f.kind], 14) }), ' ', f.text)))
        : h('p', { class: 'muted' }, 'Firsts are set down as they happen: a new age, a first contact, the first guns met or made.'),
    ];
  },

  fame: () => {
    const me = player(S);
    const kings = [...S.stats.kings, { name: me.ruler.name, arch: me.ruler.arch, from: me.ruler.from, to: S.year, prestige: Math.round(me.prestige - (me.ruler.prestigeAtStart ?? 0)), epithet: undefined as string | undefined }];
    const gens = [...S.characters.filter(c => (c.wins ?? 0) + (c.losses ?? 0) > 0).map(c => ({ name: c.name, wins: c.wins ?? 0, losses: c.losses ?? 0, note: 'Serving' })), ...S.stats.fallen.map(f => ({ name: f.name, wins: f.wins, losses: f.losses, note: `Until ${f.until}` }))].sort((a, b) => b.wins - a.wins).slice(0, 10);
    const great = S.characters.filter(c => RARITY_ORDER.indexOf(c.rarity) >= RARITY_ORDER.indexOf('epic') || c.legendId).sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.skill - a.skill);
    const aw = awards(S);
    return [
      aw.length ? h('div', { class: 'cp-awards' }, aw.map(a => h('div', { class: 'cp-award' }, h('span', { html: icon('laurel', 22) }), h('b', {}, a.title), h('span', {}, a.who), h('small', { class: 'muted' }, a.why)))) : h('p', { class: 'muted' }, 'Honours are earned: a reign that gains lands, wealth or learning is named here.'),
      h('div', { class: 'cp-cols' },
        h('div', {}, h('h3', {}, 'Monarchs'), h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, ...['Monarch', 'Kind', 'Reign', 'Prestige'].map(x => h('th', {}, x)))),
          h('tbody', {}, kings.map(k => h('tr', { class: k.name === me.ruler.name ? 'me' : '' }, h('td', {}, k.name, k.epithet ? h('em', {}, ' ' + k.epithet) : null), h('td', {}, RULER_ARCHS[k.arch]?.name ?? k.arch), h('td', {}, `${k.from}–${k.to}`), h('td', {}, String(k.prestige))))))),
        h('div', {}, h('h3', {}, 'Generals'), gens.length ? h('table', { class: 'ptable' }, h('thead', {}, h('tr', {}, ...['General', 'Won', 'Lost', ''].map(x => h('th', {}, x)))),
          h('tbody', {}, gens.map(g => h('tr', {}, h('td', {}, g.name), h('td', {}, String(g.wins)), h('td', {}, String(g.losses)), h('td', { class: 'muted' }, g.note))))) : h('p', { class: 'muted' }, 'No battles fought yet.'),
          h('h3', {}, 'Distinguished at court'), great.length ? h('ul', { class: 'cp-list' }, great.slice(0, 8).map((c: Character) => h('li', {}, h('b', {}, c.name), h('small', { class: 'muted' }, ` ${RARITY[c.rarity].name} ${roleName[c.role]}, skill ${c.skill}`)))) : h('p', { class: 'muted' }, 'No one of great rank serves yet.'))),
    ];
  },

  annals: redraw => {
    const R = recordsOf(S);
    type Line = { year: number; text: string; kind: AnnalKind };
    const lines: Line[] = [
      ...(S.stats.annals ?? []).map(a => ({ year: a.year, text: a.text, kind: annalKind(a.text) })),
      ...R.firsts.map(f => ({ year: f.year, text: f.text, kind: 'civilisation' as AnnalKind })),
      ...R.wars.map(w => ({ year: w.from, text: `War with ${realmLook(S, w.foe)[0]}${w.to ? `, to ${w.to}${w.result ? ` (${w.result})` : ''}` : ', still under way'}`, kind: 'war' as AnnalKind })),
    ].filter((l, i, a) => a.findIndex(x => x.text === l.text && x.year === l.year) === i).sort((a, b) => b.year - a.year);
    const shown = lines.filter(l => annalFilter === 'all' || l.kind === annalFilter);
    const kinds: [AnnalKind | 'all', string][] = [['all', 'All'], ['war', 'War'], ['diplomacy', 'Diplomacy'], ['civilisation', 'Civilisation'], ['realm', 'The realm']];
    return [
      h('button', { class: 'btn wide', onclick: () => showHistory() }, 'The history of your realm, reign by reign'),
      h('div', { class: 'seg cp-sub' }, kinds.map(([k, l]) => h('button', { class: 'seg-b' + (annalFilter === k ? ' on' : ''), onclick: () => { annalFilter = k; redraw(); } }, l, h('small', {}, ` ${k === 'all' ? lines.length : lines.filter(x => x.kind === k).length}`)))),
      shown.length ? h('ol', { class: 'cp-annals' }, shown.map(l => h('li', { class: 'k-' + l.kind }, h('span', { class: 'cl-when' }, String(l.year)), l.text))) : h('p', { class: 'muted' }, 'Nothing of this kind set down yet.'),
    ];
  },
};

/** Rules & Reference: the numbers behind the game, as a page of its own. */
export function openRules() {
  const body = h('div', { class: 'cp-body' });
  rulesTab(body);
  openModal(h('div', { class: 'mbox cpage' },
    h('div', { class: 'cp-head' }, h('h2', {}, 'Rules & Reference'), h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: closeModal, html: icon('close', 18) })),
    body));
}
