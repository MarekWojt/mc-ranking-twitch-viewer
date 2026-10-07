export async function buildObjectStatisticDetail(
  bareObjectKey: string,
  specificSubgroup: SpecificStatisticSubgroup
): Promise<DataWithFreshness<ObjectStatisticDetailDto> | null> {
  const scoreboard = await computeScoreboard()
  const objectKey = toMinecraftId(bareObjectKey)
  const matchingDefinitions = scoreboard.statisticDefinitions.filter(
    definition => definition.key === objectKey && definition.specificSubgroup === specificSubgroup
  )

  if (matchingDefinitions.length === 0) return null

  const objectLabel = matchingDefinitions[0]!.label
  const categories = matchingDefinitions.map(definition => definition.category)
  const groupLabelByCategory = Object.fromEntries(
    matchingDefinitions.map(definition => [definition.category, definition.groupLabel!])
  )

  const participants = scoreboard.participants.map(({ participant, statistics }) => {
    const valueByCategory: Record<string, number> = {}
    const displayValueByCategory: Record<string, string> = {}
    const pointsByCategory: Record<string, number> = {}
    let totalValue = 0
    let totalPoints = 0

    for (const definition of matchingDefinitions) {
      const score = statistics.find(entry => entry.statistic.slug === definition.slug)
      const value = score?.value ?? 0
      valueByCategory[definition.category] = value
      displayValueByCategory[definition.category] = formatStatisticDisplayValue(definition.key, value)
      totalValue += value
      pointsByCategory[definition.category] = score?.points ?? 0
      totalPoints += score?.points ?? 0
    }

    return {
      participantId: participant.id,
      displayName: participant.displayName,
      minecraftUuid: participant.minecraftUuid,
      valueByCategory,
      displayValueByCategory,
      totalValue,
      pointsByCategory,
      totalPoints
    }
  })

  return {
    asOf: scoreboard.asOf,
    payload: { objectKey, objectLabel, categories, groupLabelByCategory, participants }
  }
}
