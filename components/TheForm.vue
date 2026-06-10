<template>
  <v-dialog v-model="dialog" persistent max-width="600px" @after-enter="adjustTextareaHeights">
    <v-card class="pa-6">
      <v-card-title class="headline text-center">{{ dialogTitle }}</v-card-title>
      <v-form @submit.prevent="submitForm">
        <v-autocomplete
          v-model="newField.block"
          :items="sortedItems"
          label="Блок"
          variant="outlined"
          required
          class="mb-4"
          type="text"
        ></v-autocomplete>
        <v-textarea
          v-model="newField.title"
          :rules="nameRules"
          label="Название критерия"
          variant="outlined"
          required
          class="mb-4"
          type="text"
          maxlength="200"
          rows="1"
          :ref="(el) => setTextareaRef(el, 0)"
        ></v-textarea>
        <v-textarea
          v-model="newField.description"
          label="Описание критерия"
          variant="outlined"
          required
          class="mb-4"
          type="text"
          maxlength="400"
          rows="1"
          :ref="(el) => setTextareaRef(el, 1)"
        ></v-textarea>
        <v-text-field
          v-if="!editItem"
          v-model="newField.maxGrade"
          :rules="gradeRules"
          label="Макс. оценка"
          variant="outlined"
          required
          class="mb-4"
          type="number"
        ></v-text-field>
        <v-switch v-model="newField.zeroing" @click="toggleZeroing" label="Обнуляющий критерий" color="primary"></v-switch>
        <div class="d-flex justify-end gap-4">
          <v-btn
            type="reset"
            color="error"
            variant="outlined"
            @click="resetForm"
          >
            Отменить
          </v-btn>
          <v-btn
            type="submit"
            color="primary"
            :loading="isSubmitting"
          >
            Сохранить
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
  <v-dialog v-model="dialogBlock" persistent max-width="600px">
    <v-card class="pa-6">
      <v-card-title class="headline text-center">{{ dialogTitle }}</v-card-title>
      <v-form @submit.prevent="submitBlockForm">
        <v-text-field
          v-model="newBblock"
          :items="sortedItems"
          :rules="nameRules"
          label="Блок"
          variant="outlined"
          required
          class="mb-4"
          type="text"
        ></v-text-field>
        <div class="d-flex justify-end gap-4">
          <v-btn
            type="reset"
            color="error"
            variant="outlined"
            @click="resetBlockForm"
          >
            Отменить
          </v-btn>
          <v-btn
            type="submit"
            color="primary"
            :loading="isSubmitting"
          >
            Сохранить
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
  <td colspan="3" class="add-item-td" @click="showDialog()">
    <div class="add-item">
      <v-icon color="primary" class="button-icon">mdi-plus</v-icon>
        <span>Добавить критерий</span>
    </div>
  </td>
  <td colspan="3" class="add-item-td" @click="showBlockDialog()">
    <div class="add-item">
      <v-icon color="primary" class="button-icon">mdi-plus</v-icon>
        <span>Добавить блок</span>
    </div>
  </td>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import { useForm } from 'vee-validate';
import { number, object, string } from 'yup';
import { toTypedSchema } from '@vee-validate/yup';

const props = defineProps({
  arrayLength: {
    type: Number,
    required: true,
    default: 0,
  },
  blocks: {
    type: Array,
    required: true,
    default: [],
  }
});



const blocks = ref(props.blocks);
const sortedItems = computed(() => {
  // Здесь сортируем по индексам — фактически items уже в нужном порядке,
  // но если хотите сортировать явно по item.id, например:
  console.log(blocks.value);
  return blocks.value.slice().sort((a, b) => a.index - b.index)
})
console.log(sortedItems.value);
const newBblock = ref('');

const emit = defineEmits(['add-item', 'edit-item', 'add-block', 'edit-block', 'delete-block']);

interface Field {
  block: string | null;
  title: string | null;
  maxGrade: number | null;
  index: number | null;
  description: string | null;
  zeroing: boolean;
}

const textareaRefs = ref([]);

const setTextareaRef = (el, index) => {
  if (el) {
    textareaRefs.value[index] = el;
  }
};

const adjustTextareaHeights = async () => {
  await nextTick(); // Ждем пока диалог и все элементы полностью отрендерятся
  
  textareaRefs.value.forEach((textarea) => {
    if (textarea) {
      // Вычисляем высоту содержимого
      const scrollHeight = textarea.$el.querySelector('textarea').scrollHeight;
      // Устанавливаем высоту = высота содержимого + 1rem (16px)
      textarea.$el.querySelector('textarea').style.height = `${scrollHeight}px`;
    }
  });
    }

const submitBlockForm = () => {
  blocks.value.push({title: newBblock.value, index: blocks.value.length});
  resetBlockForm();
  emit('add-block');
}

// Схема валидации с использованием Yup
const validationSchema = toTypedSchema(
  object({
    title: string().required('Название критерия обязательно').max(13, 'Максимальная длина 13 символов'),
    maxGrade: number()
      .required('Макс. оценка обязательна')
      .min(1, 'Минимальная оценка 1')
      .max(999, 'Максимальная оценка 999')
      .typeError('Должно быть числом'),
  })
);

const { handleSubmit, resetForm: resetValidation } = useForm({
  validationSchema,
});

const toggleZeroing = () => {
  newField.value.zeroing ? (newField.value.zeroing = false) : (newField.value.zeroing = true);
}

const showDialog = (item? : Field, edit? : boolean) => {
  console.log(item);
  if(edit){
    dialogTitle.value = 'Изменить критерий';
    newField.value = JSON.parse(JSON.stringify(item));
    editItem.value = true;
  }else{
    dialogTitle.value = 'Добавить критерий';
    editItem.value = false;
  }

  dialog.value = true;
}

const showBlockDialog = () => {
  dialogBlock.value = true;
}

const dialog = ref(false);
const dialogBlock = ref(false);
const isSubmitting = ref(false);
const form = ref<HTMLFormElement | null>(null);
const dialogTitle = ref('');
const editItem = ref(false);

const newField = ref<Field>({
  block: null,
  title: null,
  maxGrade: null,
  index: null,
  description: null,
  zeroing: false,
});

// Правила валидации для Vuetify (дополнительные к Yup)
const nameRules = [
  (v: string) => !!v || 'Название критерия обязательно',
];

const gradeRules = [
  (v: string) => !!v || 'Макс. оценка обязательна',
  (v: string) => !isNaN(Number(v)) || 'Должно быть числом',
  (v: string) => (Number(v) >= 1) || 'Минимальная оценка 1',
  (v: string) => (Number(v) <= 999) || 'Максимальная оценка 999',
];

const submitForm = (async (values) => {
  isSubmitting.value = true;

  try {
    if(editItem.value){
      const response = await editItemFunc(newField.value);
    }else{
      const response = await addItem(newField.value);
    }
    resetForm();
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Произошла ошибка при отправке формы');
  } finally {
    isSubmitting.value = false;
  }
});

const resetForm = () => {
  dialog.value = false;
  newField.value = {
    block: null,
    title: null,
    maxGrade: null,
    index: null,
    description: null,
    zeroing: false,
  };
  resetValidation();
};

const resetBlockForm = () => {
  dialogBlock.value = false;
  newBblock.value = '';
}

const editItemFunc = (item : Field) => {
  console.log(item);
  emit('edit-item', item);
}

const addItem = (item : Field) => {
  console.log("запрос к битриксу и бд");
  const newItem = { index: props.arrayLength, title: item.title, maxGrade: item.maxGrade, description: item.description ? item.description : "", zeroing: item.zeroing, block: item.block ? item.block : "", comment: "", value: "" };
  emit('add-item', newItem); // Отправляем данные в родительский компонент
}

defineExpose({ showDialog });
</script>

<style scoped>
.gap-4 {
  gap: 16px;
}
</style>