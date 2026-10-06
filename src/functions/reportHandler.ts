import {
  BITRIX_RATE_LIMIT_MESSAGE,
  BitrixRateLimitError,
  createRateLimitError,
  isRateLimitError,
  withRateLimitRetry,
} from './bitrixRateLimit'
import { callApi } from './callApi'

export const REPORT_HANDLER_URL = 'https://master.rymar-consulting.ru/request/handler.php'
export const REPORT_HANDLER_BATCH_LIMIT = 2500

// Event entity type ID для динамических полей
export const EVENT_ENTITY_TYPE_ID = 1052

// Все стадии категории C32 (мероприятия)
export const EVENT_DEAL_STAGES = [
  'C32:NEW',
  'C32:PREPARATION',
  'C32:UC_GKSSJ3',
  'C32:UC_HPGIL5',
  'C32:UC_LXYCFO',
  'C32:UC_VJZ0FL',
  'C32:UC_6VDO9F',
  'C32:UC_5BBXZ5',
  'C32:UC_R5DX1H',
  'C32:WON',
  'C32:LOSE',
  'C32:APOLOGY',
  'C32:1',
  'C32:2',
  'C32:3',
  'C32:4',
  'C32:5',
  'C32:6',
  'C32:7',
  'C32:8',
  'C32:9',
]

// Поле фильтрации сделок по мероприятию через DYNAMIC binding
export function buildEventDealFilter(eventIds: (string | number)[]): Record<string, unknown> {
  return { DYNAMIC_1052: eventIds.map(String) }
}

export const DEAL_SELECT_FIELDS = [
  'ID',
  'TITLE',
  'UF_CRM_1744096783472',
  'UF_CRM_1742797326',
  'STAGE_ID',
  'ASSIGNED_BY_ID',
  'UF_CRM_1744890618774',
  'UF_CRM_1744062581756',
  'UF_CRM_1745995594',
  'UF_CRM_1744064620850',
  'UF_CRM_1744095783871',
  'UF_CRM_1742906712910',
  'UF_CRM_1742971372921',
  'UF_CRM_1745222013992',
  'UF_CRM_1759821112055',
  'UF_CRM_1744096312349',
  'UF_CRM_1755788950300',
  'UF_CRM_1756807710',
  'UF_CRM_1754290331',
  'UF_CRM_1742972105926',
  'UF_CRM_1742972167794',
  'UF_CRM_1745308616558',
  'CONTACT_ID',
]

export const DEAL_SELECT_FIELDS_WITH_COMMENTS = [
  ...DEAL_SELECT_FIELDS,
  'COMMENTS',
]

type HandlerListResponse = {
  data?: unknown[]
  total?: number
}

type HandlerPayload = {
  data?: HandlerListResponse
  error?: string
  code?: string
  retryAfter?: number
}

async function requestHandlerList(
  method: string,
  filters: Record<string, unknown>,
  select: string[],
  start: number,
  limit: number,
  url: string = REPORT_HANDLER_URL,
): Promise<{ items: any[]; total: number }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method,
      filters,
      select,
      start,
      limit,
    }),
  })

  let payload: HandlerPayload = {}
  try {
    payload = await response.json() as HandlerPayload
  } catch (_) {
    payload = {}
  }

  if (response.status === 429 || isRateLimitError(null, payload)) {
    throw createRateLimitError(null, payload)
  }

  if (!response.ok) {
    throw new Error(payload.error || `Handler error: ${response.status} ${response.statusText}`)
  }

  if (payload.error) {
    if (isRateLimitError(null, payload)) {
      throw createRateLimitError(null, payload)
    }
    throw new Error(payload.error)
  }

  const items = Array.isArray(payload.data?.data) ? payload.data.data : []
  const total = Number(payload.data?.total ?? items.length)

  return { items, total }
}

export async function fetchDealsFromHandler(
  filters: Record<string, unknown>,
  select: string[] = DEAL_SELECT_FIELDS,
  options: {
    url?: string
    limit?: number
    onRateLimit?: (retryInMs: number, attempt: number) => void
  } = {},
): Promise<any[]> {
  const result = await callApi('crm.deal.list', filters, select, null, 0, 0)
  return Array.isArray(result) ? result : []
}

export async function fetchUsersFromHandler(
  filters: Record<string, unknown> = {},
  select: string[] = ['ID', 'NAME', 'SECOND_NAME', 'LAST_NAME', 'PERSONAL_PHOTO', 'UF_DEPARTMENT'],
  options: {
    url?: string
    limit?: number
    onRateLimit?: (retryInMs: number, attempt: number) => void
  } = {},
): Promise<any[]> {
  const url = options.url || REPORT_HANDLER_URL
  const limit = options.limit || REPORT_HANDLER_BATCH_LIMIT

  return withRateLimitRetry(async () => {
    const allUsers: any[] = []
    let start = 0
    let total = Number.POSITIVE_INFINITY

    while (start < total) {
      const chunkResult = await requestHandlerList('user.get', filters, select, start, limit, url)
      allUsers.push(...chunkResult.items)
      total = chunkResult.total

      if (chunkResult.items.length < limit) {
        break
      }

      start += limit
    }

    return allUsers
  }, {
    onRateLimit: options.onRateLimit,
  })
}

export { BITRIX_RATE_LIMIT_MESSAGE, BitrixRateLimitError }
