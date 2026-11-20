// Music: four pieces, one for each part of the world, chosen by the dress of the player's people (the same
// families as the faces). A piece is fetched only once a game is under way, kept by the service worker, and
// played in a loop: as it ends it begins again under its own last note. Nothing sounds before the first tap,
// and all goes quiet when the page is hidden.
import { settings } from './settings';
import { faceFamily } from './art';
import { audioCtx } from './sound';

/** Which piece each family of dress hears. */
export const MUSIC_TRACKS: Record<string, string> = { western: 'europe', islamic: 'levant', eastasian: 'eastasia', african: 'world', american: 'world' };
/** How loud the music is at Full (Soft is half of it), against effects at their own full. */
export const MUSIC_LEVEL = 0.5;
/** Seconds the end of the piece overlaps its beginning. */
export const MUSIC_OVERLAP = 0.35;

export const trackFor = (culture: string) => MUSIC_TRACKS[faceFamily(culture)] ?? 'europe';

interface Voice { el: HTMLAudioElement; gain: GainNode | null; }
let voices: Voice[] = [];
let now = 0;            // which of the two voices is sounding
let track = '';         // the piece loaded, '' for none
let wanted = '';        // the piece asked for
let src = '';           // where the piece is played from (a blob once fetched)
let loopT = 0;
/** For the smoke test and for debugging. */
const state = { track: '', playing: false, format: '' };
(globalThis as { __music?: typeof state }).__music = state;
/** Test hooks: which voice sounds and where it is in the piece; jump to `s` seconds before the end. */
(globalThis as { __musicProbe?: () => unknown }).__musicProbe = () => voices.map((v, i) => ({ on: i === now, paused: v.el.paused, t: +v.el.currentTime.toFixed(1), vol: +(v.gain ? v.gain.gain.value : v.el.volume).toFixed(2), wired: !!v.gain }));
(globalThis as { __musicSeek?: (s: number) => void }).__musicSeek = s => { const e = voices[now]?.el; if (e && isFinite(e.duration)) e.currentTime = e.duration - s; };

const level = () => Math.max(0, Math.min(1, settings().music)) * MUSIC_LEVEL;
/** Ogg where the browser plays it; the AAC copy elsewhere (Safari before 18.4). */
function format(): string {
  try { return new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a'; } catch { return 'm4a'; }
}
function setVol(v: Voice, x: number, over = 0) {
  const ctx = audioCtx();
  if (v.gain && ctx) { v.gain.gain.cancelScheduledValues(ctx.currentTime); v.gain.gain.setValueAtTime(v.gain.gain.value, ctx.currentTime); v.gain.gain.linearRampToValueAtTime(x, ctx.currentTime + Math.max(0.01, over)); }
  else { try { v.el.volume = x; } catch { /* some devices fix the volume */ } }
}
/** Route a voice through Web Audio once there is a context: on iOS that is the only way to set its volume. */
function wire(v: Voice) {
  const ctx = audioCtx();
  if (v.gain || !ctx || !src.startsWith('blob:')) return; // a file played straight from disk may not be routed
  try { const g = ctx.createGain(); g.gain.value = 0; ctx.createMediaElementSource(v.el).connect(g).connect(ctx.destination); v.gain = g; v.el.volume = 1; } catch { /* stays on its own volume */ }
}
function voice(): Voice {
  const el = new Audio();
  el.preload = 'auto'; el.loop = false;
  const v: Voice = { el, gain: null };
  el.addEventListener('timeupdate', () => {
    if (voices[now] !== v || loopT || !isFinite(el.duration)) return;
    const left = el.duration - el.currentTime;
    if (left < 1.5) loopT = window.setTimeout(again, Math.max(0, (left - MUSIC_OVERLAP) * 1000));
  });
  el.addEventListener('ended', () => { if (voices[now] === v && !loopT) again(); });
  return v;
}
/** The piece begins again on the other voice while this one's last note dies away. */
function again() {
  loopT = 0;
  if (!track || level() <= 0 || document.hidden) return;
  const old = voices[now], next = voices[(now = 1 - now)];
  wire(next);
  try { next.el.currentTime = 0; } catch { /* not ready */ }
  setVol(next, level());
  void next.el.play().catch(() => { /* waits for the next tap */ });
  setVol(old, 0, MUSIC_OVERLAP);
  window.setTimeout(() => { if (voices[now] !== old) old.el.pause(); }, MUSIC_OVERLAP * 1000 + 80);
}
function startPlaying() {
  if (!track || !src || level() <= 0 || document.hidden) return;
  const v = voices[now];
  wire(v);
  setVol(v, level(), 1.2);
  void v.el.play().then(() => { state.playing = true; }).catch(() => { state.playing = false; });
}
/** Fetch the piece as a whole file, so the service worker can keep it and it plays offline; a page opened
 *  straight from disk cannot fetch, and plays the file by its path instead. */
async function load(name: string) {
  const path = `sound/music-${name}.${state.format = format()}`;
  let from = path;
  if (location.protocol !== 'file:') try { const r = await fetch(path); if (r.ok) from = URL.createObjectURL(await r.blob()); } catch { /* played by its path */ }
  if (wanted !== name) { if (from.startsWith('blob:')) URL.revokeObjectURL(from); return; }
  if (src.startsWith('blob:')) URL.revokeObjectURL(src);
  if (!voices.length) voices = [voice(), voice()];
  src = from; track = state.track = name; now = 0;
  for (const v of voices) { v.el.pause(); v.el.src = src; }
  startPlaying();
}

/** Ask for the piece that suits a people. Call as often as you like: it acts only when something changed. */
export function syncMusic(culture: string) {
  const name = level() > 0 ? trackFor(culture) : '';
  if (!name) { if (track) quiet(); wanted = ''; return; }
  if (name === wanted) { if (track === name) { if (voices[now].el.paused) startPlaying(); else setVol(voices[now], level(), 0.3); } return; }
  wanted = name;
  void load(name);
}
function quiet() {
  clearTimeout(loopT); loopT = 0;
  for (const v of voices) { setVol(v, 0, 0.3); window.setTimeout(() => v.el.pause(), 350); }
  state.playing = false;
}
/** Silence, and forget the piece: the title screen, or music switched off. */
export function stopMusic() { wanted = ''; if (track) quiet(); }

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!track || !wanted) return; if (document.hidden) { clearTimeout(loopT); loopT = 0; for (const v of voices) v.el.pause(); } else startPlaying(); });
  // a browser may refuse to start sound outside a tap: try again on the next one
  document.addEventListener('pointerdown', () => { if (track && wanted && voices[now]?.el.paused) startPlaying(); }, { passive: true });
}
