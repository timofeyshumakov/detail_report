import moment from 'moment';

export type DateIsoRange = [string | null, string | null];

export const DEAL_DATE_FIELD = 'UF_CRM_1744096783472';
export const DEAL_DATE_FROM_FILTER = `>=${DEAL_DATE_FIELD}` as const;
export const DEAL_DATE_TO_FILTER = `<=${DEAL_DATE_FIELD}` as const;

export type DealDateFilter = {
  '>UF_CRM_1744096783472': string | null;
  '<UF_CRM_1744096783472': string | null;
};

export type CompanyTableDateFilter = {
  [DEAL_DATE_FROM_FILTER]: string | null;
  [DEAL_DATE_TO_FILTER]: string | null;
};

/** Календарная дата из ISO, как при emit в Date.vue (start: −12ч, end: +12ч). */
export function calendarDateFromFilterIso(iso: string, edge: 'start' | 'end'): string {
  const adjusted = edge === 'start'
    ? moment(iso).add(12, 'hours')
    : moment(iso).subtract(12, 'hours');

  return adjusted.format('YYYY-MM-DD');
}

/** Календарная дата из поля CRM (мероприятие, сделка). */
export function toCalendarDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/[+-]\d{2}:\d{2}$|Z$/i.test(raw)) {
    const parsed = moment.parseZone(raw);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
  }

  if (raw.includes('T')) {
    return raw.split('T')[0];
  }

  const parsed = moment(raw, ['YYYY-MM-DD', 'DD.MM.YYYY'], true);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
}

/** Преобразует ISO-диапазон из фильтра дат в формат YYYY-MM-DD для crm.deal.list */
export function formatDateFilterRange(selectedDateIso: DateIsoRange): [string | null, string | null] {
  const [fromIso, toIso] = selectedDateIso;

  return [
    fromIso ? calendarDateFromFilterIso(fromIso, 'start') : null,
    toIso ? calendarDateFromFilterIso(toIso, 'end') : null,
  ];
}

/** Собирает фильтр по дате передачи (UF_CRM_1744096783472), как в отчёте */
export function buildDealListDateFilter(selectedDateIso: DateIsoRange): DealDateFilter {
  const [from, to] = formatDateFilterRange(selectedDateIso);

  return {
    '>UF_CRM_1744096783472': from,
    '<UF_CRM_1744096783472': to,
  };
}

/** Фильтр даты передачи для таблицы "Компании по категориям" (включительно) */
export function buildCompanyTableDateFilter(selectedDateIso: DateIsoRange): CompanyTableDateFilter {
  const [from, to] = formatDateFilterRange(selectedDateIso);

  return {
    [DEAL_DATE_FROM_FILTER]: from,
    [DEAL_DATE_TO_FILTER]: to,
  };
}

export const EVENT_START_DATE_FIELD = 'ufCrm38_1745307580193';

/** Проверяет, что дата начала мероприятия попадает в диапазон (включительно по дням) */
export function isEventWithinDateRange(
  startDate: string | null | undefined,
  from: string | null,
  to: string | null,
): boolean {
  if (!from && !to) return true;

  const start = toCalendarDate(startDate);
  if (!start) return false;

  if (from && start < from) return false;
  if (to && start > to) return false;

  return true;
}

/** Проверяет, что дата передачи сделки попадает в диапазон (включительно по дням) */
export function isDealWithinDateRange(
  transferDate: string,
  from: string | null,
  to: string | null,
): boolean {
  const date = toCalendarDate(transferDate);
  if (!date) return false;

  if (from && date < from) return false;
  if (to && date > to) return false;

  return true;
}
