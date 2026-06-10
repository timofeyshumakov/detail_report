<template lang="pug">
    v-expansion-panels.date-picker-panels(
      v-if="showInput[4] || showInput[5]"
      v-model="panel"
      variant="accordion"
      :class="{ 'date-picker-panels--range': showInput[4], 'date-picker-panels--day': showInput[5] }"
    )
      v-expansion-panel(elevation="0")
        v-expansion-panel-title Выбор даты в календаре
        v-expansion-panel-text.calendars(
          :class="{ 'calendars--range': showInput[4], 'calendars--day': showInput[5] }"
        )
          template(v-if="showInput[4]")
            v-date-picker(
              class="calendar calendar--range"
              color="primary"
              :max="maxDate"
              :min="minDate"
              v-model="selectedRange[0]"
              title="Начальная дата"
              @update:modelValue="updateSelectedRange"
            )
            v-date-picker(
              class="calendar calendar--range"
              color="primary"
              :max="maxDate"
              :min="minDate"
              v-model="selectedRange[1]"
              title="Конечная дата"
              @update:modelValue="updateSelectedRange"
            )
          v-date-picker(
            v-if="showInput[5]"
            class="calendar calendar--day"
            color="primary"
            :max="maxDate"
            :min="minDate"
            v-model="selectedDay"
            title="Выберите день"
            @update:modelValue="updateSelectedDay"
          )
</template>

<script>
export default {
  props: {
    showInput: {
      type: Array,
      required: true,
    },
    maxDate: {
      type: [String, Date],
      required: true,
    },
    minDate: {
      type: [String, Date],
      required: true,
    },
    selectedRange: {
      type: Array,
      required: true,
    },
    selectedDay: {
      type: [String, Date],
      required: true,
    },
  },
  emits: ['update:selectedRange', 'update:selectedDay'],
  data() {
    return {
      selectedDay: this.selectedDay,
      selectedRange: this.selectedRange,
      panel: [0],
    };
  },
  methods: {
    updateSelectedDay(value) {
      this.selectedDay = value;
      this.$emit('update:selectedDay', value);
    },
    updateSelectedRange() {
      this.$emit('update:selectedRange', this.selectedRange);
    },
  },
};
</script>

<style lang="sass" scoped>
.date-picker-panels
  max-width: 100%

.date-picker-panels--range
  width: 100%
  position: relative
  overflow: visible

.date-picker-panels--range :deep(.v-expansion-panel)
  width: 200%
  margin-left: -100%
  border: 1px solid #000000
  border-radius: 12px
  background: #fff

.date-picker-panels--day
  width: 100%

.date-picker-panels--day :deep(.v-expansion-panel)
  border: 1px solid #000000
  border-radius: 12px
  background: #fff

.calendars
  display: grid
  gap: 0.75rem
  width: 100%
  max-width: 100%

.calendars--day
  grid-template-columns: minmax(0, 1fr)

.calendar--range,
.calendar--day
  border: none
  border-radius: 0
  overflow: hidden
  width: 100%
  min-width: 0

:deep(.v-date-picker)
  width: 100%
  max-width: 100%

:deep(.v-date-picker-controls)
  padding: 0.5rem 0.75rem

:deep(.v-date-picker-month)
  min-height: 260px

:deep(.v-date-picker-month__day)
  font-size: 0.9rem

@media (max-width: 760px)
  .date-picker-panels--range :deep(.v-expansion-panel)
    width: 100%
    margin-left: 0

</style>