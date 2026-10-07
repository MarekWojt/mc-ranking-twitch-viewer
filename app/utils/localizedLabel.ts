export function resolveLocalizedLabel(label: LocalizedLabel, locale: MinecraftNameLocale): string {
  return locale === 'de' ? (label.de ?? label.en) : label.en
}

export function resolveLocalizedOptionalText(text: LocalizedOptionalText, locale: MinecraftNameLocale): string | null {
  return locale === 'de' ? (text.de ?? text.en) : text.en
}

function buildSearchText(...texts: (string | null | undefined)[]): string {
  return texts.filter((text): text is string => text !== null && text !== undefined).join(' ').toLowerCase()
}

export function resolveStatisticLabelAndGroupLabel(
  statistic: { group: StatisticGroup, label: LocalizedLabel, groupLabel: LocalizedLabel | null },
  resolvedObjectsLocale: MinecraftNameLocale,
  resolvedStatisticsLocale: MinecraftNameLocale
): { label: string, groupLabel: string | null, searchText: string } {
  // the object name (item/entity identity) follows "Items & Entities"; the category/action header - and the
  // general stat's own name, which plays the same "what is being measured" role - follows "Statistiken"
  const labelLocale = statistic.group === 'allgemein' ? resolvedStatisticsLocale : resolvedObjectsLocale

  return {
    label: resolveLocalizedLabel(statistic.label, labelLocale),
    groupLabel: statistic.groupLabel ? resolveLocalizedLabel(statistic.groupLabel, resolvedStatisticsLocale) : null,
    searchText: buildSearchText(statistic.label.en, statistic.label.de, statistic.groupLabel?.en, statistic.groupLabel?.de)
  }
}

export function resolveAdvancementFields(
  advancement: { label: LocalizedLabel, description: LocalizedOptionalText | null, groupLabel: LocalizedLabel },
  locale: MinecraftNameLocale
): { label: string, description: string | null, groupLabel: string, searchText: string } {
  return {
    label: resolveLocalizedLabel(advancement.label, locale),
    description: advancement.description ? resolveLocalizedOptionalText(advancement.description, locale) : null,
    groupLabel: resolveLocalizedLabel(advancement.groupLabel, locale),
    searchText: buildSearchText(
      advancement.label.en, advancement.label.de,
      advancement.groupLabel.en, advancement.groupLabel.de,
      advancement.description?.en, advancement.description?.de
    )
  }
}
