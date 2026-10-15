import type { ShallowRef } from 'vue'

const MINIMUM_GAP_BETWEEN_TABS_AND_CONTROLS_PIXELS = 16

// offsets instead of bounding rects, because the tab list scrolls sideways and its scroll position must not count
function measureTabsRightEdgeFromContainerLeft(container: HTMLElement, tabList: HTMLElement): number {
  const tabListLeft = tabList.getBoundingClientRect().left - container.getBoundingClientRect().left
  const tabRightEdges = [...tabList.querySelectorAll<HTMLElement>('[role="tab"]')].map(tab => tab.offsetLeft + tab.offsetWidth)
  return tabListLeft + Math.max(0, ...tabRightEdges)
}

// controls overlaid on the right of a tab bar would cover tabs once both no longer fit side by side; this depends on tab
// labels, the active tab's controls and the container width, so it is measured instead of guessed with a breakpoint
export function useFitsBesideTabList(
  container: Readonly<ShallowRef<HTMLElement | null>>,
  controls: Readonly<ShallowRef<HTMLElement | null>>
) {
  const fitsBesideTabList = ref(true)
  let resizeObserver: ResizeObserver | undefined

  function updateFitsBesideTabList() {
    const containerElement = container.value
    const controlsElement = controls.value
    const tabList = containerElement?.querySelector<HTMLElement>('[role="tablist"]')
    if (!containerElement || !controlsElement || !tabList) return

    const requiredWidth = measureTabsRightEdgeFromContainerLeft(containerElement, tabList)
      + MINIMUM_GAP_BETWEEN_TABS_AND_CONTROLS_PIXELS
      + controlsElement.offsetWidth
    fitsBesideTabList.value = requiredWidth <= containerElement.clientWidth
  }

  onMounted(() => {
    resizeObserver = new ResizeObserver(updateFitsBesideTabList)
    watch([container, controls], ([containerElement, controlsElement]) => {
      resizeObserver!.disconnect()
      const tabs = containerElement?.querySelectorAll('[role="tab"]') ?? []
      for (const element of [containerElement, controlsElement, ...tabs]) {
        if (element) resizeObserver!.observe(element)
      }
      updateFitsBesideTabList()
    }, { immediate: true })
  })

  onBeforeUnmount(() => resizeObserver?.disconnect())

  return fitsBesideTabList
}
