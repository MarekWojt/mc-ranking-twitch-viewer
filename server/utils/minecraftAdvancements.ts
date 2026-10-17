import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface CompletedAdvancement {
  id: string
  completedAt: string | null
}

interface MinecraftPlayerAdvancementEntry {
  done?: boolean
  criteria?: Record<string, string>
}

type MinecraftPlayerAdvancementsFile = Record<string, MinecraftPlayerAdvancementEntry | number>

function isDisplayableAdvancementId(advancementId: string): boolean {
  return advancementId.startsWith('minecraft:') && !advancementId.startsWith('minecraft:recipes/')
}

const MINECRAFT_ADVANCEMENT_TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/

function parseMinecraftAdvancementTimestamp(rawTimestamp: string): Date | null {
  const match = rawTimestamp.match(MINECRAFT_ADVANCEMENT_TIMESTAMP_PATTERN)
  if (!match) return null

  const [, datePart, timePart, offsetHours, offsetMinutes] = match
  const date = new Date(`${datePart}T${timePart}${offsetHours}:${offsetMinutes}`)
  return Number.isNaN(date.getTime()) ? null : date
}

function extractCompletedAt(entry: MinecraftPlayerAdvancementEntry): string | null {
  const criteriaTimestamps = Object.values(entry.criteria ?? {})
    .map(parseMinecraftAdvancementTimestamp)
    .filter((date): date is Date => date !== null)

  if (criteriaTimestamps.length === 0) return null

  return new Date(Math.max(...criteriaTimestamps.map(date => date.getTime()))).toISOString()
}

function playerAdvancementsFilePath(minecraftUuid: string): string {
  const { minecraftAdvancementsDirectoryPath } = useRuntimeConfig()
  return join(minecraftAdvancementsDirectoryPath, `${minecraftUuid}.json`)
}

async function readPlayerCompletedAdvancements(minecraftUuid: string): Promise<CompletedAdvancement[]> {
  try {
    const fileContents = await readFile(playerAdvancementsFilePath(minecraftUuid), 'utf8')
    const parsedFile = JSON.parse(fileContents) as MinecraftPlayerAdvancementsFile
    return Object.entries(parsedFile)
      .filter((entry): entry is [string, MinecraftPlayerAdvancementEntry] =>
        isDisplayableAdvancementId(entry[0]) && (entry[1] as MinecraftPlayerAdvancementEntry).done === true)
      .map(([advancementId, entry]) => ({
        id: advancementId,
        completedAt: extractCompletedAt(entry)
      }))
  } catch {
    return []
  }
}

const minecraftAdvancementsCacheOptions = {
  name: 'minecraft-player-advancements',
  getKey: () => 'all',
  maxAge: useRuntimeConfig().minecraftStatsCacheTtlSeconds,
  ...FRESH_DATA_CACHE_OPTIONS
}

export const loadAllPlayerAdvancements = defineCachedFunction(async (): Promise<TimestampedValue<Record<string, CompletedAdvancement[]>>> => {
  const { value: participants } = await loadParticipants()
  const advancementEntries = await Promise.all(
    participants.map(async participant =>
      [participant.minecraftUuid, await readPlayerCompletedAdvancements(participant.minecraftUuid)] as const
    )
  )
  return { value: Object.fromEntries(advancementEntries), fetchedAt: new Date().toISOString() }
}, minecraftAdvancementsCacheOptions)
