import { describe, expect, it } from 'vitest'
import {
  aggregateEventMetrics,
  buildEventMetricsRow,
  finalizeEventMetrics,
  isDealSumRelatedField,
  parseDealReportSum,
  computeDealReportSum,
  resolveDealReportSum,
  resolveDealMetricContribution,
} from '../functions/eventReportMetrics'

describe('eventReportMetrics', () => {
  it('parseDealReportSum normalizes money values', () => {
    expect(parseDealReportSum({ UF_CRM_1744062581756: '1500|RUB' })).toBe(1500)
    expect(parseDealReportSum({ UF_CRM_1744062581756: 250 })).toBe(250)
    expect(parseDealReportSum({})).toBe(0)
  })

  it('aggregateEventMetrics groups sums by stage', () => {
    const metrics = aggregateEventMetrics([
      { STAGE_ID: 'C32:UC_R5DX1H', UF_CRM_1759821112055: 100 },
      { STAGE_ID: 'C32:UC_LXYCFO', UF_CRM_1742971372921: 50 },
      { STAGE_ID: 'C32:UC_5BBXZ5', UF_CRM_1742971372921: 30 },
      { STAGE_ID: 'C32:NEW', UF_CRM_1742971372921: 20 },
    ])

    expect(metrics.summ).toBe(100)
    expect(metrics.pot).toBe(70)
    expect(metrics.dog).toBe(30)
    expect(metrics.pd).toBe(100)
  })

  it('transferred deal counts extra option in summ not dog', () => {
    const metrics = aggregateEventMetrics([
      {
        STAGE_ID: 'C32:UC_R5DX1H',
        UF_CRM_1745222013992: 100,
        UF_CRM_1759821112055: 500,
        UF_CRM_1742972105926: 50,
      },
    ])

    expect(metrics.summ).toBe(650)
    expect(metrics.dog).toBe(0)
    expect(resolveDealMetricContribution({
      STAGE_ID: 'C32:UC_R5DX1H',
      UF_CRM_1742972105926: 50,
    }, 'dog')).toBe(0)
  })

  it('additional sales on agreement stage do not increase dog', () => {
    const metrics = aggregateEventMetrics([
      {
        STAGE_ID: 'C32:UC_5BBXZ5',
        UF_CRM_1742971372921: 30,
        UF_CRM_1742972105926: 20,
      },
    ])

    expect(metrics.dog).toBe(30)
    expect(metrics.pd).toBe(50)
  })

  it('aggregateEventMetrics ignores refusal stages', () => {
    const metrics = aggregateEventMetrics([
      { STAGE_ID: 'C32:LOSE', UF_CRM_1759821112055: 1000 },
      { STAGE_ID: 'C32:UC_LXYCFO', UF_CRM_1759821112055: 100 },
    ])

    expect(metrics.summ).toBe(0)
    expect(metrics.pot).toBe(100)
  })

  it('finalizeEventMetrics calculates over as summ minus plan', () => {
    expect(finalizeEventMetrics({
      summ: 100,
      pot: 0,
      dog: 0,
      pd: 0,
      over: 0,
    }, 150)).toEqual({
      summ: 100,
      pot: 0,
      dog: 0,
      pd: 0,
      over: -50,
    })
  })

  it('isDealSumRelatedField detects money fields', () => {
    expect(isDealSumRelatedField('UF_CRM_1759821112055')).toBe(true)
    expect(isDealSumRelatedField('COMMENTS')).toBe(false)
  })

  it('computeDealReportSum sums money components', () => {
    expect(computeDealReportSum({
      UF_CRM_1759821112055: 5000,
      UF_CRM_1742972167794: 200,
    })).toBe(5200)

    expect(computeDealReportSum({
      UF_CRM_1742971372921: 1000,
      UF_CRM_1745222013992: 1500,
      UF_CRM_1759821112055: 500,
    })).toBe(2000)
  })

  it('buildEventMetricsRow returns metrics for event deals', () => {
    const row = buildEventMetricsRow(
      { id: 10, ufCrm38_1745221903440: '1000|RUB' },
      [
        { STAGE_ID: 'C32:UC_R5DX1H', UF_CRM_1759821112055: 400 },
        { STAGE_ID: 'C32:UC_LXYCFO', UF_CRM_1742971372921: 100 },
      ],
    )

    expect(row.summ).toBe(400)
    expect(row.pot).toBe(100)
    expect(row.planProfit).toBe(1000)
    expect(row.over).toBe(-600)
  })
})
