// The battle report: after a battle you fought, one card for the outcome and one for each side, with the companies
// that fell and the strength left, as diplomacy has its envoy's report. Pure words from the battle as it ended.
import type { GameState, Battle, BattleSide, RevealItem, Prompt } from '../types';
import { TROOPS } from '../data/troops';
import { nationName } from './core';

const nameOf = (s: GameState, n: string) => (n === 'rebels' ? 'The rebels' : nationName(s, n));
const unitName = (t: string, garrison?: boolean) => (garrison ? 'Garrison' : TROOPS[t]?.name ?? t);
const plural = (n: number, w: string) => `${n} ${n === 1 ? w : w.endsWith('y') ? w.slice(0, -1) + 'ies' : w + 's'}`;

/** One side in a line: who led, how many fought, who fell, what is left. */
function sideItem(s: GameState, sd: BattleSide, won: boolean, mine: boolean): RevealItem {
  const units = sd.units.filter(u => u.start > 0);
  const fell = units.filter(u => u.str <= 0);
  const hurt = units.filter(u => u.str > 0 && u.str < u.start * 0.75);
  const left = Math.round((units.reduce((a, u) => a + Math.max(0, u.str), 0) / Math.max(1, units.reduce((a, u) => a + u.start, 0))) * 100);
  const list = (us: typeof units) => { const c: Record<string, number> = {}; for (const u of us) { const k = unitName(u.type, u.garrison); c[k] = (c[k] ?? 0) + 1; } return Object.entries(c).map(([k, n]) => (n > 1 ? `${n} ${k}` : k)).join(', '); };
  const parts = [
    `${plural(units.length, 'company')} fought${sd.general ? ` under ${sd.general.name}` : ''}.`,
    fell.length ? `Lost: ${list(fell)}.` : 'None lost.',
    hurt.length ? `Badly hurt: ${list(hurt)}.` : '',
    `Strength left: ${left}%.`,
  ].filter(Boolean);
  return { title: `${mine ? 'Your army' : nameOf(s, sd.nation)} · ${won ? 'won' : 'lost'}`, text: parts.join(' '), tone: mine ? (won ? 'good' : 'bad') : 'neutral', kind: 'sword' };
}

/** The outcome in plain words: an attack or a defence, and what it meant for the place. */
export function battleOutcome(s: GameState, b: Battle, owner0: string | undefined): { title: string; text: string; good: boolean } {
  const mine = b.playerSide, won = (b.winner === 'att') === (mine === 'att');
  const p = s.provinces[b.province], place = p?.name ?? 'the field';
  const changed = !!p && owner0 !== p.owner;
  if (b.naval) return { title: won ? `Victory at sea off ${place}` : `Defeat at sea off ${place}`, text: won ? 'The enemy fleet is beaten.' : 'Your fleet is beaten.', good: won };
  if (mine === 'att') {
    if (won && changed) return { title: `${place} taken`, text: `${place} is yours until the peace decides.`, good: true };
    if (won) return { title: b.context === 'raid' ? `${place} raided` : 'Attack succeeded', text: b.context === 'raid' ? 'Your troops strip the land and come away.' : `The defenders of ${place} are broken.`, good: true };
    return { title: 'Attack beaten back', text: `The defenders of ${place} hold.`, good: false };
  }
  if (won) return { title: 'Defence held', text: `${place} stays yours.`, good: true };
  return { title: changed ? `${place} lost` : 'Defence broken', text: changed ? `${nameOf(s, p!.owner)} holds ${place} now.` : `The enemy breaks your line at ${place}.`, good: false };
}

/** Push the report right after the battle it tells (or at the end of the queue when the battle was not shown). */
export function pushBattleReport(s: GameState, b: Battle, owner0: string | undefined) {
  if (!b.att.player && !b.def.player) return;
  const out = battleOutcome(s, b, owner0);
  const mine = b.playerSide === 'att' ? b.att : b.def, foe = b.playerSide === 'att' ? b.def : b.att;
  const iWon = (b.winner === 'att') === (b.playerSide === 'att');
  const head = s.queue.find(p => p.kind === 'battle' && p.battle === b) as (Prompt & { kind: 'battle' }) | undefined;
  const p = s.provinces[b.province];
  const items: RevealItem[] = [
    { title: out.title, text: out.text, tone: out.good ? 'good' : 'bad', kind: out.good ? 'laurel' : 'sword' },
    sideItem(s, mine, iWon, true),
    sideItem(s, foe, !iWon, false),
  ];
  const report: Prompt = {
    kind: 'reveal', title: 'Battle report', subtitle: `${b.naval ? 'At sea off' : 'At'} ${p?.name ?? 'the field'} · ${nameOf(s, b.att.nation)} attacked ${nameOf(s, b.def.nation)}`, items,
    story: head?.story ? { ...head.story, changes: p && owner0 !== p.owner ? [{ label: `${p.name}: held by`, delta: 0, from: owner0 === s.player ? 'you' : nameOf(s, owner0 ?? ''), to: p.owner === s.player ? 'you' : nameOf(s, p.owner), good: p.owner === s.player }] : [] } : undefined,
  };
  const at = head ? s.queue.indexOf(head) : -1;
  if (at >= 0) s.queue.splice(at + 1, 0, report); else s.queue.push(report);
}
