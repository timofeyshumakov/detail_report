import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('globalStore', {
  state: () => ({
    courses: [],
    branchInfo: [],
    paymentMethods: [],
  }),
  actions: {
    setGlobalItem(itemName, value) {
        this[itemName] = value;
    },
  }
});

export const useMyStore = defineStore('myStore', {
  state: () => ({
    items: [],
    totalOpportunity: 0,
  }),
  actions: {
    setItemAtIndex(item, index) {
        this.items[index] = item;
    },
    setTotalOpportunity(number){
      this.totalOpportunity = number;
    },
    clearItems(){
      this.items = [];
      this.totalOpportunity = [];
    }
  }
});

export const useParseStore = defineStore('parseStore', {
  state: () => ({
    filter: {},
    select: [],
    parsedBatches: [],
    total: 0,
  }),
  actions: {
    setFilter(key, item) {
        this.filter[key] = item;
    },
    setSelect(array){
      this.select = array;
    },
    addParsedBatches(item){
      this.parsedBatches.push(item);
    },
    deleteParsedBatches(){
      this.parsedBatches = [];
    },
    setTotal(total){
      this.total = total;
    }
  }
});
