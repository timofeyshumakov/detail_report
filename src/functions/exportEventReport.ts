import * as XLSX from 'xlsx'

export type EventReportRow = {
  event?: string
  audience?: string
  managers?: string
  start?: string
  percent?: number | string
  summ?: number | string
  over?: number | string
  planProfit?: number | string
  pot?: number | string
  dog?: number | string
  pd?: number | string
  UF_CRM_1742797326?: number | string
}

export type EventDealReportRow = {
  UF_CRM_1744890618774?: string
  ASSIGNED_BY_ID?: string
  status?: string
  stage?: string
  STAGE_ID?: string
  COMMENTS?: string
  trustedPerson?: string
  keyPerson?: string
  UF_CRM_1756807710?: string | number | Array<string | number>
  UF_CRM_1745222013992?: number | string
  UF_CRM_1759821112055?: number | string
  UF_CRM_1742972167794?: number | string
  UF_CRM_1742972105926?: number | string
  UF_CRM_1744062581756?: number | string
  UF_CRM_1744096783472?: string
  UF_CRM_1742797326?: number | string
}

type ExportHeader = {
  title: string
  key: string
}

type GroupedExportItem = {
  UF_CRM_1744890618774: string
  status: string
  UF_CRM_1744062581756: number
  trustedPerson: string
  COMMENTS: string
  STAGE_ID: string
  count: number
}

type ExportGroup = {
  title: string
  items: GroupedExportItem[]
  totalSum: number
}

/** Как в ODK: колонки групп сделок */
const CATEGORY_HEADERS: ExportHeader[] = [
  { title: 'Компания', key: 'UF_CRM_1744890618774' },
  { title: 'Статус', key: 'status' },
  { title: 'Сумма', key: 'UF_CRM_1744062581756' },
  { title: 'Доверенное лицо', key: 'trustedPerson' },
  { title: 'Комментарий', key: 'COMMENTS' },
]

/** Порядок категорий в Excel: Передано → Договоренности → Потенциал → Отказ */
export const EXPORT_STAGE_GROUPS = [
  { title: 'Передано', ids: ['C32:UC_R5DX1H'] },
  { title: 'Договоренности', ids: ['C32:UC_6VDO9F', 'C32:UC_5BBXZ5'] },
  { title: 'Потенциал', ids: ['C32:UC_LXYCFO', 'C32:UC_VJZ0FL'] },
  {
    title: 'Отказ',
    ids: [
      'C32:LOSE',
      'LOSE',
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
    ],
  },
] as const

/** Стадии для выборки сделок под экспорт (как filterCategory в ODK getData) */
export const EXPORT_DEAL_STAGE_IDS = [
  ...EXPORT_STAGE_GROUPS[0].ids,
  ...EXPORT_STAGE_GROUPS[1].ids,
  ...EXPORT_STAGE_GROUPS[2].ids,
  ...EXPORT_STAGE_GROUPS[3].ids,
]

const COLOR_MAP: Record<string, string> = {
  Потенциал: 'FFF893',
  Договоренности: 'FFF893',
  Передано: '7BC56E',
  Отказ: 'FF5852',
}

const BORDER_STYLE = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
}

function normalizeMoney(value: unknown): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  const normalized = String(value).replace(/\|RUB$/i, '').replace(/\s/g, '').replace(',', '.')
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'мероприятие'
}

function replaceBrackets(text: unknown): string {
  if (text == null) return ''
  return String(text)
    .replace(/\[/g, '<')
    .replace(/\]/g, '>')
}

function cleanComment(text: unknown): string {
  return replaceBrackets(text)
    .replace(/<[^>]+>/g, '')
    .replace(/\n/g, '')
    .trim()
}

function getTrustedPersonLabel(deal: EventDealReportRow): string {
  const explicit = String(deal.trustedPerson || deal.keyPerson || '').trim()
  if (explicit) return explicit
  return 'Не указано'
}

function getHeadersForGroup(groupTitle: string): ExportHeader[] {
  let headers = [...CATEGORY_HEADERS]

  // Как в ODK: для «Потенциал» без «Статус»
  if (groupTitle === 'Потенциал') {
    headers = headers.filter((header) => header.key !== 'status')
  }

  // Как в ODK: для «Отказ» — «Причина» вместо «Статус», без «Сумма»
  if (groupTitle === 'Отказ') {
    headers = headers
      .map((header) => (header.key === 'status' ? { ...header, title: 'Причина' } : header))
      .filter((header) => header.key !== 'UF_CRM_1744062581756')
  }

  return headers
}

/**
 * Группировка сделок по стадиям — как groupedDeals в ODK:
 * компания + STAGE_ID, суммы и комментарии агрегируются.
 * Всегда возвращает 4 блока (даже пустые).
 */
export function buildGroupedDeals(deals: EventDealReportRow[]): ExportGroup[] {
  return EXPORT_STAGE_GROUPS.map((merged) => {
    const categoryDeals = (deals || []).filter((deal) =>
      (merged.ids as readonly string[]).includes(String(deal.STAGE_ID || '')),
    )
    const dealGroups: Record<string, GroupedExportItem & { comments: string[] }> = {}

    categoryDeals.forEach((deal) => {
      const company = String(deal.UF_CRM_1744890618774 || '').trim()
      const stageId = String(deal.STAGE_ID || '')
      const key = `${company}_${stageId}`

      if (!dealGroups[key]) {
        dealGroups[key] = {
          UF_CRM_1744890618774: company,
          // Отказ → название стадии (причина); иначе статус участия
          status: merged.title === 'Отказ'
            ? String(deal.stage || '')
            : String(deal.status || ''),
          UF_CRM_1744062581756: 0,
          trustedPerson: getTrustedPersonLabel(deal),
          COMMENTS: '',
          STAGE_ID: stageId,
          count: 0,
          comments: [],
        }
      }

      dealGroups[key].count += 1
      dealGroups[key].UF_CRM_1744062581756 += normalizeMoney(deal.UF_CRM_1744062581756)
      if (deal.COMMENTS) {
        dealGroups[key].comments.push(String(deal.COMMENTS))
      }
    })

    const items = Object.values(dealGroups).map((group) => ({
      UF_CRM_1744890618774: group.UF_CRM_1744890618774,
      status: group.status,
      UF_CRM_1744062581756: group.UF_CRM_1744062581756,
      trustedPerson: group.trustedPerson,
      COMMENTS: group.comments.map(cleanComment).filter(Boolean).join(''),
      STAGE_ID: group.STAGE_ID,
      count: group.count,
    }))

    return {
      title: merged.title,
      items,
      totalSum: items.reduce((acc, item) => acc + item.UF_CRM_1744062581756, 0),
    }
  })
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(value)
}

function cellValue(header: ExportHeader, item: GroupedExportItem): string | number {
  if (header.key === 'UF_CRM_1744062581756') {
    return formatMoney(item.UF_CRM_1744062581756)
  }
  if (header.key === 'COMMENTS') {
    return cleanComment(item.COMMENTS)
  }
  if (header.key === 'trustedPerson') {
    return item.trustedPerson || 'Не указано'
  }
  if (header.key === 'status') {
    return item.status || ''
  }
  return ((item as Record<string, unknown>)[header.key] as string) || ''
}

/**
 * Экспорт сделок мероприятия в Excel — разбивка по стадиям как в ODK.
 */
export function exportEventReportToExcel(
  eventRow: EventReportRow,
  deals: EventDealReportRow[],
  _formatDate?: (date: string) => string,
): string {
  const eventId = String(eventRow.UF_CRM_1742797326 || '')
  const eventTitle = eventRow.event || `Мероприятие ${eventId}`
  // Всегда 4 блока: Передано, Договоренности, Потенциал, Отказ
  const groups = buildGroupedDeals(deals)

  const sheetData: Array<Array<string | number>> = []
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = []
  let rowNum = 1

  groups.forEach((group) => {
    const headers = getHeadersForGroup(group.title)

    // Заголовок группы (merge)
    sheetData.push([group.title, ...Array(Math.max(headers.length - 1, 0)).fill('')])
    merges.push({ s: { r: rowNum - 1, c: 0 }, e: { r: rowNum - 1, c: Math.max(headers.length - 1, 0) } })
    rowNum += 1

    // Шапка колонок
    sheetData.push(headers.map((header) => header.title))
    rowNum += 1

    // Строки данных
    group.items.forEach((item) => {
      sheetData.push(headers.map((header) => cellValue(header, item)))
      rowNum += 1
    })

    // Итого (кроме «Отказ») — как в ODK
    if (group.title !== 'Отказ') {
      const totalRow = Array(headers.length).fill('') as Array<string | number>
      totalRow[0] = 'Итого:'
      const sumIndex = headers.findIndex((header) => header.key === 'UF_CRM_1744062581756')
      if (sumIndex >= 0) {
        totalRow[sumIndex] = formatMoney(group.totalSum)
      } else if (headers.length > 2) {
        totalRow[2] = formatMoney(group.totalSum)
      }
      merges.push({
        s: { r: rowNum - 1, c: 0 },
        e: { r: rowNum - 1, c: Math.min(1, Math.max(headers.length - 1, 0)) },
      })
      sheetData.push(totalRow)
      rowNum += 1
    }

    // Пустая строка-разделитель
    sheetData.push(Array(headers.length).fill(''))
    rowNum += 1
  })

  if (!sheetData.length) {
    sheetData.push(['Нет данных для экспорта'])
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 28 },
    { wch: 24 },
    { wch: 18 },
    { wch: 28 },
    { wch: 40 },
  ]

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cellAddr = XLSX.utils.encode_cell({ r, c })
      if (!ws[cellAddr]) continue
      if (!ws[cellAddr].s) ws[cellAddr].s = {}
      ws[cellAddr].s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true }
      ws[cellAddr].s.border = BORDER_STYLE
    }
  }

  let currentRow = 0
  groups.forEach((group) => {
    const headers = getHeadersForGroup(group.title)
    const titleCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 })
    if (ws[titleCell]) {
      ws[titleCell].s = {
        fill: { fgColor: { rgb: COLOR_MAP[group.title] || '676767' } },
        font: { sz: 16, bold: true, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: BORDER_STYLE,
      }
    }
    currentRow += 1

    for (let c = 0; c < headers.length; c += 1) {
      const headerCell = XLSX.utils.encode_cell({ r: currentRow, c })
      if (ws[headerCell]) {
        ws[headerCell].s = {
          fill: { fgColor: { rgb: '676767' } },
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: BORDER_STYLE,
        }
      }
    }
    currentRow += 1
    currentRow += group.items.length

    if (group.title !== 'Отказ') {
      const itogoCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 })
      if (ws[itogoCell]?.s) {
        ws[itogoCell].s.alignment = { horizontal: 'left', vertical: 'center', wrapText: true }
      }
      currentRow += 1
    }
    currentRow += 1
  })

  XLSX.utils.book_append_sheet(wb, ws, 'Сделки')

  const fileName = `Отчет_${sanitizeFileName(eventTitle)}_${eventId || 'event'}.xlsx`
  XLSX.writeFile(wb, fileName)
  return fileName
}
