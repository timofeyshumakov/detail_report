export async function callApi(method: string, filter: {}, select: string[] | null, entityTypeId: number | null, batchNumber : number, parsed : number) : Promise<any[]> {

    let total : number = 0;
    const maxTotal : number = 50;
    let data : any = [];
    const params: {filter : any; select : string[] | null, entityTypeId : number | null, id : number | null, start : number} = {
      filter: filter ? filter : null,
      select: select ? select : null,
      entityTypeId: entityTypeId ? entityTypeId : null,
      id: method === "crm.dealcategory.stage.list" ? entityTypeId : null,
      start: 0,
    };

    const exceptions: string[] = ["crm.status.list"];

    await new Promise((resolve) => {
      // @ts-ignore
      BX24.callMethod(method, params, (res : any) => {
        if (res.data()) {
          total = res.total();
          data = res.data();
          parsed += total;
          resolve(data);
        }
      });
    });

    if (total > maxTotal && !exceptions.includes(method)) {
      let cmd = {};
      const iterations : number = Math.min(Math.ceil((total - batchNumber * 2500) / maxTotal), 50) ;
      let resultData: any[] = [];
      for (let i : number = 0; i < iterations; i++) {
          const key : string = `cmd${i}`;
          const value = {
            method: method,
            params: {
                        filter: filter || null,
                        select: select || null,
                        entityTypeId: entityTypeId || null,
                        id: method === "crm.dealcategory.stage.list" ? entityTypeId : null,
                        start: (batchNumber * 2500) + i * maxTotal,
            }
          }
          cmd[key] = value;
        if ((i + 1) % maxTotal === 0 || i + 1 === iterations) {
          const batchLength : number = (i + 1) % maxTotal === 0 ? maxTotal : iterations % maxTotal;
        await new Promise((resolve: any) => {
        // @ts-ignore
        BX24.callBatch(cmd, (res : any) => {
          for (let r : number = i - batchLength + 1; r < i + 1; r++) {
            const key : string = `cmd${r}`;
            const data = res[key].data();
            const data2 = data.items ? data.items : data;
            resultData.push(data2);
          }
          resultData = resultData.flat();
          data = resultData;
          cmd = {};
          resolve();
        });
      })
      break;
        }
      }
    }
    return data.items ? data.items : data;
  }