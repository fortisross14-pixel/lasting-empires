// The history of the realm as one picture: the map as it stands, the title, and the chapters, on paper.
// Handed to the device's share sheet where there is one, saved as a file where there is not.
import type { GameState } from '../types';
import { getGeo } from '../engine/map';
import { player, provsOf } from '../engine/core';
import { provKnown } from '../engine/overseas';
import { historyOf } from '../engine/chronicle';
import { NO_STATE } from '../data/nations';
import { wash } from './map';

const W = 1080, PAD = 64, MAP_H = 520;
const INK = '#1b1a17', PAPER = '#f6f1e6', WAX = '#b3261e', MUTED = '#6f6a5f', SEA = '#dfe7e3';
const DISPLAY = "'Cormorant SC', 'Palatino Linotype', Georgia, serif", BODY = "'EB Garamond', Garamond, Georgia, serif";

/** Break a text into lines that fit a width, with the font already set on the context. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = []; let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** The map around the player's realm, drawn into a box of the canvas. */
function drawMap(ctx: CanvasRenderingContext2D, s: GameState, x: number, y: number, w: number, h: number) {
  const g = getGeo(), mine = provsOf(s, s.player);
  const cs = (mine.length ? mine : Object.values(s.provinces)).map(p => g.center[p.id]).filter(Boolean);
  let x0 = Math.min(...cs.map(c => c[0])), x1 = Math.max(...cs.map(c => c[0])), y0 = Math.min(...cs.map(c => c[1])), y1 = Math.max(...cs.map(c => c[1]));
  // room around the realm, then widen whichever way the box needs
  const mx = Math.max(60, (x1 - x0) * 0.45), my = Math.max(40, (y1 - y0) * 0.45);
  x0 -= mx; x1 += mx; y0 -= my; y1 += my;
  const k = Math.min(w / (x1 - x0), h / (y1 - y0));
  const ox = x + (w - (x1 - x0) * k) / 2 - x0 * k, oy = y + (h - (y1 - y0) * k) / 2 - y0 * k;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = SEA; ctx.fillRect(x, y, w, h);
  ctx.translate(ox, oy); ctx.scale(k, k);
  const byLand: Record<string, string[]> = {};
  for (const [id, l] of Object.entries(g.land)) (byLand[l] ??= []).push(id);
  for (const [lid, ids] of Object.entries(byLand)) {
    const land = new Path2D(g.landPaths[lid]);
    ctx.save(); ctx.clip(land, 'evenodd');
    for (const id of ids) {
      const p = s.provinces[id]; if (!p) continue;
      const known = provKnown(s, id), nat = s.nations[p.owner];
      ctx.fillStyle = !known ? '#e9e2d0' : p.owner === NO_STATE || !nat ? '#ddd5c0' : wash(nat.color, p.owner === s.player ? 0.1 : 0.5);
      const cell = new Path2D(g.cells[id]);
      ctx.fill(cell);
      ctx.strokeStyle = 'rgba(36, 28, 23, .25)'; ctx.lineWidth = 0.6 / k; ctx.stroke(cell);
    }
    ctx.restore();
    ctx.strokeStyle = '#241c17'; ctx.lineWidth = 1.6 / k; ctx.stroke(land);
  }
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
}

/** Draw the picture. Returns the canvas (its height follows the length of the history). */
export function historyCanvas(s: GameState): HTMLCanvasElement {
  const me = player(s), chapters = historyOf(s);
  const said = (t: string) => t.replace(/^You declare war on /, 'War is declared on ').replace(/^You open the /, `${me.name} opens the `).replace(/ declares war on you!$/, ` declares war on ${me.name}.`).replace(/!$/, '.');
  const probe = document.createElement('canvas').getContext('2d')!;
  // lay the text out first, to know how tall the sheet must be
  type Row = { font: string; color: string; text: string; gap: number; indent?: number };
  const rows: Row[] = [];
  const inner = W - PAD * 2;
  for (const c of chapters) {
    rows.push({ font: `600 34px ${DISPLAY}`, color: INK, text: `${c.ruler}${c.epithet ? ' ' + c.epithet : ''}`, gap: 30 });
    rows.push({ font: `400 22px ${BODY}`, color: MUTED, text: `${c.from} – ${c.to}`, gap: 4 });
    if (!c.moments.length) rows.push({ font: `italic 400 26px ${BODY}`, color: MUTED, text: 'A quiet reign, of which the chroniclers say little.', gap: 10 });
    for (const m of c.moments) {
      probe.font = `400 26px ${BODY}`;
      wrap(probe, `${m.year}  ${said(m.text)}`, inner).forEach((line, i) => rows.push({ font: `400 26px ${BODY}`, color: INK, text: line, gap: i ? 2 : 10 }));
    }
  }
  if (!chapters.length) rows.push({ font: `italic 400 26px ${BODY}`, color: MUTED, text: 'Nothing is written yet.', gap: 20 });
  const lineH = (r: Row) => parseInt(/(\d+)px/.exec(r.font)![1], 10) * 1.25 + r.gap;
  const textH = rows.reduce((a, r) => a + lineH(r), 0);
  const top = PAD + MAP_H + 40 + 30 + 76; // map, eyebrow, title
  const H = Math.ceil(top + textH + 90);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(20, 20, W - 40, H - 40);
  drawMap(ctx, s, PAD, PAD, inner, MAP_H);
  ctx.textBaseline = 'alphabetic';
  let y = PAD + MAP_H + 40 + 24;
  ctx.font = `600 22px ${DISPLAY}`; ctx.fillStyle = WAX; ctx.fillText(`${s.startYear} – ${s.year}`.split('').join(' '), PAD, y);
  y += 62;
  const title = `The History of ${me.name}`;
  let size = 58;
  ctx.fillStyle = INK; ctx.font = `700 ${size}px ${DISPLAY}`;
  while (ctx.measureText(title).width > inner && size > 30) { size -= 4; ctx.font = `700 ${size}px ${DISPLAY}`; }
  ctx.fillText(title, PAD, y);
  y += 14;
  for (const r of rows) { y += lineH(r); ctx.font = r.font; ctx.fillStyle = r.color; ctx.fillText(r.text, PAD, y); }
  ctx.font = `600 20px ${DISPLAY}`; ctx.fillStyle = MUTED; ctx.textAlign = 'right';
  ctx.fillText('Lasting Empires', W - PAD, H - 44);
  ctx.textAlign = 'left';
  return cv;
}

/** Share the picture, or save it where sharing is not offered. Resolves to what happened, for the screen to say. */
export async function shareHistory(s: GameState): Promise<'shared' | 'saved' | 'cancelled' | 'failed'> {
  try {
    await Promise.all([document.fonts?.load(`700 58px ${DISPLAY}`), document.fonts?.load(`400 26px ${BODY}`)]).catch(() => undefined);
    const cv = historyCanvas(s);
    const blob = await new Promise<Blob | null>(res => cv.toBlob(res, 'image/png'));
    if (!blob) return 'failed';
    const name = `history-of-${player(s).name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${s.year}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], title: `The History of ${player(s).name}` }); return 'shared'; }
      catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled'; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'saved';
  } catch { return 'failed'; }
}
