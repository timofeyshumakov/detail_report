import { callApi } from './callApi';
import { DEAL_DATE_FIELD, type DealDateFilter } from './dateFilter';

export type BitrixDealListItem = {
  ID: string;
  UF_CRM_1744096783472: string;
};

export type BitrixDealListResponse = {
  result: BitrixDealListItem[];
  total: number;
  next?: number;
};

export async function fetchDealsByDateFilter(
  dateFilter: DealDateFilter,
  options: { start?: number; limit?: number } = {},
): Promise<BitrixDealListResponse> {
  const filter: Record<string, unknown> = {};
  if (dateFilter[`>${DEAL_DATE_FIELD}`]) {
    filter[`>${DEAL_DATE_FIELD}`] = dateFilter[`>${DEAL_DATE_FIELD}`];
  }
  if (dateFilter[`<${DEAL_DATE_FIELD}`]) {
    filter[`<${DEAL_DATE_FIELD}`] = dateFilter[`<${DEAL_DATE_FIELD}`];
  }

  const deals = await callApi('crm.deal.list', filter, ['ID', DEAL_DATE_FIELD], null, 0, 0);
  const result = Array.isArray(deals) ? deals : [];

  return {
    result: result as BitrixDealListItem[],
    total: result.length,
  };
}
