import { defineStore } from 'pinia'

type GlobalState = {
  courses: unknown[]
  branchInfo: unknown[]
  paymentMethods: unknown[]
}

export const useGlobalStore = defineStore('globalStore', {
  state: (): GlobalState => ({
    courses: [],
    branchInfo: [],
    paymentMethods: [],
  }),
  actions: {
    setGlobalItem<K extends keyof GlobalState>(itemName: K, value: GlobalState[K]) {
      this[itemName] = value
    },
  },
})

type MyState = {
  items: unknown[]
  totalOpportunity: number
}

export const useMyStore = defineStore('myStore', {
  state: (): MyState => ({
    items: [],
    totalOpportunity: 0,
  }),
  actions: {
    setItemAtIndex(item: unknown, index: number) {
      this.items[index] = item
    },
    setTotalOpportunity(number: number) {
      this.totalOpportunity = number
    },
    clearItems() {
      this.items = []
      this.totalOpportunity = 0
    },
  },
})

type ParseState = {
  filter: Record<string, unknown>
  select: unknown[]
  parsedBatches: unknown[]
  total: number
}

export const useParseStore = defineStore('parseStore', {
  state: (): ParseState => ({
    filter: {},
    select: [],
    parsedBatches: [],
    total: 0,
  }),
  actions: {
    setFilter(key: string, item: unknown) {
      this.filter[key] = item
    },
    resetFilters() {
      this.filter = {}
    },
    setSelect(array: unknown[]) {
      this.select = array
    },
    addParsedBatches(item: unknown) {
      this.parsedBatches.push(item)
    },
    deleteParsedBatches() {
      this.parsedBatches = []
    },
    setTotal(total: number) {
      this.total = total
    },
  },
})
