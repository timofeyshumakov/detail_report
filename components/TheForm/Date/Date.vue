<template lang="pug">
    v-autocomplete(
        variant="outlined"
        :modelValue="selectedDateName"
        :items="dateNames"
        label="Выберите дату"
        @update:modelValue="handleOptionChange"
    )
    NumberInput(
        :showInput="showInput[0]" 
        v-model="daysAgo"
        :maxValue="maxDaysAgo"
        @update:modelValue="update"
    )
    NumberInput(
        :showInput="showInput[6]"
        v-model="daysAhead" 
        :maxValue="maxDaysAhead"
        @update:modelValue="update"
    )
    DateFields(
          :showInput="showInput"
          :monthNames="monthNames"
          :quarterNames="quarterNames"
          :yearNames="yearNames"
          v-model:selectedMonth="selectedMonth"
          v-model:selectedQuarter="selectedQuarter"
          v-model:selectedYear="selectedYear"
          @update:selectedMonth="update"
          @update:selectedQuarter="update"
          @update:selectedYear="update"
    )
    DatePickerPanel(
        :showInput="showInput"
        :maxDate="maxDate"
        :minDate="minDate"
        v-model:selectedRange="selectedRange"
        v-model:selectedDay="selectedDay"
        @update:selectedRange="update"
        @update:selectedDay="update"
    )
</template>

<script>
import DateFields from './DateFields.vue';
import DatePickerPanel from './DatePickerPanel.vue';
import NumberInput from './NumberInput.vue';
import moment from 'moment';
export default {
    components: { NumberInput, DatePickerPanel, DateFields },
    props: {
        showInput: {},
        selectedDateName: {},
        selectedDateIso: {},
    },
    data() {
        const today = moment();
          const nextYearEnd = moment().add(1, 'years').endOf('year');
          const firstDay = moment().subtract(10, 'years').startOf('year');
          const maxDate = nextYearEnd._d; // Устанавливаем на конец следующего года
          const minDate = firstDay._d;
          const maxDaysAhead = nextYearEnd.diff(today, 'days');
          const maxDaysAgo = moment().diff(firstDay, 'days');
          const yearNames = Array.from({ length: 12 }, (_, index) => moment().year() + 1 - index);
          const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
          const quarterNames = ["I", "II", "III", "IV"];
          const selectedQuarter = quarterNames[Math.floor(today.month() / 3)];
          const selectedMonth = monthNames[today.month()];
          const selectedYear = yearNames[1];
          const selectedDay = moment()._d;
          const selectedRange = [moment()._d, moment()._d];

        return {
            dateNames: ["Любая дата", "Сегодня", "Вчера", "Текущая неделя", "Текущий месяц", "Текущий квартал", "Текущий год", "Прошлая неделя", "Прошлый месяц", "Прошлый квартал", "Прошлый год", "Последние 7 дней", "Последние 30 дней", "Последние 60 дней", "Последние 90 дней", "Последние N дней", "Месяц", "Квартал", "Год", "Точная дата", "Диапазон"],
            selectedDateName: "Последние 30 дней",
            showInput: this.showInput,
            maxDaysAhead: maxDaysAhead,
            maxDaysAgo: maxDaysAgo,
            daysAgo: 0,
            daysAhead: 0,
            maxDate: maxDate,
            minDate: minDate,
            selectedQuarter: selectedQuarter,
            selectedMonth: selectedMonth,
            selectedYear: selectedYear,
            monthNames: monthNames,
            quarterNames: quarterNames,
            yearNames: yearNames,
            selectedDay: selectedDay,
            selectedRange: selectedRange,
            selectedDate: [],
            selectedDateIso: this.selectedDateIso,
        }
    },
    methods: {
        handleOptionChange(selectedDateName){
            this.selectedDateName = selectedDateName;
            this.showInput[0] = selectedDateName === "Последние N дней";
            this.showInput[1] = selectedDateName === "Месяц";
            this.showInput[2] = selectedDateName === "Квартал";
            this.showInput[3] = selectedDateName === "Год";
            this.showInput[4] = selectedDateName === "Диапазон";
            this.showInput[5] = selectedDateName === "Точная дата";
            this.showInput[6] = selectedDateName === "Следующие N дней";
            this.update();
        },
        update(value){
            const quarterIndex = this.quarterNames.findIndex((item) => item === this.selectedQuarter);
            const startMonth = quarterIndex * 3 + 1;
            const monthIndex = this.monthNames.findIndex((item) => item === this.selectedMonth);

            switch (this.selectedDateName) {
            case "Любая дата":
                this.selectedDate[0] = null;
                this.selectedDate[1] = null;
                break;
            case "Сегодня":
                this.selectedDate[0] = moment().startOf('day')
                this.selectedDate[1] = moment().endOf('day');
                break;
            case "Вчера":
                this.selectedDate[0] = moment().startOf('day').subtract(1, 'days');
                this.selectedDate[1] = moment().startOf('day');
                break;
            case "Текущая неделя":
                this.selectedDate[0] = moment().startOf('week').add(1, 'days');
                this.selectedDate[1] = moment().endOf('week').add(36, 'hours');
                break;
            case "Текущий месяц":
                this.selectedDate[0] = moment().startOf('month').add(12, 'hours');
                this.selectedDate[1] = moment().endOf('month');
                break; 
            case "Текущий квартал":
                this.selectedDate[0] = moment().startOf('quarter').add(12, 'hours');
                this.selectedDate[1] = moment().endOf('quarter');
                break;
            case "Текущий год":
                this.selectedDate[0] = moment().startOf('year').add(12, 'hours');
                this.selectedDate[1] = moment().endOf('year');
                break;
            case "Последние 7 дней":
                this.selectedDate[0] = moment().subtract(7, 'days').startOf('day').add(12, 'hours');
                this.selectedDate[1] = moment().endOf('day');
                break;
            case "Последние 30 дней":
                this.selectedDate[0] = moment().subtract(30, 'days').add(12, 'hours');
                this.selectedDate[1] = moment().endOf('day');
                break;
            case "Последние 60 дней":
                this.selectedDate[0] = moment().subtract(60, 'days').startOf('day');
                this.selectedDate[1] = moment().endOf('day');
                break;
            case "Последние 90 дней":
                this.selectedDate[0] = moment().subtract(90, 'days').startOf('day');
                this.selectedDate[1] = moment().endOf('day');
                break;
            case "Последние N дней":
                this.selectedDate[0] = moment().subtract(+value + 1, 'days').add(12, 'hours');
                this.selectedDate[1] = moment().add(1, 'days');
                break;
            case "Месяц":
                this.selectedDate[0] = moment().year(this.selectedYear).month(monthIndex).startOf('month');
                this.selectedDate[1] = moment().year(this.selectedYear).month(monthIndex).endOf('month');
                break;
            case "Квартал":
                this.selectedDate[0] = moment().year(this.selectedYear).quarter(quarterIndex + 1).startOf('quarter');
                this.selectedDate[1] = moment().year(this.selectedYear).quarter(quarterIndex + 1).endOf('quarter');
                break;
            case "Год":
                this.selectedDate[0] = moment().year(this.selectedYear).startOf('year');
                this.selectedDate[1] = moment().year(this.selectedYear).endOf('year');
                break;
            case "Прошлая неделя":
                const lastWeekStart = moment().subtract(1, 'weeks').startOf('isoWeek');
                this.selectedDate[0] = lastWeekStart;
                this.selectedDate[1] = lastWeekStart.clone().add(1, 'weeks');
                break;
            case "Прошлый месяц":
                this.selectedDate[0] = moment().subtract(1, 'months').startOf('month');
                this.selectedDate[1] = moment().subtract(1, 'months').endOf('month');
                break;
            case "Прошлый квартал":
                const lastQuarterStart = moment().month(startMonth).subtract(1, 'quarters').startOf('quarter');
                this.selectedDate[0] = lastQuarterStart;
                this.selectedDate[1] = lastQuarterStart.clone().add(1, 'quarters');
                break;
            case "Прошлый год":
                this.selectedDate[0] = moment().subtract(1, 'years').startOf('year');
                this.selectedDate[1] = moment().subtract(1, 'years').endOf('year');
                break;
            case "Следующие 7 дней":
                this.selectedDate[0] = moment().startOf('day').add(12, 'hours');
                this.selectedDate[1] = moment().add(7, 'days').endOf('day');
                break;
            case "Следующие 30 дней":
                this.selectedDate[0] = moment().startOf('day').add(12, 'hours');
                this.selectedDate[1] = moment().add(30, 'days').endOf('day');
                break;
            case "Следующие 60 дней":
                this.selectedDate[0] = moment().startOf('day').add(12, 'hours');
                this.selectedDate[1] = moment().add(60, 'days').endOf('day');
                break;
            case "Следующие 90 дней":
                this.selectedDate[0] = moment().startOf('day').add(12, 'hours');
                this.selectedDate[1] = moment().add(90, 'days').endOf('day');
                break;
            case "Следующие N дней":
                this.selectedDate[0] = moment().startOf('day');
                this.selectedDate[1] = moment().add(+this.daysAhead, 'days').endOf('day');
                break;
            case "Следующая неделя":
                this.selectedDate[0] = moment().add(1, 'weeks').startOf('isoWeek');
                this.selectedDate[1] = moment().add(1, 'weeks').endOf('isoWeek');
                break;
            case "Следующий месяц":
                this.selectedDate[0] = moment().add(1, 'months').startOf('month');
                this.selectedDate[1] = moment().add(1, 'months').endOf('month');
                break;
            case "Следующий квартал":
                this.selectedDate[0] = moment().add(1, 'quarters').startOf('quarter');
                this.selectedDate[1] = moment().add(1, 'quarters').endOf('quarter');
                break;
            case "Следующий год":
                this.selectedDate[0] = moment().add(1, 'years').startOf('years');
                this.selectedDate[1] = moment().add(1, 'years').endOf('years');
                break;
            case "Точная дата":
                this.selectedDate[0] = moment(this.selectedDay).startOf('day');
                this.selectedDate[1] = moment(this.selectedDay).endOf('day');
                break;
            case "Диапазон":
                this.selectedDate[0] = moment(this.selectedRange[0]).startOf('day');
                this.selectedDate[1] = moment(this.selectedRange[1]).endOf('day');
                if(this.selectedDate[0] > this.selectedDate[1]){
                    this.dialogStages = true;
                    this.dialogMsg = 'Начальная дата не может быть больше конечной';
                    this.isLoading = false;
                }
                break;
            default:
                break;
            }
            console.log(this.selectedDate[0]);
            this.selectedDateIso[0] = this.selectedDate[0] ? this.selectedDate[0].subtract(12, 'hours').toISOString() : null;
            this.selectedDateIso[1] = this.selectedDate[1] ? this.selectedDate[1].add(12, 'hours').toISOString() : null;
            this.$emit('update:selectedDateIso[0]', this.selectedDateIso[0]);
            this.$emit('update:selectedDateIso[1]', this.selectedDateIso[1]);
            this.$emit('sendValue', this.selectedDateIso);
            console.log(this.selectedDateIso[0]);
        },
    },
    mounted(){
        this.handleOptionChange(this.selectedDateName)
    }
}
</script>