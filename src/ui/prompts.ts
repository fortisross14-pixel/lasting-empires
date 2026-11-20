// Decisions the game puts to the player: reveals, events, drafts, succession, battles, attacks, peace, endings.
import { showHistory } from './sheets';
import { commanderOf } from '../engine/commanders';
import { sfx, buzz, type Sfx } from './sound';
import type { DraftOption, RevealItem, Battle, Heir } from '../types';
import { RULER_ARCHS } from '../data/nations';
import { TROOPS, EQUIPMENT } from '../data/troops';
import { MISSIONS } from '../data/missions';
import { goalView } from '../engine/goals';
import { commandOf, GENERIC_COMMAND, OUTCOMES, TRAITS } from '../data/characters';
import { player, provsOf, atWar, armyPower, nationName } from '../engine/core';
import { newMissionGame, chooseEventOption, ranking, chooseHeir } from '../engine/turn';
import { EVENT, eventTitle } from '../engine/events';
import { CARDS } from '../engine/cards';
import { takeDraftOption, AMBITIONS } from '../engine/drafts';
import { playRound, autoResolve, finishBattle, ratio, breakLevel, hp } from '../engine/battle';
import { h, clear, sleep, reduced } from './dom';
import { icon } from './icons';
import { troopCard, charCard, handCard, tacticCard, backCard, flipCard } from './cards';
import { warScore, peaceTerms, enemyDemands, concludePeace } from '../engine/diplo';
import { troopsNear, setDefence } from '../engine/army';
import { S, pendingReport, modalOpen, slot, saveNow, save, clearSlot, startIn, shield } from './state';
import { artImg } from './art';
import { recordMission, doneCount, showMissions, showTitle, setMissionYear } from './title';
import { refresh, toast } from './app';
import { openModal, closeModal } from './modal';
import { showTurnReport } from './endturn';

export function processQueue() {
  if (!modalOpen && !S.queue.length && pendingReport) { showTurnReport(); return; }
  if (modalOpen || !S.queue.length) return;
  const p = S.queue[0];
  if (p.kind === 'reveal') showReveal(p.title, p.subtitle, p.items, () => { S.queue.shift(); afterPrompt(); }, p.alarm);
  else if (p.kind === 'event') showEvent();
  else if (p.kind === 'draft') showDraft(p.draft, p.options);
  else if (p.kind === 'battle') showBattle(p.battle);
  else if (p.kind === 'succession') showSuccession(p.heirs, p.old);
  else if (p.kind === 'peace') showPeace(p.enemy, p.offered, p.surrender);
  else if (p.kind === 'incoming') showIncoming(p.id);
  else if (p.kind === 'gameover') showGameOver(p.victory, p.reason);
  else if (p.kind === 'mission_end') showMissionEnd(p.won);
}
export function afterPrompt() { closeModal(); refresh(); setTimeout(processQueue, 60); }

/** The five outcomes, told apart at a glance by a mark as well as by colour: a cross, a dot, one to three stars. */
const OUTCOME_MARKS = ['✗', '·', '★', '★★', '★★★'];
export const outcomeLevel = (title: string) => (/ outcome$/.test(title) ? OUTCOMES.findIndex(o => title.startsWith(o.name)) : -1);

export function infoCard(it: RevealItem) {
  const lvl = outcomeLevel(it.title);
  return h('div', { class: `card k-info tone-${it.tone}${lvl >= 0 ? ` is-outcome o-${lvl}` : ''}` },
    h('div', { class: 'c-art', html: icon(lvl === 4 ? 'laurel' : it.kind ?? 'star', 30) }),
    h('div', { class: 'c-name c-title' }, it.title),
    lvl >= 0 ? h('div', { class: 'o-mark', 'aria-hidden': 'true' }, OUTCOME_MARKS[lvl]) : null,
    h('div', { class: 'c-text' }, it.text));
}

export async function flipAll(flips: { flip: () => void }[], delay = 380) {
  for (const f of flips) { await sleep(reduced() ? 0 : delay); f.flip(); sfx('flip'); buzz(); }
}

export function showReveal(title: string, subtitle: string | undefined, items: RevealItem[], done: () => void, alarm = false) {
  const row = h('div', { class: 'reveal-row' });
  const flips = items.map(it => { const f = flipCard(infoCard(it), ''); row.append(f.el); return f; });
  openModal(h('div', { class: 'mbox reveal' + (alarm ? ' alarm' : '') }, alarm ? h('div', { class: 'alarm-band', html: icon('sword', 28) }) : null, h('h2', {}, title), subtitle ? h('p', { class: 'muted' }, subtitle) : null, row, h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: done }, 'Continue'))));
  if (alarm) sfx('drum');
  void flipAll(flips).then(() => { const s = stingFor(items, alarm); if (s) sfx(s, 0.12); });
}

/** The note a reveal ends on: by the outcome when there is one, otherwise by the news itself. */
function stingFor(items: RevealItem[], alarm: boolean): Sfx | null {
  if (alarm || !items.length) return null;
  const out = items.find(it => / outcome$/.test(it.title));
  if (out) { const lvl = outcomeLevel(out.title); return lvl >= 3 ? 'great' : lvl === 0 ? 'bad' : 'plain'; }
  const first = items[0];
  if (first.tone === 'bad') return 'bad';
  if (first.tone === 'good') return ['hands', 'ring', 'dove', 'scroll'].includes(first.kind ?? '') ? 'quill' : 'plain';
  return null;
}

export function showEvent() {
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

export function draftFront(o: DraftOption) {
  if (o.t === 'troop') return troopCard({ type: o.type, vet: o.vet, str: 100 });
  if (o.t === 'char') return charCard(o.ch, S);
  if (o.t === 'card') return handCard(o.card);
  if (o.t === 'equip') return handCard('eq_' + o.type);
  const a = AMBITIONS.find(x => x.id === o.id)!;
  return h('div', { class: 'card k-event' }, h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, 'Ambition')),
    h('div', { class: 'c-art', html: icon('crown', 34) }), h('div', { class: 'c-name c-title' }, a.name), h('div', { class: 'c-text' }, a.text), h('div', { class: 'c-text gold' }, `+${a.reward} prestige`));
}

export function optName(o: DraftOption) {
  return o.t === 'troop' ? TROOPS[o.type].name : o.t === 'equip' ? EQUIPMENT[o.type].name : o.t === 'char' ? o.ch.name : o.t === 'card' ? CARDS[o.card].name : AMBITIONS.find(a => a.id === o.id)!.name;
}

export function showDraft(kind: string, options: DraftOption[]) {
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

export function heirCard(hr: Heir) {
  const a = RULER_ARCHS[hr.arch];
  return h('div', { class: 'card k-event heir' },
    h('div', { class: 'c-top' }, h('span', { class: 'c-cat' }, hr.historical ? 'Heir of history' : 'Heir')),
    h('div', { class: 'c-art', html: icon(a.role ? ({ general: 'helm', diplomat: 'scroll', admin: 'quill', merchant: 'coin', researcher: 'book' } as Record<string, string>)[a.role] : 'crown', 30) }),
    h('div', { class: 'c-name c-title' }, hr.name),
    h('div', { class: 'c-rarity' }, `${a.name} · skill ${hr.skill}`),
    h('div', { class: 'c-text' }, a.desc),
    h('div', { class: 'c-text muted' }, `Likely reign: ~${hr.reign} years`));
}

export function showSuccession(heirs: Heir[], old: string) {
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
export function unitChip(u: { type: string; vet: number; str: number; start: number; garrison?: boolean }) {
  const d = TROOPS[u.type];
  return h('div', { class: 'uchip' + (u.str <= 0 ? ' dead' : '') },
    h('span', { html: icon(d.icon, 16) }), h('span', { class: 'u-n' }, d.name + (u.vet ? ' ' + '★'.repeat(u.vet) : '')),
    h('span', { class: 'u-bar' }, h('i', { style: `width:${Math.max(0, u.str)}%` })));
}

/** A company on the battlefield: its painting, its strength, its stars, and what it lost this round. */
export function unitTile(u: { type: string; vet: number; str: number; garrison?: boolean }, lost = 0) {
  const d = TROOPS[u.type];
  const pic = artImg(u.garrison ? 'unit_garrison' : 'unit_' + u.type);
  const name = d.name + (u.vet ? ' ' + '★'.repeat(u.vet) : '');
  const gone = u.str <= 0;
  return h('button', { type: 'button', class: 'utile' + (gone ? ' dead' : '') + (lost > 0 ? ' hit' : ''), 'aria-label': `${name}, ${gone ? 'destroyed' : `strength ${Math.round(u.str)}%`}`,
    onclick: () => toast(`${name}: ${gone ? 'destroyed' : `strength ${Math.round(u.str)}%`} · melee ${d.melee}, fire ${d.fire}, defence ${d.def}`) },
    h('span', { class: 'ut-pic', html: pic ?? icon(d.icon, 22) }),
    u.vet ? h('span', { class: 'ut-vet' }, '★'.repeat(u.vet)) : null,
    lost > 0 ? h('span', { class: 'ut-dmg' }, `−${Math.round(lost)}`) : null,
    h('span', { class: 'u-bar' }, h('i', { style: `width:${Math.max(0, Math.min(100, u.str))}%` })),
    h('span', { class: 'ut-n' }, d.name));
}

export function showBattle(b: Battle) {
  const me = b.playerSide === 'att' ? b.att : b.def;
  const foe = b.playerSide === 'att' ? b.def : b.att;
  const prov = S.provinces[b.province];
  const box = h('div', { class: 'mbox battle' });
  type Round = { mine: string; theirs: string; myC: boolean; theirC: boolean; dmgMe: number; dmgThem: number; lost: Map<number, number> };
  const draw = (last?: Round) => {
    clear(box);
    const foeNat = S.nations[foe.nation];
    const foeName = foe.nation === 'rebels' ? 'Rebels' : nationName(S, foe.nation);
    const ctx = { conquer: 'Siege of', defend: 'Defence of', raid: 'Raid on', rebels: 'Fighting at', sea: 'Sea battle off' }[b.context];
    box.append(h('div', { class: 'b-head' }, h('h2', {}, `${ctx} ${prov.name}`), h('p', { class: 'muted' }, `Round ${Math.min(3, b.round + (b.done ? 0 : 1))} of 3${foe.fort ? ` · their walls: level ${foe.fort}` : me.fort ? ` · your walls: level ${me.fort}` : ''}`)));
    const side = (sd: typeof me, label: string, cls: string, nat?: { id: string; color: string }) => {
      const pct = Math.round(ratio(sd) * 100), brk = Math.round(breakLevel(sd) * 100);
      return h('div', { class: 'b-side ' + cls },
        h('div', { class: 'b-label' }, nat ? shield(nat.id, nat.color, true) : h('span', { class: 'b-rebel', html: icon('torch', 20) }),
          h('span', { class: 'b-who' }, h('b', {}, label), h('small', {}, sd.general ? sd.general.name : 'No general')),
          h('span', { class: 'hpbar', role: 'img', 'aria-label': `${label}: ${pct}% of its strength left; it breaks at ${brk}%` }, h('i', { style: `width:${pct}%` }), h('em', { style: `left:${brk}%` }), h('span', {}, `${pct}%`))),
        h('div', { class: 'utiles' }, sd.units.map(u => unitTile(u, last?.lost.get(u.uid) ?? 0))));
    };
    box.append(side(foe, foeName, 'foe', foeNat ? { id: foeNat.id, color: foeNat.color } : undefined));
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
    box.append(side(me, 'Your army', 'mine', { id: S.player, color: player(S).color }));
    if (b.done) {
      const out = b.result ?? (b.result = finishBattle(S, b));
      save();
      box.append(h('div', { class: 'b-result ' + (out.good ? 'win' : 'loss') }, h('h3', {}, out.title), ...out.lines.map(l => h('p', {}, l))),
        h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); afterPrompt(); } }, 'Continue')));
      if (!resultPlayed) { resultPlayed = true; sfx(out.good ? 'great' : 'bad', 0.35); }
      return;
    }
    // the generals fight it out: you watch
    box.append(h('p', { class: 'muted center' }, me.general ? `${me.general.name} commands. Each round both sides commit a tactic.` : 'No general: your captains do what they can.'));
    box.append(h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: () => { stop = true; autoResolve(S, b); draw(); } }, 'Skip to the result')));
    if (!stop) timer = setTimeout(() => commit(), reduced() ? 300 : 1700);
  };
  let stop = false, resultPlayed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  void timer;
  const commit = () => {
    if (b.done || !document.body.contains(box)) return;
    const beforeMe = hp(me), beforeFoe = hp(foe);
    const was = new Map([...me.units, ...foe.units].map(u => [u.uid, u.str] as [number, number]));
    const lg = playRound(S, b, null);
    sfx(b.round % 2 ? 'clash' : 'clash2'); buzz(15);
    const lost = new Map([...me.units, ...foe.units].map(u => [u.uid, Math.max(0, (was.get(u.uid) ?? u.str) - u.str)] as [number, number]));
    const att = b.playerSide === 'att';
    draw({ mine: att ? lg.attTactic : lg.defTactic, theirs: att ? lg.defTactic : lg.attTactic, myC: att ? lg.attCountered : lg.defCountered, theirC: att ? lg.defCountered : lg.attCountered, dmgMe: Math.round(beforeMe - hp(me)), dmgThem: Math.round(beforeFoe - hp(foe)), lost });
    box.querySelectorAll('.slot .card').forEach(c => c.classList.add('slam'));
  };
  draw();
  openModal(box);
}

/** An enemy army is on its way: choose who defends. The battle comes next quarter and plays itself. */
export function showIncoming(id: number) {
  const inc = S.incoming?.find(x => x.id === id);
  const done = () => { S.queue.shift(); afterPrompt(); };
  if (!inc) return done();
  const n = S.nations[inc.nation], prov = S.provinces[inc.target];
  const force = n.army.filter(t => inc.force.includes(t.uid));
  const spied = (n.spiedUntil ?? 0) > S.year;
  const near = troopsNear(S, S.player, prov.id);
  const gens = S.characters.filter(c => (c.role === 'general' || c.role === 'conqueror' || (c.ruler && RULER_ARCHS[player(S).ruler.arch]?.role === 'general')) && c.mission == null);
  let gen: number | undefined = [...gens].sort((a, b) => b.skill - a.skill)[0]?.uid;
  const cap = () => { const g = S.characters.find(c => c.uid === gen); return g ? commandOf(g.skill) : GENERIC_COMMAND; };
  let picked = [...near].sort((a, b) => armyPower([b]) - armyPower([a])).slice(0, cap()).map(t => t.uid);
  const box = h('div', { class: 'mbox planner' });
  const draw = () => {
    clear(box);
    const mine = armyPower(S.troops.filter(t => picked.includes(t.uid))), theirs = armyPower(force);
    box.append(h('h2', {}, `${n.name} marches on ${prov.name}`), h('p', { class: 'muted' }, `They arrive when you end this turn, with ${spied ? force.length : `about ${Math.max(1, force.length - 1)}–${force.length + 2}`} companies. Choose who stands to meet them; the battle then plays itself.`),
      (() => { const g = commanderOf(S, n.id); return g ? h('p', { class: 'inc-gen' }, h('b', {}, g.name), ` leads them${g.traits.length ? `: ${g.traits.map(x => TRAITS[x]?.name ?? x).join(', ').toLowerCase()}` : ''}.`) : ''; })());
    if (spied) box.append(h('div', { class: 'cards-row wrap' }, force.map(t => troopCard(t, { small: true }))));
    box.append(h('h3', {}, 'General'));
    const gr = h('div', { class: 'cards-row wrap' });
    if (!gens.length) gr.append(h('p', { class: 'muted' }, 'No free general: your captains lead.'));
    for (const c of gens) gr.append(charCard(c, S, { small: true, selected: gen === c.uid, onclick: () => { gen = gen === c.uid ? undefined : c.uid; picked = picked.slice(0, cap()); draw(); } }));
    box.append(gr);
    box.append(h('h3', {}, `Troops (${picked.length}/${cap()}) · ${near.length} within reach`), h('p', { class: 'muted small' }, `${S.characters.find(c => c.uid === gen)?.name ?? 'A captain'} can lead ${cap()} companies. The walls (level ${prov.fort}) fight on top. Companies that already fought this season cannot.`));
    const tr = h('div', { class: 'cards-row wrap' });
    if (!near.length) tr.append(h('p', { class: 'bad' }, 'None of your troops can get there in time. The walls and local militia must hold. Move troops to a garrison nearby for next time.'));
    for (const t of near) tr.append(troopCard(t, { small: true, selected: picked.includes(t.uid), onclick: () => { if (!picked.includes(t.uid) && picked.length >= cap()) return toast(`Your general can lead only ${cap()} companies`, 'bad'); picked = picked.includes(t.uid) ? picked.filter(x => x !== t.uid) : [...picked, t.uid]; draw(); } }));
    box.append(tr);
    box.append(h('div', { class: 'facts' }, h('span', { class: 'fact' }, `Your strength ${Math.round(mine)} + fort ${prov.fort}`), h('span', { class: 'fact' }, `Theirs ${spied ? Math.round(theirs) : `~${Math.round(theirs * 0.8)}–${Math.round(theirs * 1.25)}`}`)));
    box.append(h('div', { class: 'mrow' }, h('button', { class: 'btn primary', onclick: () => { setDefence(S, id, picked, gen); closeModal(); done(); } }, 'Hold the line')));
  };
  draw();
  openModal(box);
}

export function showPeace(enemy: string, offered: boolean, surrender = false) {
  const n = S.nations[enemy];
  if (!n?.alive || !atWar(S, S.player, enemy)) { S.queue.shift(); afterPrompt(); return; }
  const landless = !provsOf(S, enemy).length;
  // a beaten realm takes whatever terms you set
  const score = surrender ? Math.max(100, warScore(S, enemy)) : warScore(S, enemy);
  const box = h('div', { class: 'mbox narrow peace' });
  let chosen: string[] = [];
  const draw = () => {
    clear(box);
    if (offered) box.append(h('div', { class: 'alarm-band peace-band', html: icon('dove', 28) }));
    if (surrender) box.append(h('h2', {}, `${n.name} surrenders`), h('p', { class: 'muted' }, `${landless ? 'You hold every province they had.' : 'Their army is gone and you hold their heartland.'} Dictate the terms: keep the provinces you want (the rest go back), make them your vassal, take reparations, or annex them whole.${landless ? '' : ' Or fight on.'}`));
    else box.append(h('h2', {}, offered ? `${n.name} offers peace` : `Peace with ${n.name}`), h('p', { class: 'muted' }, `${offered ? 'Accept their terms, or fight on. ' : ''}War score ${score > 0 ? '+' : ''}${score}: ${score > 10 ? 'you are winning and set the terms.' : score < -10 ? 'they are winning and set the terms.' : 'neither side has the upper hand.'}`));
    if (score > 10) {
      const spent = peaceTerms(S, enemy).filter(t => chosen.includes(t.id)).reduce((a, t) => a + t.cost, 0);
      box.append(h('h3', {}, surrender ? 'Your terms' : `Your demands (${spent}/${score} points)`));
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
        offered && !landless ? h('button', { class: 'btn ghost', onclick: () => { S.queue.shift(); toast('The war goes on'); afterPrompt(); } }, 'Fight on') : null,
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
export function showMissionEnd(won: boolean) {
  recordMission();
  const sc = S.scenario!;
  const views = sc.goals.map(g => goalView(S, g, sc.deadline));
  const def = MISSIONS.find(m => m.id === sc.id);
  const next = () => { S.queue.shift(); closeModal(); refresh(); afterPrompt(); };
  const toMissions = () => { S.queue.shift(); closeModal(); saveNow(); setMissionYear(def?.start ?? S.startYear); showMissions(); };
  const retry = () => { S.queue.shift(); closeModal(); const fresh = newMissionGame(S.player, sc.custom ? { ...sc, status: 'active', done: undefined } : sc.id, S.startYear, { difficulty: S.difficulty }); if (fresh.scenario?.steps?.length) fresh.tutorial = -1; startIn(slot, fresh); };
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

export function showGameOver(victory: boolean, reason: string) {
  const r = ranking(S);
  const sc = S.scenario;
  openModal(h('div', { class: 'mbox narrow' },
    h('h2', {}, sc ? (sc.status === 'won' ? 'Mission accomplished' : 'The end of an age') : victory ? 'A lasting empire' : 'The end of an age'), h('p', {}, reason),
    h('ol', { class: 'rank' }, r.slice(0, 8).map(x => h('li', { class: x.id === S.player ? 'me' : '' }, h('span', {}, x.name), h('b', {}, String(x.score))))),
    h('div', { class: 'mrow' }, h('button', { class: 'btn ghost', onclick: () => { S.queue.shift(); closeModal(); refresh(); showHistory(); } }, 'Read its history'), h('button', { class: 'btn ghost', onclick: () => { S.queue.shift(); closeModal(); refresh(); } }, 'Look at the map'),
      h('button', { class: 'btn primary', onclick: () => { S.queue.shift(); closeModal(); clearSlot(slot); showTitle(); } }, 'New campaign'))));
}
