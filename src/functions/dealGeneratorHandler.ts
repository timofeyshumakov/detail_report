import {
  callApi,
  getBx24Auth,
  getCurrentBxUserId,
  getCurrentBxUserName,
  getListElements,
} from './callApi'
import {
  createRateLimitError,
  isRateLimitError,
  sleep,
  withRateLimitRetry,
} from './bitrixRateLimit'
import { REPORT_HANDLER_URL } from './reportHandler'

const AUDIENCE_LIST_ID = 216
const COMPANY_AUDIENCE_FIELD = 'UF_CRM_1753364407'
const GENERATE_CHUNK_SIZE = 15
const CHUNK_DELAY_MS = 500
const HANDLER_TIMEOUT_MS = 120_000
const OPERATION_TIME_SAFE_LIMIT_SECONDS = 440
const OPERATION_TIME_BLOCK_RETRY_MS = 120_000
const OPERATION_TIME_MAX_RETRIES = 5

let operationThrottleUntil = 0

export type DealGeneratorAudienceItem = {
  ID: string
  NAME: string
}

export type DealGeneratorCompanyItem = {
  ID: string
  TITLE: string
  UF_CRM_1753364407?: unknown
  UF_CRM_1753364801?: unknown
}

export type DealGeneratorGenerateResult = {
  createdDealIds: Array<string | number>
  createdCount: number
  totalCompanies: number
  message: string
}

type HandlerPayload<T> = {
  data?: T
  error?: string
  code?: string
  retryAfter?: number
  time?: {
    operating?: number | string
    operating_reset_at?: number | string
  }
}

type GenerateProgress = {
  created: number
  total: number
  phase: string
}

type ActionOptions = {
  onRateLimit?: (retryInMs: number, attempt: number) => void
  onOperationWait?: (remainingMs: number, reason: 'safe-limit' | 'blocked') => void
}

class OperationTimeLimitError extends Error {
  retryAfterMs: number

  constructor(message: string, retryAfterMs = OPERATION_TIME_BLOCK_RETRY_MS) {
    super(message)
    this.name = 'OperationTimeLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

function isOperationTimeLimit(payload: HandlerPayload<unknown>): boolean {
  const code = String(payload.code || '').toUpperCase()
  const text = String(payload.error || '').toLowerCase()
  return code === 'OPERATION_TIME_LIMIT'
    || text.includes('method is blocked due to operation time limit')
    || text.includes('operation time limit')
}

function parseResetTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value
  }

  const raw = String(value || '').trim()
  if (!raw) return 0
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const numeric = Number(raw)
    return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric
  }

  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function rememberOperationTime(time: HandlerPayload<unknown>['time']): void {
  const operating = Number(time?.operating)
  if (!Number.isFinite(operating) || operating < OPERATION_TIME_SAFE_LIMIT_SECONDS) return

  const resetAt = parseResetTimestamp(time?.operating_reset_at)
  operationThrottleUntil = resetAt > Date.now()
    ? resetAt + 1000
    : Date.now() + OPERATION_TIME_BLOCK_RETRY_MS
}

async function waitForOperationBudget(
  until: number,
  reason: 'safe-limit' | 'blocked',
  onWait?: ActionOptions['onOperationWait'],
): Promise<void> {
  while (Date.now() < until) {
    const remainingMs = Math.max(0, until - Date.now())
    onWait?.(remainingMs, reason)
    await sleep(Math.min(1000, remainingMs))
  }
}

function normalizeListItems<T extends Record<string, unknown>>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is T => item != null && typeof item === 'object')
  }
  if (value != null && typeof value === 'object') {
    return Object.values(value as Record<string, T>).filter((item) => item != null && typeof item === 'object')
  }
  return []
}

function normalizeAudienceItems(raw: unknown): DealGeneratorAudienceItem[] {
  return normalizeListItems<Record<string, unknown>>(raw)
    .map((item) => ({
      ID: String(item.ID ?? item.id ?? ''),
      NAME: String(item.NAME ?? item.name ?? item.TITLE ?? item.title ?? item.ID ?? item.id ?? ''),
    }))
    .filter((item) => item.ID !== '' && item.NAME !== '')
}

function normalizeCompanyItems(raw: unknown): DealGeneratorCompanyItem[] {
  return normalizeListItems<Record<string, unknown>>(raw)
    .map((item) => ({
      ID: String(item.ID ?? item.id ?? ''),
      TITLE: String(item.TITLE ?? item.title ?? item.NAME ?? item.name ?? item.ID ?? item.id ?? ''),
      UF_CRM_1753364407: item.UF_CRM_1753364407,
      UF_CRM_1753364801: item.UF_CRM_1753364801,
    }))
    .filter((item) => item.ID !== '')
}

function flattenCallApiResult(result: unknown): DealGeneratorCompanyItem[] {
  if (!Array.isArray(result)) return []
  const flat = result.length && Array.isArray(result[0]) ? result.flat() : result
  return normalizeCompanyItems(flat)
}

function dedupeCompanies(companies: DealGeneratorCompanyItem[]): DealGeneratorCompanyItem[] {
  const seen = new Set<string>()
  return companies.filter((company) => {
    const id = String(company.ID)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let offset = 0; offset < items.length; offset += size) {
    chunks.push(items.slice(offset, offset + size))
  }
  return chunks
}

function getCompanyAudienceIds(company: DealGeneratorCompanyItem): number[] {
  const raw = company.UF_CRM_1753364407
  if (raw == null || raw === '') return []
  if (Array.isArray(raw)) {
    return raw.map((id) => Number(id)).filter((id) => Number.isFinite(id))
  }
  if (typeof raw === 'string') {
    return raw.split(',').map((id) => Number(id.trim())).filter((id) => Number.isFinite(id))
  }
  const id = Number(raw)
  return Number.isFinite(id) ? [id] : []
}

function filterEligibleCompanies(
  companies: DealGeneratorCompanyItem[],
  selectedAudience: DealGeneratorAudienceItem[],
): DealGeneratorCompanyItem[] {
  const selectedIds = new Set(selectedAudience.map((item) => Number(item.ID)))
  return companies.filter((company) => (
    getCompanyAudienceIds(company).some((audienceId) => selectedIds.has(audienceId))
  ))
}

async function callDealGeneratorAction<T>(
  action: string,
  payload: Record<string, unknown> = {},
  options: ActionOptions = {},
): Promise<T> {
  for (let attempt = 0; attempt <= OPERATION_TIME_MAX_RETRIES; attempt++) {
    if (operationThrottleUntil > Date.now()) {
      await waitForOperationBudget(operationThrottleUntil, 'safe-limit', options.onOperationWait)
    }

    try {
      return await withRateLimitRetry(async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), HANDLER_TIMEOUT_MS)

        try {
          const response = await fetch(REPORT_HANDLER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...payload }),
            signal: controller.signal,
          })

          let body: HandlerPayload<T> = {}
          try {
            body = await response.json() as HandlerPayload<T>
          } catch (_) {
            body = {}
          }

          rememberOperationTime(body.time)

          if (isOperationTimeLimit(body)) {
            const retryAfterSeconds = Number(body.retryAfter)
            const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
              ? retryAfterSeconds * 1000
              : OPERATION_TIME_BLOCK_RETRY_MS
            throw new OperationTimeLimitError(
              body.error || 'Method is blocked due to operation time limit.',
              retryAfterMs,
            )
          }

          if (response.status === 429 || isRateLimitError(null, body)) {
            throw createRateLimitError(null, body)
          }

          if (!response.ok) {
            throw new Error(body.error || `Handler error: ${response.status} ${response.statusText}`)
          }

          if (body.error) {
            if (isRateLimitError(null, body)) {
              throw createRateLimitError(null, body)
            }
            throw new Error(body.error)
          }

          return body.data as T
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Превышено время ожидания ответа сервера')
          }
          throw error
        } finally {
          clearTimeout(timeoutId)
        }
      }, {
        onRateLimit: options.onRateLimit,
      })
    } catch (error) {
      if (!(error instanceof OperationTimeLimitError) || attempt >= OPERATION_TIME_MAX_RETRIES) {
        throw error
      }

      operationThrottleUntil = Date.now() + error.retryAfterMs
      await waitForOperationBudget(operationThrottleUntil, 'blocked', options.onOperationWait)
    }
  }

  throw new Error('Не удалось продолжить генерацию после ограничения времени Bitrix24')
}

async function loadCompaniesForGeneration(
  mode: 'manual' | 'mass',
  audienceIds: Array<string | number>,
  selectedCompanies: DealGeneratorCompanyItem[],
): Promise<DealGeneratorCompanyItem[]> {
  if (mode === 'manual') {
    return dedupeCompanies(selectedCompanies)
  }

  return dedupeCompanies(flattenCallApiResult(
    await callApi(
      'crm.company.list',
      { [COMPANY_AUDIENCE_FIELD]: audienceIds },
      ['ID', 'TITLE', COMPANY_AUDIENCE_FIELD, 'UF_CRM_1753364801'],
      null,
      0,
      0,
    ),
  ))
}

export async function fetchDealGeneratorAudience(): Promise<DealGeneratorAudienceItem[]> {
  const items = await getListElements(AUDIENCE_LIST_ID, {}, ['ID', 'NAME'])
  return normalizeAudienceItems(items)
}

export async function fetchDealGeneratorCompanies(
  audienceIds: Array<string | number>,
): Promise<DealGeneratorCompanyItem[]> {
  const result = await callDealGeneratorAction<{ items?: unknown; data?: unknown }>(
    'dealGenerator.companies',
    { audienceIds },
  )
  return dedupeCompanies(normalizeCompanyItems(result?.items ?? result?.data ?? result))
}

export async function generateDealsChunked(options: {
  event: Record<string, any>
  mode: 'manual' | 'mass'
  selectedAudience: DealGeneratorAudienceItem[]
  selectedCompanies?: DealGeneratorCompanyItem[]
  onProgress?: (progress: GenerateProgress) => void
  onRateLimit?: (retryInMs: number, attempt: number) => void
}): Promise<DealGeneratorGenerateResult> {
  const audienceIds = options.selectedAudience.map((item) => item.ID)
  const audienceNames = options.selectedAudience.map((item) => item.NAME)

  options.onProgress?.({ created: 0, total: 0, phase: 'Загрузка компаний' })

  // Auth и author нужны серверу: crm.deal.add идёт от имени текущего пользователя
  const auth = getBx24Auth()
  const [authorId, authorName] = await Promise.all([
    getCurrentBxUserId(),
    getCurrentBxUserName(),
  ])

  const companies = await loadCompaniesForGeneration(
    options.mode,
    audienceIds,
    options.selectedCompanies || [],
  )
  const eligibleCompanies = filterEligibleCompanies(companies, options.selectedAudience)

  if (!eligibleCompanies.length) {
    return {
      createdDealIds: [],
      createdCount: 0,
      totalCompanies: 0,
      message: 'Не найдено компаний для создания сделок',
    }
  }

  const total = eligibleCompanies.length
  const chunks = chunkArray(eligibleCompanies, GENERATE_CHUNK_SIZE)
  const createdDealIds: Array<string | number> = []

  options.onProgress?.({ created: 0, total, phase: 'Подготовка' })

  for (let index = 0; index < chunks.length; index++) {
    options.onProgress?.({
      created: createdDealIds.length,
      total,
      phase: `Создание сделок ${index + 1}/${chunks.length}`,
    })

    const chunkResult = await callDealGeneratorAction<{
      createdDealIds?: Array<string | number>
      createdCount?: number
    }>('dealGenerator.generateChunk', {
      eventId: options.event.id ?? options.event.ID,
      audienceIds,
      audienceNames,
      authorId,
      authorName,
      auth,
      companies: chunks[index],
      finalize: index === chunks.length - 1,
    }, {
      onRateLimit: options.onRateLimit,
      onOperationWait: (remainingMs, reason) => {
        const seconds = Math.max(1, Math.ceil(remainingMs / 1000))
        const phase = reason === 'blocked'
          ? `Метод Bitrix24 заблокирован. Продолжение через ${seconds} сек.`
          : `Пауза для защиты от блокировки. Продолжение через ${seconds} сек.`
        options.onProgress?.({
          created: createdDealIds.length,
          total,
          phase,
        })
      },
    })

    const chunkIds = Array.isArray(chunkResult?.createdDealIds) ? chunkResult.createdDealIds : []
    createdDealIds.push(...chunkIds)

    options.onProgress?.({
      created: createdDealIds.length,
      total,
      phase: `Создано ${createdDealIds.length} из ${total}`,
    })

    if (index < chunks.length - 1) {
      await sleep(CHUNK_DELAY_MS)
    }
  }

  return {
    createdDealIds,
    createdCount: createdDealIds.length,
    totalCompanies: total,
    message: createdDealIds.length > 0
      ? 'Сделки успешно созданы'
      : 'Не найдено компаний для создания сделок',
  }
}
