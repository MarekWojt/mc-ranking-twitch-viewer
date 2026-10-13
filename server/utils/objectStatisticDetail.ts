export async function buildObjectStatisticDetail(
  bareObjectKey: string,
  specificSubgroup: SpecificStatisticSubgroup
): Promise<ScoredDataWithFreshness<ObjectStatisticDetailDto> | null> {
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
    const pointsWithoutStatisticWeightByCategory: Record<string, number> = {}
    const rankByCategory: Record<string, number> = {}
    let totalValue = 0
    let totalPoints = 0

    for (const definition of matchingDefinitions) {
      const score = statistics.find(entry => entry.statistic.slug === definition.slug)
      const value = score?.value ?? 0
      valueByCategory[definition.category] = value
      displayValueByCategory[definition.category] = formatStatisticDisplayValue(definition.key, value)
      totalValue += value
      pointsByCategory[definition.category] = score?.points ?? 0
      pointsWithoutStatisticWeightByCategory[definition.category] = score?.pointsWithoutStatisticWeight ?? 0
      totalPoints += score?.points ?? 0
      rankByCategory[definition.category] = score?.rank ?? scoreboard.participants.length
    }

    return {
      participantId: participant.id,
      displayName: participant.displayName,
      minecraftUuid: participant.minecraftUuid,
      valueByCategory,
      displayValueByCategory,
      totalValue,
      pointsByCategory,
      pointsWithoutStatisticWeightByCategory,
      totalPoints,
      rankByCategory
    }
  })

  return {
    asOf: scoreboard.asOf,
    scoreGroupFactors: scoreboard.scoreGroupFactors,
    payload: { objectKey, objectLabel, categories, groupLabelByCategory, participants }
  }
}
