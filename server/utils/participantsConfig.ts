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
  return entry.displayName ?? entry.minecraftName ?? entry.twitchLogin ?? `Eintrag Nr. ${entryIndex + 1}`
}

async function resolveParticipantConfigEntry(entry: ParticipantConfigEntry, entryIndex: number): Promise<ParticipantConfigFieldCompletion & { entry: ResolvedParticipantConfigEntry }> {
  const resolvedEntry: ParticipantConfigEntry = { ...entry }
  const wasIdDerived = !resolvedEntry.id
  const wasDisplayNameDerived = !resolvedEntry.displayName
  const wasMinecraftUuidDerived = !resolvedEntry.minecraftUuid

  if (wasDisplayNameDerived) {
    if (!resolvedEntry.minecraftName && !resolvedEntry.twitchLogin) {
      throw new Error(`${describeParticipantConfigEntryForErrors(entry, entryIndex)}: weder displayName noch minecraftName oder twitchLogin in participants.toml angegeben`)
    }
    resolvedEntry.displayName = resolvedEntry.twitchLogin ?? resolvedEntry.minecraftName
  }

  if (wasIdDerived) {
    resolvedEntry.id = slugify(resolvedEntry.displayName!)
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

  return { entry: resolvedEntry as ResolvedParticipantConfigEntry, wasIdDerived, wasDisplayNameDerived, wasMinecraftUuidDerived }
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

const participantsConfigCacheTtlSeconds = 60

export const loadParticipants = defineCachedFunction(async (): Promise<TimestampedValue<Participant[]>> => {
  const fileContents = await readParticipantsConfigFile()
  const parsedFile = parseToml(fileContents) as unknown as ParticipantsTomlFile
  const rawEntries = parsedFile.participants ?? []

  const entryResolutions = await resolveParticipantConfigEntriesTolerantly(rawEntries)
  const successfulCompletions = entryResolutions
    .map(resolution => resolution.completion)
    .filter(completion => completion !== null)

  const resolvedEntries = successfulCompletions.map(completion => completion.entry)
  const needsWriteBack = successfulCompletions.some(completion =>
    completion.wasIdDerived || completion.wasDisplayNameDerived || completion.wasMinecraftUuidDerived
  )

  if (needsWriteBack) {
    const fieldCompletionsByPosition = entryResolutions.map(resolution => resolution.completion)
    const patchedFileContents = patchMissingParticipantFieldsIntoFileContents(fileContents, fieldCompletionsByPosition)
    if (patchedFileContents === null) {
      await writeParticipantsConfigFileFromScratch(entryResolutions)
    } else {
      await writeFile(participantsConfigFilePath, patchedFileContents, 'utf8')
    }
  }

  return { value: toValidatedParticipants(resolvedEntries), fetchedAt: new Date().toISOString() }
}, {
  name: 'participants-config',
  getKey: () => 'all',
  maxAge: participantsConfigCacheTtlSeconds
})
