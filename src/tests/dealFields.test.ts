import { describe, expect, it } from 'vitest'
import {
  buildCrmItemUpdatePayload,
  buildInputValue,
  isEmptyFieldValue,
  normalizeIdList,
  serializeRequiredFieldValue,
  toCrmItemFieldName,
  type RequiredFieldMeta,
} from '../domain/dealFields'

const baseMeta = (overrides: Partial<RequiredFieldMeta> = {}): RequiredFieldMeta => ({
  name: 'UF_CRM_TEST',
  title: 'Test',
  type: 'string',
  multiple: false,
  options: [],
  settings: {},
  mandatory: false,
  ...overrides,
})

describe('normalizeIdList', () => {
  it('returns empty for nullish', () => {
    expect(normalizeIdList(null)).toEqual([])
    expect(normalizeIdList('')).toEqual([])
  })

  it('normalizes scalar and arrays', () => {
    expect(normalizeIdList(12)).toEqual(['12'])
    expect(normalizeIdList(['1', 2, { ID: 3 }])).toEqual(['1', '2', '3'])
  })

  it('reads object id fields', () => {
    expect(normalizeIdList({ id: '9' })).toEqual(['9'])
    expect(normalizeIdList({ VALUE: 5 })).toEqual(['5'])
  })
})

describe('isEmptyFieldValue', () => {
  it('detects empty values', () => {
    expect(isEmptyFieldValue(null)).toBe(true)
    expect(isEmptyFieldValue('  ')).toBe(true)
    expect(isEmptyFieldValue([])).toBe(true)
    expect(isEmptyFieldValue({ value: '' })).toBe(true)
  })

  it('detects filled values', () => {
    expect(isEmptyFieldValue('x')).toBe(false)
    expect(isEmptyFieldValue(0)).toBe(false)
    expect(isEmptyFieldValue(['1'])).toBe(false)
  })
})

describe('toCrmItemFieldName / buildCrmItemUpdatePayload', () => {
  it('maps UF and stage names for crm.item.update', () => {
    expect(toCrmItemFieldName('UF_CRM_1745995594')).toBe('ufCrm_1745995594')
    expect(toCrmItemFieldName('STAGE_ID')).toBe('stageId')
    expect(toCrmItemFieldName('COMMENTS')).toBe('comments')
  })

  it('keeps original UF names in payload and maps stage only', () => {
    expect(buildCrmItemUpdatePayload({
      STAGE_ID: 'C32:UC_LXYCFO',
      UF_CRM_1742971372921: '1000|RUB',
      UF_CRM_1745995594: ['42'],
    })).toEqual({
      stageId: 'C32:UC_LXYCFO',
      UF_CRM_1742971372921: '1000|RUB',
      UF_CRM_1745995594: ['42'],
    })
  })
})

describe('buildInputValue / serializeRequiredFieldValue', () => {
  it('handles crm_status as single id in and array out', () => {
    const meta = baseMeta({ type: 'crm_status', title: 'Статус' })
    expect(buildInputValue(meta, ['42'])).toBe('42')
    expect(serializeRequiredFieldValue(meta, '42')).toEqual(['42'])
    expect(serializeRequiredFieldValue(meta, null)).toEqual([])
  })

  it('handles crm_contact as string', () => {
    const meta = baseMeta({ type: 'crm_contact', title: 'Контакт' })
    expect(buildInputValue(meta, [7])).toBe('7')
    expect(serializeRequiredFieldValue(meta, '7')).toBe('7')
    expect(serializeRequiredFieldValue(meta, '')).toBe('')
  })

  it('serializes money with RUB suffix', () => {
    const meta = baseMeta({ type: 'money', title: 'Сумма' })
    expect(serializeRequiredFieldValue(meta, '1 200,5')).toBe('1200.5|RUB')
  })
})
