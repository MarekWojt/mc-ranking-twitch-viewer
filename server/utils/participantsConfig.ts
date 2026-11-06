import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'

interface ParticipantsTomlFile {
  autoAddFromStats?: boolean
  participants?: ParticipantConfigEntry[]
}

interface ResolvedParticipantConfigEntry extends ParticipantConfigEntry {
  id: string
  displayName: string
  minecraftUuid: string
}

const DEFAULT_PARTICIPANTS_CONFIG_FILE_PATH = 'participants.toml'

function resolveParticipantsConfigFilePath(): string {
  return resolve(process.cwd(), useRuntimeConfig().participantsConfigFilePath || DEFAULT_PARTICIPANTS_CONFIG_FILE_PATH)
}

async function readParticipantsConfigFile(): Promise<string> {
  const participantsConfigFilePath = resolveParticipantsConfigFilePath()
  try {
    return await readFile(participantsConfigFilePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`participants.toml wurde nicht gefunden unter ${participantsConfigFilePath}. Bitte aus participants.example.toml erstellen.`, { cause: error })
    }
    throw error
  }
}

interface ResolvedParticipantConfigCompletion extends ParticipantConfigFieldCompletion {
  entry: ResolvedParticipantConfigEntry
  isDisplayNameProvisional: boolean
}

interface ParticipantConfigEntryResolution {
  rawEntry: ParticipantConfigEntry
  completion: ResolvedParticipantConfigCompletion | null
}

function toOrderedTomlEntry({ id, displayName, minecraftUuid, minecraftName, twitchLogin }: ParticipantConfigEntry): ParticipantConfigEntry {
  const tomlEntry: ParticipantConfigEntry = {}
  if (id) tomlEntry.id = id
  if (displayName) tomlEntry.displayName = displayName
  if (minecraftUuid) tomlEntry.minecraftUuid = minecraftUuid
  if (minecraftName) tomlEntry.minecraftName = minecraftName
  if (twitchLogin) tomlEntry.twitchLogin = twitchLogin
  return tomlEntry
}

async function writeParticipantsConfigFileFromScratch(entryResolutions: ParticipantConfigEntryResolution[]): Promise<void> {
  const tomlEntries = entryResolutions.map(({ rawEntry, completion }) => {
    if (!completion) return rawEntry
    return toOrderedTomlEntry(completion.isDisplayNameProvisional
      ? { ...completion.entry, id: rawEntry.id, displayName: rawEntry.displayName }
      : completion.entry)
  })
  const tomlContents = stringifyToml({ participants: tomlEntries })
  await writeFile(resolveParticipantsConfigFilePath(), tomlContents, 'utf8')
}

function describeParticipantConfigEntryForErrors(entry: ParticipantConfigEntry, entryIndex: number): string {
  return entry.displayName ?? entry.minecraftName ?? entry.twitchLogin ?? entry.minecraftUuid ?? `Eintrag Nr. ${entryIndex + 1}`
}

function takeLookedUpValueOrThrow<Value>(lookup: CachedValueLookup<Value>, lookedUpValueDescription: string): Value {
  if (lookup.status === 'stored') return lookup.value
  if (lookup.status === 'loading') throw new Error(`${lookedUpValueDescription} wird gerade im Hintergrund nachgeschlagen`)
  throw new Error(`${lookedUpValueDescription} konnte nicht ermittelt werden, wird in einigen Minuten erneut versucht`, { cause: lookup.error })
}

// never waits for Mojang or Twitch: values that are not known yet are looked up in the background and the entry is skipped until
// then, so a slow lookup or a misspelled name in participants.toml cannot hold up every page
function resolveParticipantConfigEntry(entry: ParticipantConfigEntry, entryIndex: number): ResolvedParticipantConfigCompletion {
  const resolvedEntry: ParticipantConfigEntry = { ...entry }
  const entryDescription = describeParticipantConfigEntryForErrors(entry, entryIndex)
  const wasIdDerived = !resolvedEntry.id
  const wasDisplayNameDerived = !resolvedEntry.displayName
  const wasMinecraftUuidDerived = !resolvedEntry.minecraftUuid
  let wasMinecraftNameDerived = false
  // started before the Minecraft lookups below can skip the entry, so both run in the same round instead of one after the other
  const twitchDisplayNameLookup = wasDisplayNameDerived && resolvedEntry.twitchLogin
    ? lookUpTwitchDisplayNameWithoutWaiting(resolvedEntry.twitchLogin)
    : null

  if (wasDisplayNameDerived && !resolvedEntry.minecraftName && !resolvedEntry.twitchLogin) {
    if (!resolvedEntry.minecraftUuid) {
      throw new Error(`${entryDescription}: weder displayName, minecraftName, twitchLogin noch minecraftUuid in participants.toml angegeben`)
    }

    resolvedEntry.minecraftName = takeLookedUpValueOrThrow(
      lookUpCurrentMinecraftNameWithoutWaiting(resolvedEntry.minecraftUuid, { isUrgent: true }),
      `${entryDescription}: minecraftName zur minecraftUuid "${resolvedEntry.minecraftUuid}"`
    )
    wasMinecraftNameDerived = true
  }

  if (wasMinecraftUuidDerived) {
    if (!resolvedEntry.minecraftName) {
      throw new Error(`${entryDescription}: weder minecraftUuid noch minecraftName in participants.toml angegeben`)
    }

    resolvedEntry.minecraftUuid = takeLookedUpValueOrThrow(
      lookUpMinecraftUuidByNameWithoutWaiting(resolvedEntry.minecraftName),
      `${entryDescription}: minecraftUuid zum minecraftName "${resolvedEntry.minecraftName}"`
    )
  }

  if (resolvedEntry.minecraftName && resolvedEntry.minecraftUuid && !wasMinecraftNameDerived) {
    const currentMinecraftNameLookup = lookUpCurrentMinecraftNameWithoutWaiting(resolvedEntry.minecraftUuid)
    if (currentMinecraftNameLookup.status === 'stored' && currentMinecraftNameLookup.value !== resolvedEntry.minecraftName) {
      resolvedEntry.minecraftName = currentMinecraftNameLookup.value
      wasMinecraftNameDerived = true
    }
  }

  if (wasDisplayNameDerived) {
    if (twitchDisplayNameLookup) {
      if (twitchDisplayNameLookup.status === 'loading') {
        throw new Error(`${entryDescription}: Schreibweise des Twitch-Namens wird gerade im Hintergrund nachgeschlagen`)
      }
      resolvedEntry.displayName = twitchDisplayNameLookup.status === 'stored' ? twitchDisplayNameLookup.value : resolvedEntry.twitchLogin!
    } else {
      resolvedEntry.displayName = resolvedEntry.minecraftName
    }
  }

  if (wasIdDerived) {
    resolvedEntry.id = slugify(resolvedEntry.displayName!)
  }

  // after a failed lookup the login keeps the participant visible, but only a name confirmed by Twitch may reach participants.toml,
  // because a name stored there is never looked up again
  const isDisplayNameProvisional = twitchDisplayNameLookup?.status === 'failed'

  return {
    entry: resolvedEntry as ResolvedParticipantConfigEntry,
    wasIdDerived: wasIdDerived && !isDisplayNameProvisional,
    wasDisplayNameDerived: wasDisplayNameDerived && !isDisplayNameProvisional,
    wasMinecraftUuidDerived,
    wasMinecraftNameDerived,
    isDisplayNameProvisional
  }
}

function resolveParticipantConfigEntriesTolerantly(rawEntries: ParticipantConfigEntry[]): ParticipantConfigEntryResolution[] {
  return rawEntries.map((rawEntry, entryIndex) => {
    try {
      return { rawEntry, completion: resolveParticipantConfigEntry(rawEntry, entryIndex) }
    } catch (error) {
      console.error(
        `Teilnehmer-Eintrag konnte nicht aufgelöst werden und wird vorerst übersprungen: ${describeParticipantConfigEntryForErrors(rawEntry, entryIndex)}`,
        error
      )
      return { rawEntry, completion: null }
    }
  })
}

async function discoverParticipantConfigEntriesFromStats(alreadyClaimedMinecraftUuids: Set<string>): Promise<ParticipantConfigEntryResolution[]> {
  const statsDirectoryMinecraftUuids = await listMinecraftUuidsWithStatsFiles()
  const undiscoveredMinecraftUuids = statsDirectoryMinecraftUuids.filter(minecraftUuid => !alreadyClaimedMinecraftUuids.has(minecraftUuid))

  return resolveParticipantConfigEntriesTolerantly(undiscoveredMinecraftUuids.map(minecraftUuid => ({ minecraftUuid })))
}

function toValidatedParticipants(entries: ResolvedParticipantConfigEntry[]): Participant[] {
  const seenParticipantIds = new Set<string>()
  const seenMinecraftUuids = new Set<string>()

  return entries.map((entry) => {
    if (seenParticipantIds.has(entry.id)) {
      throw new Error(`Doppelte Teilnehmer-ID in participants.toml: ${entry.id}`)
    }
    seenParticipantIds.add(entry.id)

    if (!isValidMinecraftUuid(entry.minecraftUuid)) {
      throw new Error(`Ungültige minecraftUuid für Teilnehmer ${entry.id}: ${entry.minecraftUuid}`)
    }

    const normalizedMinecraftUuid = normalizeMinecraftUuid(entry.minecraftUuid)
    if (seenMinecraftUuids.has(normalizedMinecraftUuid)) {
      throw new Error(`Doppelte minecraftUuid in participants.toml: ${normalizedMinecraftUuid}`)
    }
    seenMinecraftUuids.add(normalizedMinecraftUuid)

    return {
      id: entry.id,
      displayName: entry.displayName,
      minecraftUuid: normalizedMinecraftUuid,
      twitchLogin: entry.twitchLogin ? entry.twitchLogin.toLowerCase() : null
    }
  })
}

const participantsConfigCacheOptions = {
  name: 'participants-config',
  getKey: () => 'all',
  maxAge: 60,
  ...FRESH_DATA_CACHE_OPTIONS
}

export const loadParticipants = defineCachedFunction(async (): Promise<TimestampedValue<Participant[]>> => {
  const fileContents = await readParticipantsConfigFile()
  const parsedFile = parseToml(fileContents) as unknown as ParticipantsTomlFile
  const rawEntries = parsedFile.participants ?? []
  const isAutoAddFromStatsEnabled = parsedFile.autoAddFromStats ?? true
  if (!isAutoAddFromStatsEnabled) {
    console.log('Auto-Discovery neuer Teilnehmer aus den Stats ist deaktiviert (autoAddFromStats = false in participants.toml)')
  }

  const configuredEntryResolutions = resolveParticipantConfigEntriesTolerantly(rawEntries)
  const configuredCompletions = configuredEntryResolutions
    .map(resolution => resolution.completion)
    .filter(completion => completion !== null)

  const hadUnresolvedConfiguredEntries = configuredCompletions.length !== configuredEntryResolutions.length
  if (isAutoAddFromStatsEnabled && hadUnresolvedConfiguredEntries) {
    console.error('Auto-Discovery neuer Teilnehmer aus den Stats wird diesen Durchlauf übersprungen, da nicht alle konfigurierten Einträge aufgelöst werden konnten (eine nicht erkannte UUID-Überschneidung könnte sonst zu einem doppelten Eintrag führen)')
  }

  const claimedMinecraftUuids = new Set(configuredCompletions.map(completion => completion.entry.minecraftUuid))
  const discoveredEntryResolutions = (hadUnresolvedConfiguredEntries || !isAutoAddFromStatsEnabled)
    ? []
    : await discoverParticipantConfigEntriesFromStats(claimedMinecraftUuids)
  const discoveredCompletions = discoveredEntryResolutions
    .map(resolution => resolution.completion)
    .filter(completion => completion !== null)

  const resolvedEntries = [...configuredCompletions, ...discoveredCompletions].map(completion => completion.entry)

  const needsExistingEntriesWriteBack = configuredCompletions.some(completion =>
    completion.wasIdDerived || completion.wasDisplayNameDerived || completion.wasMinecraftUuidDerived || completion.wasMinecraftNameDerived
  )

  if (needsExistingEntriesWriteBack || discoveredCompletions.length > 0) {
    const fieldCompletionsByPosition = configuredEntryResolutions.map(resolution => resolution.completion)
    const newEntriesTomlText = discoveredCompletions.length > 0
      ? stringifyToml({ participants: discoveredCompletions.map(completion => toOrderedTomlEntry(completion.entry)) })
      : null

    const patchedFileContents = patchMissingParticipantFieldsIntoFileContents(fileContents, fieldCompletionsByPosition, newEntriesTomlText)
    if (patchedFileContents === null) {
      await writeParticipantsConfigFileFromScratch([...configuredEntryResolutions, ...discoveredEntryResolutions])
    } else {
      await writeFile(resolveParticipantsConfigFilePath(), patchedFileContents, 'utf8')
    }
  }

  return { value: toValidatedParticipants(resolvedEntries), fetchedAt: new Date().toISOString() }
}, participantsConfigCacheOptions)
