import type { VNodeChild } from 'vue'
import type { BadgeProps } from '@nuxt/ui'
import { UBadge } from '#components'

export const ITEM_ACTION_ICON_BY_CATEGORY: Record<string, string> = {
  broken: '💥',
  crafted: '🛠️',
  dropped: '🔻',
  mined: '⛏️',
  picked_up: '🔺',
  used: '✋'
}

export const ENTITY_ACTION_ICON_BY_CATEGORY: Record<string, string> = {
  killed: '🔪',
  killed_by: '☠️'
}

export type SortableColumn = { getIsSorted: () => false | 'asc' | 'desc', toggleSorting: () => void }

export const RIGHT_ALIGNED_META_CLASS = { th: 'text-right', td: 'text-right' }

export function sortKeysByTotalDescending(keys: Iterable<string>, totalOf: (key: string) => number): string[] {
  return [...keys].sort((a, b) => totalOf(b) - totalOf(a))
}

export function renderSortableColumnHeader(column: SortableColumn, content: VNodeChild, align: 'start' | 'end' = 'end') {
  const sortDirection = column.getIsSorted()
  const sortIndicator = sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : '↕'

  return h('button', {
    type: 'button',
    class: `flex w-full items-center gap-1 hover:text-highlighted ${align === 'end' ? 'justify-end' : 'justify-start'}`,
    onClick: () => column.toggleSorting()
  }, [content, h('span', { class: 'text-xs text-muted' }, sortIndicator)])
}

export function renderActionColumnHeaderContent(actionLabel: string, icon: string | null) {
  return h('span', { title: actionLabel, class: 'inline-flex items-center gap-1' }, icon
    ? [h('span', { class: 'text-lg leading-none' }, icon), h('span', {}, actionLabel)]
    : actionLabel)
}

export function renderBoldTabularNumber(value: number) {
  return h('span', { class: 'text-sm tabular-nums font-medium' }, formatNumberWithTypographicMinus(value))
}

export function renderRankedValue(text: string, rank: number) {
  return h('span', { class: 'text-sm tabular-nums', title: `Platz #${rank}` }, text)
}

const NARROW_NO_BREAK_SPACE = '\u202F'

export function formatStatisticWeight(weight: number): string {
  return `×${NARROW_NO_BREAK_SPACE}${formatNumberWithTypographicMinus(weight)}`
}

function roundScoreGroupFactorToHundredths(factor: number): number {
  return Math.round(factor * 100) / 100
}

export function formatScoreGroupFactor(factor: number): string {
  return formatStatisticWeight(roundScoreGroupFactorToHundredths(factor))
}

export function formatScoreGroupShare(scoreGroup: ScoreGroup): string {
  return SCORE_GROUP_SHARES[scoreGroup].toLocaleString('de-DE', { style: 'percent' })
}

export function describeScoreGroupFactor(factor: number, scoreGroup: ScoreGroup): string {
  return `Alle Punkte dieser Kategorie werden mit ${formatNumberWithTypographicMinus(roundScoreGroupFactorToHundredths(factor))} multipliziert, damit sie etwa ${formatScoreGroupShare(scoreGroup)} der Gesamtpunktzahl ausmachen.`
}

export function describeStatisticWeight(weight: number): string {
  return `Faktor ${formatNumberWithTypographicMinus(weight)} für diese Statistik, zusätzlich zum Faktor ihrer Kategorie`
}

export function describeCategoryWeight(weight: number): string {
  return `Faktor ${formatNumberWithTypographicMinus(weight)} für diese Aktion, zusätzlich zum Faktor der Kategorie`
}

export function renderWeightedPoints(points: number, pointsWithoutStatisticWeight: number, weight: number): VNodeChild {
  const formattedPoints = formatRoundedPoints(points)
  if (weight !== 0) return formattedPoints

  const formattedPointsWithoutStatisticWeight = formatRoundedPoints(pointsWithoutStatisticWeight)
  return h('span', {}, [
    formattedPoints,
    h('span', { class: 'ml-1 text-muted', title: `Ohne den Faktor dieser Statistik: ${formattedPointsWithoutStatisticWeight} Punkte` }, `(${formattedPointsWithoutStatisticWeight})`)
  ])
}

export function resolveStatisticWeightBadgeColor(weight: number): 'error' | 'info' | 'warning' | 'neutral' | 'success' {
  if (weight < 0) return 'error'
  if (weight === 0) return 'info'
  if (weight < DEFAULT_STATISTIC_WEIGHT) return 'warning'
  if (weight > DEFAULT_STATISTIC_WEIGHT) return 'success'
  return 'neutral'
}

export function buildStatisticWeightBadgeProps(weight: number): BadgeProps {
  return {
    label: formatStatisticWeight(weight),
    color: resolveStatisticWeightBadgeColor(weight),
    variant: 'subtle',
    size: 'sm',
    class: 'tabular-nums'
  }
}

function renderStatisticWeightBadge(weight: number, description: string): VNodeChild {
  return h(UBadge, { ...buildStatisticWeightBadgeProps(weight), title: description })
}

export function renderStatisticLabelWithWeight(label: string, weight: number): VNodeChild {
  if (weight === DEFAULT_STATISTIC_WEIGHT) return label

  return h('span', { class: 'inline-flex items-center gap-2' }, [
    label,
    renderStatisticWeightBadge(weight, describeStatisticWeight(weight))
  ])
}
