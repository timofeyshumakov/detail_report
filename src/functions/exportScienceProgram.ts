import { callApi } from './callApi';

export const SCIENCE_PROGRAM_TEMPLATE_ID = 3104
export const SCIENCE_PROGRAM_FILE_FIELD = 'ufCrm38_1749547387617'
export const SCIENCE_PROGRAM_FILE_FIELD_UF = 'UF_CRM_38_1749547387617'
export const SCIENCE_PROGRAM_EVENT_ENTITY_TYPE_ID = 1052

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 90000

export type ScienceProgramFile = {
  id: string
  name: string
  url: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function normalizeScienceFiles(raw: unknown): ScienceProgramFile[] {
  if (raw == null || raw === '') return []
  const list = Array.isArray(raw) ? raw : [raw]

  return list
    .map((item) => {
      if (item == null || item === '') return null
      if (typeof item === 'object') {
        const record = item as Record<string, unknown>
        const id = record.id ?? record.ID ?? record.fileId ?? record.FILE_ID
        if (id == null || id === '') return null
        return {
          id: String(id),
          name: String(record.name ?? record.NAME ?? 'научная-программа'),
          url: String(
            record.urlMachine
            ?? record.downloadUrl
            ?? record.DOWNLOAD_URL
            ?? record.url
            ?? record.showUrl
            ?? '',
          ),
        }
      }
      return {
        id: String(item),
        name: 'научная-программа',
        url: '',
      }
    })
    .filter((file): file is ScienceProgramFile => Boolean(file))
}

export function pickNewScienceFile(
  previous: ScienceProgramFile[],
  current: ScienceProgramFile[],
): ScienceProgramFile | null {
  const previousIds = new Set(previous.map((file) => file.id))
  const added = current.filter((file) => !previousIds.has(file.id))
  if (added.length) return added[added.length - 1]
  return null
}

function readScienceFilesFromEvent(event: Record<string, unknown> | null | undefined) {
  if (!event) return []
  return normalizeScienceFiles(
    event[SCIENCE_PROGRAM_FILE_FIELD]
    ?? event[SCIENCE_PROGRAM_FILE_FIELD_UF]
    ?? event[SCIENCE_PROGRAM_FILE_FIELD_UF.toLowerCase()]
    ?? null,
  )
}

export function buildScienceWorkflowDocumentId(eventId: string | number) {
  return [
    'crm',
    'Bitrix\\Crm\\Integration\\BizProc\\Document\\Dynamic',
    `DYNAMIC_${SCIENCE_PROGRAM_EVENT_ENTITY_TYPE_ID}_${eventId}`,
  ]
}

async function getEventScienceFiles(eventId: string | number): Promise<ScienceProgramFile[]> {
  const result = await callApi('crm.item.get', { id: eventId }, null, SCIENCE_PROGRAM_EVENT_ENTITY_TYPE_ID, 0, 0)
  const item = Array.isArray(result) ? result[0] || {} : result || {}
  return readScienceFilesFromEvent(item)
}

async function isWorkflowRunning(workflowId: string | null, eventId: string | number) {
  if (!workflowId) return false
  try {
    const instances = await callApi('bizproc.workflow.instances', {
      FILTER: {
        TEMPLATE_ID: SCIENCE_PROGRAM_TEMPLATE_ID,
        DOCUMENT_ID: `DYNAMIC_${SCIENCE_PROGRAM_EVENT_ENTITY_TYPE_ID}_${eventId}`,
      },
    }, ['ID', 'TEMPLATE_ID', 'DOCUMENT_ID'], null, 0, 0)
    const list = Array.isArray(instances) ? instances : []
    return list.some((item) => String(item?.ID ?? item?.id ?? '') === String(workflowId))
  } catch (_) {
    return false
  }
}

async function resolveDownloadUrl(file: ScienceProgramFile): Promise<string> {
  if (file.url) return file.url
  const diskFile = await callApi('disk.file.get', { id: file.id }, null, null, 0, 0)
  const firstResult = Array.isArray(diskFile) ? diskFile[0] : diskFile
  const url = firstResult?.DOWNLOAD_URL || firstResult?.downloadUrl || firstResult?.urlMachine || ''
  if (!url) throw new Error('Не удалось получить ссылку на файл научной программы')
  return String(url)
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename || 'научная-программа'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

async function downloadScienceFile(file: ScienceProgramFile) {
  const url = await resolveDownloadUrl(file)
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    triggerBlobDownload(blob, file.name)
  } catch (_) {
    const link = document.createElement('a')
    link.href = url
    link.download = file.name || 'научная-программа'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}

export async function exportScienceProgram(
  eventId: string | number,
  options: { onStatus?: (message: string) => void } = {},
) {
  if (eventId == null || eventId === '') {
    throw new Error('Не удалось определить мероприятие')
  }

  const onStatus = options.onStatus || (() => {})
  const previousFiles = await getEventScienceFiles(eventId)

  onStatus('Запуск бизнес-процесса…')
  const workflowResult = await callApi('bizproc.workflow.start', {
    TEMPLATE_ID: SCIENCE_PROGRAM_TEMPLATE_ID,
    DOCUMENT_ID: buildScienceWorkflowDocumentId(eventId),
  }, null, null, 0, 0)
  const workflowId = Array.isArray(workflowResult) ? workflowResult[0] : workflowResult

  onStatus('Ожидание документа…')
  const startedAt = Date.now()
  let finishedSeenAt: number | null = null
  let latestFiles = previousFiles

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS)
    latestFiles = await getEventScienceFiles(eventId)
    const nextFile = pickNewScienceFile(previousFiles, latestFiles)
    if (nextFile) {
      onStatus('Скачивание документа…')
      await downloadScienceFile(nextFile)
      return nextFile
    }

    const running = await isWorkflowRunning(workflowId ? String(workflowId) : null, eventId)
    if (!running) {
      if (finishedSeenAt == null) finishedSeenAt = Date.now()
      if (Date.now() - finishedSeenAt >= POLL_INTERVAL_MS * 2 && latestFiles.length) {
        const fallback = latestFiles[latestFiles.length - 1]
        onStatus('Скачивание документа…')
        await downloadScienceFile(fallback)
        return fallback
      }
    }
  }

  throw new Error('Документ научной программы не появился. Попробуйте ещё раз через минуту.')
}
