import {
  buildEventChecklistProgress,
  EVENT_CHECKLIST_TYPES,
  EVENT_ENTITY_TYPE_ID_FOR_CHECKLIST,
  extractChecklistUserFields,
  getChecklistParentEventId,
  getChecklistEntityTypeIds,
  getEventChecklistSelectFields,
  normalizeChecklistListResult,
  type EventChecklistFieldDef,
  type EventChecklistProgress,
} from '../domain/eventChecklist'
import { callApi } from './callApi'

const fieldsCache = new Map<number, EventChecklistFieldDef[]>()

function normalizeFieldsResult(raw: unknown): Record<string, any> {
  if (!raw || typeof raw !== 'object') return {}
  const record = raw as Record<string, any>
  if (record.fields && typeof record.fields === 'object' && !Array.isArray(record.fields)) {
    return record.fields
  }
  if (Array.isArray(raw)) {
    const first = raw[0]
    if (first?.fields && typeof first.fields === 'object') return first.fields
    if (first && typeof first === 'object' && !Array.isArray(first)) return first
    return {}
  }
  return record
}

async function ensureChecklistFieldsLoaded(): Promise<void> {
  const missing = getChecklistEntityTypeIds().filter((id) => !fieldsCache.has(id))
  if (!missing.length) return

  try {
    await Promise.all(
      missing.map(async (entityTypeId) => {
        const raw = await callApi('crm.item.fields', { entityTypeId }, null, null, 0, 0)
        const fields = extractChecklistUserFields(normalizeFieldsResult(raw))
        fieldsCache.set(entityTypeId, fields)
      }),
    )
  } catch (error) {
    console.error('Ошибка загрузки полей чек-листа:', error)
    missing.forEach((entityTypeId) => {
      if (!fieldsCache.has(entityTypeId)) {
        fieldsCache.set(entityTypeId, [])
      }
    })
  }
}

export async function getChecklistUserFields(entityTypeId: number): Promise<EventChecklistFieldDef[]> {
  await ensureChecklistFieldsLoaded()
  return fieldsCache.get(entityTypeId) || []
}

export async function loadEventChecklistForEvent(eventId: string | number): Promise<EventChecklistProgress> {
  if (eventId == null || eventId === '') {
    return buildEventChecklistProgress(null)
  }

  const parentKey = `parentId${EVENT_ENTITY_TYPE_ID_FOR_CHECKLIST}`

  await ensureChecklistFieldsLoaded()

  for (const type of EVENT_CHECKLIST_TYPES) {
    try {
      const fields = fieldsCache.get(type.entityTypeId) || []
      const result = await callApi(
        'crm.item.list',
        { [parentKey]: eventId },
        getEventChecklistSelectFields(fields),
        type.entityTypeId,
        0,
        0,
      )
      const item = normalizeChecklistListResult(result)[0] || null
      if (item) {
        return buildEventChecklistProgress(item, fields, type.entityTypeId)
      }
    } catch (error) {
      console.error(`Ошибка загрузки чек-листа ${type.label}:`, error)
    }
  }

  return buildEventChecklistProgress(null)
}

export async function loadEventChecklistsMap(
  eventIds: Array<string | number>,
): Promise<Record<string, EventChecklistProgress>> {
  const map: Record<string, EventChecklistProgress> = {}
  const uniqueIds = [...new Set((eventIds || []).filter((id) => id != null && id !== '').map(String))]

  uniqueIds.forEach((id) => {
    map[id] = buildEventChecklistProgress(null)
  })

  if (!uniqueIds.length) return map

  const parentKey = `parentId${EVENT_ENTITY_TYPE_ID_FOR_CHECKLIST}`

  await ensureChecklistFieldsLoaded()

  for (const type of EVENT_CHECKLIST_TYPES) {
    try {
      const fields = fieldsCache.get(type.entityTypeId) || []
      const result = await callApi(
        'crm.item.list',
        { [parentKey]: uniqueIds },
        getEventChecklistSelectFields(fields),
        type.entityTypeId,
        0,
        0,
      )

      normalizeChecklistListResult(result).forEach((item) => {
        const parentId = getChecklistParentEventId(item)
        if (parentId == null || parentId === '') return
        const key = String(parentId)
        if (!map[key] || !map[key].itemId) {
          map[key] = buildEventChecklistProgress(item, fields, type.entityTypeId)
        }
      })
    } catch (error) {
      console.error(`Ошибка загрузки чек-листов ${type.label}:`, error)
    }
  }

  return map
}
