export interface ParticipantConfigFieldCompletion {
  entry: { id: string, displayName: string, minecraftUuid: string }
  wasIdDerived: boolean
  wasDisplayNameDerived: boolean
  wasMinecraftUuidDerived: boolean
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
  fieldCompletions: ParticipantConfigFieldCompletion[]
): string | null {
  const fileLines = originalFileContents.split('\n')
  const tableHeaderLineIndexes = findParticipantTableHeaderLineIndexes(fileLines)

  if (tableHeaderLineIndexes.length !== fieldCompletions.length) return null

  const tablePatches: { headerLineIndex: number, fieldCompletion: ParticipantConfigFieldCompletion }[] = []
  tableHeaderLineIndexes.forEach((headerLineIndex, tableIndex) => {
    const fieldCompletion = fieldCompletions[tableIndex]
    if (fieldCompletion === undefined) return
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
    if (derivedFieldLines.length === 0) continue

    fileLines.splice(headerLineIndex + 1, 0, ...derivedFieldLines)
  }

  return fileLines.join('\n')
}
