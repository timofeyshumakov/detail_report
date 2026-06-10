export async function callApi(method: string, filter: {}, select: string[] | null, entityTypeId: number | null, batchNumber: number = 0, parsed: number): Promise<any[]> {
    let total: number = 0;
    const maxTotal: number = 50;
    let data: any = [];

    if (method.endsWith('.get')) {
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
        
        // Выполняем batch запрос
        await new Promise((resolve) => {
            // @ts-ignore
            BX24.callBatch(batchCommands, (res: any) => {
                for (let i = 0; i < totalBatches; i++) {
                    const key = `cmd${i}`;
                    if (res[key] && !res[key].error()) {
                        const batchData = res[key].data();
                        const processedData = batchData.items ? batchData.items : batchData;
                        resultData.push(processedData);
                    } else if (res[key] && res[key].error()) {
                        console.error(`Ошибка в batch команде ${key}:`, res[key].error());
                    }
                }
                data = resultData;
                resolve(data);
            });
        });
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
    if(!Array.isArray(entityTypeId)){
        await new Promise((resolve) => {
            // @ts-ignore
            BX24.callMethod(method, params, (res: any) => {
                if (res.data()) {
                    total = res.total();
                    data = res.data();
                    parsed += total;
                    resolve(data);
                }
            });
        });
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
                
                await new Promise((resolve: any) => {
                    // @ts-ignore
                    BX24.callBatch(cmd, (res: any) => {
                        for (let r: number = i - batchLength + 1; r < i + 1; r++) {
                            const key: string = `cmd${r}`;
                            if (res[key] && !res[key].error()) {
                                const batchData = res[key].data();
                                const processedData = batchData.items ? batchData.items : batchData;
                                resultData.push(processedData);
                            } else if (res[key] && res[key].error()) {
                                console.error(`Ошибка в batch команде ${key}:`, res[key].error());
                            }
                        }
                        if(!Array.isArray(entityTypeId)){
                            resultData = resultData.flat();
                        }
                        
                        data = resultData;
                        cmd = {};
                        resolve();
                    });
                });
                batchNumber++;
            }
        }
    }
    
    return data.items ? data.items : data;
}

export async function callGetMethod(method: string, id: number | string): Promise<any> {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        BX24.callMethod(method, { id: id }, (res: any) => {
            if (res.error()) {
                console.error(`Ошибка в методе ${method}:`, res.error());
                reject(res.error());
                return;
            }
            
            const data = res.data();
            resolve(data);
        });
    });
}

export async function callMethod(method: string, id: number | string, fields: Record<string, unknown>, entityTypeId: number | string): Promise<any> {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        BX24.callMethod(method, { id: id, fields: fields, ...(entityTypeId !== undefined ? { entityTypeId } : {}) }, (res: any) => {
            if (res.error()) {
                console.error(`Ошибка в методе ${method}:`, res.error());
                reject(res.error());
                return;
            }
            
            const data = res.data();
            resolve(data);
        });
    });
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