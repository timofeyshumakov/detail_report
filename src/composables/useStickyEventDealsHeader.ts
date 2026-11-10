/**
 * Закрепление заголовка таблицы сделок в окне мероприятия (EventDealsDialog).
 *
 * Механика та же, что у «Активность по мероприятию» (useStickyReportTableHeaders):
 * при прокрутке клонируем <thead> в фиксированный слой на body и синхронизируем
 * ширины колонок и горизонтальный сдвиг. Плюс окно мероприятия «залипает»
 * под верхней границей скролл-контейнера, поэтому шапка не уезжает за край.
 */

const TABLE_SELECTOR = '.event-deals-table'
const CLONE_CLASS = 'event-deals-sticky-header'
/** Зазор от верха скролл-контейнера до шапки */
const TOP_OFFSET = 0

type StickyBinding = {
  root: HTMLElement
  scrollHost: HTMLElement
  table: HTMLTableElement
  thead: HTMLTableSectionElement
  tableWrap: HTMLElement
  cloneHost: HTMLDivElement
  cloneTable: HTMLTableElement
  cloneThead: HTMLTableSectionElement
  onScroll: () => void
}

let bindings: StickyBinding[] = []
let frameId = 0

/**
 * Скролл-контейнер окна мероприятия — тот, что реально прокручивается по вертикали.
 * Нельзя брать первый элемент с overflow: .event-deals-table-wrap имеет
 * overflow-x: auto, из-за чего браузер вычисляет overflow-y: auto и он
 * ложно попадает под проверку.
 */
function findScrollHost(element: HTMLElement): HTMLElement | null {
  // Сначала пробуем известный контейнер окна
  const known = element.closest<HTMLElement>('.event-deals-dialog__content')
  if (known) return known

  let node = element.parentElement
  while (node) {
    const style = getComputedStyle(node)
    const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY)
      && node.scrollHeight > node.clientHeight
    if (canScrollY) return node
    node = node.parentElement
  }
  return null
}

function buildCloneThead(sourceThead: HTMLTableSectionElement): HTMLTableSectionElement {
  const cloneThead = document.createElement('thead')
  const sourceRow = sourceThead.querySelector('tr')
  if (!sourceRow) return cloneThead

  const cloneRow = document.createElement('tr')
  cloneRow.className = sourceRow.className

  sourceRow.querySelectorAll<HTMLTableCellElement>('th').forEach((sourceCell) => {
    const cloneCell = document.createElement('th')
    cloneCell.className = sourceCell.className
    cloneCell.innerHTML = sourceCell.innerHTML
    cloneRow.appendChild(cloneCell)
  })

  cloneThead.appendChild(cloneRow)
  return cloneThead
}

function syncWidths(binding: StickyBinding) {
  const sourceCells = binding.thead.querySelectorAll<HTMLTableCellElement>('th')
  const cloneCells = binding.cloneThead.querySelectorAll<HTMLTableCellElement>('th')

  sourceCells.forEach((sourceCell, index) => {
    const cloneCell = cloneCells[index]
    if (!cloneCell) return

    const rect = sourceCell.getBoundingClientRect()
    cloneCell.style.width = `${rect.width}px`
    cloneCell.style.minWidth = `${rect.width}px`
    cloneCell.style.maxWidth = `${rect.width}px`

    const style = getComputedStyle(sourceCell)
    cloneCell.style.background = style.backgroundColor
    cloneCell.style.color = style.color
    cloneCell.style.fontWeight = style.fontWeight
    cloneCell.style.fontSize = style.fontSize
    cloneCell.style.textAlign = style.textAlign
    cloneCell.style.padding = style.padding
    cloneCell.style.boxSizing = 'border-box'
  })

  const tableStyle = getComputedStyle(binding.table)
  binding.cloneTable.style.width = `${binding.table.offsetWidth}px`
  binding.cloneTable.style.tableLayout = tableStyle.tableLayout
  binding.cloneTable.style.borderCollapse = tableStyle.borderCollapse
}

function updateBinding(binding: StickyBinding) {
  const { scrollHost, thead, tableWrap, table } = binding

  // Якорь — сам скролл-контейнер окна. Его верхняя граница и есть место,
  // к которому должна прилипнуть шапка.
  const hostRect = scrollHost.getBoundingClientRect()
  const theadRect = thead.getBoundingClientRect()
  const tableRect = table.getBoundingClientRect()
  const headerHeight = thead.offsetHeight || theadRect.height

  // Высота шапки может быть 0 при zoom/CSS-анимации — берём из клона
  const effectiveHeight = headerHeight
    || binding.cloneThead.getBoundingClientRect().height
    || 52

  const shouldShow = (
    theadRect.height > 0
    && theadRect.top < hostRect.top + TOP_OFFSET
    && tableRect.bottom > hostRect.top + effectiveHeight
  )

  if (!shouldShow) {
    binding.cloneHost.style.display = 'none'
    return
  }

  syncWidths(binding)

  const wrapRect = tableWrap.getBoundingClientRect()
  binding.cloneHost.style.display = 'block'
  binding.cloneHost.style.top = `${hostRect.top + TOP_OFFSET}px`
  binding.cloneHost.style.left = `${wrapRect.left}px`
  binding.cloneHost.style.width = `${wrapRect.width}px`
  binding.cloneHost.style.height = `${effectiveHeight}px`
  binding.cloneTable.style.transform = `translateX(-${tableWrap.scrollLeft}px)`
}

function scheduleUpdate() {
  if (frameId) cancelAnimationFrame(frameId)
  frameId = requestAnimationFrame(() => {
    frameId = 0
    bindings.forEach(updateBinding)
  })
}

function destroyBindings() {
  bindings.forEach((binding) => {
    binding.scrollHost.removeEventListener('scroll', binding.onScroll)
    binding.tableWrap.removeEventListener('scroll', binding.onScroll)
    binding.cloneHost.remove()
  })
  bindings = []
}

function createBinding(root: HTMLTableElement): StickyBinding | null {
  const thead = root.querySelector<HTMLTableSectionElement>('thead')
  const tableWrap = root.closest<HTMLElement>('.event-deals-table-wrap')
  if (!thead || !tableWrap) return null

  const scrollHost = findScrollHost(root)
  if (!scrollHost) return null

  const cloneHost = document.createElement('div')
  cloneHost.className = CLONE_CLASS

  const cloneTable = document.createElement('table')
  cloneTable.className = root.className
  const cloneThead = buildCloneThead(thead)
  cloneTable.appendChild(cloneThead)
  cloneHost.appendChild(cloneTable)
  document.body.appendChild(cloneHost)

  const binding: StickyBinding = {
    root,
    scrollHost,
    table: root,
    thead,
    tableWrap,
    cloneHost,
    cloneTable,
    cloneThead,
    onScroll: scheduleUpdate,
  }

  scrollHost.addEventListener('scroll', binding.onScroll, { passive: true })
  tableWrap.addEventListener('scroll', binding.onScroll, { passive: true })

  return binding
}

export function useStickyEventDealsHeader() {
  let listening = false

  function onViewportChange() {
    scheduleUpdate()
  }

  function startGlobalListeners() {
    if (listening) return
    listening = true
    // capture: ловим scroll любого вложенного контейнера, а не только window
    window.addEventListener('scroll', onViewportChange, { passive: true, capture: true })
    window.addEventListener('resize', onViewportChange)
  }

  function stopGlobalListeners() {
    if (!listening) return
    listening = false
    window.removeEventListener('scroll', onViewportChange, { capture: true } as EventListenerOptions)
    window.removeEventListener('resize', onViewportChange)
  }

  function refresh(): void {
    destroyBindings()

    const tables = document.querySelectorAll<HTMLTableElement>(TABLE_SELECTOR)

    tables.forEach((table) => {
      if (!table.offsetParent) return
      const binding = createBinding(table)
      if (binding) bindings.push(binding)
    })

    if (bindings.length) {
      startGlobalListeners()
    }

    scheduleUpdate()
  }

  function destroy(): void {
    if (frameId) {
      cancelAnimationFrame(frameId)
      frameId = 0
    }
    stopGlobalListeners()
    destroyBindings()
  }

  return { refreshEventDealsStickyHeader: refresh, destroyEventDealsStickyHeader: destroy }
}
