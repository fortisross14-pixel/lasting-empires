// Painted card art: small webp tiles in the art/ folder, loaded only when a card shows.
// Cards without a painting keep their line icon.
import type { Character, Role } from '../types';
import { CULTURE_POOL } from '../data/names';

const ART = new Set('card_alliance_pact card_ambush card_assimilation card_breakthrough card_charter card_church_gift card_claim card_collaboration card_colonial_charter card_condottieri card_conquista card_conquistadors card_crusade card_debt card_drill card_embassy card_eq_banner card_eq_plate card_eq_warhorse card_expedition card_export_contract card_favour card_fealty card_forced_march card_fortify card_found_settlement card_fresh_recruits card_grow_settlement card_guild_charter card_harvest card_import_contract card_integration card_irrigation card_lavish_gifts card_levy_tax card_loan card_march_orders card_marriage card_merchant_route card_move_capital card_peace_envoy card_religious_mission card_revolution card_royal_feast card_royal_progress card_royal_works card_scholar card_scouts card_settlers card_spy_network card_study_economy card_study_military card_study_state card_tax_farm card_trade_fair card_trade_route card_trading_post card_windfall role_admin role_admiral role_artist role_colonist role_conqueror role_courtier role_diplomat role_explorer role_general role_leader role_merchant role_priest role_researcher unit_arquebusiers unit_bombard unit_caravel unit_carrack unit_crossbow unit_cuirassiers unit_dragoons unit_field_cannon unit_galleass unit_galleon unit_galley unit_garrison unit_jinetes unit_knights unit_levy unit_line_infantry unit_man_of_war unit_men_at_arms unit_musketeers unit_old_tercio unit_pikemen unit_rebels unit_reiters unit_swiss unit_tercio'.split(' '));

/** Extra cards that share another subject's painting. */
const ALIAS: Record<string, string> = {
  card_treasure_fleet: 'unit_galleon', card_greek_scholars: 'card_collaboration', card_census: 'card_study_state', card_study: 'card_study_state',
  card_pacify: 'card_charter', card_tolerance: 'card_charter', card_sermon: 'card_religious_mission', card_holy_see: 'card_religious_mission',
  card_relic: 'card_religious_mission', card_unrest: 'unit_rebels', card_patronage: 'role_artist', card_royal_grace: 'role_leader',
  card_embrace_culture: 'role_leader', card_festival: 'card_royal_feast',
  // units of the peoples outside Europe have no painting of their own yet (listed in docs/art-prompts-units.md):
  // each borrows the nearest painting of its kind, so no battle shows an empty tile
  unit_warriors: 'unit_levy', unit_militia: 'unit_levy', unit_spearmen: 'unit_levy', unit_azaps: 'unit_levy',
  unit_elite_warriors: 'unit_men_at_arms', unit_shield_warriors: 'unit_men_at_arms', unit_rajput_swords: 'unit_men_at_arms',
  unit_janissaries: 'unit_arquebusiers',
  unit_slingers: 'unit_crossbow', unit_archers: 'unit_crossbow', unit_horse_archers_foot: 'unit_crossbow',
  unit_sahel_horse: 'unit_jinetes', unit_horse_archers: 'unit_jinetes', unit_sipahis: 'unit_knights', unit_war_elephants: 'unit_knights',
  // the national troops of phase 2 (docs/HISTORY-PLAN.md), until they have their own paintings
  unit_inca_spearmen: 'unit_levy', unit_mace_warriors: 'unit_men_at_arms', unit_andean_slingers: 'unit_crossbow', unit_inca_guard: 'unit_men_at_arms',
  unit_macuahuitl_warriors: 'unit_men_at_arms', unit_atlatl_skirmishers: 'unit_crossbow', unit_jaguar_warriors: 'unit_men_at_arms', unit_eagle_warriors: 'unit_men_at_arms',
  unit_ming_spearmen: 'unit_pikemen', unit_chinese_crossbow: 'unit_crossbow', unit_early_handgunners: 'unit_arquebusiers', unit_chinese_cavalry: 'unit_jinetes', unit_chinese_artillery: 'unit_bombard',
  unit_ashigaru: 'unit_pikemen', unit_samurai: 'unit_men_at_arms', unit_yumi_archers: 'unit_crossbow', unit_teppo_ashigaru: 'unit_arquebusiers', unit_mounted_samurai: 'unit_knights',
  unit_bornean_spearmen: 'unit_levy', unit_malay_swordsmen: 'unit_men_at_arms', unit_island_skirmishers: 'unit_crossbow', unit_lantaka_gunners: 'unit_field_cannon',
  unit_lancaran: 'unit_galley', unit_jong: 'unit_carrack', unit_junk: 'unit_carrack', unit_dhow: 'unit_caravel', unit_pike_and_shot: 'unit_tercio',
  card_eq_long_pike: 'unit_pikemen', card_eq_arquebus: 'unit_arquebusiers', card_eq_bronze: 'unit_field_cannon', card_eq_pistols: 'unit_reiters', card_eq_musket: 'unit_musketeers', card_eq_bayonet: 'unit_line_infantry',
};

export function artName(name: string): string | null {
  const n = ART.has(name) ? name : ALIAS[name];
  return n && ART.has(n) ? n : null;
}

/** An <img> for the painting, or null when there is none. */
export function artImg(name: string): string | null {
  const n = artName(name);
  return n ? `<img class="c-pic" src="art/${n}.webp" alt="" loading="lazy" decoding="async" width="256" height="256">` : null;
}

/** Paintings that open an event: the event's id and the scene in art/ (event_<scene>.webp, 480 × 320).
 *  The steps of a chain share the painting of the chain; an event not listed keeps its line icon. */
const EVENT_ART: Record<string, string> = {
  constantinople: 'constantinople', siege_attack: 'constantinople',
  printer_1: 'printer', printer_2: 'printer', printer_3: 'printer',
  columbus: 'columbus', cape_route: 'cape_route', tordesillas: 'tordesillas', italian_wars: 'italian_wars',
  reformation: 'reformation', protestant_minority: 'reformation', potosi: 'potosi', lepanto: 'lepanto',
  thirty_years: 'thirty_years', westphalia: 'westphalia', versailles: 'versailles',
  plague: 'plague', plague_1: 'plague', plague_2: 'plague', plague_3: 'plague',
  bad_harvest: 'bad_harvest', famine_1: 'bad_harvest', famine_2: 'bad_harvest', famine_3: 'bad_harvest',
  revolt: 'revolt', court_visitor: 'court_visitor', great_artist: 'great_artist', tax_riots: 'tax_riots',
  golden_age: 'golden_age', call_to_arms: 'call_to_arms', armada: 'armada', sack_of_rome: 'sack_of_rome',
  french_revolution: 'estates_general', vienna_ottoman: 'vienna', vienna_austria: 'vienna', seven_years_war: 'seven_years_war',
  war_warning: 'war_warning', ultimatum: 'ultimatum', ultimatum_due: 'ultimatum', tribute_demand: 'ultimatum',
};
export const EVENT_SCENES = [...new Set(Object.values(EVENT_ART))];
export const eventsWithArt = () => Object.keys(EVENT_ART);
/** The painting for an event, as an <img>, or null when it has none. */
export function eventArt(id: string): string | null {
  const n = EVENT_ART[id];
  return n ? `<img class="ev-pic" src="art/event_${n}.webp" alt="" decoding="async" width="480" height="320">` : null;
}

// ---------- faces (roadmap 2.15) ----------
// Sixteen portraits for each of five families of dress: art/face_<family>_<row><column>.webp. The rows are four
// soldiers, four men of affairs, four of learning and faith, four of the court (two ladies, a courtier, an artist).
export const FACE_FAMILIES = ['western', 'islamic', 'eastasian', 'african', 'american'] as const;
/** Which family of dress a pool of names wears; any not listed is Western. */
const POOL_FAMILY: Record<string, string> = {
  turkish: 'islamic', arab: 'islamic', persian: 'islamic', steppe: 'islamic', indian: 'islamic',
  chinese: 'eastasian', korean: 'eastasian', japanese: 'eastasian', seasian: 'eastasian',
  african: 'african', american: 'american', mexica: 'american', andean: 'american',
};
export const faceFamily = (culture: string) => POOL_FAMILY[CULTURE_POOL[culture] ?? ''] ?? 'western';
/** The faces that suit each role, best first, as row × 4 + column. */
const ROLE_FACES: Record<Role, number[]> = {
  general: [0, 1, 3, 2], conqueror: [3, 1, 0], admiral: [2, 0, 3], explorer: [2, 1, 6],
  diplomat: [6, 7, 4], admin: [5, 7, 6], merchant: [4, 7, 5], colonist: [7, 4, 5],
  priest: [8, 9], researcher: [10, 11, 9],
  courtier: [14, 6, 11], artist: [15, 14], leader: [14, 9, 7],
};
/** The two ladies of each sheet, for those whose name is a woman's. */
const LADIES = [12, 13];
const WOMEN = new Set(['Isabel', 'Isabella', 'Juana', 'Beatriz', 'Leonor', 'María', 'Maria', 'Catalina', 'Anne', 'Marguerite', 'Margaret', 'Elizabeth', 'Mary', 'Anna', 'Margarete',
  'Kristina', 'Caterina', 'Jadwiga', 'Elena', 'Erzsébet', 'Eirene', 'Helena', 'Hürrem', 'Fatima', 'Parisa', 'Rani', 'Padmini', 'Amina']);
/** The face of a person: chosen once and kept on them, so the same person always looks the same. Among the faces
 *  that suit the role, the one fewest others at court already wear; no dice. */
export function faceOf(c: Character, court: Character[]): number {
  if (c.face != null) return c.face;
  const pool = WOMEN.has(c.name.split(' ')[0]) ? LADIES : ROLE_FACES[c.role] ?? ROLE_FACES.courtier;
  const worn = (f: number) => court.filter(x => x !== c && x.face === f).length;
  // the best-suited face nobody wears yet; when all are worn, the one worn least
  return (c.face = pool.reduce((best, f) => (worn(f) < worn(best) ? f : best), pool[0]));
}
/** The portrait as an <img>. */
export function faceImg(culture: string, face: number): string {
  return `<img class="c-pic c-face" src="art/face_${faceFamily(culture)}_${Math.floor(face / 4)}${face % 4}.webp" alt="" loading="lazy" decoding="async" width="224" height="224">`;
}
