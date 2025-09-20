<template lang="pug">
    div.pagination-container
      v-select(
        v-model="itemsPerPage"
        :items="[10, 25, 50]"
        label="Записей на странице"
      )
      v-pagination(
        v-model="page"
        :length="pageCount"
        @update:modelValue="onPageChange"
        v-if="pageCount >= 2"
      )
</template>
  
<script lang="ts">
// Функции
import { callApi } from '../functions/callApi.ts';
import { formatItems } from '../functions/formatItems.ts';
import { useMyStore } from '../stores/store.js'; 
import { useParseStore } from '../stores/store.js'; 
import { useGlobalStore } from '../stores/store'; 

  export default {
    props: {
      pagination: {
        type: Object,
        required: true,
      },
      branchInfo: {},
      paymentMethods: {},
    },
    data(){
      const myStore = useMyStore();
      const parseStore = useParseStore();
      const globalStore = useGlobalStore();
      return{
        myStore,
        parseStore,
        pagination: this.pagination,
        globalStore,
        courses: globalStore.courses,
        totalOpportunity: myStore.totalOpportunity,
        branchInfo: this.branchInfo,
        paymentMethods: this.paymentMethods,
      }
    },
    computed: {
      pageCount(){
        return Math.ceil( this.parseStore.total / this.pagination.itemsPerPage);
      },
      itemsPerPage: {
        get() : number {
          return this.pagination.itemsPerPage;
        },
        set(value : number) : void {
          this.pagination.itemsPerPage = value;
        },
      },
      page: {
        get() : number {
          return this.pagination.page;
        },
        set(value : number) : void {
          this.pagination.page = value;
        },
      },
    },
    methods: {
      async onPageChange(value : number) {
        console.log(this.pagination.page);
          const parsed = this.parseStore.parsed;
          const total = this.parseStore.total;
          const pagesInBatch = (50 * (50 / this.pagination.itemsPerPage));
          const batchNumber = Math.ceil(this.pagination.page / pagesInBatch) - 1;
          const needToParse = this.myStore.items[batchNumber * 2500] ? false : true;
          console.log(needToParse);

         if(parsed < total && needToParse && !this.parseStore.parsedBatches.includes(batchNumber)){
            let invoices;
            [invoices, , this.parseStore.parsed]= await callApi("crm.item.list", this.parseStore.filter, this.parseStore.select, 31, batchNumber, this.parseStore.parsed);
            this.parseStore.addParsedBatches(batchNumber);
            let newFormatedInvoices : {closedate : number | null, paymentMethod : string | null, branch : string | null, opportunity : number}[] = [];
            [newFormatedInvoices, this.totalOpportunity] = formatItems(invoices.items, 'update',this.branchInfo,this.paymentMethods, this.courses,this.totalOpportunity);
            this.myStore.setTotalOpportunity(this.totalOpportunity);
            console.log(newFormatedInvoices);
            for (let i = batchNumber * 2500; i < newFormatedInvoices.length; i++) {
              this.myStore.setItemAtIndex(newFormatedInvoices[i], i);
            }
          }
        this.$emit('update:page', value);
      },
    },
  };
</script>
  
<style scoped>

</style>