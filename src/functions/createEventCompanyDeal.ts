import { SERVER_HANDLER_URL } from '../pages/callApi'

export const EVENT_DEAL_CATEGORY_ID = 32
export const EVENT_DEAL_STAGE_ID = 'C32:NEW'
export const EVENT_ENTITY_TYPE_ID = 1052

export function buildCompanyCreatePath() {
  return '/crm/company/details/0/'
}

function getCompanyAudienceIds(company: Record<string, unknown>) {
  const raw = company?.UF_CRM_1753364407
  if (raw == null || raw === '') return []

  if (Array.isArray(raw)) {
    return raw.map((id) => Number(id)).filter((id) => Number.isFinite(id))
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id))
  }

  const id = Number(raw)
  return Number.isFinite(id) ? [id] : []
}

function flattenCallApiResult(result: unknown): any[] {
  if (!Array.isArray(result)) return []
  return result.length && Array.isArray(result[0]) ? result.flat() : result
}

function waitMs(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function serverCall(method: string, params: Record<string, unknown> = {}): Promise<any> {
  const response = await fetch(SERVER_HANDLER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, ...params }),
  })

  if (!response.ok) {
    throw new Error(`Server handler error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  if (data.error) {
    throw new Error(data.error)
  }

  return data.data ?? data.result ?? null
}

export function extractCompanyIdFromPath(path: string | null | undefined): number | null {
  if (!path) return null
  const match = String(path).match(/\/crm\/company\/details\/(\d+)\/?/i)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) && id > 0 ? id : null
}

export function attachCompanySliderCloseTracker(onCapture: (url: string) => void) {
  const bx = (window as any).BX
  if (!bx?.addCustomEvent) {
    return () => {}
  }

  const handler = (event: any) => {
    try {
      const url = String(event?.getSlider?.()?.getUrl?.() || '')
      if (!/\/crm\/company\/details\//i.test(url)) return
      onCapture(url)
    } catch {
      // ignore
    }
  }

  bx.addCustomEvent('SidePanel.Slider:onCloseComplete', handler)
  return () => {
    bx.removeCustomEvent?.('SidePanel.Slider:onCloseComplete', handler)
  }
}

export async function fetchRecentCompanies(limit = 100) {
  const list = flattenCallApiResult(
    await serverCall('crm.company.list', {
      select: ['ID', 'TITLE', 'UF_CRM_1753364407', 'UF_CRM_1753364801'],
    }),
  )

  return list
    .slice()
    .sort((a, b) => Number(b.ID) - Number(a.ID))
    .slice(0, limit)
}

export async function fetchCompanyById(companyId: string | number) {
  try {
    const company = await serverCall('crm.company.get', { id: companyId })
    return company?.ID || company?.id ? company : null
  } catch (error) {
    console.error('Не удалось загрузить компанию:', error)
    return null
  }
}

export async function fetchCompaniesNewerThan(minId: number, limit = 30) {
  if (!Number.isFinite(minId) || minId <= 0) {
    return fetchRecentCompanies(limit)
  }

  const list = flattenCallApiResult(
    await serverCall('crm.company.list', {
      filter: { '>ID': minId },
      select: ['ID', 'TITLE', 'UF_CRM_1753364407', 'UF_CRM_1753364801'],
    }),
  )

  return list
    .slice()
    .sort((a, b) => Number(b.ID) - Number(a.ID))
    .slice(0, limit)
}

export async function getCurrentBxUser() {
  try {
    const user = await serverCall('user.current', {})
    return user
  } catch (error) {
    console.error('Не удалось получить текущего пользователя:', error)
    return null
  }
}

async function fetchCompanyContactIds(companyId: string | number) {
  try {
    const data = await serverCall('crm.company.contact.items.get', { id: companyId })
    const items = Array.isArray(data) ? data : (data?.items || [])

    return (items || [])
      .map((item: any) => Number(item.CONTACT_ID ?? item.contactId ?? item.ID))
      .filter((id: number) => Number.isFinite(id))
  } catch (error) {
    console.error('Не удалось получить контакты компании:', error)
    return []
  }
}

export function buildEventDealFieldsFromCompany(
  company: Record<string, any>,
  event: Record<string, any>,
  author: Record<string, any>,
  contactIds: number[] = [],
) {
  const audienceIds = getCompanyAudienceIds(company)

  return {
    TITLE: company.TITLE,
    ASSIGNED_BY_ID: author?.ID,
    STAGE_ID: EVENT_DEAL_STAGE_ID,
    CATEGORY_ID: String(EVENT_DEAL_CATEGORY_ID),
    CONTACT_IDS: contactIds.length ? contactIds : null,
    COMPANY_ID: company.ID,
    UF_CRM_1742797326: event.id ?? event.ID,
    UF_CRM_1744890618774: company.TITLE,
    UF_CRM_1754290331: contactIds.length ? contactIds : null,
    UF_CRM_1755867109691: event.ufCrm38_1751875905992,
    UF_CRM_1745308616558: event.ufCrm38_1745307580193,
    UF_CRM_1755869361: event.ufCrm38_1753082280,
    UF_CRM_1754897181: audienceIds,
    UF_CRM_1753365812: audienceIds,
    UF_CRM_1745308628574: event.ufCrm38_1745221903440,
    UF_CRM_1745995876: event.ufCrm38_1750326807,
  }
}

export async function createDealForEventCompany(
  company: Record<string, any>,
  event: Record<string, any>,
  author: Record<string, any>,
) {
  const contactIds = await fetchCompanyContactIds(company.ID)
  const fields = buildEventDealFieldsFromCompany(company, event, author, contactIds)

  return serverCall('crm.deal.add', { fields })
}

export async function appendDealIdsToEvent(eventId: string | number, createdDealIds: Array<string | number>) {
  if (!eventId || !createdDealIds.length) return

  const eventItem = await getCrmItem(EVENT_ENTITY_TYPE_ID, eventId)
  const startAddedDeals = eventItem?.ufCrm38AddedDeals || ''

  await serverCall('crm.item.update', {
    entityTypeId: EVENT_ENTITY_TYPE_ID,
    id: eventId,
    fields: {
      ufCrm38_AddedDeals: `${startAddedDeals} / ${createdDealIds.join(', ')}`,
    },
  })
}

export function findNewlyCreatedCompany(
  beforeCompanies: Array<Record<string, any>>,
  afterCompanies: Array<Record<string, any>>,
) {
  const beforeIds = new Set(beforeCompanies.map((company) => String(company.ID)))
  return afterCompanies.find((company) => !beforeIds.has(String(company.ID))) || null
}

export async function resolveCreatedCompanyAfterClose(
  beforeCompanies: Array<Record<string, any>>,
  options: {
    sliderUrl?: string
    maxBeforeId?: number
    maxAttempts?: number
    delayMs?: number
  } = {},
): Promise<Record<string, any> | null> {
  const beforeIds = new Set(beforeCompanies.map((company) => String(company.ID)))
  const maxBeforeId = options.maxBeforeId ?? Math.max(
    0,
    ...beforeCompanies.map((company) => Number(company.ID)).filter((id) => Number.isFinite(id)),
  )
  const maxAttempts = options.maxAttempts ?? 5
  const delayMs = options.delayMs ?? 400

  const loadCreatedById = async (companyId: number) => {
    if (beforeIds.has(String(companyId))) return null
    return fetchCompanyById(companyId)
  }

  const sliderCompanyId = extractCompanyIdFromPath(options.sliderUrl)
  if (sliderCompanyId) {
    const fromSlider = await loadCreatedById(sliderCompanyId)
    if (fromSlider?.ID) return fromSlider
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await waitMs(delayMs * attempt)
    }

    const newerCompanies = await fetchCompaniesNewerThan(maxBeforeId, 30)
    const createdFromNewer = newerCompanies.find(
      (company) => !beforeIds.has(String(company.ID)),
    ) || findNewlyCreatedCompany(beforeCompanies, newerCompanies)
    if (createdFromNewer?.ID) return createdFromNewer

    const recentCompanies = await fetchRecentCompanies(100)
    const createdFromRecent = findNewlyCreatedCompany(beforeCompanies, recentCompanies)
    if (createdFromRecent?.ID) return createdFromRecent
  }

  return null
}

// Вспомогательная функция для получения элемента CRM
async function getCrmItem(entityTypeId: number, id: string | number): Promise<any> {
  return serverCall('crm.item.get', { entityTypeId, id })
}
