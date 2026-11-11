// Coats of arms for every realm, drawn as small SVG shields.
// The great realms carry simplified historical arms; the rest get arms made from their colour and name,
// so the same realm always shows the same shield.

const T = { or: '#d9a93a', ar: '#f4f0e6', gu: '#b3261e', az: '#2f5d8a', ve: '#3e7a3e', sa: '#1b1a17', pu: '#6b3a7a', orange: '#e07b2a' } as const;
type Tc = keyof typeof T | string;
const col = (t: Tc) => (T as Record<string, string>)[t] ?? t;

const SHIELD = 'M1 1H29V19C29 27 21.5 32.5 15 35C8.5 32.5 1 27 1 19Z';

// ---------- charges, drawn in a 30 × 36 box, centred near (15, 17) ----------
const star = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`); }
  return `<polygon points="${pts.join(' ')}"/>`;
};
const CHARGE: Record<string, (c: string) => string> = {
  star: c => `<g fill="${c}">${star(15, 16.5, 7.5)}</g>`,
  crescent: c => `<path fill="${c}" d="M18.5 9.5a8 8 0 1 0 0 15a6.4 6.4 0 1 1 0-15z"/>`,
  crescentstar: c => `<g fill="${c}"><path d="M15 10a7.5 7.5 0 1 0 0 14a6 6 0 1 1 0-14z"/>${star(20.5, 17, 3.4)}</g>`,
  lion: c => `<path fill="${c}" d="M8 27l1.5-5c-1.5-1-2.5-3-2-5.5l2-1.5-1.5-2.5 2.5-.5 1-3 2 2.5c1.5-.5 3 0 4 1l3.5-3.5 1 2-2 3c1.5 1.5 2 3.5 1.5 5.5l2.5 1 .5 3-2-1-1.5 2 .5 3h-2l-1-3.5h-4l-1 3.5h-2l.5-3.5-2-.5-1 4z"/>`,
  eagle: c => `<path fill="${c}" d="M15 8.5l1.6 2.6 6.4-3-1.8 5.2 3.3.8-5 2.5.9 5.3-3.2-2.2-2.2 5-2.2-5-3.2 2.2.9-5.3-5-2.5 3.3-.8L7 8.1l6.4 3z"/>`,
  fleur: c => `<path fill="${c}" d="M15 7c-2.2 2.6-2.4 5.8 0 9 2.4-3.2 2.2-6.4 0-9zM15 16.5c-2.6-2.8-7-2.4-7 .8 0 1.8 1.6 2.8 3.4 2-1.5-.2-1.6-1.9-.2-2 1.3 0 2.6 1.2 3.8 2.4 1.2-1.2 2.5-2.4 3.8-2.4 1.4.1 1.3 1.8-.2 2 1.8.8 3.4-.2 3.4-2 0-3.2-4.4-3.6-7-.8zM11 20.5h8v1.8h-8zM14.1 22.3h1.8l1 4.7h-3.8z"/>`,
  tower: c => `<path fill="${c}" d="M8.5 27V15.5h1.8v-2.2h2.2v2.2h1.6v-2.2h1.8v2.2h1.6v-2.2h2.2v2.2h1.8V27zM13.4 27v-4a1.6 1.6 0 0 1 3.2 0v4z"/>`,
  keys: c => `<g stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M8.5 9.5l13 15M21.5 9.5l-13 15"/><circle cx="8" cy="9" r="2.4"/><circle cx="22" cy="9" r="2.4"/><path d="M19 22l2.5-2.5M11 22l-2.5-2.5"/></g>`,
  disc: c => `<circle fill="${c}" cx="15" cy="17" r="7"/>`,
  crown: c => `<path fill="${c}" d="M8 22l-1-9 4.5 4L15 10l3.5 7 4.5-4-1 9zM8 23.5h14v2.2H8z"/>`,
  quinas: c => `<g fill="${c}"><rect x="12.5" y="8" width="5" height="5.5"/><rect x="7" y="14.5" width="5" height="5.5"/><rect x="12.5" y="14.5" width="5" height="5.5"/><rect x="18" y="14.5" width="5" height="5.5"/><rect x="12.5" y="21" width="5" height="5.5"/></g>`,
  sun: c => `<g fill="${c}"><circle cx="15" cy="17" r="4.2"/>${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<polygon points="${(15 + 5.2 * Math.cos(a - .16)).toFixed(1)},${(17 + 5.2 * Math.sin(a - .16)).toFixed(1)} ${(15 + 8.5 * Math.cos(a)).toFixed(1)},${(17 + 8.5 * Math.sin(a)).toFixed(1)} ${(15 + 5.2 * Math.cos(a + .16)).toFixed(1)},${(17 + 5.2 * Math.sin(a + .16)).toFixed(1)}"/>`; }).join('')}</g>`,
};

// ---------- partitions and ordinaries ----------
type Field =
  | { k: 'plain'; a: Tc }
  | { k: 'pale' | 'fess' | 'bend' | 'quarterly' | 'tierce'; a: Tc; b: Tc; c?: Tc }
  | { k: 'cross' | 'saltire' | 'fessband' | 'paleband' | 'chief' | 'chevron' | 'bordure'; a: Tc; b: Tc }
  | { k: 'barry' | 'paly'; a: Tc; b: Tc; n?: number }
  | { k: 'stripes'; a: Tc; b: Tc; canton: Tc };

function field(f: Field): string {
  const a = col(f.a), b = 'b' in f ? col(f.b) : a;
  switch (f.k) {
    case 'plain': return `<rect width="30" height="36" fill="${a}"/>`;
    case 'pale': return `<rect width="30" height="36" fill="${a}"/><rect x="15" width="15" height="36" fill="${b}"/>`;
    case 'fess': return `<rect width="30" height="36" fill="${a}"/><rect y="17" width="30" height="19" fill="${b}"/>`;
    case 'bend': return `<rect width="30" height="36" fill="${a}"/><path d="M0 0H30V36z" fill="${b}"/>`;
    case 'quarterly': return `<rect width="30" height="36" fill="${a}"/><rect x="15" width="15" height="17" fill="${b}"/><rect y="17" width="15" height="19" fill="${b}"/>`;
    case 'tierce': return `<rect width="30" height="12" fill="${a}"/><rect y="12" width="30" height="12" fill="${b}"/><rect y="24" width="30" height="12" fill="${col(f.c ?? f.a)}"/>`;
    case 'cross': return `<rect width="30" height="36" fill="${a}"/><rect x="12" width="6" height="36" fill="${b}"/><rect y="13" width="30" height="6" fill="${b}"/>`;
    case 'saltire': return `<rect width="30" height="36" fill="${a}"/><path d="M0 2L3 0 30 34 27 36zM30 2L27 0 0 34 3 36z" fill="${b}"/>`;
    case 'fessband': return `<rect width="30" height="36" fill="${a}"/><rect y="13" width="30" height="8" fill="${b}"/>`;
    case 'paleband': return `<rect width="30" height="36" fill="${a}"/><rect x="11" width="8" height="36" fill="${b}"/>`;
    case 'chief': return `<rect width="30" height="36" fill="${a}"/><rect width="30" height="10" fill="${b}"/>`;
    case 'chevron': return `<rect width="30" height="36" fill="${a}"/><path d="M0 26L15 12 30 26V32L15 18 0 32z" fill="${b}"/>`;
    case 'bordure': return `<rect width="30" height="36" fill="${b}"/><path d="${SHIELD}" transform="translate(3.6 3.4) scale(.76)" fill="${a}"/>`;
    case 'barry': { const n = f.n ?? 6, h = 36 / n; return `<rect width="30" height="36" fill="${a}"/>` + Array.from({ length: n }, (_, i) => (i % 2 ? `<rect y="${(i * h).toFixed(2)}" width="30" height="${h.toFixed(2)}" fill="${b}"/>` : '')).join(''); }
    case 'paly': { const n = f.n ?? 8, w = 30 / n; return `<rect width="30" height="36" fill="${a}"/>` + Array.from({ length: n }, (_, i) => (i % 2 ? `<rect x="${(i * w).toFixed(2)}" width="${w.toFixed(2)}" height="36" fill="${b}"/>` : '')).join(''); }
    case 'stripes': return field({ k: 'barry', a: f.a, b: f.b, n: 13 }) + `<rect width="14" height="16" fill="${col(f.canton)}"/>` + `<g fill="#f4f0e6">${star(4.5, 4.5, 2)}${star(10, 4.5, 2)}${star(7.2, 9, 2)}${star(4.5, 13, 2)}${star(10, 13, 2)}</g>`;
  }
}

interface Arms { f: Field; ch?: string; cc?: Tc; extra?: string }

/** Simplified historical arms of the great realms. */
const ARMS: Record<string, Arms> = {
  castile: { f: { k: 'quarterly', a: 'gu', b: 'ar' }, extra: `<g transform="translate(0 0) scale(.5)">${CHARGE.tower(T.or)}</g><g transform="translate(15 17) scale(.5)">${CHARGE.tower(T.or)}</g><g transform="translate(15 0) scale(.5)">${CHARGE.lion(T.pu)}</g><g transform="translate(0 17) scale(.5)">${CHARGE.lion(T.pu)}</g>` },
  aragon: { f: { k: 'paly', a: 'or', b: 'gu', n: 9 } },
  portugal: { f: { k: 'bordure', a: 'ar', b: 'gu' }, ch: 'quinas', cc: 'az' },
  france: { f: { k: 'plain', a: 'az' }, extra: `<g transform="translate(-.5 -.5) scale(.55)">${CHARGE.fleur(T.or)}</g><g transform="translate(13.5 -.5) scale(.55)">${CHARGE.fleur(T.or)}</g><g transform="translate(6.5 13) scale(.55)">${CHARGE.fleur(T.or)}</g>` },
  england: { f: { k: 'plain', a: 'gu' }, extra: [-4, 5.5, 15].map(y => `<g transform="translate(5.7 ${y}) scale(.62)">${CHARGE.lion(T.or)}</g>`).join('') },
  scotland: { f: { k: 'plain', a: 'or' }, ch: 'lion', cc: 'gu' },
  ireland: { f: { k: 'plain', a: 'az' }, ch: 'crown', cc: 'or' },
  ottomans: { f: { k: 'plain', a: 'gu' }, ch: 'crescentstar', cc: 'ar' },
  byzantium: { f: { k: 'cross', a: 'gu', b: 'or' } },
  venice: { f: { k: 'plain', a: 'az' }, ch: 'lion', cc: 'or' },
  genoa: { f: { k: 'cross', a: 'ar', b: 'gu' } },
  milan: { f: { k: 'quarterly', a: 'or', b: 'ar' }, ch: 'eagle', cc: 'sa' },
  florence: { f: { k: 'plain', a: 'ar' }, ch: 'fleur', cc: 'gu' },
  naples: { f: { k: 'chief', a: 'az', b: 'gu' }, ch: 'fleur', cc: 'or' },
  papacy: { f: { k: 'plain', a: 'gu' }, ch: 'keys', cc: 'or' },
  austria: { f: { k: 'fessband', a: 'gu', b: 'ar' } },
  hungary: { f: { k: 'barry', a: 'gu', b: 'ar', n: 8 } },
  poland: { f: { k: 'plain', a: 'gu' }, ch: 'eagle', cc: 'ar' },
  lithuania: { f: { k: 'plain', a: 'gu' }, ch: 'tower', cc: 'ar' },
  bohemia: { f: { k: 'plain', a: 'gu' }, ch: 'lion', cc: 'ar' },
  muscovy: { f: { k: 'plain', a: 'or' }, ch: 'eagle', cc: 'sa' },
  novgorod: { f: { k: 'plain', a: 'ar' }, ch: 'crown', cc: 'or' },
  sweden: { f: { k: 'cross', a: 'az', b: 'or' } },
  denmark: { f: { k: 'cross', a: 'gu', b: 'ar' } },
  norway: { f: { k: 'plain', a: 'gu' }, ch: 'lion', cc: 'or' },
  burgundy: { f: { k: 'bend', a: 'or', b: 'az' } },
  brandenburg: { f: { k: 'plain', a: 'ar' }, ch: 'eagle', cc: 'gu' },
  prussia: { f: { k: 'plain', a: 'ar' }, ch: 'eagle', cc: 'sa' },
  teutonic: { f: { k: 'cross', a: 'ar', b: 'sa' } },
  hospitallers: { f: { k: 'cross', a: 'gu', b: 'ar' } },
  navarre: { f: { k: 'saltire', a: 'gu', b: 'or' }, extra: `<rect x="13" width="4" height="36" fill="${T.or}"/><rect y="15" width="30" height="4" fill="${T.or}"/>` },
  granada: { f: { k: 'plain', a: 've' }, ch: 'crescent', cc: 'or' },
  morocco: { f: { k: 'plain', a: 'gu' }, ch: 'star', cc: 've' },
  mamluks: { f: { k: 'plain', a: 'or' }, ch: 'eagle', cc: 'gu' },
  netherlands: { f: { k: 'plain', a: 'orange' }, ch: 'lion', cc: 'az' },
  ming: { f: { k: 'plain', a: 'or' }, ch: 'sun', cc: 'gu' },
  qing: { f: { k: 'plain', a: 'or' }, ch: 'sun', cc: 'az' },
  japan: { f: { k: 'plain', a: 'ar' }, ch: 'disc', cc: 'gu' },
  korea: { f: { k: 'plain', a: 'ar' }, extra: `<circle cx="15" cy="17" r="7" fill="${T.az}"/><path d="M8 17a7 7 0 0 1 14 0a3.5 3.5 0 0 1-7 0a3.5 3.5 0 0 0-7 0z" fill="${T.gu}"/>` },
  mughals: { f: { k: 'plain', a: 've' }, ch: 'sun', cc: 'or' },
  safavids: { f: { k: 'plain', a: 've' }, ch: 'lion', cc: 'or', extra: `<g fill="${T.or}">${star(21.5, 9, 3)}</g>` },
  timurids: { f: { k: 'plain', a: 'az' }, extra: `<g fill="${T.or}"><circle cx="10" cy="12" r="3"/><circle cx="20" cy="12" r="3"/><circle cx="15" cy="21" r="3"/></g>` },
  mali: { f: { k: 'plain', a: 'or' }, ch: 'crown', cc: 'gu' },
  songhai: { f: { k: 'plain', a: 'gu' }, ch: 'star', cc: 'or' },
  ethiopia: { f: { k: 'tierce', a: 've', b: 'or', c: 'gu' }, ch: 'lion', cc: 'sa' },
  kongo: { f: { k: 'plain', a: 'gu' }, ch: 'crown', cc: 'or' },
  aztec: { f: { k: 'plain', a: 've' }, ch: 'eagle', cc: 'or' },
  inca: { f: { k: 'barry', a: 'gu', b: 'or', n: 7 }, ch: 'sun', cc: 'or' },
  thirteen_colonies: { f: { k: 'stripes', a: 'gu', b: 'ar', canton: 'az' } },
  vijayanagara: { f: { k: 'plain', a: 'gu' }, ch: 'sun', cc: 'or' },
  delhi: { f: { k: 'plain', a: 've' }, ch: 'crescent', cc: 'ar' },
  bahmani: { f: { k: 'plain', a: 've' }, ch: 'crescentstar', cc: 'or' },
  marathas: { f: { k: 'plain', a: 'orange' }, ch: 'sun', cc: 'gu' },
  savoy: { f: { k: 'cross', a: 'gu', b: 'ar' } },
  swiss: { f: { k: 'plain', a: 'gu' }, extra: `<path d="M12.5 9h5v6h6v5h-6v6h-5v-6h-6v-5h6z" fill="${T.ar}"/>` },
  bavaria: { f: { k: 'paly', a: 'ar', b: 'az', n: 8 } },
  saxony: { f: { k: 'barry', a: 'sa', b: 'or', n: 10 } },
  brittany: { f: { k: 'plain', a: 'ar' }, extra: `<g fill="${T.sa}">${[6, 15, 24].map(x => `<path d="M${x} 9l1.5 4h-3zM${x} 19l1.5 4h-3z"/>`).join('')}</g>` },
  hansa: { f: { k: 'fess', a: 'ar', b: 'gu' } },
};

// ---------- arms for everyone else, from their colour and name ----------
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const lum = (hex: string) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return 0.5; const n = parseInt(m[1], 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
function madeArms(id: string, color: string): Arms {
  const h = hash(id);
  const metal = lum(color) > 0.6 ? (h & 1 ? T.sa : T.gu) : (h & 1 ? T.or : T.ar);
  const kinds: Field['k'][] = ['plain', 'plain', 'plain', 'pale', 'fess', 'bend', 'chief', 'chevron', 'cross', 'saltire', 'fessband', 'paleband', 'bordure'];
  const k = kinds[(h >>> 3) % kinds.length];
  const charges = ['star', 'crescent', 'lion', 'eagle', 'tower', 'fleur', 'crown', 'sun', 'disc', ''];
  const plainField = k === 'plain' || k === 'bordure' || k === 'chief';
  const ch = plainField ? charges[(h >>> 7) % (charges.length - 1)] : '';
  return { f: { k, a: color, b: metal } as Field, ch: ch || undefined, cc: metal === T.sa || metal === T.gu ? (lum(color) > 0.6 ? metal : T.or) : metal };
}

const CACHE: Record<string, string> = {};
/** The shield of a realm as SVG markup. */
export function armsSvg(id: string, color: string): string {
  const key = id + color;
  if (CACHE[key]) return CACHE[key];
  const a = ARMS[id] ?? madeArms(id, color);
  const clip = 'cl' + hash(key).toString(36);
  const charge = a.ch ? CHARGE[a.ch]?.(col(a.cc ?? T.or)) ?? '' : '';
  const svg = `<svg viewBox="0 0 30 36" width="100%" height="100%" aria-hidden="true"><defs><clipPath id="${clip}"><path d="${SHIELD}"/></clipPath></defs><g clip-path="url(#${clip})">${field(a.f)}${charge}${a.extra ?? ''}</g><path d="${SHIELD}" fill="none" stroke="#1b1a17" stroke-width="1.4"/></svg>`;
  return (CACHE[key] = svg);
}
