// Painted card art: small webp tiles in the art/ folder, loaded only when a card shows.
// Cards without a painting keep their line icon.

const ART = new Set('card_alliance_pact card_ambush card_claim card_colonial_charter card_condottieri card_conquista card_debt card_drill card_embassy card_eq_banner card_eq_plate card_eq_warhorse card_export_contract card_fealty card_forced_march card_fortify card_found_settlement card_fresh_recruits card_grow_settlement card_guild_charter card_import_contract card_integration card_irrigation card_lavish_gifts card_levy_tax card_loan card_march_orders card_marriage card_move_capital card_peace_envoy card_revolution card_royal_feast card_royal_progress card_royal_works card_scouts card_settlers card_spy_network card_tax_farm card_trade_fair card_trade_route card_trading_post card_windfall role_admin role_admiral role_artist role_colonist role_conqueror role_courtier role_diplomat role_explorer role_general role_leader role_merchant role_priest role_researcher unit_arquebusiers unit_bombard unit_caravel unit_carrack unit_crossbow unit_cuirassiers unit_dragoons unit_field_cannon unit_galleass unit_galleon unit_galley unit_garrison unit_jinetes unit_knights unit_levy unit_line_infantry unit_man_of_war unit_men_at_arms unit_musketeers unit_old_tercio unit_pikemen unit_rebels unit_reiters unit_swiss unit_tercio'.split(' '));

/** Extra cards that share another subject's painting. */
const ALIAS: Record<string, string> = { card_conquistadors: 'role_conqueror', card_expedition: 'role_explorer', card_treasure_fleet: 'unit_galleon', card_merchant_route: 'card_trade_route', card_crusade: 'card_march_orders' };

export function artName(name: string): string | null {
  const n = ART.has(name) ? name : ALIAS[name];
  return n && ART.has(n) ? n : null;
}

/** An <img> for the painting, or null when there is none. */
export function artImg(name: string): string | null {
  const n = artName(name);
  return n ? `<img class="c-pic" src="art/${n}.webp" alt="" loading="lazy" decoding="async" width="256" height="256">` : null;
}
