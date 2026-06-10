<template lang="pug">
  ErrorLog(
        v-model:dialogStages="dialogStages"
        :dialogMsg="dialogMsg"
  )
  v-form(v-model="invoices")
        Filtres(
            :branchInfo="branchInfo"
            :paymentMethods="paymentMethods"
            v-model:showInput="showInput"
            :users="users"
            ref="child"
            :reportType="reportType"
            @update-data="$emit('update-data', $event)"
            @update-task-data="$emit('update-task-data', $event)"
            @update:selected-task-types="handleTaskTypesUpdate"
        )
  v-btn(color="primary" @click="submit") {{ submitButtonText }}
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { callApi } from '../../functions/callApi.ts'
import { useMyStore } from '../../stores/store.js'
import { useGlobalStore } from '../../stores/store.js'
import { useParseStore } from '../../stores/store.js'
import ErrorLog from './ErrorLog.vue'
import Filtres from './Filtres.vue'

const emit = defineEmits(['updateData'])

const props = defineProps({
  monthNames: {
    type: Array
  },
  invoices: {
    type: Array
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  branchInfo: {
    type: Array,
    required: true
  },
  paymentMethods: {
    type: Array,
    required: true
  },
  showInput: {
    type: Array
  },
  parse: {
    type: Object
  },
  users: {
    type: Object
  },
  reportType: {
    type: String,
    default: 'invoices', // 'invoices' или 'tasks'
    validator: (value) => ['invoices', 'tasks'].includes(value)
  }
})
const selectedTaskTypes = ref([]);

const handleTaskTypesUpdate = (types) => {
  selectedTaskTypes.value = types;
};
const dateNames = ref(["Любая дата", "Сегодня", "Вчера", "Текущая неделя", "Текущий месяц", "Текущий квартал", "Текущий год", "Прошлая неделя", "Прошлый месяц", "Прошлый квартал", "Прошлый год", "Последние 7 дней", "Последние 30 дней", "Последние 60 дней", "Последние 90 дней", "Последние N дней", "Следующие 7 дней", "Следующие 30 дней", "Следующие 60 дней", "Следующие 90 дней", "Следующие N дней", "Следующая неделя", "Следующий месяц", "Следующий квартал", "Следующий год", "Месяц", "Квартал", "Год", "Точная дата", "Диапазон"])
const isLoading = ref(props.isLoading)
const invoices = ref([])
const tasks = ref([])
const dialogStages = ref(false)
const dialogMsg = ref(null)
const showInput = ref([false, false, false, false, false, false])
const child = ref(null)

const myStore = useMyStore()
const parseStore = useParseStore()
const globalStore = useGlobalStore()

const items = computed(() => myStore.items)
const filter = computed(() => parseStore.items)
const courses = computed(() => globalStore.courses)

// Текст кнопки в зависимости от типа отчета
const submitButtonText = computed(() => {
  return props.reportType === 'invoices' ? 'Получить заявки' : 'Получить задачи'
})

// Настройки полей для разных типов отчетов
const getEntitySettings = () => {
  if (props.reportType === 'invoices') {
    return {
      entity: 'crm.item.list',
      categoryId: '69',
      selectFields: [
        'title',
        'closedate',
        'begindate',
        'ufCrm_47_1706781047803',
        'stageId',
        'id',
        'ufCrm_47_1700468491',
        'ufCrm_47_1708437057833',
        'ufCrm_47_1752822806',
        'ufCrm_47_1752752059810',
        'ufCrm_47_1700467583',
        'ufCrm_47_1740572062101',
        'ufCrm_47_1700468467',
        'ufCrm_47_1704813732503',
        'ufCrm_47_1752010288013',
        'ufCrm_47_1752010416',
        'ufCrm_47_1701780020523',
      ]
    }
  } else {
    return {
      entity: 'tasks.task.list',
      categoryId: null,
      selectFields: [
        'id',
        'title',
        'description',
        'status',
        'responsibleId',
        'createdDate',
        'deadline',
        'priority',
        'groupId'
        // добавьте другие поля для задач по необходимости
      ]
    }
  }
}

const checkError = () => {
  if (showInput.value[5] && !selectedDay.value) {
    dialogStages.value = true
    dialogMsg.value = 'Выберите дату'
    return true
  } else if (showInput.value[4]) {
    if (!selectedRange.value[0] || !selectedRange.value[1]) {
      dialogStages.value = true
      dialogMsg.value = 'Выберите дату'
      return true
    }
  }
}

const submit = async () => {
  child.value.submit()

  if (checkError()) {
    return
  }

  isLoading.value = true
  
  const entitySettings = getEntitySettings()
  
  // Устанавливаем поля для выборки
  parseStore.setSelect(entitySettings.selectFields)

  let responseData
  let total

  myStore.clearItems()
  parseStore.deleteParsedBatches()

  // Вызываем API с соответствующими параметрами
  responseData = await callApi(
    entitySettings.entity,
    parseStore.filter,
    parseStore.select,
    172,
    0,
    0
  )
  
  parseStore.addParsedBatches(0)
  parseStore.setTotal(total)
  
  // Обрабатываем данные в зависимости от типа отчета
  if (props.reportType === 'invoices') {
    emit('updateData', responseData);
    /*
    [invoices.value, totalOpportunity] = formatItems(
      responseData.items,
      caller.value,
      props.branchInfo,
      props.paymentMethods,
      courses.value,
      0
    )
    
    myStore.setTotalOpportunity(totalOpportunity)

    for (let i = 0; i < invoices.value.length; i++) {
      myStore.setItemAtIndex(invoices.value[i], i)
    }
    */
  } else {
    // Обработка задач
        if(Array.isArray(responseData)){
  responseData = responseData.reduce((acc, current) => {
    return acc.concat(current.tasks);
  }, []);
        }else{
          responseData = responseData.tasks;
        }
    const filteredData = filterTasksByType(responseData, selectedTaskTypes.value);
    emit('updateTaskData', filteredData);
    /*
    [tasks.value, totalTasks] = formatTaskItems(
      responseData.items,
      props.users,
      0
    )
    
    myStore.setTotalTasks(totalTasks)

    for (let i = 0; i < tasks.value.length; i++) {
      myStore.setTaskAtIndex(tasks.value[i], i)
    }
    */
  }

  isLoading.value = false
  return responseData
}
const filterTasksByType = (tasksData, selectedTypes) => {
  if (!selectedTypes || selectedTypes.length === 0) return tasksData;
  return tasksData.filter(task => {
    const description = task.description || '';
    return selectedTypes.some(type => 
      description.toLowerCase().includes('направление: [' + type.toLowerCase())
    );
  });
};
// Следим за изменением типа отчета
watch(() => props.reportType, (newType) => {
  // Очищаем данные при смене типа отчета
  myStore.clearItems()
  parseStore.deleteParsedBatches()
})
</script>

<style lang="sass" scoped>
  .v-form
      width: 100%
      display: grid
      grid-template-columns: 1fr 1fr
      gap: 0.75rem

  .v-form .v-input
    width: 45%

  .inputs
    display: grid
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr))
    column-gap: 1rem
    padding: 0
</style>