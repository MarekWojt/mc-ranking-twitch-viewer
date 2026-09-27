export interface ParticipantConfigFieldCompletion {
  entry: { id: string, displayName: string, minecraftUuid: string, minecraftName?: string }
  wasIdDerived: boolean
  wasDisplayNameDerived: boolean
  wasMinecraftUuidDerived: boolean
  wasMinecraftNameDerived: boolean
}

const PARTICIPANT_TABLE_HEADER_PATTERN = /^\s*\[\[\s*participants\s*\]\]\s*(#.*)?$/

function findParticipantTableHeaderLineIndexes(fileLines: string[]): number[] {
  return fileLines.reduce<number[]>((headerLineIndexes, line, lineIndex) => {
    if (PARTICIPANT_TABLE_HEADER_PATTERN.test(line)) headerLineIndexes.push(lineIndex)
    return headerLineIndexes
  }, [])
}

function toTomlStringLiteral(value: string): string {
  return JSON.stringify(value)
}

export function patchMissingParticipantFieldsIntoFileContents(
  originalFileContents: string,
  fieldCompletions: (ParticipantConfigFieldCompletion | null)[],
  newEntriesTomlText: string | null
): string | null {
  const fileLines = originalFileContents.split('\n')
  const tableHeaderLineIndexes = findParticipantTableHeaderLineIndexes(fileLines)

  if (tableHeaderLineIndexes.length !== fieldCompletions.length) return null

  const tablePatches: { headerLineIndex: number, fieldCompletion: ParticipantConfigFieldCompletion }[] = []
  tableHeaderLineIndexes.forEach((headerLineIndex, tableIndex) => {
    const fieldCompletion = fieldCompletions[tableIndex]
    if (fieldCompletion === undefined || fieldCompletion === null) return
    tablePatches.push({ headerLineIndex, fieldCompletion })
  })

  for (const { headerLineIndex, fieldCompletion } of tablePatches.reverse()) {
    const derivedFieldLines: string[] = []

    if (fieldCompletion.wasIdDerived) {
      derivedFieldLines.push(`id = ${toTomlStringLiteral(fieldCompletion.entry.id)}`)
    }
    if (fieldCompletion.wasDisplayNameDerived) {
      derivedFieldLines.push(`displayName = ${toTomlStringLiteral(fieldCompletion.entry.displayName)}`)
    }
    if (fieldCompletion.wasMinecraftUuidDerived) {
      derivedFieldLines.push(`minecraftUuid = ${toTomlStringLiteral(fieldCompletion.entry.minecraftUuid)}`)
    }
    if (fieldCompletion.wasMinecraftNameDerived && fieldCompletion.entry.minecraftName) {
      derivedFieldLines.push(`minecraftName = ${toTomlStringLiteral(fieldCompletion.entry.minecraftName)}`)
    }
    if (derivedFieldLines.length === 0) continue

    fileLines.splice(headerLineIndex + 1, 0, ...derivedFieldLines)
  }

  if (newEntriesTomlText === null) return fileLines.join('\n')

  const lastLine = fileLines.at(-1)
  if (lastLine !== undefined && lastLine.trim().length > 0) fileLines.push('')

  return `${fileLines.join('\n')}\n${newEntriesTomlText}`
}
