import { defineStore } from 'pinia'

export type ScoringCriterion = {
  id: string
  name: string
  weight?: number
  [key: string]: unknown
}

type ScoringState = {
  criteria: ScoringCriterion[]
}

export const useScoringStore = defineStore('scoringStore', {
  state: (): ScoringState => ({
    criteria: [],
  }),
  actions: {
    setCriteria(criteria: ScoringCriterion[]) {
      this.criteria = criteria
    },
  },
})
