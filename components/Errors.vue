<template>
    <td colspan="3" class="errors">
      <div class="td-container">
        <span>Критические ошибки</span>
        <v-icon @click="isShow = true" title="Изменить критерий" aria-label="Изменить критерий">mdi-cog</v-icon>
      </div>
    </td>
    <td colspan="3" style="padding: 0">
      <v-autocomplete v-if="isEditing" v-model="localSelectedErrors" @update:modelValue="handleUpdate" :items="errors" item-title="value" label="Выберите ошибки" multiple chips closable-chips clearable></v-autocomplete>
    </td>
    <v-dialog v-model="isShow" max-width="800" class="errors-editor">
      <!-- Поисковая строка -->
      <v-text-field
        v-model="search"
        label="Поиск по значению"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        clearable
        class="errors-input"
      ></v-text-field>

      <!-- Список форм -->
      <v-list>
        <v-list-item
          v-for="(item, index) in filteredItems"
          :key="index"
          class="mb-2"
        >
          <v-form @submit.prevent="saveItem(index)">
            <v-row align="center">
              <!-- Поле для редактирования -->
              <v-col class="errors-col">
                <v-text-field
                  v-model="item.value"
                  variant="outlined"
                  hide-details
                  @input="markAsEdited(index)"
                ></v-text-field>
              </v-col>
              <!-- Кнопки сохранения и удаления -->
              <v-col class="error-actions">
                <v-btn
                  color="primary"
                  type="submit"
                  :disabled="!item.edited"
                  class="mr-2"
                >
                  Сохранить
                </v-btn>
                <v-btn
                  color="error"
                  variant="outlined"
                  type="reset"
                  :disabled="!item.edited"
                  class="mr-2"
                >
                  Отменить
                </v-btn>
                <v-btn
                  color="error"
                  icon="mdi-delete"
                  @click="deleteItem(index)"
                ></v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-list-item>
      </v-list>
      <v-btn class="errors-exit" type="submit" color="primary" @click="isShow = false">выйти</v-btn>
    </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  isEditing: {
    type: Boolean,
    required: false,
    default: true,
  },
  selectedErrors: {
    type: Array,
    required: false,
    default: [],
  },
});
const emit = defineEmits(['update:selectedErrors', 'countSumm'])

const localSelectedErrors = ref(props.selectedErrors)

// Обработчик изменения модели
const handleUpdate = (value) => {
  emit('update:selectedErrors', value)
  emit('countSumm', value)
}

// Следим за изменениями props.selectedErrors извне
watch(() => props.selectedErrors, (newVal) => {
  localSelectedErrors.value = newVal
})

const openErrorsEditor = () => {
  console.log('1');
}

const isShow = ref(false);
const errors = ref([
  { value: "Хамство, грубость в отношении клиента", edited: false },
  { value: "Разговор с клиентом на повышенных тонах и/или с применением нецензурной лексики", edited: false },
  { value: "Негативные отзывы о компании Оrtonica и товарах размещенных на площадке интернет - магазина Оrtonica.ru", edited: false },
  { value: "Предоставление клиенту недостоверной информации о продукте, повлекшее за собой отказ от заказа или возврат товара. Ошибка считается если МПП некорректно информирует клиента в рамках УТП", edited: false },
  { value: "Введение клиента в заблуждение по стране производства колясок", edited: false },
  { value: "Неграмотная консультация по вопросам сервисного обслуживания и запчастей, а также разговоры на отвлеченные темы не касаемо продажи по инициативе МПП (если менеджер ведет диалог сам, а не переводит звонок на сервис)", edited: false },
  { value: "Повторная коммуникация: менеджер не связывается с клиентом в назначенный день, или связывается с клиентом позже установленного срока / дня /, что приводит к провальной сделке", edited: false },
  { value: "Избирательность к клиентам. Необъективное избирательное отношение, приводящее к провальной сделке. Менеджеры не должны принимать самостоятельное решение о дальнейшей работе с клиентом, основываясь на первом впечатлении", edited: false },
  { value: "Длинные монологи. Презентация продукта должна быть интересной и лаконичной. Нельзя растягивать разговор: длинные и скучные монологи не способствует продажам. Диалог должен строиться не уходя от главного (отсылка к таблице: длительные звонки)", edited: false },
  { value: "Несоблюдение режима рабочего времени, умышленное сокращение рабочего времени в разговоре с клиентом", edited: false },
])

// Поисковый запрос
const search = ref('')

// Фильтрованный список на основе поиска
const filteredItems = computed(() => {
  if (!search.value) return errors.value
  return errors.value.filter(error =>
    error.value.toLowerCase().includes(search.value.toLowerCase())
  )
})

// Отметка элемента как отредактированного
const markAsEdited = (index) => {
  errors.value[index].edited = true
}

// Сохранение изменений
const saveItem = (index) => {
  if (errors.value[index].value.trim() === '') {
    // Удаляем пустые значения
    errors.value.splice(index, 1)
  } else {
    errors.value[index].edited = false
  }
}

// Удаление элемента
const deleteItem = (index) => {
  errors.value.splice(index, 1)
}

</script>

<style lang="sass">

  .errors-editor .v-overlay__content
    background: rgba(var(--v-theme-surface))
    border-radius: 0.25rem
    
  .errors-input
    padding: 1rem

  .errors-col
    flex-grow: 2.7

  .errors-editor .errors-exit
    width: 15rem
    align-self: center
    margin: 0.75rem

  .error-actions
    display: flex
</style>