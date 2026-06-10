<template lang="pug">
    .date-fields(v-show="showInput[3] || showInput[2] || showInput[1] || showInput[7]")
      v-autocomplete(
        v-if="showInput[1]"
        :items="monthNames"
        :modelValue="selectedMonth"
        @update:modelValue="updateMonth"
        variant="outlined"
        density="compact"
        single-line
        hide-details
        placeholder="Месяц"
      )
      v-autocomplete(
        v-if="showInput[2]"
        :items="quarterNames"
        :modelValue="selectedQuarter"
        @update:modelValue="updateQuarter"
        variant="outlined"
        density="compact"
        single-line
        hide-details
        placeholder="Квартал"
      )
      v-autocomplete(
        v-if="showInput[7]"
        :items="halfYearNames"
        :modelValue="selectedHalfYear"
        @update:modelValue="updateHalfYear"
        variant="outlined"
        density="compact"
        single-line
        hide-details
        placeholder="Полугодие"
      )
      v-autocomplete(
        v-if="showInput[3] || showInput[2] || showInput[1] || showInput[7]"
        :items="yearNames"
        :modelValue="selectedYear"
        @update:modelValue="updateYear"
        variant="outlined"
        density="compact"
        single-line
        hide-details
        placeholder="Год"
      )
</template>

<script>
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
      monthNames: this.monthNames,
      quarterNames: this.quarterNames,
      halfYearNames: this.halfYearNames,
      yearNames: this.yearNames,
      selectedMonth: this.selectedMonth,
      selectedQuarter: this.selectedQuarter,
      selectedHalfYear: this.selectedHalfYear,
      selectedYear: this.selectedYear,
    };
  },
  methods: {
    updateMonth(value) {
      this.selectedMonth = value;
      this.$emit('update:selectedMonth', value);
    },
    updateQuarter(value) {
      this.selectedQuarter = value;
      this.$emit('update:selectedQuarter', value);
    },
    updateHalfYear(value) {
      this.selectedHalfYear = value;
      this.$emit('update:selectedHalfYear', value);
    },
    updateYear(value) {
      this.selectedYear = value;
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