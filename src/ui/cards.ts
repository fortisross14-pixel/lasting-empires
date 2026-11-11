// Card faces for every kind of card in the game.
import type { TroopCard, EquipCard, Character, GameState } from '../types';
import { TROOPS, EQUIPMENT, TACTICS } from '../data/troops';
import { TRAITS, RARITY } from '../data/characters';
import { CORE } from '../data/core';
import { CARDS, cardType, CARD_TYPE_NAME, unitFor } from '../engine/cards';
import { roleName, troopPower } from '../engine/core';
import { h } from './dom';
import { icon } from './icons';
import { artImg } from './art';

/** The art panel: the painting when there is one, else the line icon. */
const artDiv = (name: string, fallback: string, ...kids: (HTMLElement | null)[]) => { const pic = artImg(name); return h('div', { class: 'c-art' + (pic ? ' has-pic' : ''), html: pic ?? fallback }, ...kids); };

interface Opts { small?: boolean; selected?: boolean; dim?: boolean; onclick?: (e: Event) => void; badge?: string; cls?: string; wide?: boolean; count?: number; }

const stars = (n: number) => (n > 0 ? '★'.repeat(n) : '');

function shell(kind: string, o: Opts, ...kids: (HTMLElement | null)[]) {
  const el = h('button', {
    class: `card k-${kind}${o.wide ? ' wide' : o.small ? ' small' : ''}${o.selected ? ' sel' : ''}${o.dim ? ' dim' : ''} ${o.cls ?? ''}`,
    type: 'button', onclick: o.onclick,
  }, ...kids);
  if (o.badge) el.append(h('span', { class: 'c-badge' }, o.badge));
  if ((o.count ?? 1) > 1) el.append(h('span', { class: 'c-count' }, `×${o.count}`));
  return el;
}

const VET_NAME = ['Recruits', 'Seasoned', 'Veterans', 'Elite'];

export function troopCard(t: Pick<TroopCard, 'type' | 'vet' | 'str'> & { mission?: number; might?: number }, o: Opts = {}) {
  const d = TROOPS[t.type];
  return shell('troop', { ...o, cls: `tier${d.tier} ${o.cls ?? ''}` },
    h('div', { class: 'c-top' }, h('span', { class: 'c-name' }, d.name), h('span', { class: 'c-vet' }, stars(t.vet))),
    artDiv('unit_' + t.type, icon(d.icon, o.small ? 26 : 34)),
    h('div', { class: 'c-power', title: 'Total strength' }, h('b', {}, String(Math.round(troopPower(t)))), h('small', {}, VET_NAME[Math.min(3, t.vet)])),
    (t.might ?? 1) > 1 ? h('div', { class: 'c-might', title: 'Forged: worth this many ordinary companies' }, `×${(t.might ?? 1).toFixed(1)}`) : null,
    h('div', { class: 'c-stats' },
      h('span', { title: 'Melee' }, h('b', {}, 'M'), d.melee), h('span', { title: 'Fire' }, h('b', {}, 'F'), d.fire), h('span', { title: 'Defence' }, h('b', {}, 'D'), d.def)),
    h('div', { class: 'c-bar' }, h('i', { style: `width:${Math.round(t.str)}%` })),
    t.mission != null ? h('div', { class: 'c-away' }, 'On mission') : null,
  );
}

export function equipCard(e: Pick<EquipCard, 'type'>, o: Opts = {}) {
  const d = EQUIPMENT[e.type];
  return shell('equip', o,
    h('div', { class: 'c-top' }, h('span', { class: 'c-name' }, d.name)),
    artDiv('card_eq_' + e.type, icon(d.icon, o.small ? 26 : 34)),
    h('div', { class: 'c-text' }, o.small ? 'Equipment' : d.desc),
  );
}

export const ROLE_ICON: Record<string, string> = { general: 'helm', diplomat: 'scroll', admin: 'quill', merchant: 'coin', researcher: 'book', explorer: 'anchor', conqueror: 'lance', colonist: 'tower', admiral: 'ship', courtier: 'people', priest: 'church', artist: 'quill', leader: 'laurel' };

export function charCard(c: Character, s: GameState, o: Opts = {}) {
  if (o.wide) return shell('char', { ...o, cls: `r-${c.rarity} role-${c.role} ty-person ${o.cls ?? ''}` },
    artDiv('role_' + c.role, icon(ROLE_ICON[c.role] ?? 'crown', 34)),
    h('div', { class: 'c-body' },
      h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, `Person · ${c.ruler ? 'Monarch' : roleName[c.role]}`), h('span', { class: 'c-rarity' }, RARITY[c.rarity].name)),
      h('div', { class: 'c-name c-title' }, c.name),
      h('div', { class: 'c-text' }, c.traits.map(t => TRAITS[t]?.name ?? t).join(' · ') || 'No traits', ` · age ${s.year - c.born}`),
      c.mission != null ? h('div', { class: 'c-away' }, c.mission === -1 ? 'Viceroy' : 'On mission') : null));
  return shell('char', { ...o, cls: `r-${c.rarity} role-${c.role} ${o.cls ?? ''}` },
    h('div', { class: 'c-top' }, h('span', { class: 'c-role' }, c.ruler ? 'Monarch' : roleName[c.role]), h('span', { class: 'c-gem', title: RARITY[c.rarity].name })),
    artDiv('role_' + c.role, icon(ROLE_ICON[c.role] ?? 'crown', o.small ? 24 : 32)),
    h('div', { class: 'c-name c-person' }, c.name),
    h('div', { class: 'c-rarity' }, RARITY[c.rarity].name),
    h('div', { class: 'c-traits' }, c.traits.map(t => TRAITS[t]?.name ?? t).join(' · ') || '—'),
    o.small ? null : h('div', { class: 'c-age' }, `Age ${s.year - c.born}`),
    c.mission != null ? h('div', { class: 'c-away' }, 'On mission') : null,
  );
}

const KIND_LABEL: Record<string, string> = { ship: 'Ship', troop: 'Troop', equip: 'Equipment', hire: 'Hire', mission: 'Mission', instant: 'Order' };

/** The game being shown: class troop cards name the unit they hire now. */
let current: GameState | null = null;
export const setCardGame = (s: GameState) => { current = s; };

export function handCard(id: string, o: Opts = {}) {
  const d = CARDS[id];
  const unit = d.cls && current ? unitFor(current, d.cls) : d.troop;
  const t = unit ? TROOPS[unit] : null;
  const pic = unit ? 'unit_' + unit : d.kind === 'hire' && d.role ? 'role_' + d.role : 'card_' + id;
  const label = d.permanent ? 'Action · permanent' : CARD_TYPE_NAME[cardType(d)];
  if (o.wide) {
    const ty = d.permanent ? 'permanent' : cardType(d);
    return shell('hand', { ...o, cls: `cat-${d.cat} kind-${d.kind} ty-${ty}${d.burden ? ' burden' : ''} ${o.cls ?? ''}` },
      artDiv(pic, icon(t?.icon ?? d.icon, 34), h('span', { class: 'c-ty' }, d.permanent ? 'Keep' : CARD_TYPE_NAME[cardType(d)])),
      h('div', { class: 'c-body' },
        h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, label)),
        h('div', { class: 'c-name c-title' }, d.name),
        d.cls && t ? h('div', { class: 'c-unit' }, `Hires: ${t.name}`) : null,
        t ? h('div', { class: 'c-stats' }, h('span', {}, h('b', {}, 'M'), t.melee), h('span', {}, h('b', {}, 'F'), t.fire), h('span', {}, h('b', {}, 'D'), t.def), h('span', {}, h('b', {}, 'upkeep'), t.upkeep)) : null,
        h('div', { class: 'c-text' }, d.text)));
  }
  return shell('hand', { ...o, cls: `cat-${d.cat} kind-${d.kind}${d.burden ? ' burden' : ''} ${o.cls ?? ''}` },
    h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, label)),
    artDiv(pic, icon(t?.icon ?? d.icon, o.small ? 24 : 32)),
    h('div', { class: 'c-name c-title' }, d.name),
    t ? h('div', { class: 'c-stats' }, h('span', {}, h('b', {}, 'M'), t.melee), h('span', {}, h('b', {}, 'F'), t.fire), h('span', {}, h('b', {}, 'D'), t.def)) : null,
    o.small || t ? null : h('div', { class: 'c-text' }, d.text),
  );
}

export function tacticCard(id: string, o: Opts = {}) {
  const d = TACTICS[id];
  const ic = { volley: 'gun', charge: 'lance', pike: 'pike', flank: 'boot', hold: 'shield', barrage: 'cannon', broadside: 'cannon', board: 'sword', line: 'ship', gauge: 'twist' }[id] ?? 'sword';
  return shell('tactic', o,
    h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, 'Tactic')),
    h('div', { class: 'c-art', html: icon(ic, o.small ? 26 : 34) }),
    h('div', { class: 'c-name c-title' }, d.name),
    h('div', { class: 'c-text' }, d.desc),
    o.small ? null : h('div', { class: 'c-counter' }, 'Beaten by ' + d.counteredBy.map(c => TACTICS[c].name).join(', ')),
  );
}

export function backCard(label: string, o: Opts = {}) {
  return shell('back', o, h('div', { class: 'c-rose', html: icon('star', o.small ? 26 : 40) }), h('div', { class: 'c-backlabel' }, label));
}

/** A card that starts face-down and flips over to show `front`. */
export function flipCard(front: HTMLElement, label = '', big = false) {
  const wrap = h('div', { class: 'flip' + (big ? ' big' : '') });
  const inner = h('div', { class: 'flip-in' });
  const back = backCard(label, { small: !big && front.classList.contains('small') });
  back.classList.add('flip-back');
  front.classList.add('flip-front');
  inner.append(back, front);
  wrap.append(inner);
  return { el: wrap, flip: () => wrap.classList.add('flipped') };
}

export function coreCard(id: string, o: Opts & { slotted?: boolean } = {}) {
  const d = CORE[id];
  return shell('core', { ...o, cls: `ax-${d.axis}${o.slotted ? ' slotted' : ''} ${o.cls ?? ''}` },
    h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, 'Core card')),
    h('div', { class: 'c-art', html: icon(d.icon, o.small ? 24 : 30) }),
    h('div', { class: 'c-name c-title' }, d.name),
    o.small ? null : h('div', { class: 'c-text c-pros' }, d.pros.join(' · ')),
    o.small ? null : h('div', { class: 'c-text c-cons' }, d.cons.join(' · ')),
  );
}
