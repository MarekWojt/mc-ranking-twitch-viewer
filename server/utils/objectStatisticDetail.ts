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
    let totalValue = 0

    for (const definition of matchingDefinitions) {
      const actionLabel = definition.groupLabel!
      const value = statistics.find(entry => entry.statistic.slug === definition.slug)?.value ?? 0
      valueByActionLabel[actionLabel] = value
      displayValueByActionLabel[actionLabel] = formatStatisticDisplayValue(definition.key, value)
      totalValue += value
    }

    return {
      participantId: participant.id,
      displayName: participant.displayName,
      minecraftUuid: participant.minecraftUuid,
      valueByActionLabel,
      displayValueByActionLabel,
      totalValue
    }
  })

  return {
    asOf: scoreboard.asOf,
    payload: { objectKey, objectLabel, participants }
  }
}
