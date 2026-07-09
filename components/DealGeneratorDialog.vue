<template>
  <v-dialog :model-value="modelValue" max-width="720" persistent @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="deal-generator-dialog__title">
        {{ dialogTitle }}
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="submit">
          <v-combobox
            v-model="selectedAudience"
            :items="audienceOptions"
            item-title="NAME"
            item-value="ID"
            label="Выберите целевую аудиторию"
            multiple
            chips
            variant="outlined"
            hide-details
            class="mb-4"
          />

          <v-autocomplete
            v-if="mode === 'manual'"
            v-model="selectedCompanies"
            :items="companyOptions"
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
          <div class="mb-2">Создано: {{ createdDealsCount }} из {{ totalDealsToCreate }}</div>
          <v-progress-linear indeterminate color="primary" />
        </v-card>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="close">Отмена</v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="completionDialog" max-width="480" persistent>
      <v-card>
        <v-card-title class="text-center">Генерация завершена</v-card-title>
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
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { callApi, getListElements } from '../functions/callApi'

const DEAL_CATEGORY_ID = 32
const DEAL_STAGE_ID = 'C32:NEW'
const EVENT_ENTITY_TYPE_ID = 1052
const AUDIENCE_LIST_ID = 216

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'mass' },
  event: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])

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
}

function updateSelectAllState() {
  selectAllCompanies.value = companyOptions.value.length > 0
    && companyOptions.value.every((company) => (
      selectedCompanies.value.some((item) => String(item.ID) === String(company.ID))
    ))
}

function toggleSelectAllCompanies(checked) {
  selectedCompanies.value = checked ? [...companyOptions.value] : []
  selectAllCompanies.value = checked
}

async function loadAudienceOptions() {
  audienceOptions.value = await getListElements(AUDIENCE_LIST_ID, {}, ['ID', 'NAME'])
}

async function loadCompaniesByAudience() {
  if (!selectedAudience.value.length) {
    companyOptions.value = []
    return
  }

  companiesLoading.value = true
  try {
    companyOptions.value = await callApi(
      'crm.company.list',
      { UF_CRM_1753364407: selectedAudience.value.map((item) => item.ID) },
      ['ID', 'TITLE', 'UF_CRM_1753364407', 'UF_CRM_1753364801'],
      null,
      0,
      0,
    )
  } finally {
    companiesLoading.value = false
    updateSelectAllState()
  }
}

function getCompanyAudienceIds(company) {
  const raw = company?.UF_CRM_1753364407
  if (!raw) return []

  if (Array.isArray(raw)) return raw.map((id) => Number(id))
  if (typeof raw === 'string') {
    return raw.split(',').map((id) => Number(id.trim())).filter((id) => !Number.isNaN(id))
  }

  return [Number(raw)]
}

function getCompanyTargetAudiences(company) {
  const companyAudienceIds = getCompanyAudienceIds(company)
  return selectedAudience.value.filter((item) => companyAudienceIds.includes(Number(item.ID)))
}

async function getCurrentUser() {
  return new Promise((resolve) => {
    globalThis.BX24.callMethod('user.current', {}, (result) => {
      if (result.error()) {
        console.error(result.error())
        resolve(null)
        return
      }
      resolve(result.data())
    })
  })
}

function buildDealFields(company, contactIds, companyTargetAudiences, author) {
  const event = props.event
  return {
    TITLE: company.TITLE,
    ASSIGNED_BY_ID: author.ID,
    STAGE_ID: DEAL_STAGE_ID,
    CATEGORY_ID: String(DEAL_CATEGORY_ID),
    CONTACT_IDS: contactIds.length ? contactIds : null,
    COMPANY_ID: company.ID,
    UF_CRM_1742797326: event.id,
    UF_CRM_1754290331: contactIds.length ? contactIds : null,
    UF_CRM_1755867109691: event.ufCrm38_1751875905992,
    UF_CRM_1745308616558: event.ufCrm38_1745307580193,
    UF_CRM_1755869361: event.ufCrm38_1753082280,
    UF_CRM_1754897181: companyTargetAudiences.map((item) => item.ID),
    UF_CRM_1753365812: companyTargetAudiences.map((item) => item.ID),
    UF_CRM_1745308628574: event.ufCrm38_1745221903440,
    UF_CRM_1745995876: event.ufCrm38_1750326807,
  }
}

async function fetchCompanyContacts(companyIds) {
  const maxTotal = 50
  const resultData = []
  let cmd = {}

  for (let i = 0; i < companyIds.length; i++) {
    cmd[`cmd${i}`] = {
      method: 'crm.company.contact.items.get',
      params: { id: companyIds[i] },
    }

    if ((i + 1) % maxTotal === 0 || i + 1 === companyIds.length) {
      const batchLength = (i + 1) % maxTotal === 0 ? maxTotal : companyIds.length % maxTotal
      const batchResult = await new Promise((resolve) => {
        globalThis.BX24.callBatch(cmd, (res) => {
          const chunk = []
          for (let r = i - batchLength + 1; r < i + 1; r++) {
            const data = res[`cmd${r}`]?.data()
            chunk.push(data?.items ? data.items : data || [])
          }
          resolve(chunk)
        })
      })
      resultData.push(...batchResult)
      cmd = {}
    }
  }

  return resultData
}

async function fetchContactsForCompanies(contactGroups) {
  const audienceIds = selectedAudience.value.map((item) => item.ID)
  const cmd = {}

  contactGroups.forEach((group, index) => {
    if (!Array.isArray(group) || !group.length) {
      return
    }

    cmd[`withAudience${index}`] = {
      method: 'crm.contact.list',
      params: {
        filter: {
          ID: group.map((item) => item.CONTACT_ID),
          UF_CRM_1753364801: audienceIds,
        },
        select: ['ID'],
      },
    }

    cmd[`withoutAudience${index}`] = {
      method: 'crm.contact.list',
      params: {
        filter: {
          ID: group.map((item) => item.CONTACT_ID),
          '=UF_CRM_1753364801': '',
        },
        select: ['ID'],
      },
    }
  })

  if (!Object.keys(cmd).length) return []

  const batchResult = await new Promise((resolve) => {
    globalThis.BX24.callBatch(cmd, (res) => {
      resolve(res)
    })
  })

  const results = []
  contactGroups.forEach((group, index) => {
    if (!Array.isArray(group) || !group.length) {
      results.push([])
      return
    }

    const withAudience = batchResult[`withAudience${index}`]?.data() || []
    const withoutAudience = batchResult[`withoutAudience${index}`]?.data() || []
    const withItems = withAudience.items ? withAudience.items : withAudience
    const withoutItems = withoutAudience.items ? withoutAudience.items : withoutAudience
    results.push([].concat(withItems || [], withoutItems || []))
  })

  return results
}

async function createDealsBatch(companies, contactResults, author) {
  const cmd = {}

  companies.forEach((company, index) => {
    const companyTargetAudiences = getCompanyTargetAudiences(company)
    if (!companyTargetAudiences.length) return

    const contacts = contactResults[index] || []
    const contactIds = contacts.map((item) => +item.ID)

    cmd[`deal${index}`] = {
      method: 'crm.deal.add',
      params: {
        fields: buildDealFields(company, contactIds, companyTargetAudiences, author),
      },
    }
  })

  if (!Object.keys(cmd).length) return []

  return new Promise((resolve) => {
    globalThis.BX24.callBatch(cmd, (res) => {
      resolve(Object.values(res).map((item) => item.answer?.result).filter(Boolean))
    })
  })
}

async function updateEventAfterCreation(createdDealIds, author) {
  const event = props.event
  if (!event?.id || !createdDealIds.length) return

  const startAddedDeals = await new Promise((resolve) => {
    globalThis.BX24.callMethod(
      'crm.item.get',
      { entityTypeId: EVENT_ENTITY_TYPE_ID, id: event.id },
      (res) => resolve(res.answer?.result?.item?.ufCrm38AddedDeals || ''),
    )
  })

  await new Promise((resolve) => {
    globalThis.BX24.callMethod(
      'crm.item.update',
      {
        entityTypeId: EVENT_ENTITY_TYPE_ID,
        id: event.id,
        fields: {
          ufCrm38_AddedDeals: `${startAddedDeals} / ${createdDealIds.join(', ')}`,
        },
      },
      () => resolve(),
    )
  })

  const audienceNames = selectedAudience.value.map((item) => item.NAME).join('", "')
  const authorName = [author.LAST_NAME, author.NAME, author.SECOND_NAME].filter(Boolean).join(' ')

  await new Promise((resolve) => {
    globalThis.BX24.callMethod(
      'crm.timeline.comment.add',
      {
        fields: {
          ENTITY_ID: event.id,
          ENTITY_TYPE: 'dynamic_1052',
          COMMENT: `✅ ${authorName} взял в работу ЦА: "${audienceNames}"`,
          AUTHOR_ID: author.ID,
        },
      },
      () => resolve(),
    )
  })
}

async function createDealsForCompanies(companies) {
  const author = await getCurrentUser()
  if (!author) throw new Error('Не удалось получить текущего пользователя')

  const companyIds = companies.map((company) => company.ID)
  const contactGroups = await fetchCompanyContacts(companyIds)
  const contactResults = await fetchContactsForCompanies(contactGroups)

  totalDealsToCreate.value = companies.length
  createdDealsCount.value = 0

  const maxTotal = 50
  const createdDealIds = []

  for (let i = 0; i < companies.length; i += maxTotal) {
    const batchCompanies = companies.slice(i, i + maxTotal)
    const batchContacts = contactResults.slice(i, i + maxTotal)
    const batchCreated = await createDealsBatch(batchCompanies, batchContacts, author)
    createdDealIds.push(...batchCreated)
    createdDealsCount.value += batchCreated.length

    if (i + maxTotal < companies.length) {
      await new Promise((resolve) => setTimeout(resolve, 700))
    }
  }

  await updateEventAfterCreation(createdDealIds, author)
  return createdDealIds
}

async function submit() {
  if (!props.event?.id || !canSubmit.value) return

  loading.value = true
  failedDeals.value = []

  try {
    let companies = []

    if (props.mode === 'manual') {
      companies = selectedCompanies.value
    } else {
      companies = await callApi(
        'crm.company.list',
        { UF_CRM_1753364407: selectedAudience.value.map((item) => item.ID) },
        ['ID', 'TITLE', 'UF_CRM_1753364407', 'UF_CRM_1753364801'],
        null,
        0,
        0,
      )
    }

    const createdDealIds = await createDealsForCompanies(companies)
    completionMessage.value = createdDealIds.length
      ? 'Сделки успешно созданы'
      : 'Не найдено компаний для создания сделок'
    completionDialog.value = true
  } catch (error) {
    console.error(error)
    completionMessage.value = error instanceof Error ? error.message : 'Ошибка при создании сделок'
    completionDialog.value = true
  } finally {
    loading.value = false
  }
}

function closeCompletionDialog() {
  completionDialog.value = false
  emit('update:modelValue', false)
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

<style scoped lang="sass">
.deal-generator-dialog__title
  font-size: 1.125rem
  font-weight: 700
  line-height: 1.35
</style>
