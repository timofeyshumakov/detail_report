import { DEAL_DATE_FIELD, type DealDateFilter } from './dateFilter';

const DEFAULT_WEBHOOK_URL =
  'https://ittochka.bitrix24.ru/rest/1614/bjwa71vyp7k591al/';

export type BitrixDealListItem = {
  ID: string;
  UF_CRM_1744096783472: string;
};

export type BitrixDealListResponse = {
  result: BitrixDealListItem[];
  total: number;
  next?: number;
};

export function getWebhookUrl(override?: string): string {
  const url = override || DEFAULT_WEBHOOK_URL;
  return url.endsWith('/') ? url : `${url}/`;
}

export async function fetchDealsByDateFilter(
  dateFilter: DealDateFilter,
  options: { start?: number; limit?: number; webhookUrl?: string } = {},
): Promise<BitrixDealListResponse> {
  const webhookUrl = options.webhookUrl || getWebhookUrl();
  const params = new URLSearchParams();

  params.set('start', String(options.start ?? 0));
  if (options.limit != null) {
    params.set('limit', String(options.limit));
  }

  params.set('select[0]', 'ID');
  params.set('select[1]', DEAL_DATE_FIELD);
  params.set(`order[${DEAL_DATE_FIELD}]`, 'DESC');

  if (dateFilter[`>${DEAL_DATE_FIELD}`]) {
    params.set(`filter[>${DEAL_DATE_FIELD}]`, dateFilter[`>${DEAL_DATE_FIELD}`]!);
  }
  if (dateFilter[`<${DEAL_DATE_FIELD}`]) {
    params.set(`filter[<${DEAL_DATE_FIELD}]`, dateFilter[`<${DEAL_DATE_FIELD}`]!);
  }

  const response = await fetch(`${webhookUrl}crm.deal.list?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Bitrix webhook error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return {
    result: data.result || [],
    total: data.total ?? 0,
    next: data.next,
  };
}
