// Painted card art: small webp tiles in the art/ folder, loaded only when a card shows.
// Cards without a painting keep their line icon.

const ART = new Set('card_alliance_pact card_ambush card_assimilation card_breakthrough card_charter card_church_gift card_claim card_collaboration card_colonial_charter card_condottieri card_conquista card_conquistadors card_crusade card_debt card_drill card_embassy card_eq_banner card_eq_plate card_eq_warhorse card_expedition card_export_contract card_favour card_fealty card_forced_march card_fortify card_found_settlement card_fresh_recruits card_grow_settlement card_guild_charter card_harvest card_import_contract card_integration card_irrigation card_lavish_gifts card_levy_tax card_loan card_march_orders card_marriage card_merchant_route card_move_capital card_peace_envoy card_religious_mission card_revolution card_royal_feast card_royal_progress card_royal_works card_scholar card_scouts card_settlers card_spy_network card_study_economy card_study_military card_study_state card_tax_farm card_trade_fair card_trade_route card_trading_post card_windfall role_admin role_admiral role_artist role_colonist role_conqueror role_courtier role_diplomat role_explorer role_general role_leader role_merchant role_priest role_researcher unit_arquebusiers unit_bombard unit_caravel unit_carrack unit_crossbow unit_cuirassiers unit_dragoons unit_field_cannon unit_galleass unit_galleon unit_galley unit_garrison unit_jinetes unit_knights unit_levy unit_line_infantry unit_man_of_war unit_men_at_arms unit_musketeers unit_old_tercio unit_pikemen unit_rebels unit_reiters unit_swiss unit_tercio'.split(' '));

/** Extra cards that share another subject's painting. */
const ALIAS: Record<string, string> = {
  card_treasure_fleet: 'unit_galleon', card_greek_scholars: 'card_collaboration', card_census: 'card_study_state',
  card_pacify: 'card_charter', card_tolerance: 'card_charter', card_sermon: 'card_religious_mission', card_holy_see: 'card_religious_mission',
  card_relic: 'card_religious_mission', card_unrest: 'unit_rebels', card_patronage: 'role_artist', card_royal_grace: 'role_leader',
  card_embrace_culture: 'role_leader', card_festival: 'card_royal_feast',
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
