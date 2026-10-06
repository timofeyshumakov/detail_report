export type ViewportSize = {
  width: number
  height: number
}

export type OverlayRect = ViewportSize & {
  top: number
  left: number
}

type ViewportSource = {
  innerWidth: number
  innerHeight: number
  scrollY?: number
  pageYOffset?: number
  frameElement?: {
    getBoundingClientRect?: () => { top?: number; left?: number }
  } | null
  parent?: {
    innerWidth?: number
    innerHeight?: number
    scrollY?: number
    document?: {
      documentElement?: { clientHeight?: number; clientWidth?: number; scrollTop?: number }
      body?: { clientHeight?: number; clientWidth?: number; scrollTop?: number }
    }
  } | null
  visualViewport?: { height?: number; width?: number; offsetTop?: number; pageTop?: number } | null
  screen?: { availHeight?: number; height?: number; availWidth?: number; width?: number } | null
}

/**
 * Стабильный размер host-viewport для вложенного диалога Bitrix.
 * Берёт минимум из parent/visualViewport/iframe и всегда ограничивает screen —
 * чтобы после BX24.fitWindow iframe не раздувал панель.
 */
export function getHostViewportSize(source: ViewportSource = window): ViewportSize {
  const heightCandidates: number[] = []
  const widthCandidates: number[] = []

  try {
    if (source.parent && source.parent !== (source as unknown as Window)) {
      if (source.parent.innerHeight) heightCandidates.push(source.parent.innerHeight)
      if (source.parent.innerWidth) widthCandidates.push(source.parent.innerWidth)
      const parentDoc = source.parent.document
      const parentClientHeight = parentDoc?.documentElement?.clientHeight || parentDoc?.body?.clientHeight
      const parentClientWidth = parentDoc?.documentElement?.clientWidth || parentDoc?.body?.clientWidth
      if (parentClientHeight) heightCandidates.push(parentClientHeight)
      if (parentClientWidth) widthCandidates.push(parentClientWidth)
    }
  } catch {
    // cross-origin parent — ignore
  }

  if (source.visualViewport?.height) {
    heightCandidates.push(Math.ceil(source.visualViewport.height))
  }
  if (source.visualViewport?.width) {
    widthCandidates.push(Math.ceil(source.visualViewport.width))
  }

  if (source.innerHeight) heightCandidates.push(source.innerHeight)
  if (source.innerWidth) widthCandidates.push(source.innerWidth)

  const screenHeight = source.screen?.availHeight || source.screen?.height || 1080
  const screenWidth = source.screen?.availWidth || source.screen?.width || 1920
  heightCandidates.push(screenHeight)
  widthCandidates.push(screenWidth)

  const rawHeight = Math.min(...heightCandidates.filter((value) => Number.isFinite(value) && value > 0))
  const rawWidth = Math.min(...widthCandidates.filter((value) => Number.isFinite(value) && value > 0))

  return {
    width: Math.max(320, rawWidth),
    height: Math.max(480, rawHeight - 16),
  }
}

function getVisibleFrameOffset(source: ViewportSource): number {
  try {
    const rect = source.frameElement?.getBoundingClientRect?.()
    if (rect && Number.isFinite(rect.top)) {
      return Math.max(0, Math.round(-Number(rect.top)))
    }
  } catch {
    // cross-origin frameElement — ignore
  }

  try {
    if (source.parent && source.parent !== (source as unknown as Window)) {
      const parentScroll = source.parent.scrollY
        || source.parent.document?.documentElement?.scrollTop
        || source.parent.document?.body?.scrollTop
        || 0
      if (parentScroll > 0) return Math.round(parentScroll)
    }
  } catch {
    // cross-origin parent — ignore
  }

  const visualOffset = Math.round(Number(source.visualViewport?.pageTop || source.visualViewport?.offsetTop || 0))
  if (visualOffset > 0) return visualOffset

  return Math.max(0, Math.round(Number(source.scrollY || source.pageYOffset || 0)))
}

/**
 * Полоса видимого экрана внутри высокого iframe после BX24.fitWindow.
 * top — смещение от верха документа приложения до текущего окна браузера.
 */
export function getVisibleOverlayRect(source: ViewportSource = window): OverlayRect {
  const { width, height } = getHostViewportSize(source)
  return {
    top: getVisibleFrameOffset(source),
    left: 0,
    width,
    height,
  }
}
