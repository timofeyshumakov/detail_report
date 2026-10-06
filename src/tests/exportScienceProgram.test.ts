import { describe, expect, it } from 'vitest'
import {
  buildScienceWorkflowDocumentId,
  normalizeScienceFiles,
  pickNewScienceFile,
  SCIENCE_PROGRAM_TEMPLATE_ID,
} from '../functions/exportScienceProgram'

describe('exportScienceProgram helpers', () => {
  it('normalizes single and multiple CRM file values', () => {
    expect(normalizeScienceFiles(null)).toEqual([])
    expect(normalizeScienceFiles({
      id: 11,
      name: 'a.docx',
      urlMachine: 'https://file/a',
    })).toEqual([{ id: '11', name: 'a.docx', url: 'https://file/a' }])
    expect(normalizeScienceFiles([
      { ID: 1, NAME: 'old.pdf', downloadUrl: 'https://old' },
      { id: 2, name: 'new.pdf', url: 'https://new' },
    ])).toEqual([
      { id: '1', name: 'old.pdf', url: 'https://old' },
      { id: '2', name: 'new.pdf', url: 'https://new' },
    ])
  })

  it('picks the newly generated file when the field already has files', () => {
    const previous = [{ id: '1', name: 'old.pdf', url: 'https://old' }]
    const current = [
      { id: '1', name: 'old.pdf', url: 'https://old' },
      { id: '9', name: 'fresh.pdf', url: 'https://fresh' },
    ]
    expect(pickNewScienceFile(previous, current)).toEqual({
      id: '9',
      name: 'fresh.pdf',
      url: 'https://fresh',
    })
    expect(pickNewScienceFile(current, current)).toBeNull()
  })

  it('builds SPA document id for workflow 3104', () => {
    expect(SCIENCE_PROGRAM_TEMPLATE_ID).toBe(3104)
    expect(buildScienceWorkflowDocumentId(394)).toEqual([
      'crm',
      'Bitrix\\Crm\\Integration\\BizProc\\Document\\Dynamic',
      'DYNAMIC_1052_394',
    ])
  })
})
