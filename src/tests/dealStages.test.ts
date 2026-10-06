import { describe, expect, it } from 'vitest'
import {
  FINAL_SUM_FIELD,
  getRequiredFieldNamesForStage,
  PARTICIPATION_STATUS_FIELD,
  PRELIMINARY_SUM_FIELD,
  SQM_FIELD,
  TRUSTED_PERSON_FIELD,
} from '../domain/dealStages'

describe('getRequiredFieldNamesForStage', () => {
  it('requires preliminary sum on potential cold', () => {
    expect(getRequiredFieldNamesForStage('C32:UC_LXYCFO')).toEqual([PRELIMINARY_SUM_FIELD])
  })

  it('requires preliminary sum on agreement warm', () => {
    expect(getRequiredFieldNamesForStage('C32:UC_5BBXZ5')).toEqual([
      PRELIMINARY_SUM_FIELD,
      PARTICIPATION_STATUS_FIELD,
      SQM_FIELD,
    ])
  })

  it('requires status, sqm, final sum and trusted person on Transferred', () => {
    expect(getRequiredFieldNamesForStage('C32:UC_R5DX1H')).toEqual([
      PARTICIPATION_STATUS_FIELD,
      SQM_FIELD,
      FINAL_SUM_FIELD,
      TRUSTED_PERSON_FIELD,
    ])
  })

  it('requires nothing for base stage', () => {
    expect(getRequiredFieldNamesForStage('C32:NEW')).toEqual([])
  })

  it('requires nothing for refusal stages', () => {
    expect(getRequiredFieldNamesForStage('C32:LOSE')).toEqual([])
    expect(getRequiredFieldNamesForStage('C32:6')).toEqual([])
  })
})
