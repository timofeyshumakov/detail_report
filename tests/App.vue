<template lang="pug">
    Home
</template>

<script lang="ts">
// Документация
/*
* ufCrm_SMART_INVOICE_1729670614381 Филиал
* ufCrm_SMART_INVOICE_1730028921271 Способ оплаты
* //@ts-ignore прописывается в 2 случаях: 
* 1) при использовании BX24 т.к. ts не понимет, что это
* 2) при импорте т.к. ts может тупить на некотоых импортах
*/

// Компоненты
//@ts-ignore
import Home from './pages/Home.vue';

export default {
  components: { Home }
}
</script>
