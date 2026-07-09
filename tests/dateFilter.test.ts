// @vitest-environment node

import { describe, expect, it } from 'vitest';
import moment from 'moment';
import {
  buildCompanyTableDateFilter,
  buildDealListDateFilter,
  DEAL_DATE_FROM_FILTER,
  DEAL_DATE_TO_FILTER,
  formatDateFilterRange,
  isDealWithinDateRange,
  isEventWithinDateRange,
} from '../functions/dateFilter';
import { fetchDealsByDateFilter } from '../functions/bitrixWebhook';

describe('dateFilter (unit)', () => {
  it('возвращает null для «Любая дата»', () => {
    expect(formatDateFilterRange([null, null])).toEqual([null, null]);
    expect(buildDealListDateFilter([null, null])).toEqual({
      '>UF_CRM_1744096783472': null,
      '<UF_CRM_1744096783472': null,
    });
  });

  it('форматирует ISO-диапазон в YYYY-MM-DD (как Date.vue)', () => {
    const from = moment('2026-06-01').startOf('day').add(12, 'hours').subtract(12, 'hours').toISOString();
    const to = moment('2026-06-03').endOf('day').add(12, 'hours').toISOString();

    expect(formatDateFilterRange([from, to])).toEqual(['2026-06-01', '2026-06-03']);
    expect(buildDealListDateFilter([from, to])).toEqual({
      '>UF_CRM_1744096783472': '2026-06-01',
      '<UF_CRM_1744096783472': '2026-06-03',
    });
  });

  it('не сдвигает начало месяца на предыдущий день при фильтре «Месяц»', () => {
    const fromIso = moment('2026-03-01').startOf('month').add(12, 'hours').subtract(12, 'hours').toISOString();
    const toIso = moment('2026-03-01').endOf('month').add(12, 'hours').toISOString();

    expect(formatDateFilterRange([fromIso, toIso])).toEqual(['2026-03-01', '2026-03-31']);
    expect(isEventWithinDateRange('2026-02-28T03:00:00+03:00', '2026-03-01', '2026-03-31')).toBe(false);
    expect(isEventWithinDateRange('2026-03-01T00:00:00+03:00', '2026-03-01', '2026-03-31')).toBe(true);
    expect(isEventWithinDateRange('2026-03-31T23:59:59+03:00', '2026-03-01', '2026-03-31')).toBe(true);
  });

  it('собирает фильтр даты для таблицы "Компании по категориям" включительно', () => {
    const from = moment('2026-06-01').startOf('day').add(12, 'hours').subtract(12, 'hours').toISOString();
    const to = moment('2026-06-03').endOf('day').add(12, 'hours').toISOString();

    expect(buildCompanyTableDateFilter([from, to])).toEqual({
      [DEAL_DATE_FROM_FILTER]: '2026-06-01',
      [DEAL_DATE_TO_FILTER]: '2026-06-03',
    });
  });

  it('собирает пустой фильтр даты для таблицы "Компании по категориям" при "Любая дата"', () => {
    expect(buildCompanyTableDateFilter([null, null])).toEqual({
      [DEAL_DATE_FROM_FILTER]: null,
      [DEAL_DATE_TO_FILTER]: null,
    });
  });

  it('проверяет попадание даты сделки в диапазон', () => {
    expect(isDealWithinDateRange('2026-06-02T16:32:38+03:00', '2026-06-01', '2026-06-03')).toBe(true);
    expect(isDealWithinDateRange('2026-05-20T14:57:38+03:00', '2026-06-01', '2026-06-03')).toBe(false);
    expect(isDealWithinDateRange('2026-06-08T15:16:01+03:00', null, null)).toBe(true);
  });

  it('проверяет попадание даты начала мероприятия в диапазон', () => {
    expect(isEventWithinDateRange('2026-06-02T10:00:00+03:00', '2026-06-01', '2026-06-03')).toBe(true);
    expect(isEventWithinDateRange('2026-05-20T10:00:00+03:00', '2026-06-01', '2026-06-03')).toBe(false);
    expect(isEventWithinDateRange(null, '2026-06-01', '2026-06-03')).toBe(false);
    expect(isEventWithinDateRange('2026-06-02T10:00:00+03:00', null, null)).toBe(true);
  });
});

describe('dateFilter (integration, Bitrix webhook)', () => {
  it('узкий диапазон возвращает меньше сделок, чем широкий', async () => {
    const wideFilter = buildDealListDateFilter([
      moment('2026-01-01').toISOString(),
      moment('2026-06-10').toISOString(),
    ]);
    const narrowFilter = buildDealListDateFilter([
      moment('2026-06-01').startOf('day').toISOString(),
      moment('2026-06-03').endOf('day').toISOString(),
    ]);

    const wide = await fetchDealsByDateFilter(wideFilter, { limit: 50 });
    const narrow = await fetchDealsByDateFilter(narrowFilter, { limit: 50 });

    expect(wide.total).toBeGreaterThan(0);
    expect(narrow.total).toBeGreaterThan(0);
    expect(narrow.total).toBeLessThan(wide.total);
  }, 30_000);

  it('все сделки из узкого диапазона попадают в выбранные даты', async () => {
    const from = '2026-06-01';
    const to = '2026-06-03';
    const filter = buildDealListDateFilter([
      moment(from).startOf('day').toISOString(),
      moment(to).endOf('day').toISOString(),
    ]);

    const { result, total } = await fetchDealsByDateFilter(filter, { limit: 50 });

    expect(total).toBeGreaterThan(0);
    expect(result.length).toBeGreaterThan(0);

    for (const deal of result) {
      expect(isDealWithinDateRange(deal.UF_CRM_1744096783472, from, to)).toBe(true);
    }
  }, 30_000);

  it('за пределами диапазона сделок нет', async () => {
    const filter = buildDealListDateFilter([
      moment('2099-01-01').startOf('day').toISOString(),
      moment('2099-01-02').endOf('day').toISOString(),
    ]);

    const { result, total } = await fetchDealsByDateFilter(filter, { limit: 50 });

    expect(total).toBe(0);
    expect(result).toEqual([]);
  }, 30_000);
});
