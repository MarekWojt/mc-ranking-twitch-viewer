export type StatisticGroup = 'allgemein' | 'spezifisch'

export interface StatisticDefinition {
  slug: string
  category: string
  key: string
  group: StatisticGroup
  groupLabel: string | null
  label: string
}
