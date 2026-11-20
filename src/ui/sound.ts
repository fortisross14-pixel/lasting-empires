// Sound effects, made in the browser with Web Audio: no files to load, nothing to cache.
// Each effect is a short recipe of noise and tones in the spirit of the chancery: paper, wax, quill, coin, drum.
// Nothing sounds before the player's first tap (browsers require it), and all goes quiet when the page is hidden.
import { settings } from './settings';

export type Sfx = 'draw' | 'play' | 'flip' | 'great' | 'plain' | 'bad' | 'seal' | 'coin' | 'quill' | 'drum' | 'clash' | 'clash2' | 'bell' | 'knock';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
/** The audio context, once the first tap has made one: the music sets its volume through it. */
export const audioCtx = () => ctx;
/** The last effects asked for, newest last: for the smoke test and for debugging. */
export const soundLog: string[] = [];
(globalThis as { __sounds?: string[] }).__sounds = soundLog;

function unlock() {
  if (ctx) { if (ctx.state === 'suspended' && !document.hidden) void ctx.resume(); return; }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    const n = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, n, n);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  } catch { ctx = null; }
}
if (typeof document !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(ev, unlock, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) void ctx.suspend(); else void ctx.resume(); });
}

// ---------- building blocks ----------
/** A tone that starts at once and dies away: `f` to `f2` in hertz over `dur` seconds. */
function tone(at: number, f: number, dur: number, vol: number, type: OscillatorType = 'sine', f2 = f) {
  const c = ctx!, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (f2 !== f) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at); o.stop(at + dur + 0.02);
}
/** A burst of filtered noise: paper, breath, scratch. The filter slides from `f` to `f2`. */
function noise(at: number, dur: number, vol: number, kind: BiquadFilterType, f: number, f2 = f, q = 0.8) {
  const c = ctx!, s = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf; s.loop = true;
  flt.type = kind; flt.Q.value = q;
  flt.frequency.setValueAtTime(f, at);
  if (f2 !== f) flt.frequency.exponentialRampToValueAtTime(f2, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(flt).connect(g).connect(master!);
  s.start(at, Math.random() * 0.5); s.stop(at + dur + 0.02);
}
/** A plucked string, lute-like: a bright start that mellows at once. */
function pluck(at: number, f: number, dur: number, vol: number) {
  tone(at, f, dur, vol, 'triangle');
  tone(at, f * 2, dur * 0.35, vol * 0.35, 'sine');
  noise(at, 0.02, vol * 0.5, 'highpass', 3000);
}

// ---------- the effects ----------
const RECIPES: Record<Sfx, (t: number) => void> = {
  /** A card comes to hand: a quick breath of paper. */
  draw: t => { noise(t, 0.11, 0.22, 'bandpass', 1800, 3400, 1.2); },
  /** A card is played: paper slid across the table. */
  play: t => { noise(t, 0.18, 0.3, 'lowpass', 2400, 500); tone(t + 0.13, 140, 0.07, 0.18, 'sine', 90); },
  /** A card is turned over. */
  flip: t => { noise(t, 0.045, 0.2, 'highpass', 2600); tone(t + 0.035, 190, 0.06, 0.16, 'sine', 120); },
  /** The best outcomes: a rising figure on the lute. */
  great: t => { pluck(t, 293.7, 0.5, 0.26); pluck(t + 0.11, 440, 0.5, 0.26); pluck(t + 0.22, 587.3, 0.8, 0.3); },
  /** An ordinary result: one note. */
  plain: t => { pluck(t, 293.7, 0.45, 0.22); },
  /** A poor result or bad news: two low notes falling a semitone. */
  bad: t => { pluck(t, 155.6, 0.5, 0.26); pluck(t + 0.16, 146.8, 0.9, 0.28); },
  /** End Turn: the seal pressed into wax. */
  seal: t => { tone(t, 95, 0.16, 0.5, 'sine', 48); noise(t, 0.05, 0.16, 'lowpass', 900); },
  /** Coins counted out. */
  coin: t => { tone(t, 2350, 0.16, 0.14); tone(t, 3520, 0.12, 0.08); tone(t + 0.07, 2640, 0.2, 0.14); tone(t + 0.07, 3960, 0.14, 0.07); },
  /** A treaty signed: the scratch of a quill. */
  quill: t => { for (let i = 0; i < 4; i++) noise(t + i * 0.07, 0.06, 0.13, 'bandpass', 3200 + i * 400, 4200, 2.5); },
  /** War: two beats of a drum. */
  drum: t => { for (const d of [0, 0.28]) { tone(t + d, 120, 0.3, 0.6, 'sine', 55); noise(t + d, 0.09, 0.25, 'lowpass', 500); } },
  /** Steel on steel, two voicings so a battle does not repeat itself. */
  clash: t => { for (const [f, v] of [[830, 0.1], [1370, 0.09], [2110, 0.07], [3050, 0.05]]) tone(t, f, 0.28, v, 'square'); noise(t, 0.07, 0.25, 'highpass', 4000); },
  clash2: t => { for (const [f, v] of [[690, 0.1], [1180, 0.09], [1930, 0.07], [2790, 0.05]]) tone(t + 0.02, f, 0.24, v, 'square'); noise(t, 0.09, 0.22, 'bandpass', 2500, 5000); tone(t, 110, 0.12, 0.3, 'sine', 60); },
  /** The year turns: a bell. */
  bell: t => { for (const [k, v, d] of [[1, 0.2, 1.6], [2.76, 0.09, 1.1], [5.4, 0.05, 0.7], [0.5, 0.1, 1.8]]) tone(t, 523.3 * k, d, v); },
  /** Something cannot be done: a soft double knock. */
  knock: t => { tone(t, 210, 0.05, 0.22, 'sine', 150); tone(t + 0.09, 190, 0.06, 0.2, 'sine', 130); },
};

/** Play an effect now (or `delay` seconds from now). Silent until the first tap, and when sound is off. */
export function sfx(name: Sfx, delay = 0) {
  soundLog.push(name); if (soundLog.length > 60) soundLog.shift();
  const vol = settings().sfx;
  if (!ctx || !master || ctx.state !== 'running' || vol <= 0) return;
  master.gain.value = 0.5 * vol;
  try { RECIPES[name](ctx.currentTime + 0.005 + delay); } catch { /* an effect must never break the game */ }
}

/** A short touch of the motor where the device has one (most Android phones), for a card played or turned. */
export function buzz(ms = 10) {
  if (settings().haptics) try { navigator.vibrate?.(ms); } catch { /* not allowed here */ }
}
