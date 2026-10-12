import type { VNodeChild } from 'vue'
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
    ? [h('span', { class: 'text-lg' }, icon), h('span', {}, actionLabel)]
    : actionLabel)
}

export function renderBoldTabularNumber(value: number) {
  return h('span', { class: 'text-sm tabular-nums font-medium' }, formatNumberWithTypographicMinus(value))
}

export function renderRankedValue(text: string, rank: number) {
  return h('span', { class: 'text-sm tabular-nums', title: `Platz #${rank}` }, text)
}

export const DEFAULT_STATISTIC_WEIGHT = 1

const NARROW_NO_BREAK_SPACE = '\u202F'

export function formatStatisticWeight(weight: number): string {
  return `×${NARROW_NO_BREAK_SPACE}${formatNumberWithTypographicMinus(weight)}`
}

export function describeStatisticWeight(weight: number): string {
  return `Fließt mit Faktor ${formatNumberWithTypographicMinus(weight)} in die Gesamtpunktzahl ein`
}

export function renderWeightedPoints(points: number, unweightedPoints: number, weight: number): VNodeChild {
  const formattedPoints = formatRoundedPoints(points)
  if (weight !== 0) return formattedPoints

  const formattedUnweightedPoints = formatRoundedPoints(unweightedPoints)
  return h('span', {}, [
    formattedPoints,
    h('span', { class: 'ml-1 text-muted', title: `Ohne Faktor: ${formattedUnweightedPoints} Punkte` }, `(${formattedUnweightedPoints})`)
  ])
}

export function resolveStatisticWeightBadgeColor(weight: number): 'error' | 'neutral' {
  return weight < 0 ? 'error' : 'neutral'
}

export function renderStatisticLabelWithWeight(label: string, weight: number): VNodeChild {
  if (weight === DEFAULT_STATISTIC_WEIGHT) return label

  return h('span', { class: 'inline-flex items-center gap-2' }, [
    label,
    h(UBadge, {
      label: formatStatisticWeight(weight),
      color: resolveStatisticWeightBadgeColor(weight),
      variant: 'subtle',
      size: 'sm',
      class: 'tabular-nums',
      title: describeStatisticWeight(weight)
    })
  ])
}
