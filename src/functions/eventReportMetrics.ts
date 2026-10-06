import {
  AGREEMENT_STAGES,
  BASE_STAGES,
  CALL_STAGES,
  FINAL_SUM_FIELD,
  isRefusalStage,
  MAILING_STAGES,
  PRELIMINARY_SUM_FIELD,
  POTENTIAL_STAGES,
  SUCCESS_STAGES,
  TRANSFERRED_STAGE_ID,
  TRANSFERRED_STAGES,
} from '../domain/dealStages'

export const DEAL_REPORT_SUM_FIELD = 'UF_CRM_1744062581756'

export const DEAL_SUM_COMPONENT_FIELDS = [
  PRELIMINARY_SUM_FIELD,
  'UF_CRM_1745222013992',
  FINAL_SUM_FIELD,
  'UF_CRM_1742972105926',
  'UF_CRM_1742972167794',
] as const

export const DEAL_SUM_RELATED_FIELDS = new Set([
  DEAL_REPORT_SUM_FIELD,
  ...DEAL_SUM_COMPONENT_FIELDS,
])

const PD_STAGE_IDS = new Set<string>([
  ...POTENTIAL_STAGES,
  ...AGREEMENT_STAGES,
  ...BASE_STAGES,
  ...MAILING_STAGES,
  ...CALL_STAGES,
])

export type EventMetricBuckets = {
  summ: number
  pot: number
  dog: number
  pd: number
}

export function getEventMetricBuckets(stageId: string | null | undefined): EventMetricBuckets {
  const stage = String(stageId || '')

  if (!stage || isRefusalStage(stage)) {
    return { summ: 0, pot: 0, dog: 0, pd: 0 }
  }

  const isTransferred = stage === TRANSFERRED_STAGE_ID
    || (TRANSFERRED_STAGES as readonly string[]).includes(stage)
    || (SUCCESS_STAGES as readonly string[]).includes(stage)
  const isAgreement = (AGREEMENT_STAGES as readonly string[]).includes(stage)
  const isPotential = (POTENTIAL_STAGES as readonly string[]).includes(stage)
  const isEarlyFunnel = (BASE_STAGES as readonly string[]).includes(stage)
    || (MAILING_STAGES as readonly string[]).includes(stage)
    || (CALL_STAGES as readonly string[]).includes(stage)

  return {
    summ: isTransferred ? 1 : 0,
    pot: (isPotential || isEarlyFunnel) ? 1 : 0,
    dog: isAgreement ? 1 : 0,
    pd: PD_STAGE_IDS.has(stage) ? 1 : 0,
  }
}

export function sumDealsReportAmount(
  deals: Array<Record<string, unknown>>,
  predicate?: (deal: Record<string, unknown>) => boolean,
): number {
  return (deals || [])
    .filter((deal) => !predicate || predicate(deal))
    .reduce((acc, deal) => acc + resolveDealReportSum(deal), 0)
}

export type EventMetrics = {
  summ: number
  pot: number
  dog: number
  pd: number
  over: number
}

export function parseMoneyComponent(value: unknown): number {
  if (value == null || value === '') return 0
  const normalized = String(value).replace(/\|RUB$/i, '').replace(/\s/g, '').replace(',', '.')
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseDealReportSum(deal: Record<string, unknown> | null | undefined): number {
  return parseMoneyComponent(deal?.[DEAL_REPORT_SUM_FIELD])
}

export function computeDealReportSum(deal: Record<string, unknown> | null | undefined): number {
  if (!deal) return 0

  const preliminary = Math.max(
    parseMoneyComponent(deal[PRELIMINARY_SUM_FIELD]),
    parseMoneyComponent(deal['UF_CRM_1745222013992']),
  )
  const final = parseMoneyComponent(deal[FINAL_SUM_FIELD])
  const offBudget = parseMoneyComponent(deal['UF_CRM_1742972167794'])
  const additional = parseMoneyComponent(deal['UF_CRM_1742972105926'])

  return preliminary + final + offBudget + additional
}

export function resolveDealReportSum(deal: Record<string, unknown> | null | undefined): number {
  const computed = computeDealReportSum(deal)
  if (computed > 0) return computed
  return parseDealReportSum(deal)
}

export type DealSumParts = {
  preliminary: number
  final: number
  offBudget: number
  additional: number
}

export function getDealSumParts(deal: Record<string, unknown> | null | undefined): DealSumParts {
  if (!deal) {
    return { preliminary: 0, final: 0, offBudget: 0, additional: 0 }
  }

  return {
    preliminary: Math.max(
      parseMoneyComponent(deal[PRELIMINARY_SUM_FIELD]),
      parseMoneyComponent(deal['UF_CRM_1745222013992']),
    ),
    final: parseMoneyComponent(deal[FINAL_SUM_FIELD]),
    offBudget: parseMoneyComponent(deal['UF_CRM_1742972167794']),
    additional: parseMoneyComponent(deal['UF_CRM_1742972105926']),
  }
}

export function isCollectedStage(stageId: string | null | undefined): boolean {
  const stage = String(stageId || '')
  if (!stage) return false

  return stage === TRANSFERRED_STAGE_ID
    || (TRANSFERRED_STAGES as readonly string[]).includes(stage)
    || (SUCCESS_STAGES as readonly string[]).includes(stage)
}

function applyAmountToMetrics(
  metrics: EventMetrics,
  amount: number,
  buckets: EventMetricBuckets,
) {
  if (!amount) return

  metrics.summ += amount * buckets.summ
  metrics.pot += amount * buckets.pot
  metrics.dog += amount * buckets.dog
  metrics.pd += amount * buckets.pd
}

export function resolveDealMetricContribution(
  deal: Record<string, unknown> | null | undefined,
  target: keyof EventMetricBuckets,
): number {
  const metrics = createEmptyEventMetrics()
  appendDealMetricContribution(metrics, deal)
  return metrics[target]
}

function appendDealMetricContribution(
  metrics: EventMetrics,
  deal: Record<string, unknown> | null | undefined,
) {
  const stageId = String(deal?.STAGE_ID || '')
  if (!stageId || isRefusalStage(stageId)) return

  const parts = getDealSumParts(deal)
  const partsTotal = parts.preliminary + parts.final + parts.offBudget + parts.additional
  const buckets = getEventMetricBuckets(stageId)

  if (isCollectedStage(stageId)) {
    applyAmountToMetrics(metrics, partsTotal, { summ: 1, pot: 0, dog: 0, pd: 0 })
    return
  }

  applyAmountToMetrics(metrics, parts.preliminary, buckets)

  const collectedParts = parts.final + parts.offBudget + parts.additional
  if (collectedParts) {
    applyAmountToMetrics(metrics, collectedParts, {
      summ: buckets.summ,
      pot: buckets.pot,
      dog: 0,
      pd: buckets.pd,
    })
  }

  if (!partsTotal) {
    const storedTotal = parseDealReportSum(deal)
    applyAmountToMetrics(metrics, storedTotal, buckets)
  }
}

export function createEmptyEventMetrics(): EventMetrics {
  return {
    summ: 0,
    pot: 0,
    dog: 0,
    pd: 0,
    over: 0,
  }
}

export function aggregateEventMetrics(deals: Array<Record<string, unknown>>): EventMetrics {
  const metrics = createEmptyEventMetrics()

  deals.forEach((deal) => {
    appendDealMetricContribution(metrics, deal)
  })

  return metrics
}

export function finalizeEventMetrics(
  metrics: EventMetrics,
  planProfit: number,
): EventMetrics {
  const plan = Number(planProfit) || 0
  return {
    ...metrics,
    over: metrics.summ - plan,
  }
}

export function isDealSumRelatedField(field: string | null | undefined): boolean {
  return DEAL_SUM_RELATED_FIELDS.has(String(field || '').toUpperCase())
}

export function buildEventMetricsRow(
  event: Record<string, unknown> | null | undefined,
  deals: Array<Record<string, unknown>>,
  resolvePercent?: (event: unknown, summ: number, plan: number) => number,
) {
  const planProfit = parseMoneyComponent(event?.ufCrm38_1745221903440)
  const metrics = finalizeEventMetrics(aggregateEventMetrics(deals), planProfit)
  const percent = resolvePercent
    ? resolvePercent(event, metrics.summ, planProfit)
    : (planProfit > 0 ? Math.round((metrics.summ / planProfit) * 10000) / 100 : 0)

  // eslint-disable-next-line no-console
  console.log('🔍 [buildEventMetricsRow]', {
    eventId: event?.id,
    dealsCount: deals.length,
    firstDealSumm: deals[0]?.UF_CRM_1744062581756,
    summ: metrics.summ,
    pot: metrics.pot,
    dog: metrics.dog,
    pd: metrics.pd,
  })

  return {
    UF_CRM_1742797326: event?.id ?? event?.ID,
    summ: metrics.summ,
    pot: metrics.pot,
    dog: metrics.dog,
    pd: metrics.pd,
    over: metrics.over,
    planProfit,
    percent,
  }
}
