import type { VNodeChild } from 'vue'

export const ITEM_ACTION_ICON_BY_LABEL: Record<string, string> = {
  'Broken': '💥',
  'Crafted': '🛠️',
  'Dropped': '🔻',
  'Mined': '⛏️',
  'Picked Up': '🔺',
  'Used': '✋'
}

export const ENTITY_ACTION_ICON_BY_LABEL: Record<string, string> = {
  'Killed': '🔪',
  'Killed By': '☠️'
}

export type SortableColumn = { getIsSorted: () => false | 'asc' | 'desc', toggleSorting: () => void }

export function renderSortableColumnHeader(column: SortableColumn, content: VNodeChild) {
  const sortDirection = column.getIsSorted()
  const sortIndicator = sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : '↕'

  return h('button', {
    type: 'button',
    class: 'inline-flex items-center gap-1 hover:text-highlighted',
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
