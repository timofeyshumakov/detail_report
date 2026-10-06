/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module 'vue-the-mask' {
  import type { Plugin } from 'vue'
  const VueTheMask: Plugin
  export default VueTheMask
}

declare module 'rollup-plugin-copy' {
  import type { Plugin } from 'vite'
  interface CopyOptions {
    targets: Array<{ src: string; dest: string }>
    verbose?: boolean
    hook?: string
    apply?: 'build' | 'serve'
  }
  export default function copy(options: CopyOptions): Plugin
}

export interface Bx24Auth {
  domain?: string
  access_token?: string
  refresh_token?: string
  member_id?: string
}

export interface Bx24Api {
  init?: (callback?: () => void) => void
  callMethod?: (
    method: string,
    params: Record<string, unknown>,
    callback: (result: {
      error: () => unknown
      data: () => unknown
      more?: () => boolean
      next?: () => void
    }) => void,
  ) => void
  getAuth?: () => Bx24Auth | null
  openPath?: (path: string, onClose?: boolean | (() => void)) => void
  resizeWindow?: (width: number, height: number) => void
  fitWindow?: () => void
  scrollParentWindow?: (y: number) => void
}

declare global {
  interface Window {
    BX24?: Bx24Api
  }

  // Allows (window as any).BX24 / BX24 in app code
  // eslint-disable-next-line no-var
  var BX24: Bx24Api | undefined

  interface GlobalThis {
    BX24?: Bx24Api
  }
}

export {}
