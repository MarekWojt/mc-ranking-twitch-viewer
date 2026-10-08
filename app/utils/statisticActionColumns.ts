import type { VNodeChild } from 'vue'

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
  return h('span', { class: 'text-sm tabular-nums font-medium' }, value.toLocaleString('de-DE'))
}

export function renderRankedValue(text: string, rank: number) {
  return h('span', { class: 'text-sm tabular-nums', title: `Platz #${rank}` }, text)
}
