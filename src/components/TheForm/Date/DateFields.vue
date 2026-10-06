<template lang="pug">
    .date-fields(v-show="showInput[3] || showInput[2] || showInput[1] || showInput[7]")
      v-autocomplete(
        v-if="showInput[1]"
        :items="localMonthNames"
        :modelValue="localSelectedMonth"
        @update:modelValue="updateMonth"
        variant="outlined"
        density="compact"
        single-line
        hide-details
        placeholder="Месяц"
      )
      v-autocomplete(
        v-if="showInput[2]"
        :items="localQuarterNames"
        :modelValue="localSelectedQuarter"
        @update:modelValue="updateQuarter"
        variant="outlined"
        density="compact"
        single-line
        hide-details
        placeholder="Квартал"
      )
      v-autocomplete(
        v-if="showInput[7]"
        :items="localHalfYearNames"
        :modelValue="localSelectedHalfYear"
        @update:modelValue="updateHalfYear"
        variant="outlined"
        density="compact"
        single-line
        hide-details
        placeholder="Полугодие"
      )
      v-autocomplete(
        v-if="showInput[3] || showInput[2] || showInput[1] || showInput[7]"
        :items="localYearNames"
        :modelValue="localSelectedYear"
        @update:modelValue="updateYear"
        variant="outlined"
        density="compact"
        single-line
        hide-details
        placeholder="Год"
      )
</template>

<script lang="ts">
// @ts-nocheck
export default {
  props: {
    showInput: {
      type: Array,
      required: true,
    },
    monthNames: {},
    yearNames: {},
    quarterNames: {},
    halfYearNames: {},
    selectedMonth: {
      type: String,
      required: false,
    },
    selectedQuarter: {
      type: String,
      required: false,
    },
    selectedHalfYear: {
      type: String,
      required: false,
    },
    selectedYear: {
      type: Number,
      required: false,
    },
  },
  data() {
    return {
      localMonthNames: this.monthNames,
      localQuarterNames: this.quarterNames,
      localHalfYearNames: this.halfYearNames,
      localYearNames: this.yearNames,
      localSelectedMonth: this.selectedMonth,
      localSelectedQuarter: this.selectedQuarter,
      localSelectedHalfYear: this.selectedHalfYear,
      localSelectedYear: this.selectedYear,
    };
  },
  methods: {
    updateMonth(value) {
      this.localSelectedMonth = value;
      this.$emit('update:selectedMonth', value);
    },
    updateQuarter(value) {
      this.localSelectedQuarter = value;
      this.$emit('update:selectedQuarter', value);
    },
    updateHalfYear(value) {
      this.localSelectedHalfYear = value;
      this.$emit('update:selectedHalfYear', value);
    },
    updateYear(value) {
      this.localSelectedYear = value;
      this.$emit('update:selectedYear', value);
    },
  },
};
</script>

<style scoped lang="sass">
.date-fields
  display: grid
  gap: 0.75rem
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))
  width: 100%
</style>