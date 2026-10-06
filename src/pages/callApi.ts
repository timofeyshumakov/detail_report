export const SERVER_HANDLER_URL = 'https://master.rymar-consulting.ru/request/handler.php';

export function getServerHandlerUrl(override?: string): string {
    const url = override || SERVER_HANDLER_URL;
    return url.endsWith('/') ? url : `${url}/`;
}

/** Проверяем что работаем внутри Bitrix24 */
function isInsideBitrix24(): boolean {
    return typeof (window as any).BX24 !== 'undefined';
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

/**
 * Полная выгрузка list-метода: первый запрос узнаёт total,
 * остальные страницы (start = 50, 100, ...) забираются batch-ами по 50 команд
 * (до 2500 записей за один HTTP-запрос).
 */
async function callListWithBatchPagination(
    method: string,
    params: Record<string, unknown>,
): Promise<any[]> {
    const first = await callBxRaw(method, { ...params, start: 0 });
    const allItems: any[] = [...extractListItems(first.raw)];
    const total = first.total;

    if (allItems.length < BX_PAGE_SIZE || total <= allItems.length) {
        return allItems;
    }

    const starts: number[] = [];
    for (let start = BX_PAGE_SIZE; start < total; start += BX_PAGE_SIZE) {
        starts.push(start);
    }

    for (let i = 0; i < starts.length; i += BX_BATCH_LIMIT) {
        const chunk = starts.slice(i, i + BX_BATCH_LIMIT);
        const commands: Record<string, BxCommand> = {};
        chunk.forEach((start) => {
            commands[`page_${start}`] = { method, params: { ...params, start } };
        });

        const batchResult = await callBitrixBatch(commands);

        for (const start of chunk) {
            const res = batchResult[`page_${start}`];
            const err = res?.error?.();
            if (err) {
                throw new Error(`${method} (start=${start}): ${formatBxError(err)}`);
            }
            allItems.push(...extractListItems(res?.data?.()));
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
    // Фильтр «ни одного ID» означает пустой результат.
    if (filter && typeof filter === 'object') {
        const idFilter = (filter as any).ID ?? (filter as any).id;
        if (('ID' in filter || 'id' in filter) && (idFilter == null || idFilter === '' || (Array.isArray(idFilter) && idFilter.length === 0))) {
            return [];
        }
    }

    // Для list-методов CRM используем прямой вызов BX24 (batch-пагинация)
    if (method === 'crm.deal.list' || method === 'crm.item.list' || method === 'crm.contact.list') {
        if (!isInsideBitrix24()) {
            // Fallback на серверный handler если не в Bitrix24
            return callViaServerHandler(method, filter, select, entityTypeId, batchNumber, parsed);
        }

        try {
            // Стабильная сортировка обязательна для пагинации через start,
            // иначе страницы могут пересекаться/терять записи
            const params: Record<string, unknown> = method === 'crm.item.list'
                ? { entityTypeId: Number(entityTypeId), order: { id: 'ASC' } }
                : { order: { ID: 'ASC' } };

            if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
                params.filter = filter;
            }
            // select: null не передаём — Bitrix вернёт поля по умолчанию
            if (Array.isArray(select) && select.length > 0) {
                params.select = select;
            }

            return await callListWithBatchPagination(method, params);
        } catch (error) {
            console.error(`callApi error for ${method}:`, error);
            return [];
        }
    }

    // Для остальных методов — серверный handler
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
            chunk.forEach((cmd, index) => {
                const raw = batchResult[`cmd${i + index}`];
                const err = raw?.error?.();
                if (!raw || err) {
                    console.error(`Batch command error for ${cmd.method}:`, err ? formatBxError(err) : 'no result');
                    results.push(null);
                    return;
                }
                results.push(raw.data());
            });
        } catch (error) {
            console.error('Batch error:', error);
            chunk.forEach(() => results.push(null));
        }
    }

    return results;
}
