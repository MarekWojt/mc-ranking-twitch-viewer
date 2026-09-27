export function rankByCompetitionRanking<T>(items: T[], scoreOf: (item: T) => number): (T & { rank: number })[] {
  const sortedByScoreDescending = [...items].sort((a, b) => scoreOf(b) - scoreOf(a))
  const rankedItems: (T & { rank: number })[] = []

  sortedByScoreDescending.forEach((item, index) => {
    const previousRankedItem = rankedItems[index - 1]
    const isTiedWithPreviousItem = previousRankedItem !== undefined && scoreOf(previousRankedItem) === scoreOf(item)
    rankedItems.push({ ...item, rank: isTiedWithPreviousItem ? previousRankedItem.rank : index + 1 })
  })

  return rankedItems
}
