// Culture, faith, art and the happiness of the people, which moves stability.
import { FOOD } from '../data/goods';
import { artHappy, churchHappy } from './culture';
import type { GameState, Province } from '../types';
import { BUILDINGS } from '../data/techs';
import { player, provsOf, clamp, rand, hasCore, hasGood, log, population, ageId, techFx } from './core';
import { NATIONS, NO_STATE } from '../data/nations';
import { getGeo } from './map';

const NAMED: Record<string, string> = {
  fur: 'Fur',
  fulani: 'Fulani',
  charrua: 'Charrúa',
  tehuelche: 'Tehuelche',
  guaycuru: 'Guaycuru',
  ge: 'Gê',
  yaqui: 'Yaqui',
  inuit: 'Inuit',
  dene: 'Dene',
  salish: 'Salish',
  cree: 'Cree',
  sioux: 'Sioux',
  beja: 'Beja',
  dagestani: 'Dagestani',
  circassian: 'Circassian',
  azeri: 'Azeri',
  kurdish: 'Kurdish',
  armenian: 'Armenian',
  bugis: 'Bugis',
  dayak: 'Dayak',
  sundanese: 'Sundanese',
  rakhine: 'Rakhine',
  shan: 'Shan',
  mon: 'Mon',
  lao: 'Lao',
  bai: 'Bai',
  miao: 'Miao',
  zhuang: 'Zhuang',
  yi: 'Yi',
  formosan: 'Formosan',
  ainu: 'Ainu',
  ryukyuan: 'Ryukyuan',
  oirat: 'Oirat',
  chagatai: 'Chagatai',
  komi: 'Komi',
  karelian: 'Karelian',
  carib: 'Carib',
  cherokee: 'Cherokee',
  muskogean: 'Muskogean',
  diaguita: 'Diaguita',
  aymara: 'Aymara',
  mixtec: 'Mixtec',
  yoruba: 'Yoruba',
  mossi: 'Mossi',
  gondi: 'Gondi',
  marathi: 'Marathi',
  telugu: 'Telugu',
  castilian: 'Castilian', portuguese: 'Portuguese', aragonese: 'Aragonese', catalan: 'Catalan', basque: 'Basque', andalusi: 'Andalusi', galician: 'Galician',
  french: 'French', occitan: 'Occitan', italian: 'Italian', sicilian: 'Sicilian', sardinian: 'Sardinian', croatian: 'Croatian', maghrebi: 'Maghrebi',
  han: 'Chinese', hindustani: 'Hindustani', nahua: 'Nahua', quechua: 'Quechua', purepecha: 'Purépecha', chimu: 'Chimú', native: 'Native',
  guanche: 'Guanche', akan: 'Akan', khoisan: 'Khoisan', malagasy: 'Malagasy', taino: 'Taíno', algonquian: 'Algonquian', iroquois: 'Iroquois',
  plains: 'Plains peoples', pueblo: 'Pueblo', tupi: 'Tupi', guarani: 'Guaraní', mapuche: 'Mapuche', aboriginal: 'Aboriginal', maori: 'Māori',
  siberian: 'Siberian', filipino: 'Filipino', papuan: 'Papuan', muisca: 'Muisca', arawak: 'Arawak', nubian: 'Nubian', berber: 'Berber',
  icelandic: 'Icelandic', sami: 'Sami', canarian: 'Canarian', lunda: 'Lunda',
};
/** Display name of a culture (unknown ids are capitalised). */
export const CULTURE_NAMES: Record<string, string> = new Proxy(NAMED, { get: (t, k: string) => t[k] ?? (k ? k[0].toUpperCase() + k.slice(1) : k) });
export const RELIGION_NAMES: Record<string, string> = {
  catholic: 'Catholic', protestant: 'Protestant', orthodox: 'Orthodox', coptic: 'Coptic', muslim: 'Muslim', hindu: 'Hindu', buddhist: 'Buddhist',
  confucian: 'Confucian', shinto: 'Shinto', animist: 'Animist', nahuatl: 'Teotl faith', inti: 'Inti faith',
};

const CULTURE_OVERRIDE: Record<string, string> = {
  bilbao: 'basque', sansebastian: 'basque', vitoria: 'basque', pamplona: 'basque',
  coruna: 'galician', santiago: 'galician', lugo: 'galician', ourense: 'galician',
  barcelona: 'catalan', girona: 'catalan', lleida: 'catalan', tarragona: 'catalan', valencia: 'catalan', alicante: 'catalan', majorca: 'catalan', perpignan: 'catalan',
  toulouse: 'occitan', montpellier: 'occitan', marseille: 'occitan', bordeaux: 'occitan', bayonne: 'occitan', limoges: 'occitan', clermont: 'occitan',
  cagliari: 'sardinian', sassari: 'sardinian', palermo: 'sicilian', messina: 'sicilian', syracuse: 'sicilian',
  zagreb: 'croatian', zara: 'croatian', candia: 'greek', mistra: 'greek', athens: 'greek', thessaloniki: 'greek', izmir: 'greek', cyprus: 'greek',
  kiev: 'ruthenian', minsk: 'ruthenian', smolensk: 'russian', lutsk: 'ruthenian', lviv: 'ruthenian', riga: 'baltic', kolozsvar: 'romanian', temesvar: 'romanian',
  pressburg: 'slovak', breslau: 'silesian', calais: 'english', jerusalem: 'arab', damascus: 'arab', aswan: 'nubian', nubia: 'nubian', fezzan: 'berber',
  oslo: 'norwegian', bergen: 'norwegian', trondheim: 'norwegian', turku: 'finnish', scania: 'danish', iceland: 'icelandic',
  canaries: 'canarian', baghdad: 'arab', mosul: 'arab', kashgar: 'uyghur', goa: 'konkani', coromandel: 'tamil', kazakh: 'kazakh',
};
// Peoples of the stateless lands, by region (a few provinces are named directly).
const NATIVE_BY_REGION: Record<string, string> = {
  west_africa: 'akan', central_africa: 'bantu', southern_africa: 'khoisan', east_africa: 'swahili', siberia: 'siberian', caribbean: 'taino',
  north_america: 'algonquian', mexico: 'pueblo', andes: 'quechua', brazil: 'tupi', plata: 'guarani', oceania: 'aboriginal', east_indies: 'malay',
  india: 'hindustani', china: 'han', atlantic: 'canarian', europe: 'sami', russia: 'siberian', central_asia: 'kazakh', north_africa: 'berber', middle_east: 'arab',
};
const NATIVE_OVERRIDE: Record<string, string> = { madagascar: 'malagasy', newzealand: 'maori', luzon: 'filipino', newguinea: 'papuan', bogota: 'muisca', chile: 'mapuche', iroquoia: 'iroquois', plains: 'plains', guiana: 'arawak', lunda: 'lunda' };
const NATIVE_FAITH: Record<string, string> = { east_africa: 'muslim', east_indies: 'animist', india: 'hindu', china: 'buddhist', central_asia: 'muslim', north_africa: 'muslim', middle_east: 'muslim', atlantic: 'animist' };

export function initSociety(s: GameState) {
  const seeds = Object.fromEntries(getGeo().seeds.map(x => [x.id, x]));
  for (const p of Object.values(s.provinces)) {
    const def = NATIONS.find(n => n.id === p.core);
    p.culture ??= seeds[p.id]?.culture as string;
    if (p.core === NO_STATE) {
      const region = seeds[p.id]?.region ?? 'europe';
      p.culture ??= NATIVE_OVERRIDE[p.id] ?? CULTURE_OVERRIDE[p.id] ?? NATIVE_BY_REGION[region] ?? 'native';
      p.religion ??= NATIVE_FAITH[region] ?? 'animist';
    }
    p.culture ??= CULTURE_OVERRIDE[p.id] ?? def?.culture ?? 'native';
    p.religion ??= def?.religion ?? 'catholic';
  }
  const me = NATIONS.find(n => n.id === s.player);
  s.stateReligion ??= me?.religion ?? 'catholic';
  if (!s.accepted?.length) s.accepted = s.player === 'aragon' ? ['aragonese', 'catalan'] : s.player === 'castile' ? ['castilian', 'galician'] : [me?.culture ?? 'castilian'];
  s.art ??= 5; s.taxBurden ??= 0; s.happiness ??= 55;
}

export const isAccepted = (s: GameState, culture: string) => s.accepted.includes(culture);

export interface HappyPart { label: string; v: number; }

/** Happiness of one province (0..100) and why. */
export function happinessOf(s: GameState, p: Province): { value: number; parts: HappyPart[] } {
  const parts: HappyPart[] = [{ label: 'Base', v: 50 }];
  if (p.religion === s.stateReligion) parts.push({ label: `${RELIGION_NAMES[p.religion]} faith`, v: hasCore(s, 'traditional') ? 11 : 8 });
  else {
    let v = -18;
    if ((s.flags.tolerance_until ?? 0) > s.year) v += 10;
    if (hasCore(s, 'open')) v += 6;
    if (ageId(s) === 'reformation') v -= 4;
    parts.push({ label: `${RELIGION_NAMES[p.religion] ?? p.religion} minority`, v });
  }
  parts.push(isAccepted(s, p.culture) ? { label: `${CULTURE_NAMES[p.culture] ?? p.culture} culture`, v: 5 } : { label: `Foreign culture (${CULTURE_NAMES[p.culture] ?? p.culture})`, v: ageId(s) === 'revolutions' ? -15 : -12 });
  const art = Math.round(s.art * 0.15);
  if (art) parts.push({ label: 'Learning', v: art });
  if (p.owner === s.player) {
    const learned = techFx(s, 'happy');
    if (learned) parts.push({ label: 'Research', v: learned });
    const works = Math.round(artHappy(s));
    if (works) parts.push({ label: 'Works of art', v: works });
    const ch = churchHappy(s, p.religion);
    if (ch) parts.push({ label: ch > 0 ? 'Blessed by the church' : 'Censured by the church', v: ch });
  }
  let local = 0;
  for (const b of p.buildings) local += { temple: 5, university: 3, market: 2, farm: 2, courthouse: 1 }[b] ?? 0;
  if (local) parts.push({ label: 'Buildings', v: local });
  if (p.owner === s.player) {
    const hunger = s.short?.food ?? 0, naked = s.short?.cloth ?? 0;
    if (hunger >= 0.05) parts.push({ label: 'Hunger', v: -Math.round(4 + 12 * hunger) });
    else {
      parts.push({ label: 'Well fed', v: 2 });
      const kinds = FOOD.filter(g => (s.stock?.[g] ?? 0) > 0.2).length;
      if (kinds >= 3) parts.push({ label: `Varied food (${kinds} kinds)`, v: kinds - 1 });
    }
    if (naked >= 0.05) parts.push({ label: 'Short of cloth', v: -Math.round(2 + 6 * naked) });
  }
  const warYears = s.wars.filter(w => w.a === s.player || w.b === s.player).reduce((a, w) => a + (s.year - w.since), 0);
  if (warYears > 2) parts.push({ label: 'War weariness', v: -Math.min(15, Math.round((warYears - 2) * 1.5)) });
  if (s.taxBurden > 0) parts.push({ label: 'Taxes', v: -Math.round(s.taxBurden) });
  if ((s.flags.festival_until ?? 0) > s.year) parts.push({ label: 'Royal festival', v: 8 });
  if (p.control < 30) parts.push({ label: 'Weak royal control', v: -8 });
  if ((p.favor ?? 0) >= 1) parts.push({ label: 'Royal favour', v: Math.round(p.favor!) });
  if (p.core !== s.player) parts.push({ label: 'Recently conquered', v: -5 });
  const size = provsOf(s, s.player).length;
  if (size > 10) parts.push({ label: 'Overextension', v: -Math.min(20, Math.round((size - 10) * 0.9)) });
  const value = clamp(Math.round(parts.reduce((a, x) => a + x.v, 0)), 0, 100);
  return { value, parts };
}

/** Population-weighted happiness of the whole realm. */
export function nationalHappiness(s: GameState): number {
  let sum = 0, w = 0;
  for (const p of provsOf(s, s.player)) { const pop = population(s, p); sum += happinessOf(s, p).value * pop; w += pop; }
  return w ? Math.round(sum / w) : 50;
}

export const moodName = (h: number) => (h >= 75 ? 'Joyful' : h >= 60 ? 'Content' : h >= 40 ? 'Restless' : h >= 25 ? 'Angry' : 'Rebellious');

/** Yearly: happiness moves stability and control; art and taxes drift. */
export function yearlySociety(s: GameState) {
  const me = player(s);
  const h = nationalHappiness(s);
  s.happiness = h;
  if (h >= 80 && rand(s) < 0.4) { me.stability = clamp(me.stability + 1, -3, 3); log(s, 'A joyful people: stability rises.', 'good'); }
  else if (h >= 65 && rand(s) < 0.25) { me.stability = clamp(me.stability + 1, -3, 3); log(s, 'A content people: stability rises.', 'good'); }
  else if (h < 25 && rand(s) < 0.45) { me.stability = clamp(me.stability - 1, -3, 3); log(s, 'The people are close to revolt: stability falls.', 'bad'); }
  else if (h < 40 && rand(s) < 0.25) { me.stability = clamp(me.stability - 1, -3, 3); log(s, 'A restless people: stability falls.', 'bad'); }
  for (const p of provsOf(s, s.player)) p.control = clamp(p.control + (happinessOf(s, p).value - 50) / 25, 0, 100);
  let artGain = 0;
  for (const p of provsOf(s, s.player)) for (const b of p.buildings) artGain += ({ university: 0.5, temple: 0.3, library: 0.3 } as Record<string, number>)[b] ?? 0;
  s.art = clamp(s.art * 0.985 + artGain * (ageId(s) === 'enlightenment' ? 1.5 : 1), 0, 100);
  s.taxBurden = Math.max(0, s.taxBurden - 3);
  for (const p of Object.values(s.provinces)) if (p.favor) p.favor = p.favor > 1 ? p.favor - 1 : undefined;
  void BUILDINGS;
}

/** The biggest culture in the realm that is not yet accepted. */
export function largestForeignCulture(s: GameState): string | null {
  const count: Record<string, number> = {};
  for (const p of provsOf(s, s.player)) if (!isAccepted(s, p.culture)) count[p.culture] = (count[p.culture] ?? 0) + population(s, p);
  const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}
