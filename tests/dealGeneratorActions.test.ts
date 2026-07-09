// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  callApi,
  callRestWebhook,
  getListElements,
  isBx24Available,
} from '../pages/callApi';

const EVENT_ENTITY_TYPE_ID = 1052;
const AUDIENCE_LIST_ID = 216;
const COMPANY_AUDIENCE_FIELD = 'UF_CRM_1753364407';

type AudienceItem = { ID: string; NAME: string };
type CompanyItem = { ID: string; TITLE: string; UF_CRM_1753364407?: unknown };
type EventItem = { id: number; title?: string };

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRandomSubset<T>(items: T[], maxCount = 3): T[] {
  if (!items.length) return [];
  const count = Math.min(items.length, Math.max(1, Math.floor(Math.random() * maxCount) + 1));
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function loadAudienceOptions(): Promise<AudienceItem[]> {
  const items = await getListElements(AUDIENCE_LIST_ID, {}, ['ID', 'NAME']);
  return Array.isArray(items) ? items : [];
}

async function loadEvents(): Promise<EventItem[]> {
  const response = await callRestWebhook('crm.item.list', {
    entityTypeId: EVENT_ENTITY_TYPE_ID,
    order: { id: 'DESC' },
  });
  const items = response.data?.items || response.data || [];
  return Array.isArray(items) ? items : [];
}

async function loadCompaniesByAudience(audienceIds: string[]): Promise<CompanyItem[]> {
  const companies = await callApi(
    'crm.company.list',
    { [COMPANY_AUDIENCE_FIELD]: audienceIds },
    ['ID', 'TITLE', COMPANY_AUDIENCE_FIELD],
    null,
    0,
    0,
  );
  return Array.isArray(companies) ? companies : [];
}

async function findAudienceWithCompanies(audience: AudienceItem[]): Promise<{
  audience: AudienceItem;
  companies: CompanyItem[];
}> {
  const shuffled = [...audience].sort(() => Math.random() - 0.5);

  for (const item of shuffled.slice(0, Math.min(8, shuffled.length))) {
    const companies = await loadCompaniesByAudience([item.ID]);
    if (companies.length) {
      return { audience: item, companies };
    }
  }

  throw new Error('Не найдена ЦА со спонсорами для интеграционного теста');
}

describe('callApi webhook fallback', () => {
  it('использует webhook, если BX24 недоступен', () => {
    expect(isBx24Available()).toBe(false);
  });

  it('получает список ЦА через webhook', async () => {
    const audience = await loadAudienceOptions();
    expect(audience.length).toBeGreaterThan(0);
    expect(audience[0]).toHaveProperty('ID');
    expect(audience[0]).toHaveProperty('NAME');
  }, 60000);
});

describe('dealGeneratorActions (integration)', () => {
  it('массовая генерация: случайная ЦА возвращает компании-спонсоров', async () => {
    const audience = await loadAudienceOptions();
    expect(audience.length).toBeGreaterThan(0);

    const { audience: randomAudience, companies } = await findAudienceWithCompanies(audience);
    const events = await loadEvents();
    expect(events.length).toBeGreaterThan(0);

    const randomEvent = pickRandom(events);

    expect(randomAudience.ID).toBeTruthy();
    expect(randomEvent.id).toBeTruthy();
    expect(companies.length).toBeGreaterThan(0);
    expect(companies.every((company) => company.ID && company.TITLE)).toBe(true);

    console.info('[mass]', {
      eventId: randomEvent.id,
      eventTitle: randomEvent.title,
      audienceId: randomAudience.ID,
      audienceName: randomAudience.NAME,
      companiesCount: companies.length,
    });
  }, 120000);

  it('точечное добавление: случайный выбор компаний из списка по ЦА', async () => {
    const audience = await loadAudienceOptions();
    const { audience: randomAudience, companies } = await findAudienceWithCompanies(audience);
    const selectedCompanies = pickRandomSubset(companies, 3);
    const events = await loadEvents();
    const randomEvent = pickRandom(events);

    expect(selectedCompanies.length).toBeGreaterThan(0);
    expect(selectedCompanies.length).toBeLessThanOrEqual(companies.length);
    expect(randomEvent.id).toBeTruthy();

    const selectedIds = new Set(selectedCompanies.map((company) => String(company.ID)));
    const restored = companies.filter((company) => selectedIds.has(String(company.ID)));

    expect(restored).toHaveLength(selectedCompanies.length);

    console.info('[manual]', {
      eventId: randomEvent.id,
      eventTitle: randomEvent.title,
      audienceId: randomAudience.ID,
      audienceName: randomAudience.NAME,
      selectedCompanyIds: selectedCompanies.map((company) => company.ID),
      selectedCompanyTitles: selectedCompanies.map((company) => company.TITLE),
    });
  }, 120000);
});
