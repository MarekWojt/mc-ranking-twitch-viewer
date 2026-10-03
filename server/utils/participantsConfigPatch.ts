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

function findExistingFieldLineIndexWithinTable(fileLines: string[], headerLineIndex: number, nextHeaderLineIndex: number, fieldName: string): number | null {
  const fieldAssignmentPattern = new RegExp(`^\\s*${fieldName}\\s*=`)
  for (let lineIndex = headerLineIndex + 1; lineIndex < nextHeaderLineIndex; lineIndex++) {
    if (fieldAssignmentPattern.test(fileLines[lineIndex]!)) return lineIndex
  }
  return null
}

export function patchMissingParticipantFieldsIntoFileContents(
  originalFileContents: string,
  fieldCompletions: (ParticipantConfigFieldCompletion | null)[],
  newEntriesTomlText: string | null
): string | null {
  const fileLines = originalFileContents.split('\n')
  const tableHeaderLineIndexes = findParticipantTableHeaderLineIndexes(fileLines)

  if (tableHeaderLineIndexes.length !== fieldCompletions.length) return null

  const tablePatches: { headerLineIndex: number, nextHeaderLineIndex: number, fieldCompletion: ParticipantConfigFieldCompletion }[] = []
  tableHeaderLineIndexes.forEach((headerLineIndex, tableIndex) => {
    const fieldCompletion = fieldCompletions[tableIndex]
    if (fieldCompletion === undefined || fieldCompletion === null) return
    const nextHeaderLineIndex = tableHeaderLineIndexes[tableIndex + 1] ?? fileLines.length
    tablePatches.push({ headerLineIndex, nextHeaderLineIndex, fieldCompletion })
  })

  for (const { headerLineIndex, nextHeaderLineIndex, fieldCompletion } of tablePatches.reverse()) {
    const fieldsToUpsert: { fieldName: string, value: string }[] = []

    if (fieldCompletion.wasIdDerived) {
      fieldsToUpsert.push({ fieldName: 'id', value: fieldCompletion.entry.id })
    }
    if (fieldCompletion.wasDisplayNameDerived) {
      fieldsToUpsert.push({ fieldName: 'displayName', value: fieldCompletion.entry.displayName })
    }
    if (fieldCompletion.wasMinecraftUuidDerived) {
      fieldsToUpsert.push({ fieldName: 'minecraftUuid', value: fieldCompletion.entry.minecraftUuid })
    }
    if (fieldCompletion.wasMinecraftNameDerived && fieldCompletion.entry.minecraftName) {
      fieldsToUpsert.push({ fieldName: 'minecraftName', value: fieldCompletion.entry.minecraftName })
    }
    if (fieldsToUpsert.length === 0) continue

    const newFieldLines: string[] = []
    for (const { fieldName, value } of fieldsToUpsert) {
      const existingFieldLineIndex = findExistingFieldLineIndexWithinTable(fileLines, headerLineIndex, nextHeaderLineIndex, fieldName)
      const fieldLine = `${fieldName} = ${toTomlStringLiteral(value)}`
      if (existingFieldLineIndex === null) {
        newFieldLines.push(fieldLine)
      } else {
        fileLines[existingFieldLineIndex] = fieldLine
      }
    }
    if (newFieldLines.length > 0) {
      fileLines.splice(headerLineIndex + 1, 0, ...newFieldLines)
    }
  }

  if (newEntriesTomlText === null) return fileLines.join('\n')

  const lastLine = fileLines.at(-1)
  if (lastLine !== undefined && lastLine.trim().length > 0) fileLines.push('')

  return `${fileLines.join('\n')}\n${newEntriesTomlText}`
}
