// Settings kept on this device (not in the save): how the game behaves for this player, whatever the campaign.
import { STANDARD } from '../data/difficulty';
import { kvJson, kvSet } from './storage';

export interface Settings {
  /** Before ending a turn, list what is still open. */
  warn: boolean;
  /** Show the skip-ahead button beside End Turn. */
  skip: boolean;
  /** Less motion, even when the device does not ask for it. */
  calm: boolean;
  /** Volume of sound effects: 0 off, 0.5 soft, 1 full. */
  sfx: number;
  /** Volume of the music: 0 off, 0.5 soft, 1 full. */
  music: number;
  /** A short buzz when a card is played or turned, where the device can. */
  haptics: boolean;
  /** Fight battles that are hardly in doubt without stopping the game. */
  quickBattles: boolean;
  /** Text size: 1, 1.15 or 1.3 times the designed size. */
  text: number;
  /** The difficulty and open-game length chosen last, offered again next time. */
  difficulty: number;
  length: string;
}

const KEY = 'lasting-empires.settings';
const DEFAULTS: Settings = { warn: false, skip: true, calm: false, sfx: 1, music: 0.5, haptics: true, quickBattles: false, text: 1, difficulty: STANDARD, length: 'age' };

let cache: Settings | null = null;
export function settings(): Settings {
  if (cache) return cache;
  const stored = kvJson<Partial<Settings>>(KEY, {});
  return (cache = { ...DEFAULTS, ...stored });
}
export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  const s = settings();
  s[k] = v;
  kvSet(KEY, JSON.stringify(s));
  applySettings();
}
/** The text sizes offered. Every font size in the stylesheet is multiplied by `--ts`. */
export const TEXT_SIZES = [1, 1.15, 1.3];
/** Settings that live on the page itself: `data-motion="calm"` switches the animations off in the stylesheet,
 *  `--ts` scales the text. */
export function applySettings() {
  if (settings().calm) document.documentElement.dataset.motion = 'calm'; else delete document.documentElement.dataset.motion;
  const ts = TEXT_SIZES.includes(settings().text) ? settings().text : 1;
  if (ts === 1) document.documentElement.style.removeProperty('--ts'); else document.documentElement.style.setProperty('--ts', String(ts));
  if (ts === 1) delete document.documentElement.dataset.text; else document.documentElement.dataset.text = ts > 1.2 ? 'l' : 'm';
}
