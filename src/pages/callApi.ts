export const SERVER_HANDLER_URL = 'https://master.rymar-consulting.ru/request/handler.php';

export function getServerHandlerUrl(override?: string): string {
    const url = override || SERVER_HANDLER_URL;
    return url.endsWith('/') ? url : `${url}/`;
}

/** Проверяем что работаем внутри Bitrix24 */
function isInsideBitrix24(): boolean {
    return typeof (window as any).BX24 !== 'undefined';
}

export type Bx24UserAuth = {
    domain: string;
    access_token: string;
};

/**
 * Auth текущего пользователя BX24 (для серверных вызовов от имени пользователя).
 */
export function getBx24Auth(): Bx24UserAuth {
    if (!isInsideBitrix24()) {
        throw new Error('Приложение должно быть открыто в Bitrix24');
    }

    const auth = (window as any).BX24?.getAuth?.();
    const domain = String(auth?.domain || '').replace(/^https?:\/\//i, '').replace(/\/$/, '').trim();
    const accessToken = String(auth?.access_token || '').trim();

    if (!domain || !accessToken) {
        throw new Error('Не удалось получить auth текущего пользователя Bitrix24');
    }

    return {
        domain,
        access_token: accessToken,
    };
}

/** ID текущего пользователя BX24 */
export async function getCurrentBxUserId(): Promise<string> {
    const user = await callBxMethod('user.current', {});
    const id = user?.ID ?? user?.id;
    if (id == null || id === '') {
        throw new Error('Не удалось определить текущего пользователя');
    }
    return String(id);
}

/** ФИО текущего пользователя BX24 */
export async function getCurrentBxUserName(): Promise<string> {
    try {
        const user = await callBxMethod('user.current', {});
        return [user?.LAST_NAME, user?.NAME, user?.SECOND_NAME]
            .map((part) => String(part || '').trim())
            .filter(Boolean)
            .join(' ')
            .trim();
    } catch {
        return '';
    }
}

/**
 * Низкоуровневый вызов BX24.callMethod: { raw: res.data(), total }
 */
async function callBxRaw(method: string, params: Record<string, unknown> = {}): Promise<{ raw: any; total: number }> {
    if (!isInsideBitrix24()) {
        // Fallback на серверный handler
        const response = await fetch(getServerHandlerUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method, params }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        const raw = data.data ?? data;
        const total = Number(data.total);
        return { raw, total: Number.isFinite(total) ? total : extractListItems(raw).length };
    }
    return new Promise((resolve, reject) => {
        // @ts-ignore
        (window as any).BX24.callMethod(method, params, (res: any) => {
            if (res.error()) {
                reject(new Error(formatBxError(res.error())));
            } else {
                const total = Number(res.total());
                resolve({ raw: res.data(), total: Number.isFinite(total) ? total : 0 });
            }
        });
    });
}

/**
 * Вызов метода Bitrix24. Возвращает res.data() как есть:
 * объект для *.get (crm.company.get), массив для *.items.get и т.д.
 */
export async function callBxMethod(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const { raw } = await callBxRaw(method, params);
    return raw;
}

/** Размер страницы list-методов Bitrix24 */
const BX_PAGE_SIZE = 50;
/** Максимум команд в одном batch-запросе Bitrix24 */
const BX_BATCH_LIMIT = 50;
/**
 * Сколько list-страниц класть в один BX24.callBatch.
 * 50 crm.deal.list в одном batch часто упирается в operation time limit.
 */
const BX_LIST_BATCH_PAGES = 5;

type BxCommand = { method: string; params: Record<string, unknown> };

function extractListItems(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
}

/** Текст ошибки из ajaxError BX24 / ответа REST */
function formatBxError(err: any): string {
    return String(
        err?.ex?.error_description
        || err?.error_description
        || err?.ex?.error
        || err?.message
        || err
        || 'Unknown error',
    );
}

/**
 * Вызов BX24.callBatch с промисификацией.
 * Колбэк получает объект { key: ajaxResult } — ошибки проверяются по каждой команде отдельно.
 */
function callBitrixBatch(commands: Record<string, BxCommand>): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
        try {
            // @ts-ignore
            (window as any).BX24.callBatch(commands, (res: any) => resolve(res || {}));
        } catch (error) {
            reject(error);
        }
    });
}

/** Поля-массивы в filter, которые нужно резать на чанки по 50 и слать batch-ом */
const LIST_FILTER_ARRAY_KEYS = ['ID', 'id', 'parentId2', 'PARENT_ID_2'] as const;

function findListFilterArray(
    filter: Record<string, unknown> | null | undefined,
): { key: string; values: unknown[] } | null {
    if (!filter || typeof filter !== 'object') return null;
    for (const key of LIST_FILTER_ARRAY_KEYS) {
        if (!(key in filter)) continue;
        const value = filter[key];
        if (Array.isArray(value)) {
            return { key, values: value };
        }
        // Одиночный ID — не batch
        if (value != null && value !== '') {
            return null;
        }
        // Явно пустой ID/id
        if (key === 'ID' || key === 'id') {
            return { key, values: [] };
        }
    }
    return null;
}

function buildListMethodParams(
    method: string,
    filter: Record<string, unknown> | null | undefined,
    select: string[] | null,
    entityTypeId: number | number[] | string[] | null,
): Record<string, unknown> {
    const params: Record<string, unknown> = method === 'crm.item.list'
        ? { entityTypeId: Number(entityTypeId), order: { id: 'ASC' } }
        : { order: { ID: 'ASC' } };

    if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
        params.filter = filter;
    }
    if (Array.isArray(select) && select.length > 0) {
        params.select = select;
    }
    return params;
}

/**
 * Читает data() из ajax-результата batch-команды; при ошибке — null.
 */
function readBatchCommandData(res: any): any | null {
    if (!res) return null;
    const err = res.error?.();
    if (err) {
        console.error('Batch command error:', formatBxError(err));
        return null;
    }
    return typeof res.data === 'function' ? res.data() : res;
}

/**
 * Несколько list-команд одним (или несколькими) BX24.callBatch.
 * commands: карта key → { method, params }
 */
async function runListCommandsBatch(
    commands: Record<string, BxCommand>,
): Promise<any[]> {
    const keys = Object.keys(commands);
    if (!keys.length) return [];

    const allItems: any[] = [];

    for (let i = 0; i < keys.length; i += BX_BATCH_LIMIT) {
        const keyChunk = keys.slice(i, i + BX_BATCH_LIMIT);
        const batchCommands: Record<string, BxCommand> = {};
        keyChunk.forEach((key) => {
            batchCommands[key] = commands[key];
        });

        const batchResult = await callBitrixBatch(batchCommands);

        for (const key of keyChunk) {
            const data = readBatchCommandData(batchResult[key]);
            if (data == null) continue;
            allItems.push(...extractListItems(data));
        }
    }

    return allItems;
}

/**
 * filter с массивом ID/parentId2 > 50: режем на чанки по 50 и забираем через batch.
 * Один chunk = один list (до 50 записей), до 50 chunk-ов в одном HTTP batch.
 */
async function callListByFilterArrayBatches(
    method: string,
    filter: Record<string, unknown>,
    select: string[] | null,
    entityTypeId: number | number[] | string[] | null,
    arrayKey: string,
    values: unknown[],
): Promise<any[]> {
    const uniqueValues = [...new Set(values.map((v) => String(v)).filter((v) => v !== ''))];
    if (!uniqueValues.length) return [];

    const commands: Record<string, BxCommand> = {};
    for (let i = 0; i < uniqueValues.length; i += BX_PAGE_SIZE) {
        const chunkIds = uniqueValues.slice(i, i + BX_PAGE_SIZE);
        const chunkFilter = { ...filter, [arrayKey]: chunkIds };
        commands[`list_${i}`] = {
            method,
            params: {
                ...buildListMethodParams(method, chunkFilter, select, entityTypeId),
                start: 0,
            },
        };
    }

    return runListCommandsBatch(commands);
}

/**
 * Полная выгрузка list-метода:
 * - если страниц больше одной — ВСЕ страницы (включая 0) одним/несколькими batch;
 * - total берём из result_total первой команды batch, либо из длины.
 */
async function callListWithBatchPagination(
    method: string,
    params: Record<string, unknown>,
): Promise<any[]> {
    // Сначала одна лёгкая страница, чтобы узнать total (без неё batch наугад не построить)
    const first = await callBxRaw(method, { ...params, start: 0 });
    const firstItems = extractListItems(first.raw);
    const total = first.total;

    if (firstItems.length < BX_PAGE_SIZE || total <= firstItems.length) {
        return firstItems;
    }

    // Остальные страницы — batch-ами (страница 0 уже есть)
    const allItems: any[] = [...firstItems];
    const starts: number[] = [];
    for (let start = BX_PAGE_SIZE; start < total; start += BX_PAGE_SIZE) {
        starts.push(start);
    }

    for (let i = 0; i < starts.length; i += BX_LIST_BATCH_PAGES) {
        const chunk = starts.slice(i, i + BX_LIST_BATCH_PAGES);
        const commands: Record<string, BxCommand> = {};
        chunk.forEach((start) => {
            commands[`page_${start}`] = { method, params: { ...params, start } };
        });

        const batchResult = await callBitrixBatch(commands);

        for (const start of chunk) {
            let pageItems: any[] = [];
            const data = readBatchCommandData(batchResult[`page_${start}`]);
            if (data != null) {
                pageItems = extractListItems(data);
            } else {
                const page = await callBxRaw(method, { ...params, start });
                pageItems = extractListItems(page.raw);
            }

            if (!pageItems.length) {
                return allItems;
            }
            allItems.push(...pageItems);
            if (pageItems.length < BX_PAGE_SIZE) {
                return allItems;
            }
        }
    }

    return allItems;
}

export async function callApi(
    method: string,
    filter: {},
    select: string[] | null,
    entityTypeId: number | number[] | string[] | null,
    batchNumber: number = 0,
    parsed: number = 0,
): Promise<any[]> {
    // Пустой список ID при сериализации выпадает из запроса, и Bitrix вернёт ВСЕ записи.
    if (filter && typeof filter === 'object') {
        const idFilter = (filter as any).ID ?? (filter as any).id;
        if (('ID' in filter || 'id' in filter) && (idFilter == null || idFilter === '' || (Array.isArray(idFilter) && idFilter.length === 0))) {
            return [];
        }
    }

    // Для list-методов CRM — BX24 + batch
    if (method === 'crm.deal.list' || method === 'crm.item.list' || method === 'crm.contact.list') {
        if (!isInsideBitrix24()) {
            return callViaServerHandler(method, filter, select, entityTypeId, batchNumber, parsed);
        }

        try {
            const filterObj = (filter && typeof filter === 'object')
                ? filter as Record<string, unknown>
                : {};
            const arrayFilter = findListFilterArray(filterObj);

            // Пустой массив в filter (ID/parentId2) — нечего грузить (иначе Bitrix вернёт всё)
            if (arrayFilter && arrayFilter.values.length === 0) {
                return [];
            }

            // Массив ID/parentId2 — режем на чанки по 50 и забираем batch-ом
            if (arrayFilter && arrayFilter.values.length > 0) {
                return await callListByFilterArrayBatches(
                    method,
                    filterObj,
                    select,
                    entityTypeId,
                    arrayFilter.key,
                    arrayFilter.values,
                );
            }

            const params = buildListMethodParams(method, filterObj, select, entityTypeId);
            return await callListWithBatchPagination(method, params);
        } catch (error) {
            console.error(`callApi error for ${method}:`, error);
            return [];
        }
    }

    return callViaServerHandler(method, filter, select, entityTypeId, batchNumber, parsed);
}

/** Fallback: вызов через серверный handler */
async function callViaServerHandler(
    method: string,
    filter: {},
    select: string[] | null,
    entityTypeId: number | number[] | string[] | null,
    _batchNumber: number = 0,
    _parsed: number = 0,
): Promise<any[]> {
    const params: Record<string, unknown> = {
        method,
    };

    // Для crm.deal.list и crm.contact/list передаём параметры в обёртке filters
    if (method === 'crm.deal.list' || method === 'crm.contact.list') {
        if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
            params.filters = filter;
        }
    } else {
        // Для остальных методов передаём параметры напрямую
        if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
            Object.assign(params, filter);
        }
    }

    if (select != null) {
        params.select = select;
    }

    // entityTypeId для динамических полей
    if (entityTypeId != null) {
        params.entityTypeId = entityTypeId;
    }

    // Специальные параметры для разных методов
    if (method === 'lists.element.get') {
        if (entityTypeId != null) {
            params.IBLOCK_CODE = entityTypeId;
        }
        params.IBLOCK_TYPE_ID = 'lists';
    }

    if (method === 'user.get') {
        params.FILTER = filter || {};
    }

    try {
        const response = await fetch(getServerHandlerUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            throw new Error(`Server handler error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        const result = data.data;
        if (Array.isArray(result)) {
            return result;
        }
        if (result && typeof result === 'object') {
            if (Array.isArray(result.data)) {
                return result.data;
            }
            return Object.values(result);
        }
        return [];
    } catch (error) {
        console.error(`callApi error for ${method}:`, error);
        return [];
    }
}

// Получение элементов списка с поддержкой полной загрузки
export async function getListElements(
    iblockId: number = 0,
    filter: object = {},
    select: string[] = ['ID', 'NAME']
): Promise<any[]> {
    return callApi('lists.element.get', filter, select, iblockId, 0, 0);
}

/**
 * BX24.callBatch: карта key → { method, params }.
 * Возвращает key → data() (или null при ошибке).
 */
export async function callBatch(
    commands: Record<string, { method: string; params?: Record<string, unknown> }>,
): Promise<Record<string, any>> {
    if (!isInsideBitrix24() || !commands || Object.keys(commands).length === 0) {
        return {};
    }

    const result: Record<string, any> = {};
    const entries = Object.entries(commands);

    for (let i = 0; i < entries.length; i += BX_BATCH_LIMIT) {
        const chunk = entries.slice(i, i + BX_BATCH_LIMIT);
        const batchCommands: Record<string, BxCommand> = {};
        chunk.forEach(([key, cmd]) => {
            batchCommands[key] = {
                method: cmd.method,
                params: cmd.params || {},
            };
        });

        try {
            const batchResult = await callBitrixBatch(batchCommands);
            chunk.forEach(([key]) => {
                result[key] = readBatchCommandData(batchResult[key]);
            });
        } catch (error) {
            console.error('Batch error:', error);
            chunk.forEach(([key]) => {
                result[key] = null;
            });
        }
    }

    return result;
}

// Выполнение batch-запросов через BX24.
// Возвращает массив той же длины и в том же порядке, что commands:
// results[i] — data() i-й команды, либо null при ошибке.
export async function callBatchCommands(
    commands: Array<{ method: string; params?: Record<string, unknown> }>,
    maxBatchSize: number = BX_BATCH_LIMIT,
): Promise<any[]> {
    if (!isInsideBitrix24() || commands.length === 0) {
        return [];
    }

    const results: any[] = [];
    const batchSize = Math.max(1, Math.min(maxBatchSize, BX_BATCH_LIMIT));

    for (let i = 0; i < commands.length; i += batchSize) {
        const chunk = commands.slice(i, i + batchSize);
        const batchCommands: Record<string, BxCommand> = {};

        chunk.forEach((cmd, index) => {
            batchCommands[`cmd${i + index}`] = {
                method: cmd.method,
                params: cmd.params || {},
            };
        });

        try {
            const batchResult = await callBitrixBatch(batchCommands);
            chunk.forEach((_cmd, index) => {
                results.push(readBatchCommandData(batchResult[`cmd${i + index}`]));
            });
        } catch (error) {
            console.error('Batch error:', error);
            chunk.forEach(() => results.push(null));
        }
    }

    return results;
}
