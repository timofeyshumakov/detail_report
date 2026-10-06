import { describe, expect, it } from 'vitest'
import { getHostViewportSize, getVisibleOverlayRect } from '../domain/dialogViewport'

describe('getHostViewportSize', () => {
  it('caps inflated iframe height by screen size', () => {
    const size = getHostViewportSize({
      innerWidth: 1920,
      innerHeight: 8000,
      screen: { availHeight: 1080, availWidth: 1920 },
    })
    expect(size.height).toBe(Math.max(480, 1080 - 16))
    expect(size.width).toBe(1920)
  })

  it('prefers smaller parent viewport', () => {
    const size = getHostViewportSize({
      innerWidth: 1920,
      innerHeight: 2000,
      parent: { innerWidth: 1280, innerHeight: 720 },
      screen: { availHeight: 1080, availWidth: 1920 },
    })
    expect(size.height).toBe(Math.max(480, 720 - 16))
    expect(size.width).toBe(1280)
  })
})

describe('getVisibleOverlayRect', () => {
  it('pins overlay to the visible iframe band using frame rect', () => {
    const rect = getVisibleOverlayRect({
      innerWidth: 1920,
      innerHeight: 8000,
      screen: { availHeight: 1080, availWidth: 1920 },
      frameElement: {
        getBoundingClientRect: () => ({ top: -2400, left: 0 }),
      },
    })
    expect(rect.top).toBe(2400)
    expect(rect.height).toBe(Math.max(480, 1080 - 16))
    expect(rect.width).toBe(1920)
  })

  it('falls back to parent scroll when frame rect is unavailable', () => {
    const rect = getVisibleOverlayRect({
      innerWidth: 1920,
      innerHeight: 8000,
      parent: { innerWidth: 1280, innerHeight: 720, scrollY: 1500 },
      screen: { availHeight: 1080, availWidth: 1920 },
    })
    expect(rect.top).toBe(1500)
    expect(rect.height).toBe(Math.max(480, 720 - 16))
  })

  it('falls back to local scrollY', () => {
    const rect = getVisibleOverlayRect({
      innerWidth: 1920,
      innerHeight: 2000,
      scrollY: 400,
      screen: { availHeight: 1080, availWidth: 1920 },
    })
    expect(rect.top).toBe(400)
  })
})
