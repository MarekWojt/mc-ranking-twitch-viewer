const GENERAL_STATISTIC_THEME_FALLBACK = 'Sonstiges'

const GENERAL_STATISTIC_KEYS_BY_THEME: Record<string, string[]> = {
  'Generell': [
    'minecraft:play_time',
    'minecraft:total_world_time',
    'minecraft:time_since_rest',
    'minecraft:time_since_death',
    'minecraft:leave_game'
  ],
  'Bewegung allgemein': [
    'minecraft:walk_one_cm',
    'minecraft:walk_on_water_one_cm',
    'minecraft:walk_under_water_one_cm',
    'minecraft:sprint_one_cm',
    'minecraft:swim_one_cm',
    'minecraft:fall_one_cm',
    'minecraft:climb_one_cm',
    'minecraft:crouch_one_cm',
    'minecraft:fly_one_cm',
    'minecraft:jump',
    'minecraft:sneak_time'
  ],
  'Bewegung mit Hilfsmittel': [
    'minecraft:boat_one_cm',
    'minecraft:horse_one_cm',
    'minecraft:pig_one_cm',
    'minecraft:aviate_one_cm',
    'minecraft:minecart_one_cm',
    'minecraft:strider_one_cm',
    'minecraft:happy_ghast_one_cm'
  ],
  'Kampf': [
    'minecraft:damage_dealt',
    'minecraft:damage_taken',
    'minecraft:damage_absorbed',
    'minecraft:damage_resisted',
    'minecraft:damage_blocked_by_shield',
    'minecraft:deaths',
    'minecraft:mob_kills',
    'minecraft:player_kills'
  ],
  'Interaktionen Storage': [
    'minecraft:open_barrel',
    'minecraft:open_chest',
    'minecraft:open_enderchest',
    'minecraft:open_shulker_box',
    'minecraft:trigger_trapped_chest'
  ],
  'Interaktionen Crafting': [
    'minecraft:interact_with_cartography_table',
    'minecraft:interact_with_brewingstand',
    'minecraft:interact_with_crafting_table',
    'minecraft:interact_with_furnace',
    'minecraft:interact_with_anvil',
    'minecraft:enchant_item',
    'minecraft:interact_with_blast_furnace',
    'minecraft:interact_with_smithing_table',
    'minecraft:interact_with_smoker',
    'minecraft:interact_with_stonecutter',
    'minecraft:interact_with_loom',
    'minecraft:interact_with_grindstone'
  ],
  'Interaktionen Funktionsblöcke': [
    'minecraft:interact_with_beacon',
    'minecraft:interact_with_lectern',
    'minecraft:inspect_dispenser',
    'minecraft:inspect_dropper',
    'minecraft:inspect_hopper'
  ],
  'Interaktionen Sonstiges': [
    'minecraft:interact_with_campfire',
    'minecraft:bell_ring',
    'minecraft:eat_cake_slice',
    'minecraft:play_noteblock',
    'minecraft:play_record',
    'minecraft:tune_noteblock',
    'minecraft:pot_flower',
    'minecraft:sleep_in_bed',
    'minecraft:target_hit',
    'minecraft:use_cauldron',
    'minecraft:fill_cauldron',
    'minecraft:drop',
    'minecraft:clean_armor'
  ],
  'Villager/Tiere': [
    'minecraft:raid_trigger',
    'minecraft:raid_win',
    'minecraft:talked_to_villager',
    'minecraft:traded_with_villager',
    'minecraft:animals_bred',
    'minecraft:fish_caught'
  ]
}

export const GENERAL_STATISTIC_THEME_ORDER = Object.keys(GENERAL_STATISTIC_KEYS_BY_THEME)

const GENERAL_STATISTIC_THEME_BY_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(GENERAL_STATISTIC_KEYS_BY_THEME).flatMap(([theme, keys]) => keys.map(key => [key, theme]))
)

export function classifyGeneralStatisticTheme(statisticKey: string): string {
  return GENERAL_STATISTIC_THEME_BY_KEY[statisticKey] ?? GENERAL_STATISTIC_THEME_FALLBACK
}
