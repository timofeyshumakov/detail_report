import { describe, expect, it } from 'vitest'
import {
  buildEventChecklistCreatePath,
  buildEventChecklistDetailsPath,
  buildEventChecklistProgress,
  EVENT_CHECKLIST_TYPES,
  extractChecklistUserFields,
  isChecklistValueFilled,
} from '../domain/eventChecklist'

const SAMPLE_FIELDS = [
  { uf: 'UF_CRM_124_1785307172', camel: 'ufCrm124_1785307172', title: 'Бриф' },
  { uf: 'UF_CRM_124_1785307207', camel: 'ufCrm124_1785307207', title: 'Согласование ОП' },
  { uf: 'UF_CRM_124_1785307260', camel: 'ufCrm124_1785307260', title: 'Согласование ПО' },
  { uf: 'UF_CRM_124_1785307289', camel: 'ufCrm124_1785307289', title: 'Согласование АО' },
  { uf: 'UF_CRM_124_1785307330', camel: 'ufCrm124_1785307330', title: 'Согласование ВО' },
  { uf: 'UF_CRM_124_1785307363', camel: 'ufCrm124_1785307363', title: 'Согласование Пиар' },
  { uf: 'UF_CRM_124_1785307464662', camel: 'ufCrm124_1785307464662', title: 'Звонок' },
  { uf: 'UF_CRM_124_1785307473', camel: 'ufCrm124_1785307473', title: 'Рабочая группа' },
]

describe('eventChecklist', () => {
  it('counts filled checklist fields', () => {
    const progress = buildEventChecklistProgress({
      id: 10,
      ufCrm124_1785307172: 1614,
      ufCrm124_1785307207: null,
      ufCrm124_1785307260: '',
      ufCrm124_1785307289: '0',
      ufCrm124_1785307330: 'Y',
      UF_CRM_124_1785307363: 42,
      ufCrm124_1785307464662: '2026-08-01T10:00:00',
      ufCrm124_1785307473: false,
    }, SAMPLE_FIELDS, 1244)

    expect(progress.itemId).toBe(10)
    expect(progress.entityTypeId).toBe(1244)
    expect(progress.filled).toBe(4)
    expect(progress.total).toBe(8)
    expect(progress.percent).toBe(50)
    expect(progress.items.filter((item) => item.filled).map((item) => item.uf)).toEqual([
      'UF_CRM_124_1785307172',
      'UF_CRM_124_1785307330',
      'UF_CRM_124_1785307363',
      'UF_CRM_124_1785307464662',
    ])
  })

  it('counts all user fields from crm.item.fields', () => {
    const fields = extractChecklistUserFields({
      id: { type: 'integer', isDynamic: false, title: 'ID' },
      title: { type: 'string', isDynamic: false, title: 'Название' },
      ufCrm120_1: { type: 'boolean', isDynamic: true, title: 'Пункт 1', upperName: 'UF_CRM_120_1' },
      ufCrm120_2: { type: 'boolean', isDynamic: true, title: 'Пункт 2', upperName: 'UF_CRM_120_2' },
    })

    expect(fields).toHaveLength(2)
    const progress = buildEventChecklistProgress({
      id: 5,
      ufCrm120_1: 'Y',
      ufCrm120_2: 'N',
    }, fields, 1220)

    expect(progress.total).toBe(2)
    expect(progress.filled).toBe(1)
    expect(progress.percent).toBe(50)
  })

  it('treats empty-like values as not filled', () => {
    expect(isChecklistValueFilled(null)).toBe(false)
    expect(isChecklistValueFilled('')).toBe(false)
    expect(isChecklistValueFilled('N')).toBe(false)
    expect(isChecklistValueFilled([])).toBe(false)
    expect(isChecklistValueFilled([1])).toBe(true)
  })

  it('builds create and details paths for checklist types', () => {
    expect(EVENT_CHECKLIST_TYPES.map((type) => type.entityTypeId)).toEqual([1220, 1244, 1248])
    expect(buildEventChecklistCreatePath(394, 1244)).toBe(
      '/crm/type/1244/details/0/?parentTypeId=1052&parentId=394',
    )
    expect(buildEventChecklistDetailsPath(10, 1248)).toBe('/crm/type/1248/details/10/')
  })
})
