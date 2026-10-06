import {
  FINAL_SUM_FIELD,
  PARTICIPATION_STATUS_FIELD,
  PRELIMINARY_SUM_FIELD,
  SQM_FIELD,
  TRUSTED_PERSON_FIELD,
} from './dealStages'

export const DEAL_CONTACTS_FIELD = 'UF_CRM_1754290331'
export const LAST_CALL_DATE_FIELD = 'UF_CRM_1769784388444'
export const COMMENT_FIELD = 'COMMENTS'
export const STAND_NUMBER_FIELD = 'UF_CRM_1755788950300'
export const TRANSFER_DATE_FIELD = 'UF_CRM_1744096783472'

export const NEVER_REQUIRED_FIELDS = new Set([
  'UF_CRM_1742906712910', // Причина провала
  'UF_CRM_1756114551515', // Причина провала
  'UF_CRM_1742972105926', // Сумма доп. продаж
  'UF_CRM_1742972167794', // Сумма внебюджет
  'UF_CRM_1768912409492', // Коммерция
  'UF_CRM_1744096783472', // Дата передачи
  'COMMENTS',
  'UF_CRM_1755788950300', // № стенда
  'UF_CRM_1742972807',
  'UF_CRM_1743001846',
  'UF_CRM_1768912617565',
])

export type RequiredFieldMeta = {
  name: string
  title: string
  type: string
  multiple: boolean
  options: Array<{ value: string | number; title: string }>
  settings: Record<string, unknown>
  mandatory: boolean
}

export function normalizeIdList(value: unknown): string[] {
  if (value == null || value === '') return []
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null || item === '') return null
        if (typeof item === 'object') {
          const record = item as Record<string, unknown>
          return String(record.ID ?? record.id ?? record.VALUE ?? '')
        }
        return String(item)
      })
      .filter((id): id is string => Boolean(id))
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const id = record.ID ?? record.id ?? record.VALUE
    return id != null && id !== '' ? [String(id)] : []
  }
  return [String(value)]
}

export function isEmptyFieldValue(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value)) {
    if (!value.length) return true
    return value.every((item) => isEmptyFieldValue(item))
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if ('value' in record) return isEmptyFieldValue(record.value)
    if ('VALUE' in record) return isEmptyFieldValue(record.VALUE)
  }
  return false
}

export function normalizeMoneyInput(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  return String(value)
    .replace(/\|RUB$/i, '')
    .replace(/\s/g, '')
    .replace(',', '.')
}

export function toDateInputValue(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  if (typeof value === 'string' && /^\d{2}\.\d{2}\.\d{4}/.test(value)) {
    const [day, month, year] = value.split(' ')[0].split('.')
    return `${year}-${month}-${day}`
  }
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function buildInputValue(fieldMeta: RequiredFieldMeta, currentValue: unknown): unknown {
  if (fieldMeta.type === 'boolean') {
    if (currentValue === true || currentValue === 'Y' || currentValue === 1 || currentValue === '1') return 'Y'
    return 'N'
  }
  if (fieldMeta.type === 'date') {
    return toDateInputValue(currentValue)
  }
  if (fieldMeta.type === 'datetime' && currentValue) {
    const date = new Date(String(currentValue))
    if (!Number.isNaN(date.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    }
  }
  if (fieldMeta.type === 'money') {
    return normalizeMoneyInput(currentValue)
  }
  if (fieldMeta.type === 'crm_status' || fieldMeta.type === 'crm_contact') {
    const ids = normalizeIdList(currentValue)
    return ids[0] || null
  }
  if (fieldMeta.multiple && Array.isArray(currentValue)) {
    return currentValue
  }
  if (currentValue == null) return fieldMeta.multiple ? [] : ''
  return currentValue
}

export function serializeRequiredFieldValue(fieldMeta: RequiredFieldMeta, value: unknown): unknown {
  if (fieldMeta.type === 'boolean') {
    return value === true || value === 'Y' || value === 1 || value === '1' ? 'Y' : 'N'
  }
  if (fieldMeta.type === 'money') {
    const number = Number(normalizeMoneyInput(value))
    if (!Number.isFinite(number)) throw new Error(`Некорректное значение: ${fieldMeta.title}`)
    return `${number}|RUB`
  }
  if (fieldMeta.type === 'double' || fieldMeta.type === 'integer') {
    const number = Number(normalizeMoneyInput(value))
    if (!Number.isFinite(number)) throw new Error(`Некорректное значение: ${fieldMeta.title}`)
    return number
  }
  if (fieldMeta.type === 'date' || fieldMeta.type === 'datetime') {
    return value || ''
  }
  if (fieldMeta.type === 'crm_status') {
    if (value == null || value === '') return []
    return [String(value)]
  }
  if (fieldMeta.type === 'crm_contact') {
    return value == null || value === '' ? '' : String(value)
  }
  if (fieldMeta.multiple) {
    return Array.isArray(value) ? value : (value == null || value === '' ? [] : [value])
  }
  return value == null ? '' : value
}

export function toCrmItemFieldName(fieldName: string): string {
  const name = String(fieldName || '')
  if (name === 'STAGE_ID') return 'stageId'
  if (name.startsWith('UF_CRM_')) return `ufCrm_${name.slice(7)}`
  if (name === 'COMMENTS') return 'comments'
  if (name === 'TITLE') return 'title'
  if (name === 'ASSIGNED_BY_ID') return 'assignedById'
  return name
}

export function buildCrmItemUpdatePayload(fields: Record<string, unknown>): Record<string, unknown> {
  const itemFields: Record<string, unknown> = {}
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (key === 'STAGE_ID') {
      itemFields.stageId = value
      return
    }
    itemFields[key] = value
  })
  return itemFields
}

export function enrichRequiredFieldMeta(field: RequiredFieldMeta): RequiredFieldMeta {
  const name = String(field.name || '').toUpperCase()
  if (name === PARTICIPATION_STATUS_FIELD) {
    return {
      ...field,
      title: 'Статус участия',
      type: 'crm_status',
      multiple: false,
    }
  }
  if (name === TRUSTED_PERSON_FIELD) {
    return {
      ...field,
      title: 'Доверенное лицо',
      type: 'crm_contact',
      multiple: false,
    }
  }
  if (name === PRELIMINARY_SUM_FIELD) {
    return { ...field, title: 'Предварительная сумма участия', type: 'money' }
  }
  if (name === FINAL_SUM_FIELD) {
    return { ...field, title: 'Финальная сумма участия', type: 'money' }
  }
  if (name === SQM_FIELD) {
    return { ...field, title: 'Кв.м' }
  }
  return field
}
