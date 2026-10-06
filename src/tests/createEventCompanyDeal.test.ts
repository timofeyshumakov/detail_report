import { describe, expect, it } from 'vitest'
import {
  buildEventDealFieldsFromCompany,
  extractCompanyIdFromPath,
  findNewlyCreatedCompany,
} from '../functions/createEventCompanyDeal'

describe('createEventCompanyDeal', () => {
  it('extracts company id from slider path', () => {
    expect(extractCompanyIdFromPath('/crm/company/details/0/')).toBeNull()
    expect(extractCompanyIdFromPath('/crm/company/details/128/')).toBe(128)
  })

  it('finds company that appeared after create', () => {
    const created = findNewlyCreatedCompany(
      [{ ID: 1, TITLE: 'A' }, { ID: 2, TITLE: 'B' }],
      [{ ID: 3, TITLE: 'New Co' }, { ID: 2, TITLE: 'B' }, { ID: 1, TITLE: 'A' }],
    )
    expect(created).toEqual({ ID: 3, TITLE: 'New Co' })
  })

  it('builds deal fields with company title and event link', () => {
    const fields = buildEventDealFieldsFromCompany(
      { ID: 77, TITLE: 'ООО Ромашка', UF_CRM_1753364407: ['10', '11'] },
      {
        id: 55,
        ufCrm38_1751875905992: '2026-08-10',
        ufCrm38_1745307580193: '2026-08-01',
        ufCrm38_1753082280: 3,
        ufCrm38_1745221903440: '1000|RUB',
        ufCrm38_1750326807: 'desc',
      },
      { ID: 1614 },
      [9],
    )

    expect(fields.TITLE).toBe('ООО Ромашка')
    expect(fields.COMPANY_ID).toBe(77)
    expect(fields.UF_CRM_1742797326).toBe(55)
    expect(fields.UF_CRM_1744890618774).toBe('ООО Ромашка')
    expect(fields.CONTACT_IDS).toEqual([9])
    expect(fields.UF_CRM_1754897181).toEqual([10, 11])
  })
})
