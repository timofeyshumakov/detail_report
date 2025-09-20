<template lang="pug">
    .date-fields( :style="{ display: showInput[3] || showInput[2] || showInput[1] || showInput[4] || showInput[5] ? 'grid' : 'none' }")
      v-autocomplete(
        v-if="showInput[1]"
        :items="monthNames"
        :modelValue="selectedMonth"
        @update:modelValue="updateMonth"
      )
      v-autocomplete(
        v-if="showInput[2]"
        :items="quarterNames"
        :modelValue="selectedQuarter"
        @update:modelValue="updateQuarter"
      )
      v-autocomplete(
        v-if="showInput[3] || showInput[2] || showInput[1]"
        :items="yearNames"
        :modelValue="selectedYear"
        @update:modelValue="updateYear"
      )
</template>
  
<script>

  export default {
    props: {
      showInput: {
        type: Array,
        required: true,
      },
      monthNames:{},
      yearNames:{},
      quarterNames:{},
      selectedMonth: {
        type: String,
        required: false,
      },
      selectedQuarter: {
        type: String,
        required: false,
      },
      selectedYear: {
        type: Number,
        required: false,
      },
    },
    data(){
        return {
            monthNames: this.monthNames,
            quarterNames: this.quarterNames,
            yearNames: this.yearNames,
            selectedMonth: this.selectedMonth,
            selectedQuarter: this.selectedQuarter,
            selectedYear: this.selectedYear,
        }
    },
    methods: {
      updateMonth(value){
        this.selectedMonth = value;
        this.$emit('update:selectedMonth', value);
      },
      updateQuarter(value){
        this.selectedQuarter = value;
        this.$emit('update:selectedQuarter', value);
      },
      updateYear(value){
        this.selectedYear = value;
        this.$emit('update:selectedYear', value);
      }
    },
  };
  </script>
  
<style scoped lang="sass">

  .date-fields
    display: grid
    gap: 1rem
    grid-template-columns: repeat(2, 1fr)

</style>