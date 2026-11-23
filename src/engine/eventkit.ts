// What every event file needs: the shape of an event, the small helpers its options use, and `later`,
// which lets a choice come back years afterwards (an event chain).
import type { GameState, RevealItem } from '../types';
import { player, clamp, inflation, randInt } from './core';

export type Vars = Record<string, string | number>;

export interface EventOption {
  label: string;
  hint?: string;
  can?: (s: GameState, v: Vars) => string | null;
  run: (s: GameState, v: Vars) => RevealItem[];
}

export interface EventDef {
  id: string;
  title: string | ((s: GameState, v: Vars) => string);
  text: (s: GameState, v: Vars) => string;
  art: string;
  window?: [number, number];
  chance: number;           // per year while eligible; 0 = never by chance (a later step of a chain)
  repeat?: number;          // minimum years between repeats; omitted = once only
  cond?: (s: GameState) => boolean;
  setup?: (s: GameState) => Vars | null;
  options: EventOption[];
  history?: boolean;        // shown on the history timeline
  anywhere?: boolean;       // a history card for realms outside Europe and its neighbours too (cond says whose)
}

export const good = (title: string, text: string, kind = 'star'): RevealItem => ({ title, text, tone: 'good', kind });
export const bad = (title: string, text: string, kind = 'twist'): RevealItem => ({ title, text, tone: 'bad', kind });
export const neutral = (title: string, text: string, kind = 'scroll'): RevealItem => ({ title, text, tone: 'neutral', kind });
export const stab = (s: GameState, d: number) => { const p = player(s); p.stability = clamp(p.stability + d, -3, 3); };
export const P = (s: GameState) => s.player;
/** Ducats in the money of the day. */
export const scaled = (s: GameState, n: number) => Math.round(n * inflation(s));
export const needs = (s: GameState, n: number) => (player(s).gold < scaled(s, n) ? `Needs ${scaled(s, n)} ducats` : null);
export const pay = (s: GameState, n: number) => { player(s).gold -= scaled(s, n); };

/** Schedule a later event: `id` comes due between `min` and `max` years from now, carrying `vars` (what was chosen).
 *  It fires on its own turn like any event; if its `cond` no longer holds by then, it is dropped. */
export function later(s: GameState, id: string, min: number, max = min, vars: Vars = {}) {
  (s.pending ??= []).push({ id, year: s.year + (max > min ? randInt(s, min, max) : min), vars });
}
