const TABLE_SELECTOR = '.report-data-table.sticky-report-table'
const CLONE_CLASS = 'sticky-report-table-header'

type StickyTableBinding = {
  root: HTMLElement
  wrapper: HTMLElement
  table: HTMLTableElement
  thead: HTMLTableSectionElement
  cloneHost: HTMLDivElement
  cloneTable: HTMLTableElement
  cloneThead: HTMLTableSectionElement
  scrollTargets: Array<Element | Window>
  onScroll: () => void
}

const bindings: StickyTableBinding[] = []
let frameId = 0
let isMounted = false

function unlockStickyAncestors(table: Element) {
  let node = table.parentElement

  while (node) {
    if (node.classList.contains('report-table-card--sticky')) {
      node.style.overflow = 'visible'
    }

    if (node.classList.contains('v-main')) {
      break
    }

    node = node.parentElement
  }
}

function getScrollTargets(element: Element): Array<Element | Window> {
  const targets: Array<Element | Window> = [window]
  let node = element.parentElement

  while (node) {
    const style = getComputedStyle(node)
    const overflowValues = [style.overflow, style.overflowX, style.overflowY].join(' ')

    if (/(auto|scroll|overlay)/.test(overflowValues)) {
      targets.push(node)
    }

    node = node.parentElement
  }

  return targets
}

function buildCloneThead(sourceThead: HTMLTableSectionElement): HTMLTableSectionElement {
  const cloneThead = document.createElement('thead')
  const sourceRow = sourceThead.querySelector('tr')

  if (!sourceRow) {
    return cloneThead
  }

  const cloneRow = document.createElement('tr')
  cloneRow.className = sourceRow.className

  sourceRow.querySelectorAll<HTMLTableCellElement>('th').forEach((sourceCell) => {
    const cloneCell = document.createElement('th')
    cloneCell.className = sourceCell.className

    const content = sourceCell.querySelector('.v-data-table-header__content')
    const title = content?.querySelector('span')?.textContent?.trim()
      || sourceCell.textContent?.trim()
      || ''

    const contentNode = document.createElement('div')
    contentNode.className = 'v-data-table-header__content'

    const titleNode = document.createElement('span')
    titleNode.textContent = title
    contentNode.appendChild(titleNode)
    cloneCell.appendChild(contentNode)
    cloneRow.appendChild(cloneCell)
  })

  cloneThead.appendChild(cloneRow)
  return cloneThead
}

function copyHeaderCellStyles(source: HTMLTableCellElement, target: HTMLTableCellElement) {
  target.className = source.className
  const style = getComputedStyle(source)
  target.style.background = style.backgroundColor
  target.style.color = style.color
  target.style.fontWeight = style.fontWeight
  target.style.fontSize = style.fontSize
  target.style.textAlign = style.textAlign
  target.style.border = style.border
  target.style.borderColor = style.borderColor
  target.style.padding = style.padding
  target.style.boxSizing = 'border-box'
}

function syncHeaderWidths(binding: StickyTableBinding) {
  const sourceCells = binding.thead.querySelectorAll<HTMLTableCellElement>('th')
  const cloneCells = binding.cloneThead.querySelectorAll<HTMLTableCellElement>('th')

  sourceCells.forEach((sourceCell, index) => {
    const cloneCell = cloneCells[index]
    if (!cloneCell) return

    const width = sourceCell.getBoundingClientRect().width
    cloneCell.style.width = `${width}px`
    cloneCell.style.minWidth = `${width}px`
    cloneCell.style.maxWidth = `${width}px`
    copyHeaderCellStyles(sourceCell, cloneCell)
  })

  const tableStyle = getComputedStyle(binding.table)
  binding.cloneTable.style.width = `${binding.table.offsetWidth}px`
  binding.cloneTable.style.tableLayout = tableStyle.tableLayout
  binding.cloneTable.style.borderCollapse = tableStyle.borderCollapse
  binding.cloneTable.style.borderSpacing = tableStyle.borderSpacing
}

function updateBinding(binding: StickyTableBinding) {
  const topOffset = 0
  const theadRect = binding.thead.getBoundingClientRect()
  const rootRect = binding.root.getBoundingClientRect()
  const headerHeight = binding.thead.offsetHeight
  const shouldShow = theadRect.top <= topOffset && rootRect.bottom > topOffset + headerHeight

  binding.wrapper.style.overflowX = 'auto'
  binding.wrapper.style.maxWidth = '100%'

  if (!shouldShow) {
    binding.cloneHost.style.display = 'none'
    return
  }

  syncHeaderWidths(binding)

  const wrapperRect = binding.wrapper.getBoundingClientRect()
  binding.cloneHost.style.display = 'block'
  binding.cloneHost.style.top = `${topOffset}px`
  binding.cloneHost.style.left = `${wrapperRect.left}px`
  binding.cloneHost.style.width = `${wrapperRect.width}px`
  binding.cloneTable.style.transform = `translateX(-${binding.wrapper.scrollLeft}px)`
}

function updateAllBindings() {
  bindings.forEach(updateBinding)
}

function scheduleUpdate() {
  if (frameId) {
    cancelAnimationFrame(frameId)
  }

  frameId = requestAnimationFrame(() => {
    frameId = 0
    updateAllBindings()
  })
}

function destroyBindings() {
  bindings.splice(0).forEach((binding) => {
    binding.scrollTargets.forEach((target) => {
      target.removeEventListener('scroll', binding.onScroll)
    })
    binding.cloneHost.remove()
  })
}

function createBinding(root: HTMLElement): StickyTableBinding | null {
  unlockStickyAncestors(root)

  const wrapper = root.querySelector<HTMLElement>('.v-table__wrapper')
  const table = root.querySelector<HTMLTableElement>('table')
  const thead = table?.querySelector<HTMLTableSectionElement>('thead')

  if (!wrapper || !table || !thead) {
    return null
  }

  wrapper.style.overflowX = 'auto'
  wrapper.style.maxWidth = '100%'

  const cloneHost = document.createElement('div')
  cloneHost.className = CLONE_CLASS
  if (root.classList.contains('activity-report-table')) {
    cloneHost.classList.add('activity-report-table-header')
  }

  const cloneTable = document.createElement('table')
  cloneTable.className = table.className
  const cloneThead = buildCloneThead(thead)
  cloneTable.appendChild(cloneThead)
  cloneHost.appendChild(cloneTable)
  document.body.appendChild(cloneHost)

  const binding: StickyTableBinding = {
    root,
    wrapper,
    table,
    thead,
    cloneHost,
    cloneTable,
    cloneThead,
    scrollTargets: getScrollTargets(root),
    onScroll: scheduleUpdate,
  }

  binding.scrollTargets.forEach((target) => {
    target.addEventListener('scroll', binding.onScroll, { passive: true })
  })

  return binding
}

function setupBindings() {
  destroyBindings()
  document.querySelectorAll<HTMLElement>(TABLE_SELECTOR).forEach((tableRoot) => {
    const binding = createBinding(tableRoot)
    if (binding) {
      bindings.push(binding)
    }
  })
  updateAllBindings()
}

function onViewportChange() {
  scheduleUpdate()
}

export function useStickyReportTableHeaders() {
  function refreshStickyReportTableHeaders() {
    setupBindings()
  }

  function mountStickyReportTableHeaders() {
    if (isMounted) return

    isMounted = true
    setupBindings()
    window.addEventListener('scroll', onViewportChange, { passive: true })
    window.addEventListener('resize', onViewportChange)
  }

  function unmountStickyReportTableHeaders() {
    if (frameId) {
      cancelAnimationFrame(frameId)
      frameId = 0
    }

    window.removeEventListener('scroll', onViewportChange)
    window.removeEventListener('resize', onViewportChange)
    destroyBindings()
    isMounted = false
  }

  return {
    mountStickyReportTableHeaders,
    refreshStickyReportTableHeaders,
    unmountStickyReportTableHeaders,
  }
}
