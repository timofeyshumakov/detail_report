<template>
    <v-data-table
      :items="myStore.items"
      :headers="headers"
      v-model:page="pagination.page"
      :items-per-page="pagination.itemsPerPage"
    >
      <template v-slot:item.closedate="{ item }">
        {{ formatDate(item.closedate) }}
      </template>
  
      <template v-slot:item.branch="{ item }">
        {{ item.branch ? item.branch : "Не указан" }}
      </template>
  
      <template v-slot:item.paymentMethod="{ item }">
        {{ item.paymentMethod ? item.paymentMethod : "Не указан" }}
      </template>
      <template v-slot:item.opportunity="{ item }">
        {{ formatMoney(item.opportunity) }}
      </template>
      <template v-slot:tfoot>
        <tfoot>
          <tr>
            <td colspan="2" class="tfoot-row">Итого: {{ formatMoney(myStore.totalOpportunity) }}</td>
            <td colspan="2" class="tfoot-row"><v-btn @click="exportToExcel" color="primary">Экспортировать в Excel</v-btn></td>
          </tr>
        </tfoot>
      </template>
    </v-data-table>
  </template>
  
<script lang="ts">
import * as XLSX from "xlsx";
import { useMyStore } from '../stores/store.js'; 

  export default {
    props: {
      pagination: {
        type: Object,
        required: true,
      },
    },
    data(){
      const myStore = useMyStore();
      return {
        myStore,
        headers: [
            { title: "Филиал", value: "branch", sortable: true },
            { title: "Сопособ оплаты", value: "paymentMethod", sortable: true },
            { title: "Сумма", value: "opportunity", sortable: true },
            { title: "Дата закрытия счета", value: "closedate", sortable: true },
        ] as {title : string, value : string, sortable : boolean}[],
        //invoices: this.invoices
      }
    },
    methods: {
        formatDate(dateNumber : number) : Date {
          const date = new Date(dateNumber * 1000);
          // Опции для форматирования даты
          const options = {
            year: "numeric",
            month: "long",
            day: "numeric",
          };
          // @ts-expect-error /sss
          return date.toLocaleDateString("ru-RU", options);
        },
      formatMoney(value : number) {
        return new Intl.NumberFormat("ru-RU", {
          style: "currency",
          currency: "RUB",
        }).format(value);
      },
      exportToExcel() {
        const formatedInvoices = this.invoices.map(item => {
          return {
            "Филиал": item.branch ? item.branch : "Не указан",
            "Сопособ оплаты": item.paymentMethod ? item.paymentMethod : "Не указан",
            "Сумма": item.opportunity,
            "Дата закрытия счета": this.formatDate(item.closedate),
          };
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(formatedInvoices);
        XLSX.utils.book_append_sheet(wb, ws, "Лист 1");
        XLSX.writeFile(wb, "данные.xlsx");
      },
    },
  };
  </script>
  
<style lang="sass">

    .tfoot-row
        text-align: center

    .tfoot__td:not(:first-child)
        text-align: center

    .v-data-table-footer
        display: none

    .table-checkbox
        margin-right: 1.25rem

    .v-data-table
      border: 1px black solid
      border-radius: 0.5rem
</style>