const TICK_BASED_STATISTIC_KEYS = new Set([
  'minecraft:play_time',
  'minecraft:total_world_time',
  'minecraft:time_since_rest',
  'minecraft:time_since_death',
  'minecraft:sneak_time'
])

const CENTIMETER_BASED_STATISTIC_KEYS = new Set([
  'minecraft:walk_one_cm',
  'minecraft:walk_on_water_one_cm',
  'minecraft:walk_under_water_one_cm',
  'minecraft:sprint_one_cm',
  'minecraft:swim_one_cm',
  'minecraft:fall_one_cm',
  'minecraft:climb_one_cm',
  'minecraft:fly_one_cm',
  'minecraft:crouch_one_cm',
  'minecraft:boat_one_cm',
  'minecraft:horse_one_cm',
  'minecraft:pig_one_cm',
  'minecraft:strider_one_cm',
  'minecraft:minecart_one_cm',
  'minecraft:aviate_one_cm',
  'minecraft:happy_ghast_one_cm'
])

const MINECRAFT_TICKS_PER_SECOND = 20

function formatDurationFromTicks(ticks: number): string {
  const totalSeconds = Math.round(ticks / MINECRAFT_TICKS_PER_SECOND)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatDistanceFromCentimeters(centimeters: number): string {
  const meters = centimeters / 100
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

export function formatStatisticDisplayValue(statisticKey: string, rawValue: number): string {
  if (TICK_BASED_STATISTIC_KEYS.has(statisticKey)) return formatDurationFromTicks(rawValue)
  if (CENTIMETER_BASED_STATISTIC_KEYS.has(statisticKey)) return formatDistanceFromCentimeters(rawValue)
  return rawValue.toLocaleString('de-DE')
}
