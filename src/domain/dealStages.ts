export type StageOption = {
  value: string
  label: string
  isRefusal?: boolean
}

export const DEAL_STAGE_OPTIONS: StageOption[] = [
  { value: 'C32:NEW', label: 'База' },
  { value: 'C32:PREPARATION', label: 'Рассылка' },
  { value: 'C32:UC_GKSSJ3', label: 'Обзвон' },
  { value: 'C32:UC_HPGIL5', label: 'Нет ответа' },
  { value: 'C32:UC_LXYCFO', label: 'Потенциал - холодный' },
  { value: 'C32:UC_VJZ0FL', label: 'Потенциал - теплый' },
  { value: 'C32:UC_6VDO9F', label: 'Договоренности - холодные' },
  { value: 'C32:UC_5BBXZ5', label: 'Договоренности - теплые' },
  { value: 'C32:UC_R5DX1H', label: 'Передано' },
  { value: 'C32:WON', label: 'Мероприятие завершено' },
  { value: 'C32:LOSE', label: 'Сделка провалена' },
  { value: 'C32:APOLOGY', label: 'Нет денег' },
  { value: 'C32:1', label: 'Не заложили в бюджет' },
  { value: 'C32:2', label: 'Не продвигается препарат в данном направлении' },
  { value: 'C32:3', label: 'Не подались в РЗН' },
  { value: 'C32:4', label: 'Не работаем с клиентом' },
  { value: 'C32:5', label: 'Урезали бюджет' },
  { value: 'C32:7', label: 'Не успели согласовать документы' },
  { value: 'C32:8', label: 'Не проходит площадка проведения' },
  { value: 'C32:9', label: 'Плохой опыт участия в данном проекте (явка)' },
  { value: 'C32:6', label: 'Другое' },
]

export const REFUSAL_STAGE_OPTIONS: StageOption[] = [
  { value: 'C32:LOSE', label: 'Сделка провалена' },
  { value: 'C32:APOLOGY', label: 'Нет денег' },
  { value: 'C32:1', label: 'Не заложили в бюджет' },
  { value: 'C32:2', label: 'Не продвигается препарат в данном направлении' },
  { value: 'C32:3', label: 'Не подались в РЗН' },
  { value: 'C32:4', label: 'Не работаем с клиентом' },
  { value: 'C32:5', label: 'Урезали бюджет' },
  { value: 'C32:7', label: 'Не успели согласовать документы' },
  { value: 'C32:8', label: 'Не проходит площадка проведения' },
  { value: 'C32:9', label: 'Плохой опыт участия в данном проекте (явка)' },
  { value: 'C32:6', label: 'Другое' },
]

/** Полоса стадий: успешные + один сегмент «Отказ» */
export const STAGE_BAR_SEGMENTS: StageOption[] = [
  { value: 'C32:NEW', label: 'База' },
  { value: 'C32:PREPARATION', label: 'Рассылка' },
  { value: 'C32:UC_GKSSJ3', label: 'Обзвон' },
  { value: 'C32:UC_HPGIL5', label: 'Нет ответа' },
  { value: 'C32:UC_LXYCFO', label: 'Потенциал - холодный' },
  { value: 'C32:UC_VJZ0FL', label: 'Потенциал - теплый' },
  { value: 'C32:UC_6VDO9F', label: 'Договоренности - холодные' },
  { value: 'C32:UC_5BBXZ5', label: 'Договоренности - теплые' },
  { value: 'C32:UC_R5DX1H', label: 'Передано' },
  { value: 'C32:WON', label: 'Мероприятие завершено' },
  { value: '__REFUSAL__', label: 'Отказ', isRefusal: true },
]

export const BASE_STAGES = ['C32:NEW'] as const
export const MAILING_STAGES = ['C32:PREPARATION'] as const
export const CALL_STAGES = ['C32:UC_GKSSJ3', 'C32:UC_HPGIL5'] as const
export const POTENTIAL_STAGES = ['C32:UC_LXYCFO', 'C32:UC_VJZ0FL'] as const
export const AGREEMENT_STAGES = ['C32:UC_6VDO9F', 'C32:UC_5BBXZ5'] as const
export const TRANSFERRED_STAGES = ['C32:UC_R5DX1H'] as const
export const SUCCESS_STAGES = ['C32:UC_R5DX1H', 'C32:WON'] as const
export const REFUSAL_STAGES = REFUSAL_STAGE_OPTIONS.map((option) => option.value)

export const PRELIMINARY_SUM_FIELD = 'UF_CRM_1742971372921'
export const PARTICIPATION_STATUS_FIELD = 'UF_CRM_1745995594'
export const FINAL_SUM_FIELD = 'UF_CRM_1759821112055'
export const SQM_FIELD = 'UF_CRM_1744096312349'
export const TRUSTED_PERSON_FIELD = 'UF_CRM_1756807710'

/** Стадии: Потенциал холодный → Договоренности теплые */
export const PRELIMINARY_SUM_REQUIRED_STAGES = [
  'C32:UC_LXYCFO',
  'C32:UC_VJZ0FL',
  'C32:UC_6VDO9F',
  'C32:UC_5BBXZ5',
] as const

/** Стадии: Договоренность холодная → Передано */
export const STATUS_AND_SQM_REQUIRED_STAGES = [
  'C32:UC_6VDO9F',
  'C32:UC_5BBXZ5',
  'C32:UC_R5DX1H',
] as const

export const TRANSFERRED_STAGE_ID = 'C32:UC_R5DX1H'

export function getStageOption(stageId: string | null | undefined): StageOption | undefined {
  if (stageId == null || stageId === '') return undefined
  return DEAL_STAGE_OPTIONS.find((option) => option.value === stageId)
}

/**
 * Явная карта обязательных полей по стадии (не card-config Bitrix).
 */
export function getRequiredFieldNamesForStage(stageId: string): string[] {
  const names: string[] = []
  if ((PRELIMINARY_SUM_REQUIRED_STAGES as readonly string[]).includes(stageId)) {
    names.push(PRELIMINARY_SUM_FIELD)
  }
  if ((STATUS_AND_SQM_REQUIRED_STAGES as readonly string[]).includes(stageId)) {
    names.push(PARTICIPATION_STATUS_FIELD)
    names.push(SQM_FIELD)
  }
  if (stageId === TRANSFERRED_STAGE_ID) {
    names.push(FINAL_SUM_FIELD)
    names.push(TRUSTED_PERSON_FIELD)
  }
  return names
}

export function isRefusalStage(stageId: string | null | undefined): boolean {
  if (stageId == null || stageId === '') return false
  return REFUSAL_STAGES.includes(String(stageId))
}
