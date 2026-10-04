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

  const participants = scoreboard.participants.map(({ participant, statistics }) => {
    const valueByActionLabel: Record<string, number> = {}
    const displayValueByActionLabel: Record<string, string> = {}
    const pointsByActionLabel: Record<string, number> = {}
    let totalValue = 0
    let totalPoints = 0

    for (const definition of matchingDefinitions) {
      const actionLabel = definition.groupLabel!
      const score = statistics.find(entry => entry.statistic.slug === definition.slug)
      const value = score?.value ?? 0
      valueByActionLabel[actionLabel] = value
      displayValueByActionLabel[actionLabel] = formatStatisticDisplayValue(definition.key, value)
      totalValue += value
      pointsByActionLabel[actionLabel] = score?.points ?? 0
      totalPoints += score?.points ?? 0
    }

    return {
      participantId: participant.id,
      displayName: participant.displayName,
      minecraftUuid: participant.minecraftUuid,
      valueByActionLabel,
      displayValueByActionLabel,
      totalValue,
      pointsByActionLabel,
      totalPoints
    }
  })

  return {
    asOf: scoreboard.asOf,
    payload: { objectKey, objectLabel, participants }
  }
}
