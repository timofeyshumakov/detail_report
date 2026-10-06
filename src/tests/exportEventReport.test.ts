import { describe, expect, it } from 'vitest'
import { buildGroupedDeals } from '../functions/exportEventReport'
import type { EventDealReportRow } from '../functions/exportEventReport'

describe('buildGroupedDeals', () => {
  it('always returns 4 stage blocks', () => {
    const groups = buildGroupedDeals([])
    expect(groups).toHaveLength(4)
    expect(groups.map((g) => g.title)).toEqual([
      'Передано',
      'Договоренности',
      'Потенциал',
      'Отказ',
    ])
    groups.forEach((group) => {
      expect(group.items).toEqual([])
      expect(group.totalSum).toBe(0)
    })
  })

  it('groups deals by company and stage, aggregates sum and trusted person', () => {
    const deals: EventDealReportRow[] = [
      {
        UF_CRM_1744890618774: 'ООО Ромашка',
        STAGE_ID: 'C32:UC_LXYCFO',
        status: 'VIP',
        UF_CRM_1744062581756: '100|RUB',
        trustedPerson: 'Иван',
        COMMENTS: 'первый',
      },
      {
        UF_CRM_1744890618774: 'ООО Ромашка',
        STAGE_ID: 'C32:UC_LXYCFO',
        status: 'VIP',
        UF_CRM_1744062581756: 50,
        COMMENTS: 'второй',
      },
      {
        UF_CRM_1744890618774: 'ООО Василёк',
        STAGE_ID: 'C32:UC_R5DX1H',
        status: 'Ок',
        UF_CRM_1744062581756: 200,
        keyPerson: 'Петр',
      },
      {
        UF_CRM_1744890618774: 'ООО Отказ',
        STAGE_ID: 'C32:LOSE',
        stage: 'Нет денег',
        status: 'ignored',
        UF_CRM_1744062581756: 10,
      },
    ]

    const groups = buildGroupedDeals(deals)
    const potential = groups.find((g) => g.title === 'Потенциал')!
    const transferred = groups.find((g) => g.title === 'Передано')!
    const refusal = groups.find((g) => g.title === 'Отказ')!

    expect(potential.items).toHaveLength(1)
    expect(potential.items[0].UF_CRM_1744890618774).toBe('ООО Ромашка')
    expect(potential.items[0].UF_CRM_1744062581756).toBe(150)
    expect(potential.items[0].trustedPerson).toBe('Иван')
    expect(potential.items[0].COMMENTS).toContain('первый')
    expect(potential.totalSum).toBe(150)

    expect(transferred.items[0].trustedPerson).toBe('Петр')
    expect(transferred.totalSum).toBe(200)

    expect(refusal.items[0].status).toBe('Нет денег')
  })
})
