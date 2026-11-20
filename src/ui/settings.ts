// Settings kept on this device (not in the save): how the game behaves for this player, whatever the campaign.
import { STANDARD } from '../data/difficulty';

export interface Settings {
  /** Before ending a turn, list what is still open. */
  warn: boolean;
  /** Show the skip-ahead button beside End Turn. */
  skip: boolean;
  /** Less motion, even when the device does not ask for it. */
  calm: boolean;
  /** Volume of sound effects: 0 off, 0.5 soft, 1 full. */
  sfx: number;
  /** A short buzz when a card is played or turned, where the device can. */
  haptics: boolean;
  /** Fight battles that are hardly in doubt without stopping the game. */
  quickBattles: boolean;
  /** The difficulty and open-game length chosen last, offered again next time. */
  difficulty: number;
  length: string;
}

const KEY = 'lasting-empires.settings';
const DEFAULTS: Settings = { warn: true, skip: true, calm: false, sfx: 1, haptics: true, quickBattles: false, difficulty: STANDARD, length: 'age' };

let cache: Settings | null = null;
export function settings(): Settings {
  if (cache) return cache;
  let stored: Partial<Settings> = {};
  try { stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>; } catch { /* storage may be blocked */ }
  return (cache = { ...DEFAULTS, ...stored });
}
export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  const s = settings();
  s[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage may be blocked */ }
  applySettings();
}
/** Settings that live on the page itself: `data-motion="calm"` switches the animations off in the stylesheet. */
export function applySettings() {
  if (settings().calm) document.documentElement.dataset.motion = 'calm'; else delete document.documentElement.dataset.motion;
}
