export const STATISTIC_TABS_UI = {
  root: 'gap-0',
  // scrolling clips anything outside the list, so the baseline is drawn inside it (inset shadow instead of the default
  // border) and the active-tab indicator sits on it rather than one pixel below
  list: 'overflow-x-auto [scrollbar-width:none] border-b-0 shadow-[inset_0_-1px_0_var(--ui-border)]',
  indicator: 'bottom-0',
  trigger: 'shrink-0',
  content: 'min-w-0'
}
