import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'

interface ParticipantsTomlFile {
  participants?: ParticipantConfigEntry[]
}

interface ResolvedParticipantConfigEntry extends ParticipantConfigEntry {
  id: string
  displayName: string
  minecraftUuid: string
}

const participantsConfigFilePath = resolve(process.cwd(), 'participants.toml')

async function readParticipantsConfigFile(): Promise<string> {
  try {
    return await readFile(participantsConfigFilePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`participants.toml wurde nicht gefunden unter ${participantsConfigFilePath}. Bitte aus participants.example.toml erstellen.`, { cause: error })
    }
    throw error
  }
}

interface ParticipantConfigEntryResolution {
  rawEntry: ParticipantConfigEntry
  completion: (ParticipantConfigFieldCompletion & { entry: ResolvedParticipantConfigEntry }) | null
}

function toOrderedTomlEntry(entry: ResolvedParticipantConfigEntry): ParticipantConfigEntry {
  const tomlEntry: ParticipantConfigEntry = {
    id: entry.id,
    displayName: entry.displayName,
    minecraftUuid: entry.minecraftUuid
  }
  if (entry.minecraftName) tomlEntry.minecraftName = entry.minecraftName
  if (entry.twitchLogin) tomlEntry.twitchLogin = entry.twitchLogin
  return tomlEntry
}

async function writeParticipantsConfigFileFromScratch(entryResolutions: ParticipantConfigEntryResolution[]): Promise<void> {
  const tomlEntries = entryResolutions.map(({ rawEntry, completion }) =>
    completion ? toOrderedTomlEntry(completion.entry) : rawEntry
  )
  const tomlContents = stringifyToml({ participants: tomlEntries })
  await writeFile(participantsConfigFilePath, tomlContents, 'utf8')
}

function describeParticipantConfigEntryForErrors(entry: ParticipantConfigEntry, entryIndex: number): string {
  return entry.displayName ?? entry.minecraftName ?? entry.twitchLogin ?? entry.minecraftUuid ?? `Eintrag Nr. ${entryIndex + 1}`
}

async function resolveParticipantConfigEntry(entry: ParticipantConfigEntry, entryIndex: number): Promise<ParticipantConfigFieldCompletion & { entry: ResolvedParticipantConfigEntry }> {
  const resolvedEntry: ParticipantConfigEntry = { ...entry }
  const wasIdDerived = !resolvedEntry.id
  const wasDisplayNameDerived = !resolvedEntry.displayName
  const wasMinecraftUuidDerived = !resolvedEntry.minecraftUuid
  let wasMinecraftNameDerived = false

  if (wasDisplayNameDerived && !resolvedEntry.minecraftName && !resolvedEntry.twitchLogin) {
    if (!resolvedEntry.minecraftUuid) {
      throw new Error(`${describeParticipantConfigEntryForErrors(entry, entryIndex)}: weder displayName, minecraftName, twitchLogin noch minecraftUuid in participants.toml angegeben`)
    }

    try {
      resolvedEntry.minecraftName = await resolveMinecraftNameFromUuid(resolvedEntry.minecraftUuid)
    } catch (error) {
      throw new Error(`${describeParticipantConfigEntryForErrors(entry, entryIndex)}: minecraftName konnte nicht aus minecraftUuid "${resolvedEntry.minecraftUuid}" ermittelt werden`, { cause: error })
    }
    wasMinecraftNameDerived = true
  }

  if (wasMinecraftUuidDerived) {
    if (!resolvedEntry.minecraftName) {
      throw new Error(`${describeParticipantConfigEntryForErrors(entry, entryIndex)}: weder minecraftUuid noch minecraftName in participants.toml angegeben`)
    }

    try {
      resolvedEntry.minecraftUuid = await resolveMinecraftUuidFromName(resolvedEntry.minecraftName)
    } catch (error) {
      throw new Error(`${describeParticipantConfigEntryForErrors(entry, entryIndex)}: minecraftUuid konnte nicht aus minecraftName "${resolvedEntry.minecraftName}" ermittelt werden`, { cause: error })
    }
  }

  if (resolvedEntry.minecraftName && resolvedEntry.minecraftUuid && !wasMinecraftNameDerived) {
    try {
      const canonicalMinecraftName = await resolveMinecraftNameFromUuid(resolvedEntry.minecraftUuid)
      if (canonicalMinecraftName !== resolvedEntry.minecraftName) {
        resolvedEntry.minecraftName = canonicalMinecraftName
        wasMinecraftNameDerived = true
      }
    } catch (error) {
      console.error(
        `${describeParticipantConfigEntryForErrors(entry, entryIndex)}: aktuelle Schreibweise von minecraftName konnte nicht über Mojang bestätigt werden, bisheriger Wert bleibt bestehen`,
        error
      )
    }
  }

  if (wasDisplayNameDerived) {
    if (resolvedEntry.twitchLogin) {
      try {
        resolvedEntry.displayName = await resolveTwitchDisplayNameFromLogin(resolvedEntry.twitchLogin)
      } catch (error) {
        console.error(
          `${describeParticipantConfigEntryForErrors(entry, entryIndex)}: Schreibweise des Twitch-Namens konnte nicht über Twitch bestätigt werden, verwende twitchLogin unverändert als displayName`,
          error
        )
        resolvedEntry.displayName = resolvedEntry.twitchLogin
      }
    } else {
      resolvedEntry.displayName = resolvedEntry.minecraftName
    }
  }

  if (wasIdDerived) {
    resolvedEntry.id = slugify(resolvedEntry.displayName!)
  }

  return { entry: resolvedEntry as ResolvedParticipantConfigEntry, wasIdDerived, wasDisplayNameDerived, wasMinecraftUuidDerived, wasMinecraftNameDerived }
}

async function resolveParticipantConfigEntriesTolerantly(rawEntries: ParticipantConfigEntry[]): Promise<ParticipantConfigEntryResolution[]> {
  const entryResolutions: ParticipantConfigEntryResolution[] = []

  for (const [entryIndex, rawEntry] of rawEntries.entries()) {
    try {
      const completion = await resolveParticipantConfigEntry(rawEntry, entryIndex)
      entryResolutions.push({ rawEntry, completion })
    } catch (error) {
      console.error(
        `Teilnehmer-Eintrag konnte nicht aufgelöst werden und wird vorerst übersprungen: ${describeParticipantConfigEntryForErrors(rawEntry, entryIndex)}`,
        error
      )
      entryResolutions.push({ rawEntry, completion: null })
    }
  }

  return entryResolutions
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
  maxAge: 60
}

export const loadParticipants = defineCachedFunction(async (): Promise<TimestampedValue<Participant[]>> => {
  const fileContents = await readParticipantsConfigFile()
  const parsedFile = parseToml(fileContents) as unknown as ParticipantsTomlFile
  const rawEntries = parsedFile.participants ?? []

  const configuredEntryResolutions = await resolveParticipantConfigEntriesTolerantly(rawEntries)
  const configuredCompletions = configuredEntryResolutions
    .map(resolution => resolution.completion)
    .filter(completion => completion !== null)

  const hadUnresolvedConfiguredEntries = configuredCompletions.length !== configuredEntryResolutions.length
  if (hadUnresolvedConfiguredEntries) {
    console.error('Auto-Discovery neuer Teilnehmer aus den Stats wird diesen Durchlauf übersprungen, da nicht alle konfigurierten Einträge aufgelöst werden konnten (eine nicht erkannte UUID-Überschneidung könnte sonst zu einem doppelten Eintrag führen)')
  }

  const claimedMinecraftUuids = new Set(configuredCompletions.map(completion => completion.entry.minecraftUuid))
  const discoveredEntryResolutions = hadUnresolvedConfiguredEntries
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
      await writeFile(participantsConfigFilePath, patchedFileContents, 'utf8')
    }
  }

  return { value: toValidatedParticipants(resolvedEntries), fetchedAt: new Date().toISOString() }
}, participantsConfigCacheOptions)
