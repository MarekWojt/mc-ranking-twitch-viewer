export type StatisticGroup = 'allgemein' | 'spezifisch'
export type SpecificStatisticSubgroup = 'items' | 'entities'

export interface StatisticDefinition {
  slug: string
  category: string
  key: string
  group: StatisticGroup
  groupLabel: LocalizedLabel | null
  specificSubgroup: SpecificStatisticSubgroup | null
  label: LocalizedLabel
}
