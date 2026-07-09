export const DEFAULT_WEBHOOK_URL = 'https://ittochka.bitrix24.ru/rest/1614/bjwa71vyp7k591al/';

export function getWebhookUrl(override?: string): string {
    const url = override || DEFAULT_WEBHOOK_URL;
    return url.endsWith('/') ? url : `${url}/`;
}

export function isBx24Available(): boolean {
    return typeof globalThis.BX24?.callMethod === 'function';
}

const LIST_STYLE_GET_METHODS = new Set([
    'lists.element.get',
    'user.get',
    'crm.company.contact.items.get',
]);

function isSingleEntityGetMethod(method: string): boolean {
    return method.endsWith('.get') && !LIST_STYLE_GET_METHODS.has(method);
}

function appendWebhookParams(
    searchParams: URLSearchParams,
    value: unknown,
    prefix = '',
): void {
    if (value === null || value === undefined) {
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            appendWebhookParams(searchParams, item, `${prefix}[${index}]`);
        });
        return;
    }

    if (typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
            const nextPrefix = prefix ? `${prefix}[${key}]` : key;
            appendWebhookParams(searchParams, nestedValue, nextPrefix);
        });
        return;
    }

    searchParams.append(prefix, String(value));
}

function paramsToQuery(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();
    appendWebhookParams(searchParams, params);
    return searchParams.toString();
}

type WebhookCallResult = {
    data: any;
    total: number;
    error: string | null;
};

export async function callRestWebhook(
    method: string,
    params: Record<string, unknown> = {},
    webhookUrl?: string,
): Promise<WebhookCallResult> {
    const response = await fetch(`${getWebhookUrl(webhookUrl)}${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        throw new Error(`Bitrix webhook error: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();

    if (payload.error) {
        return {
            data: null,
            total: 0,
            error: payload.error_description || payload.error,
        };
    }

    const data = payload.result;
    const total = payload.total ?? (Array.isArray(data) ? data.length : data ? 1 : 0);

    return {
        data,
        total,
        error: null,
    };
}

type UnifiedMethodResult = {
    data: () => any;
    total: () => number;
    error: () => any;
};

async function callMethodUnified(method: string, params: Record<string, unknown>): Promise<UnifiedMethodResult> {
    if (isBx24Available()) {
        return new Promise((resolve) => {
            globalThis.BX24.callMethod(method, params, (res: any) => resolve(res));
        });
    }

    const result = await callRestWebhook(method, params);
    return {
        data: () => result.data,
        total: () => result.total,
        error: () => result.error,
    };
}

type BatchCommand = { method: string; params: Record<string, unknown> };

async function callBatchUnified(commands: Record<string, BatchCommand>): Promise<Record<string, UnifiedMethodResult>> {
    if (isBx24Available()) {
        return new Promise((resolve) => {
            globalThis.BX24.callBatch(commands, (res: any) => resolve(res));
        });
    }

    const cmd: Record<string, string> = {};
    Object.entries(commands).forEach(([key, command]) => {
        const query = paramsToQuery(command.params);
        cmd[key] = query ? `${command.method}?${query}` : command.method;
    });

    const batchResult = await callRestWebhook('batch', { halt: 0, cmd });
    const results = batchResult.data?.result || batchResult.data || {};

    return Object.fromEntries(
        Object.entries(results).map(([key, value]) => [
            key,
            {
                data: () => value,
                total: () => (Array.isArray(value) ? value.length : value ? 1 : 0),
                error: () => null,
            },
        ]),
    );
}

export async function callApi(method: string, filter: {}, select: string[] | null, entityTypeId: number | null, batchNumber: number = 0, parsed: number): Promise<any[]> {
    let total: number = 0;
    const maxTotal: number = 50;
    let data: any = [];

    if (isSingleEntityGetMethod(method)) {
        const id = (filter && typeof filter === 'object' && 'ID' in filter) 
            ? (filter as any).ID 
            : (entityTypeId || 0);
        
        const result = await callGetMethod(method, id);
        return result;
    }

    // Проверяем, содержит ли filter массив ID
    const filterHasIdArray = filter && typeof filter === 'object' && 'ID' in filter && Array.isArray((filter as any).ID);
    const idArray = filterHasIdArray ? (filter as any).ID : [];
    console.log('response');
    // Если filter содержит массив ID и их больше 50, обрабатываем через batch
    if (filterHasIdArray && idArray.length > maxTotal) {
        console.log(`Обработка ${idArray.length} ID через batch запросы`);
        let resultData: any[] = [];
        const totalBatches = Math.ceil(idArray.length / maxTotal);
        
        // Создаем batch команды
        let batchCommands: any = {};
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startIndex = batchIndex * maxTotal;
            const endIndex = Math.min(startIndex + maxTotal, idArray.length);
            const batchIds = idArray.slice(startIndex, endIndex);
            
            // Создаем новый filter с текущей партией ID
            const batchFilter = {
                ...filter,
                ID: batchIds
            };
            
            let batchParams: any = {};
            
            if (method === "task.elapseditem.getlist") {
                batchParams = {
                    ORDER: { 'TASK_ID': 'desc' },
                    FILTER: batchFilter,
                    SELECT: select || [],
                };
            } else if (method === "lists.element.get") {
                // Параметры для lists.element.get
                batchParams = {
                    IBLOCK_TYPE_ID: 'lists',
                    IBLOCK_ID: entityTypeId,
                    FILTER: batchFilter,
                    SELECT: select || ['ID', 'NAME'],
                };
            } else {
                batchParams = {
                    filter: batchFilter,
                    select: select || null,
                    entityTypeId: entityTypeId || null,
                    id: method === "crm.dealcategory.stage.list" ? entityTypeId : null,
                    start: 0,
                };
            }
            
            const key = `cmd${batchIndex}`;
            batchCommands[key] = {
                method: method,
                params: batchParams
            };
        }
        
        const batchResponse = await callBatchUnified(batchCommands);
        for (let i = 0; i < totalBatches; i++) {
            const key = `cmd${i}`;
            if (batchResponse[key] && !batchResponse[key].error()) {
                const batchData = batchResponse[key].data();
                const processedData = batchData.items ? batchData.items : batchData;
                resultData.push(processedData);
            } else if (batchResponse[key] && batchResponse[key].error()) {
                console.error(`Ошибка в batch команде ${key}:`, batchResponse[key].error());
            }
        }
        data = resultData;
        console.log(data);
        return data.items ? data.items : data;
    }
    
    // Определяем параметры в зависимости от метода
    let params: any = {};

    if (method === "task.elapseditem.getlist" && !Array.isArray(entityTypeId)) {
        // Специфичные параметры для task.elapseditem.getlist
        params = {
            ORDER: { 'TASK_ID': 'desc' },
            FILTER: filter,
            SELECT: select || [],
            start: 0
        };
    } else if (method === "lists.element.get") {
        // Параметры для lists.element.get с пагинацией
        params = {
            IBLOCK_TYPE_ID: 'lists',
            IBLOCK_ID: entityTypeId || 47,
            FILTER: filter || {},
            SELECT: select || ['ID', 'NAME'],
            start: 0,
        };
    } else {
        // Стандартные параметры для других методов
        params = {
            filter: filter ? filter : null,
            select: select ? select : null,
            entityTypeId: entityTypeId ? entityTypeId : null,
            id: method === "crm.dealcategory.stage.list" ? entityTypeId : null,
            start: 0,
        };
    }

    const exceptions: string[] = ["crm.status.list"];
    
    // Обычная обработка для случаев без массива ID или с малым количеством ID
    if (!Array.isArray(entityTypeId)) {
        const response = await callMethodUnified(method, params);
        if (!response.error() && response.data() != null) {
            total = response.total();
            data = response.data();
            parsed += total;
        }
    }

    // Проверяем, нужно ли загружать дополнительные данные через batch
    if ((total > maxTotal && !exceptions.includes(method)) || Array.isArray(entityTypeId)) {
        let cmd = {};
        let iterations: number = Math.ceil(total / maxTotal);
        console.log(iterations);
        // Для lists.element.get вычисляем количество итераций для пагинации
        if (method === "lists.element.get" && total > maxTotal) {
            iterations = Math.min(Math.ceil(total / maxTotal), 50);
        }
        
        if(iterations === 0){
          iterations = entityTypeId?.length || 0;
        }
        
        let resultData: any[] = [];

        for (let i: number = 0; i < iterations; i++) {
            const key: string = `cmd${i}`;

            let batchParams: any = {};
            
            if (method === "task.elapseditem.getlist") {
                batchParams = {
                    ORDER: { 'TASK_ID': 'desc' },
                    FILTER: filter,
                    SELECT: select || [],
                    NAV_PARAMS: {NAV_PARAMS: {
                            "nPageSize": 50,
                            "iNumPage": i + 1,
                        }
                    }
                };
                
                if(entityTypeId && entityTypeId.length > 0){
                    batchParams.TASKID = entityTypeId[i];
                }
            } else if (method === "lists.element.get") {
                // Параметры для lists.element.get в batch с пагинацией через start
                batchParams = {
                    IBLOCK_TYPE_ID: 'lists',
                    IBLOCK_ID: entityTypeId || 47,
                    FILTER: filter || {},
                    SELECT: select || ['ID', 'NAME'],
                    start: i * maxTotal,  // Увеличиваем start для каждой страницы
                };
            } else {
                console.log((batchNumber * 2500) + i * maxTotal, i);
                batchParams = {
                    filter: filter || null,
                    select: select || null,
                    entityTypeId: entityTypeId || null,
                    id: method === "crm.dealcategory.stage.list" ? entityTypeId : null,
                    start: (batchNumber * 2500) + i * maxTotal,
                };
            }

            const value = {
                method: method,
                params: batchParams,
            };
            
            cmd[key] = value;
            
            if ((i + 1) % maxTotal === 0 || i + 1 === iterations) {
                console.log(cmd);
                const batchLength: number = (i + 1) % maxTotal === 0 ? maxTotal : iterations % maxTotal;
                
                const batchResponse = await callBatchUnified(cmd);
                for (let r: number = i - batchLength + 1; r < i + 1; r++) {
                    const key: string = `cmd${r}`;
                    if (batchResponse[key] && !batchResponse[key].error()) {
                        const batchData = batchResponse[key].data();
                        const processedData = batchData.items ? batchData.items : batchData;
                        resultData.push(processedData);
                    } else if (batchResponse[key] && batchResponse[key].error()) {
                        console.error(`Ошибка в batch команде ${key}:`, batchResponse[key].error());
                    }
                }
                if (!Array.isArray(entityTypeId)) {
                    resultData = resultData.flat();
                }

                data = resultData;
                cmd = {};
                batchNumber++;
            }
        }
    }
    
    return data.items ? data.items : data;
}

export async function callGetMethod(method: string, id: number | string): Promise<any> {
    const response = await callMethodUnified(method, { id });
    if (response.error()) {
        console.error(`Ошибка в методе ${method}:`, response.error());
        throw new Error(String(response.error()));
    }
    return response.data();
}

export async function callMethod(
    method: string,
    id: number | string,
    fields: Record<string, unknown>,
    entityTypeId?: number | string,
): Promise<any> {
    const response = await callMethodUnified(method, {
        id,
        fields,
        ...(entityTypeId !== undefined ? { entityTypeId } : {}),
    });
    if (response.error()) {
        console.error(`Ошибка в методе ${method}:`, response.error());
        throw new Error(String(response.error()));
    }
    return response.data();
}

// Пример использования нового метода
export async function getTaskElapsedItems(filter: object = {}, select: string[] = [], taskId: any): Promise<any[]> {
    console.log(filter, select, taskId);
    return callApi('task.elapseditem.getlist', filter, select, taskId, 0, 0);
}

// Новая функция для получения элементов списка с поддержкой полной загрузки
export async function getListElements(
    iblockId: number = 0, 
    filter: object = {}, 
    select: string[] = ['ID', 'NAME']
): Promise<any[]> {
    return callApi('lists.element.get', filter, select, iblockId, 0, 0);
}