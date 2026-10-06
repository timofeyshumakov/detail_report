<script setup lang="ts">
// @ts-nocheck
import { computed, ref, watch } from 'vue'
import { generateDealsChunked, fetchDealGeneratorAudience, fetchDealGeneratorCompanies } from '../functions/dealGeneratorHandler'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'mass' },
  event: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'generated'])

const selectMenuProps = {
  contentClass: 'deal-generator-select-menu',
  zIndex: 3200,
  maxHeight: 360,
}

const audienceOptions = ref([])
const companyOptions = ref([])
const selectedAudience = ref([])
const selectedCompanies = ref([])
const selectAllCompanies = ref(false)
const companiesLoading = ref(false)
const loading = ref(false)
const createdDealsCount = ref(0)
const totalDealsToCreate = ref(0)
const failedDeals = ref([])
const completionDialog = ref(false)
const completionMessage = ref('')
const progressPhase = ref('')

const dialogTitle = computed(() => (
  props.mode === 'manual'
    ? 'Выбрать спонсора вручную'
    : 'Выбрать ЦА из базы спонсоров'
))

const canSubmit = computed(() => {
  if (!selectedAudience.value.length) return false
  if (props.mode === 'manual') return selectedCompanies.value.length > 0
  return true
})

function close() {
  if (loading.value) return
  emit('update:modelValue', false)
}

function resetForm() {
  selectedAudience.value = []
  selectedCompanies.value = []
  selectAllCompanies.value = false
  companyOptions.value = []
  createdDealsCount.value = 0
  totalDealsToCreate.value = 0
  failedDeals.value = []
  completionMessage.value = ''
  progressPhase.value = ''
}

function updateSelectAllState() {
  selectAllCompanies.value = companyOptions.value.length > 0
    && companyOptions.value.every((company) => (
      selectedCompanies.value.some((item) => String(item.ID) === String(company.ID))
    ))
}

function toggleSelectAllCompanies(checked: any) {
  selectedCompanies.value = checked ? [...companyOptions.value] : []
  selectAllCompanies.value = checked
}

async function loadAudienceOptions() {
  try {
    audienceOptions.value = await fetchDealGeneratorAudience()
  } catch (error) {
    console.error('Не удалось загрузить список ЦА', error)
    audienceOptions.value = []
  }
}

async function loadCompaniesByAudience() {
  if (!selectedAudience.value.length) {
    companyOptions.value = []
    return
  }

  companiesLoading.value = true
  try {
    companyOptions.value = await fetchDealGeneratorCompanies(
      selectedAudience.value.map((item) => item.ID),
    )
  } finally {
    companiesLoading.value = false
    updateSelectAllState()
  }
}

async function submit() {
  if (!props.event?.id || !canSubmit.value || loading.value) return

  loading.value = true
  failedDeals.value = []
  createdDealsCount.value = 0
  totalDealsToCreate.value = props.mode === 'manual'
    ? selectedCompanies.value.length
    : 0
  progressPhase.value = 'Запуск'

  try {
    const result = await generateDealsChunked({
      event: props.event,
      mode: props.mode,
      selectedAudience: selectedAudience.value,
      selectedCompanies: selectedCompanies.value,
      onProgress: ({ created, total, phase }) => {
        createdDealsCount.value = created
        totalDealsToCreate.value = total
        progressPhase.value = phase
      },
    })

    createdDealsCount.value = result.createdCount || 0
    totalDealsToCreate.value = result.totalCompanies || createdDealsCount.value
    completionMessage.value = result.message || (
      createdDealsCount.value
        ? 'Сделки успешно созданы'
        : 'Не найдено компаний для создания сделок'
    )
    if (createdDealsCount.value > 0) {
      emit('generated', result)
    }
    showCompletionDialog()
  } catch (error) {
    console.error(error)
    completionMessage.value = error instanceof Error ? error.message : 'Ошибка при создании сделок'
    showCompletionDialog()
  } finally {
    loading.value = false
    progressPhase.value = ''
  }
}

function showCompletionDialog() {
  emit('update:modelValue', false)
  completionDialog.value = true
}

function closeCompletionDialog() {
  completionDialog.value = false
  resetForm()
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    resetForm()
    await loadAudienceOptions()
    if (props.mode === 'manual') {
      await loadCompaniesByAudience()
    }
  },
)

watch(
  selectedAudience,
  async () => {
    if (!props.modelValue || props.mode !== 'manual') return
    selectedCompanies.value = []
    selectAllCompanies.value = false
    await loadCompaniesByAudience()
  },
  { deep: true },
)

watch(selectedCompanies, () => {
  updateSelectAllState()
}, { deep: true })
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720"
    persistent
    :z-index="3000"
    class="deal-generator-dialog-overlay"
    content-class="deal-generator-dialog-content"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="deal-generator-dialog">
      <div class="deal-generator-dialog__title">
        {{ dialogTitle }}
      </div>

      <v-card-text class="deal-generator-dialog__body">
        <v-form @submit.prevent="submit">
          <v-autocomplete
            v-model="selectedAudience"
            :items="audienceOptions"
            :menu-props="selectMenuProps"
            item-title="NAME"
            item-value="ID"
            label="Выберите целевую аудиторию"
            multiple
            chips
            closable-chips
            clearable
            return-object
            variant="outlined"
            hide-details
            class="mb-4"
          />

          <v-autocomplete
            v-if="mode === 'manual'"
            v-model="selectedCompanies"
            :items="companyOptions"
            :menu-props="selectMenuProps"
            item-title="TITLE"
            item-value="ID"
            label="Выберите компании"
            placeholder="Начните вводить название"
            variant="outlined"
            hide-details
            multiple
            chips
            closable-chips
            clearable
            return-object
            :loading="companiesLoading"
            :disabled="companiesLoading || !selectedAudience.length"
            :no-data-text="selectedAudience.length ? 'Компании не найдены' : 'Сначала выберите целевую аудиторию'"
            class="mb-4"
          >
            <template #prepend-item>
              <v-list-item>
                <v-list-item-title>
                  <v-checkbox
                    v-model="selectAllCompanies"
                    label="Выбрать все компании"
                    hide-details
                    density="compact"
                    :disabled="companiesLoading || !companyOptions.length"
                    @update:model-value="toggleSelectAllCompanies"
                  />
                </v-list-item-title>
              </v-list-item>
              <v-divider />
            </template>
          </v-autocomplete>

          <v-btn
            type="submit"
            color="primary"
            :loading="loading"
            :disabled="loading || !canSubmit"
            block
          >
            Создать сделки
          </v-btn>
        </v-form>

        <v-card v-if="loading" class="pa-4 mt-4" variant="outlined">
          <div class="mb-1">{{ progressPhase }}</div>
          <div class="mb-2">Создано: {{ createdDealsCount }} из {{ totalDealsToCreate || '…' }}</div>
          <v-progress-linear indeterminate color="primary" />
        </v-card>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="close">Отмена</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="completionDialog"
    max-width="480"
    persistent
    :z-index="4000"
    class="deal-generator-completion-overlay"
    content-class="deal-generator-completion-content"
  >
    <v-card class="deal-generator-completion">
      <div class="deal-generator-dialog__completion-title text-center">
        Генерация завершена
      </div>
      <v-card-text class="text-center">
        <p class="text-h6 mb-2">Успешно создано сделок: {{ createdDealsCount }}</p>
        <p v-if="failedDeals.length" class="text-body-2">
          Не удалось создать: {{ failedDeals.length }}
        </p>
        <p class="text-body-2 text-medium-emphasis mt-2">{{ completionMessage }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="closeCompletionDialog">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="sass">
.deal-generator-dialog
  display: flex
  flex-direction: column
  width: 100%
  max-height: min(90dvh, 720px)
  overflow: hidden
  background: #ffffff

.deal-generator-dialog__title
  flex: 0 0 auto
  min-height: auto !important
  height: auto !important
  padding: 1rem 1.25rem 0.75rem !important
  overflow: visible !important
  white-space: normal !important
  text-overflow: clip !important
  color: #0f172a !important
  background: #ffffff !important
  opacity: 1 !important
  font-size: 1.125rem !important
  font-weight: 700 !important
  line-height: 1.35 !important
  letter-spacing: normal !important

.deal-generator-dialog__completion-title
  flex: 0 0 auto
  min-height: auto !important
  padding: 1rem 1.25rem 0.75rem !important
  background: #ffffff !important
  color: #000000 !important
  opacity: 1 !important
  font-size: 1.25rem !important
  font-weight: 700 !important
  line-height: 1.35 !important
  white-space: normal !important
  overflow: visible !important

.deal-generator-dialog__body
  flex: 1 1 auto
  min-height: 0
  overflow: visible
</style>

<style>
.deal-generator-dialog-overlay.v-overlay,
.v-overlay.deal-generator-dialog-overlay {
  z-index: 3000 !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: center !important;
  overflow: visible !important;
  padding: 1rem !important;
}

.deal-generator-dialog-overlay .v-overlay__scrim {
  z-index: 3000 !important;
}

.deal-generator-dialog-overlay .v-overlay__content,
.deal-generator-dialog-content {
  z-index: 3001 !important;
  position: relative !important;
  margin: 1rem auto auto !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
  width: min(720px, calc(100vw - 2rem)) !important;
  max-width: min(720px, calc(100vw - 2rem)) !important;
  max-height: min(90dvh, 720px) !important;
  overflow: visible !important;
}

.deal-generator-select-menu.v-overlay,
.v-overlay:has(.deal-generator-select-menu) {
  z-index: 3200 !important;
}

.deal-generator-select-menu {
  z-index: 3201 !important;
  max-height: 360px !important;
  overflow-y: auto !important;
}

.deal-generator-completion-overlay.v-overlay,
.v-overlay.deal-generator-completion-overlay {
  z-index: 4000 !important;
}

.deal-generator-completion-overlay .v-overlay__scrim {
  z-index: 4000 !important;
}

.deal-generator-completion-overlay .v-overlay__content,
.deal-generator-completion-content {
  z-index: 4001 !important;
}

.deal-generator-dialog__title,
.deal-generator-dialog__completion-title {
  color: #000000 !important;
  opacity: 1 !important;
}
</style>
