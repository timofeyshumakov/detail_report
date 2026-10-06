/** Смарт-процесс «Чек-лист» мероприятия (тип A по умолчанию) */
export const EVENT_CHECKLIST_ENTITY_TYPE_ID = 1220
export const EVENT_ENTITY_TYPE_ID_FOR_CHECKLIST = 1052

export type EventChecklistType = {
  entityTypeId: number
  label: string
}

export const EVENT_CHECKLIST_TYPES: EventChecklistType[] = [
  { entityTypeId: 1220, label: 'Чек-лист A' },
  { entityTypeId: 1244, label: 'Чек лист B' },
  { entityTypeId: 1248, label: 'Чек-лист С' },
]

export type EventChecklistFieldDef = {
  uf: string
  camel: string
  title: string
}

export function getChecklistTypeById(entityTypeId: string | number | null | undefined) {
  const id = Number(entityTypeId)
  if (!Number.isFinite(id)) return null
  return EVENT_CHECKLIST_TYPES.find((type) => type.entityTypeId === id) || null
}

export function getChecklistEntityTypeIds() {
  return EVENT_CHECKLIST_TYPES.map((type) => type.entityTypeId)
}

function toCamelFieldName(name: string) {
  if (!name) return ''
  if (name.startsWith('ufCrm') || name.startsWith('uf')) return name
  return name.replace(/^UF_CRM_/i, 'ufCrm').replace(/^UF_/i, 'uf')
}

function toUfFieldName(name: string, upperName?: string) {
  if (upperName) return String(upperName)
  if (/^UF_/i.test(name)) return name
  if (name.startsWith('ufCrm')) {
    return `UF_CRM_${name.slice(5)}`
  }
  return name
}

function isUserFieldKey(key: string) {
  return /^ufCrm/i.test(key) || /^UF_CRM_/i.test(key)
}

/** Пользовательские поля смарт-процесса из crm.item.fields */
export function extractChecklistUserFields(
  fields: Record<string, any> | null | undefined,
): EventChecklistFieldDef[] {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return []

  return Object.entries(fields)
    .filter(([key, def]) => {
      if (!key || !def || typeof def !== 'object') return false
      if (def.isDynamic === true) return true
      return isUserFieldKey(key)
    })
    .map(([key, def]) => ({
      uf: toUfFieldName(key, def.upperName),
      camel: toCamelFieldName(key),
      title: String(def.title || def.formLabel || def.listLabel || key),
    }))
}

export function isChecklistValueFilled(value: unknown): boolean {
  if (value == null || value === '') return false
  if (value === false || value === 'N' || value === 0 || value === '0') return false
  if (Array.isArray(value)) {
    return value.some((entry) => isChecklistValueFilled(entry))
  }
  return true
}

export function readChecklistFieldValue(
  item: Record<string, unknown> | null | undefined,
  field: EventChecklistFieldDef,
) {
  if (!item) return null
  return item[field.camel] ?? item[field.uf] ?? null
}

export type EventChecklistProgressItem = {
  uf: string
  title: string
  filled: boolean
}

export type EventChecklistProgress = {
  itemId: string | number | null
  entityTypeId: number | null
  filled: number
  total: number
  percent: number
  items: EventChecklistProgressItem[]
}

export function inferChecklistUserFieldsFromItem(
  item: Record<string, unknown> | null | undefined,
): EventChecklistFieldDef[] {
  if (!item) return []
  return Object.keys(item)
    .filter((key) => isUserFieldKey(key))
    .map((key) => ({
      uf: toUfFieldName(key),
      camel: toCamelFieldName(key),
      title: key,
    }))
}

export function buildEventChecklistProgress(
  item: Record<string, unknown> | null | undefined,
  fields: EventChecklistFieldDef[] = [],
  entityTypeId: number | null = null,
): EventChecklistProgress {
  const fieldDefs = fields.length ? fields : inferChecklistUserFieldsFromItem(item)
  const items = fieldDefs.map((field) => ({
    uf: field.uf,
    title: field.title,
    filled: isChecklistValueFilled(readChecklistFieldValue(item, field)),
  }))
  const filled = items.filter((entry) => entry.filled).length
  const total = items.length
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0
  const rawId = item?.id ?? item?.ID ?? null
  const itemId = rawId == null || rawId === ''
    ? null
    : (typeof rawId === 'string' || typeof rawId === 'number' ? rawId : String(rawId))

  return {
    itemId,
    entityTypeId: itemId == null ? null : (entityTypeId ?? EVENT_CHECKLIST_ENTITY_TYPE_ID),
    filled,
    total,
    percent,
    items,
  }
}

export function getEventChecklistSelectFields(fields: EventChecklistFieldDef[] = []): string[] {
  return [
    'id',
    'title',
    `parentId${EVENT_ENTITY_TYPE_ID_FOR_CHECKLIST}`,
    ...fields.map((field) => field.camel),
  ]
}

export function buildEventChecklistCreatePath(
  eventId: string | number,
  entityTypeId: string | number = EVENT_CHECKLIST_ENTITY_TYPE_ID,
): string {
  return `/crm/type/${entityTypeId}/details/0/?parentTypeId=${EVENT_ENTITY_TYPE_ID_FOR_CHECKLIST}&parentId=${eventId}`
}

export function buildEventChecklistDetailsPath(
  itemId: string | number,
  entityTypeId: string | number = EVENT_CHECKLIST_ENTITY_TYPE_ID,
): string {
  return `/crm/type/${entityTypeId}/details/${itemId}/`
}

export function getChecklistParentEventId(item: Record<string, unknown> | null | undefined) {
  if (!item) return null
  const key = `parentId${EVENT_ENTITY_TYPE_ID_FOR_CHECKLIST}`
  const value = item[key] ?? item[`PARENT_ID_${EVENT_ENTITY_TYPE_ID_FOR_CHECKLIST}`]
  if (value == null || value === '') return null
  return value
}

export function normalizeChecklistListResult(raw: unknown): Record<string, unknown>[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    if (raw.length && Array.isArray(raw[0])) return (raw as unknown[]).flat() as Record<string, unknown>[]
    return raw as Record<string, unknown>[]
  }
  if (typeof raw === 'object' && Array.isArray((raw as { items?: unknown[] }).items)) {
    return (raw as { items: Record<string, unknown>[] }).items
  }
  return []
}
