<template lang="pug">
    v-expansion-panels(v-if="showInput[4] || showInput[5]" v-model="panel[0]" :style="{width: 'calc(200% + 1rem)'}")
      v-expansion-panel
        v-expansion-panel-title Свернуть / развернуть выбор даты
        v-expansion-panel-text(class="calendars")
          v-date-picker(
            v-if="showInput[4]"
            class="calendar"
            color="primary"
            :max="maxDate"
            :min="minDate"
            v-model="selectedRange[0]"
            title="Выберите начальную дату"
            @update:modelValue="updateSelectedRange"
          )
          v-date-picker(
            v-if="showInput[4]"
            class="calendar"
            color="primary"
            :max="maxDate"
            :min="minDate"
            v-model="selectedRange[1]"
            @update:modelValue="updateSelectedRange"
            title="Выберите конечную дату"
          )
          v-date-picker(
            v-if="showInput[5]"
            class="calendar select-day"
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
        type: String,
        required: true,
      },
      minDate: {
        type: String,
        required: true,
      },
      selectedRange: {
        type: Array,
        required: true,
      },
      selectedDay: {
        type: String,
        required: true,
      },
    },
    data() {
        return{
          selectedDay: this.selectedDay,
          selectedRange: this.selectedRange,
            panel: [0],
        }
    },
    methods: {
        updateSelectedDay(value) {
          console.log(value);
            this.selectedDay = value;
            this.$emit('update:selectedDay', value); // Эмитируем событие, чтобы обновить состояние в родительском компоненте
        },
        updateSelectedRange(){
          console.log(this.selectedRange);
          this.$emit('update:selectedRange', this.selectedRange);
        }
    },
    watch: {
        //selectedDay(newValue) {
        //this.localSelectedDay = newValue; // Следим за изменениями в свойствах
       // },
    },
  };
</script>
  
<style lang="sass">

  .v-expansion-panels .v-theme--light .v-expansion-panels--variant-default
    width: 200%

  .v-expansion-panel-text__wrapper
    display: grid
    grid-template-columns: 1fr 1fr
    gap: 1rem

  .v-date-picker
    width: 100%

  .v-date-picker-month__day.v-date-picker-month__day--selected
    z-index: 1

  .calendar
    border: 1px black solid
    border-radius: 0.5rem

</style>