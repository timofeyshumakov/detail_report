<template>
  <v-app>
    <LoadingProgress
      :visible="isLoading"
      :model-value="loadingProgress"
      :message="loadingMessage"
      :auto-hide="false"
    />
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3500"
      location="bottom"
    >
      {{ snackbarText }}
    </v-snackbar>
    <v-main class="report-page">
      <header class="report-header">
        <div>
          <h1>Категории + активность</h1>
        </div>
        <div class="report-actions buttons">
          <v-btn
            variant="flat"
            class="report-btn report-btn--outlined"
            :loading="isLoading"
            @click="getData()"
          >
            <template #prepend>
              <v-icon icon="mdi-refresh" />
            </template>
            Обновить
          </v-btn>
          <v-btn variant="flat" class="report-btn report-btn--outlined" prepend-icon="mdi-tray-arrow-up" @click="noopAction">Экспорт</v-btn>
          <v-btn variant="flat" class="report-btn report-btn--filled takeScreenshot" prepend-icon="mdi-camera-outline" @click="takeScreenshot">Сохранить отчёт</v-btn>
        </div>
      </header>

      <section class="filter-card panel">
        <div class="filters">
          <div class="filter-item">
            <span class="filter-label">Группа</span>
            <v-autocomplete
              v-model="filters.selected.departments"
              :items="filters.value.departments"
              item-title="NAME"
              item-value="ID"
              placeholder="Все группы"
              density="compact"
              single-line
              hide-details
              variant="outlined"
              multiple
              chips
              clearable
              prepend-inner-icon="mdi-account-group-outline"
            >
              <template v-slot:prepend-item>
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-checkbox
                        label="Выбрать все группы"
                        v-model="filters.selectAll.departments"
                        @change="() => toggleSelectAll('departments')"
                      />
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>

          <div class="filter-item">
            <span class="filter-label">Ответственный</span>
            <v-autocomplete
              v-model="filters.selected.assigned"
              :items="filteredAssignedOptions"
              item-title="FULL_NAME"
              item-value="ID"
              placeholder="Все ответственные"
              density="compact"
              single-line
              hide-details
              variant="outlined"
              multiple
              chips
              clearable
              prepend-inner-icon="mdi-account-outline"
            >
              <template v-slot:prepend-item>
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-checkbox
                        label="Выбрать всех пользователей"
                        v-model="filters.selectAll.assigned"
                        @change="() => toggleSelectAll('assigned')"
                        :disabled="filteredAssignedOptions.length === 0"
                      />
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>

          <div class="filter-item">
            <span class="filter-label">Мероприятие</span>
            <v-autocomplete
              v-model="filters.selected.events"
              :items="filters.value.events"
              item-title="title"
              item-value="id"
              placeholder="Все мероприятия"
              density="compact"
              single-line
              hide-details
              variant="outlined"
              multiple
              chips
              clearable
              prepend-inner-icon="mdi-calendar-star"
            >
              <template v-slot:prepend-item>
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-checkbox label="Выбрать все мероприятия" v-model="filters.selectAll.events" @change="() => toggleSelectAll('events')" />
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>

          <div class="filter-item">
            <span class="filter-label">Категории</span>
            <v-autocomplete
              v-model="filters.selected.category"
              :items="filters.value.category"
              item-title="title"
              item-value="id"
              placeholder="Все категории"
              density="compact"
              single-line
              hide-details
              variant="outlined"
              multiple
              chips
              clearable
              prepend-inner-icon="mdi-shield-check-outline"
            >
              <template v-slot:prepend-item>
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-checkbox label="Выбрать все категории" v-model="filters.selectAll.category" @change="() => toggleSelectAll('category')" />
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>

          <div class="filter-item">
            <span class="filter-label">Целевая аудитория</span>
            <v-autocomplete
              v-model="filters.selected.audience"
              :items="filters.value.audience"
              item-title="title"
              item-value="id"
              placeholder="Вся целевая аудитория"
              density="compact"
              single-line
              hide-details
              variant="outlined"
              multiple
              chips
              clearable
              prepend-inner-icon="mdi-account-multiple-outline"
            >
              <template v-slot:prepend-item>
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-checkbox
                        label="Выбрать всю целевую аудиторию"
                        v-model="filters.selectAll.audience"
                        @change="() => toggleSelectAll('audience')"
                      />
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>

          <div class="filter-item filter-item--period">
            <span class="filter-label">Дата</span>
            <DateFilter
              class="period-date-filter"
              :key="dateFilterKey"
              :show-input="dateFilterShowInput"
              :selected-date-name="selectedDateName"
              :selected-date-iso="selectedDateIso"
              @sendValue="onDateFilterChange"
            />
          </div>
        </div>
      </section>

      <section class="summary-cards">
        <article class="summary-card summary-card--blue">
          <img :src="summaryTotalIcon" alt="Собрано" class="summary-card__icon" />
          <div>
            <span>Собрано</span>
            <strong>{{ formatCurrency(totalRow2.summ) }}</strong>
          </div>
        </article>
        <article class="summary-card summary-card--green">
          <img :src="summaryRevenuePlanIcon" alt="План выручки" class="summary-card__icon" />
          <div>
            <span>План выручки</span>
            <strong>{{ formatCurrency(totalRow2.planProfit) }}</strong>
          </div>
        </article>
        <article class="summary-card summary-card--orange">
          <img :src="summaryEventsIcon" alt="Мероприятий" class="summary-card__icon" />
          <div>
            <span>Мероприятий</span>
            <strong>{{ groupedEvents.length }}</strong>
          </div>
        </article>
        <article class="summary-card summary-card--purple">
          <img :src="summaryDealsIcon" alt="Сделок" class="summary-card__icon" />
          <div>
            <span>Сделок</span>
            <strong>{{ table1Filtered.length }}</strong>
          </div>
        </article>
      </section>

      <section class="report-table-section">
        <v-card class="report-table-card report-table-card--sticky">
          <v-card-title class="report-table-title">
            Активность по мероприятию
          </v-card-title>
        <v-data-table
          :items="groupedEvents"
          :headers="headers2"
          class="report-data-table activity-report-table sticky-report-table"
          disable-sort
          :items-per-page="-1"
        >
          <template v-slot:item.event="{ item }">
            <button
              v-if="item.UF_CRM_1742797326"
              type="button"
              class="event-link"
              :title="`Открыть сделки: ${item.event}`"
              @click="openDealsByEvent(item.UF_CRM_1742797326, item.event)"
            >
              {{ item.event }}
            </button>
            <span v-else>{{ item.event }}</span>
          </template>
          <template v-slot:item.audience="{ item }">
            {{ item.audience }}
          </template>
          <template v-slot:item.managers="{ item }">
            <div v-if="item.managerIds?.length" class="managers-cell">
              <div
                v-for="managerId in item.managerIds"
                :key="managerId"
                class="responsible-cell"
              >
                <v-avatar size="28" color="primary" variant="tonal">
                  <img
                    v-if="getUserPhoto(managerId)"
                    :src="getUserPhoto(managerId)"
                    :alt="getUserNameById(managerId)"
                    class="avatar-image"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                    @error="markAvatarFailed(getUserPhoto(managerId))"
                  />
                  <span v-else class="avatar-initials">
                    {{ getUserInitials(getUserNameById(managerId)) }}
                  </span>
                </v-avatar>
                <span class="responsible-name" :title="getUserNameById(managerId)">
                  {{ getUserNameById(managerId) }}
                </span>
              </div>
            </div>
          </template>
          <template v-slot:item.start="{ item }">
            {{ item.start }}
          </template>
          <template v-slot:item.percent="{ item }">
            <div class="percent-cell">
              <span class="percent-cell__value">{{ formatPercent(item.percent) }}</span>
              <div class="percent-cell__track">
                <div
                  class="percent-cell__fill"
                  :class="getPercentBarClass(item.percent)"
                  :style="{ width: `${visualPercent(item.percent)}%` }"
                />
              </div>
            </div>
          </template>
          <template v-slot:item.summ="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.summ) }}
          </template>
          <template v-slot:item.over="{ item }">
            {{ item.over > 0 ? new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.over) : "" }}
          </template>
          <template v-slot:item.planProfit="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.planProfit) }}
          </template>
          <template v-slot:item.pot="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.pot) }}
          </template>
          <template v-slot:item.dog="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.dog) }}
          </template>
          <template v-slot:item.pd="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.pd) }}
          </template>
          <template v-slot:item.actions="{ item }">
            <div class="event-actions">
              <v-menu
                location="bottom end"
                :offset="[0, 8]"
                content-class="event-actions-menu-wrapper"
              >
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    variant="outlined"
                    size="small"
                    class="event-actions-trigger"
                    :disabled="!item.UF_CRM_1742797326"
                    aria-label="Действия"
                  >
                    <v-icon icon="mdi-dots-horizontal" />
                  </v-btn>
                </template>
                <v-list class="event-actions-menu" density="compact" nav>
                  <v-list-item
                    class="event-actions-menu__item"
                    prepend-icon="mdi-plus"
                    title="Точечное добавление"
                    @click="openPreciseDealForEvent(item)"
                  />
                  <v-list-item
                    class="event-actions-menu__item"
                    prepend-icon="mdi-account-multiple-outline"
                    title="Массовая генерация"
                    @click="openMassGenerationForEvent(item)"
                  />
                </v-list>
              </v-menu>
            </div>
          </template>
          <template v-slot:tfoot>
            <tfoot>
              <tr class="v-data-table__footer-row">
                <td colspan="5" class="report-table-footer-label">Итого:</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.summ) }}</td>
                <td>{{ totalRow2.over > 0 ? new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.over) : '' }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.planProfit) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.pot) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.dog) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.pd) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </template>
        </v-data-table>
        </v-card>
      </section>

      <section class="report-table-section">
        <v-card class="report-table-card report-table-card--sticky">
          <v-card-title class="report-table-title">
            Компании по категориям
          </v-card-title>
        <v-data-table
          :items="table1Filtered"
          :headers="headers"
          class="report-data-table report-data-table--paginated sticky-report-table"
          disable-sort
        >
          <template v-slot:item.ASSIGNED_BY_ID="{ item }">
            <div v-if="item.user" class="responsible-cell">
              <v-avatar size="28" color="primary" variant="tonal">
                <img
                  v-if="getUserPhoto(item.user)"
                  :src="getUserPhoto(item.user)"
                  :alt="item.ASSIGNED_BY_ID"
                  class="avatar-image"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  @error="markAvatarFailed(getUserPhoto(item.user))"
                />
                <span v-else class="avatar-initials">
                  {{ getUserInitials(item.ASSIGNED_BY_ID) }}
                </span>
              </v-avatar>
              <span class="responsible-name" :title="item.ASSIGNED_BY_ID">
                {{ item.ASSIGNED_BY_ID }}
              </span>
            </div>
            <span v-else>{{ item.ASSIGNED_BY_ID }}</span>
          </template>
          <template v-slot:item.stage="{ item }">
            <v-chip v-if="item.stage" :color="getStatusColor(item.stage)" dark>
              {{ item.stage }}
            </v-chip>
          </template>
          <template v-slot:item.UF_CRM_1745222013992="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.UF_CRM_1745222013992) }}
          </template>
          <template v-slot:item.UF_CRM_1759821112055="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.UF_CRM_1759821112055) }}
          </template>
          <template v-slot:item.UF_CRM_1742972167794="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.UF_CRM_1742972167794) }}
          </template>
          <template v-slot:item.UF_CRM_1742972105926="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.UF_CRM_1742972105926) }}
          </template>
          <template v-slot:item.UF_CRM_1744062581756="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.UF_CRM_1744062581756) }}
          </template>
          <template v-slot:item.UF_CRM_1744096783472="{ item }">
            {{ formatDate(item.UF_CRM_1744096783472) }}
          </template>
          <template v-slot:tfoot>
            <tfoot>
              <tr class="v-data-table__footer-row">
                <td colspan="5" class="report-table-footer-label">Итого:</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRowFiltered.UF_CRM_1745222013992) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRowFiltered.UF_CRM_1759821112055) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRowFiltered.UF_CRM_1742972167794) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRowFiltered.UF_CRM_1742972105926) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRowFiltered.UF_CRM_1744062581756) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </template>
        </v-data-table>
        </v-card>
      </section>
    <img v-if="screenshotSrc" ref="screenshotImg" :src="screenshotSrc" alt="Скриншот страницы" id="screenshotImg"/>
  <div>
    <!-- Диалоговое окно выбора чата -->
    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title class="headline">
          Выберите чат для отправки сообщения
        </v-card-title>

        <v-card-text>
          <!-- Поле поиска чатов -->
          <v-text-field
            v-model="search"
            label="Поиск чатов"
            append-icon="mdi-magnify"
            clearable
            class="chats-input"
          ></v-text-field>

          <!-- Список доступных чатов -->
          <v-list>
            <v-list-item
              v-for="chat in filteredChats"
              :key="chat.chat_id"
              @click="selectChat(chat)"
            >
              <v-list-item-content>
                <v-list-item-title>{{ chat.title }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ chat.message.text || 'Нет сообщений' }}
                </v-list-item-subtitle>
              </v-list-item-content>

              <v-list-item-action>
                <v-icon v-if="selectedChatId === chat.chat_id" color="primary">
                  mdi-check
                </v-icon>
              </v-list-item-action>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="dialog = false">Отмена</v-btn>
          <v-btn
            color="primary"
            :disabled="!selectedChatId"
            @click="sendMessage"
          >
            Отправить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <DealGeneratorDialog
      v-model="dealGeneratorDialog.open"
      :mode="dealGeneratorDialog.mode"
      :event="dealGeneratorDialog.event"
    />
  </div>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { callApi, getListElements } from '../functions/callApi';
import { useStickyReportTableHeaders } from '../composables/useStickyReportTableHeaders';
import moment from 'moment';
import html2canvas from 'html2canvas'; // подключаем библиотеку
import DateFilter from '../components/TheForm/Date/Date.vue';
import LoadingProgress from '../components/LoadingProgress.vue';
import DealGeneratorDialog from '../components/DealGeneratorDialog.vue';
import { useSnackbar } from '../composables/useSnackbar';
import { buildCompanyTableDateFilter, formatDateFilterRange, isDealWithinDateRange, isEventWithinDateRange } from '../functions/dateFilter';
import summaryTotalIcon from '../assets/summary/total.png';
import summaryRevenuePlanIcon from '../assets/summary/revenue-plan.png';
import summaryEventsIcon from '../assets/summary/events.png';
import summaryDealsIcon from '../assets/summary/deals.png';

const { snackbar, snackbarText, snackbarColor, showSnackbar } = useSnackbar();
const {
  mountStickyReportTableHeaders,
  refreshStickyReportTableHeaders,
  unmountStickyReportTableHeaders,
} = useStickyReportTableHeaders();

const selectedDateIso = ref([null, null]);
const selectedDateName = ref('Любая дата');
const dateFilterShowInput = ref([false, false, false, false, false, false, false, false]);
const dateFilterKey = ref(0);
const isInitialLoadDone = ref(false);

function onDateFilterChange(value) {
  selectedDateIso.value = Array.isArray(value) ? [value[0] || null, value[1] || null] : [null, null];
}

function formatDate(date) {
  if (!date) return '';
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Date(date).toLocaleDateString('ru-RU', options);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(Number(value) || 0);
}

function noopAction() {}

const EVENT_ENTITY_TYPE_ID = 1052
const DEAL_EVENT_FIELD = 'UF_CRM_1742797326'
const DEAL_CATEGORY_ID = 32

function getBitrixPortalOrigin() {
  const domain = globalThis.BX24?.getAuth?.()?.domain
  if (domain) return `https://${domain}`
  return window.location.origin
}

function openBitrixPath(path, { newTab = true } = {}) {
  const url = path.startsWith('http') ? path : `${getBitrixPortalOrigin()}${path}`

  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }

  if (globalThis.BX24?.openPath) {
    globalThis.BX24.openPath(path, true)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

function buildDealEventFilterValue(eventId) {
  const id = Number(eventId)
  if (!Number.isFinite(id)) {
    return JSON.stringify({ [`DYNAMIC_${EVENT_ENTITY_TYPE_ID}`]: [String(eventId)] })
  }
  return JSON.stringify({ [`DYNAMIC_${EVENT_ENTITY_TYPE_ID}`]: [id] })
}

function resolveEventTitle(eventId, fallbackTitle = '') {
  const title = String(fallbackTitle || '').trim()
  if (title) return title
  return findEventById(eventId)?.title || ''
}

function buildDealListEventFilterPath(eventId, eventTitle = '') {
  const params = new URLSearchParams()
  params.set('apply_filter', 'Y')
  params.set(DEAL_EVENT_FIELD, buildDealEventFilterValue(eventId))

  const title = resolveEventTitle(eventId, eventTitle)
  if (title) {
    params.set(`${DEAL_EVENT_FIELD}_label`, title)
  }

  return `/crm/deal/list/?${params.toString()}`
}

function openDealsByEvent(eventId, eventTitle = '') {
  if (eventId == null || eventId === '') return

  const path = buildDealListEventFilterPath(eventId, eventTitle)

  if (globalThis.BX24?.openPath) {
    globalThis.BX24.openPath(path, true)
    return
  }

  openBitrixPath(path)
}

function resolveEventForDealGenerator(item) {
  const eventId = item?.UF_CRM_1742797326
  if (eventId == null || eventId === '') return null
  return findEventById(eventId) || { id: eventId, title: item?.event || '' }
}

const dealGeneratorDialog = ref({
  open: false,
  mode: 'mass',
  event: null,
})

function openDealGeneratorAction(item, mode) {
  const event = resolveEventForDealGenerator(item)
  if (!event) return

  dealGeneratorDialog.value = {
    open: true,
    mode,
    event,
  }
}

function openPreciseDealForEvent(item) {
  openDealGeneratorAction(item, 'manual')
}

function openMassGenerationForEvent(item) {
  openDealGeneratorAction(item, 'mass')
}


function formatErrorMessage(error, fallback = 'Произошла ошибка') {
  if (error instanceof Error) return error.message || fallback
  if (typeof error === 'string') return error || fallback
  if (error?.message) return String(error.message)
  return fallback
}

function showError(error, fallback = 'Произошла ошибка') {
  showSnackbar(formatErrorMessage(error, fallback), 'error')
}

const isLoading = ref(true);
const loadingProgress = ref(0);
const loadingMessage = ref('Инициализация…');
const deals = ref([]);
const deals2 = ref([]);
const events = ref([]);
const userProfilesById = ref({});
const failedAvatars = ref(new Set());

const totalRow = ref({
  UF_CRM_1745222013992: 0,
  UF_CRM_1759821112055: 0,
  UF_CRM_1742972167794: 0,
  UF_CRM_1742972105926: 0,
  UF_CRM_1744062581756: 0,
});

// chats
const dialog = ref(false)
const search = ref('')
const selectedChatId = ref(null)

const filteredChats = computed(() => {
  if (!search.value) return chats.value
  return chats.value.filter(chat =>
    chat.title.toLowerCase().includes(search.value.toLowerCase())
  )
})

function selectChat(chat) {
  selectedChatId.value = chat.chat_id;
}

function finishLoading() {
  loadingProgress.value = 100;
  loadingMessage.value = 'Готово';
  setTimeout(() => {
    isLoading.value = false;
  }, 100);
}

async function sendMessage() {
  try {

  if (!selectedChatId.value) return;
  isLoading.value = true;
  loadingProgress.value = 35;
  loadingMessage.value = 'Загрузка файла на Диск…';
  let result = '';
await new Promise((resolve) => {
  BX24.callMethod(
    "disk.folder.uploadfile",
    {
        id: 1143900,
        data: {
            NAME: "report.jpg"
        },
        fileContent: document.getElementById('screenshotImg').src.replace('data:image/png;base64,', ''),
        generateUniqueName: true,
    },
    function (res)
    {
           result = res.data();
          resolve();
    }
  );
});

  loadingProgress.value = 72;
  loadingMessage.value = 'Отправка файла в чат…';

BX24.callMethod(
    'im.disk.file.commit',
    {
        'CHAT_ID': selectedChatId.value,
        'UPLOAD_ID': result.ID,
    },
    function(res){}
);
    showSnackbar('Скриншот отправлен', 'success')
  } catch (error) {
    showError(error, 'Ошибка при отправке скриншота')
  } finally {
    screenshotSrc.value = null;
    dialog.value = false;
    finishLoading();
  }
}
const chats = ref([]);
const screenshotSrc = ref(null); // ссылка на изображение скриншота
async function takeScreenshot() {

  const filtersPanel = document.querySelector(".v-expansion-panels");
  const buttons = document.querySelector(".buttons");
  const screenshotButton = document.querySelector(".takeScreenshot");

  if (filtersPanel) filtersPanel.style.display = 'none';
  if (buttons) buttons.style.display = 'none';
  if (screenshotButton) screenshotButton.style.display = 'none';
  try {
    isLoading.value = true;
    loadingProgress.value = 25;
    loadingMessage.value = 'Формирование изображения страницы…';
    // рисуем весь документ body на холсте
    const canvas = await html2canvas(document.body);
    const imageSrc = canvas.toDataURL('image/png'); // сохраняем изображение в base64
    screenshotSrc.value = imageSrc; // устанавливаем ссылку на изображение
    loadingProgress.value = 88;
    loadingMessage.value = 'Подготовка к отправке…';
  } catch (error) {
    showError(error, 'Ошибка при создании скриншота')
  } finally {
    if (filtersPanel) filtersPanel.style.display = 'flex';
    if (buttons) buttons.style.display = 'flex';
    if (screenshotButton) screenshotButton.style.display = 'block';
    finishLoading();
  }
  if(chats.value.length === 0){
/*
      let result = await BX24.callMethod('im.recent.list', {'SKIP_OPENLINES': 'Y'}, (res) => {
            if (res.data()) {
              total = res.total();
              data = res.data();
              parsed += total;
            }
          });
*/
    const result = await callApi('im.recent.list', {'SKIP_OPENLINES': 'Y'}, [], null, null, null);
    chats.value = JSON.parse(JSON.stringify(result));
  }
  dialog.value = true;
}
//
const panel = ref(true);

const SALES_DEPARTMENTS = [
  { ID: '440', NAME: '1 группа', SORT: 0, PARENT: '5', UF_HEAD: '484' },
  { ID: '446', NAME: '2 группа', SORT: 100, PARENT: '5', UF_HEAD: '73' },
  { ID: '444', NAME: '3 группа', SORT: 200, PARENT: '5', UF_HEAD: '120' },
]

const EVENT_AUDIENCE_FIELD = 'ufCrm38_1753365559'
const AUDIENCE_LIST_ID = 216
const audienceDirectory = ref([])

const filters = ref({

value: {
  'assigned': [],
  'events': [],
  'audience': [],
  'departments': SALES_DEPARTMENTS,
  'category': [
    {id: "C32:UC_LXYCFO", title: "Потенциал - холодный"},
    {id: "C32:UC_VJZ0FL", title: "Потенциал - теплый"},
    {id: "C32:UC_6VDO9F", title: "Договоренности - холодные"},
    {id: "C32:UC_5BBXZ5", title: "Договоренности - теплые"},
    {id: "C32:UC_R5DX1H", title: "Передано"},
  ],
},

selected: {
  departments: [],
  assigned: [],
  events: [],
  category: [],
  audience: [],
},

selectAll: {
  'departments': false,
  'assigned': false,
  'events': false,
  'category': false,
  'audience': false,
}
});
function disableFilters(){
  panel.value = false;
  for (let i = 0; i < Object.keys(filters.value.selectAll).length; i++) {
    filters.value.selectAll[Object.keys(filters.value.selectAll)[i]] = false;
    filters.value.selected[Object.keys(filters.value.selected)[i]] = [];
  }
  selectedDateIso.value = [null, null];
  selectedDateName.value = 'Любая дата';
  dateFilterShowInput.value = [false, false, false, false, false, false, false, false];
  dateFilterKey.value += 1;
}

const headers = ref([
  { title: "Мероприятие", key: "event", align: "start"},
  { title: "Компания", key: "UF_CRM_1744890618774", align: "center"},
  { title: "Ответственный", key: "ASSIGNED_BY_ID", align: "start"},
  { title: "Статус", key: "status", align: "center"},
  { title: "Категория", key: "stage", align: "center"},
  { title: "Предварительная", key: "UF_CRM_1745222013992", align: "center"},
  { title: "Финальная", key: "UF_CRM_1759821112055", align: "center"},
  { title: "Внебюджет", key: "UF_CRM_1742972167794", align: "center"},
  { title: "Доп. продажи", key: "UF_CRM_1742972105926", align: "center"},
  { title: "Общая", key: "UF_CRM_1744062581756", align: "center"},
  { title: "Дата передачи", key: "UF_CRM_1744096783472", align: "center"},
  
]);

const headers2 = ref([
  { title: "Мероприятие", key: "event", align: "start"},
  { title: "Целевая аудитория", key: "audience", align: "start"},
  { title: "Ответственные менеджеры", key: "managers", align: "start"},
  { title: "Дата", key: "start", align: "center"},
  { title: "% Выполнения", key: "percent", align: "center"},
  { title: "Собрано", key: "summ", align: "center"},
  { title: "Собрано сверху", key: "over", align: "center"},
  { title: "План выручки", key: "planProfit", align: "center"},
  { title: "Потенциал", key: "pot", align: "center"},
  { title: "Договоренности", key: "dog", align: "center"},
  { title: "Сумма П/Д", key: "pd", align: "center"},
  { title: "Действия", key: "actions", align: "start", sortable: false },
]);


const getStatusColor = (status) => {
  switch (status) {
    case "Потенциал - холодный":
      return 'blue';
    case "Потенциал - теплый":
      return '#BA8E23';
    case "Договоренности - холодные":
      return 'blue';
    case "Договоренности - теплые":
      return '#BA8E23';
    case "Передано":
      return 'green';
    default:
      return 'grey';
  }
};

  const toggleSelectAll = (type) => {
    if (type === 'assigned') {
      if (filters.value.selectAll[type]) {
        filters.value.selected[type] = filteredAssignedOptions.value.map((item) => item.ID)
      } else {
        filters.value.selected[type] = []
      }
      return
    }

    if (filters.value.selectAll[type]) {
      filters.value.selected[type] =
      typeof filters.value.value[type][0] === 'object'
        ? filters.value.value[type].map((item) => item.id || item.ID)
        : filters.value.value[type];
    } else {
      filters.value.selected[type] = [];
    }
  };

function stringifyDeptId(id) {
  if (id == null || id === '') return ''
  return String(id)
}

function hasAnyDepartmentMatch(employeeDepartmentIds = [], selectedDepartmentIds = []) {
  if (!selectedDepartmentIds.length) return true
  const selectedSet = new Set(selectedDepartmentIds.map(stringifyDeptId).filter(Boolean))
  return employeeDepartmentIds
    .map(stringifyDeptId)
    .some((deptId) => selectedSet.has(deptId))
}

function syncAssignedFromSelectedDepartments() {
  const departmentIds = filters.value.selected.departments
  if (!departmentIds.length) return

  const options = filteredAssignedOptions.value
  filters.value.selected.assigned = options.map((user) => user.ID)
  filters.value.selectAll.assigned = options.length > 0
}

const filteredAssignedOptions = computed(() => {
  if (!deals.value.length) return []

  const assignedIds = new Set(deals.value.map((deal) => String(deal.ASSIGNED_BY_ID)))

  let users = (filters.value.value.assigned || []).filter((user) =>
    assignedIds.has(String(user.ID))
  )

  if (filters.value.selected.departments.length > 0) {
    users = users.filter((user) =>
      hasAnyDepartmentMatch(user.departmentIds || [], filters.value.selected.departments)
    )
  }

  return users
})

const filteredDealsForEvents = computed(() => {
  const selectedCategory = new Set(asArray(filters.value.selected.category).map(String))
  const selectedAssigned = new Set(asArray(filters.value.selected.assigned).map(String))
  const selectedEvents = new Set(asArray(filters.value.selected.events).map(String))

  return deals.value.filter((deal) => {
    if (selectedCategory.size && !selectedCategory.has(String(deal.STAGE_ID))) return false
    if (selectedAssigned.size && !selectedAssigned.has(String(deal.ASSIGNED_BY_ID))) return false
    if (selectedEvents.size && !selectedEvents.has(String(deal.UF_CRM_1742797326))) return false
    return true
  })
})
const groupedEvents = computed(() => {
  const groups = {};
  
  filteredDealsForEvents.value.forEach(deal => {
    const event = findEventById(deal.UF_CRM_1742797326);
    if (!eventPassesFilters(event)) return;
    
    if (!groups[deal.UF_CRM_1742797326]) {
      groups[deal.UF_CRM_1742797326] = createEventGroupRow(event, deal);
    }
    
    const summDeal = parseFloat(deal.UF_CRM_1744062581756);

    // Увеличиваем собранную сумму для переданных сделок
    if(deal.STAGE_ID === "C32:UC_R5DX1H"){
      groups[deal.UF_CRM_1742797326].summ += summDeal;
    }
    
    // Увеличиваем потенциал для соответствующих стадий
    if( deal.STAGE_ID === "C32:UC_LXYCFO" || deal.STAGE_ID === "C32:UC_VJZ0FL"){
      groups[deal.UF_CRM_1742797326].pot += summDeal;
    }else if( deal.STAGE_ID === "C32:UC_5BBXZ5" || deal.STAGE_ID === "C32:UC_6VDO9F"){
      groups[deal.UF_CRM_1742797326].dog += summDeal;
    }
    
    // Увеличиваем сумму П/Д для соответствующих стадий
    if(deal.STAGE_ID === "C32:UC_LXYCFO" || deal.STAGE_ID === "C32:UC_VJZ0FL" || 
       deal.STAGE_ID === "C32:UC_5BBXZ5" || deal.STAGE_ID === "C32:UC_6VDO9F"){
      groups[deal.UF_CRM_1742797326].pd += summDeal;
    }
    
    // Увеличиваем over для всех стадий, кроме передано
    if(deal.STAGE_ID === "C32:UC_LXYCFO" || deal.STAGE_ID === "C32:UC_VJZ0FL" || 
       deal.STAGE_ID === "C32:UC_5BBXZ5" || deal.STAGE_ID === "C32:UC_6VDO9F"){
      groups[deal.UF_CRM_1742797326].over += summDeal;
    }
  });

  getFilteredEventIds().forEach((eventId) => {
    if (groups[eventId]) return

    const event = findEventById(eventId)
    if (!event || !eventPassesFilters(event)) return

    groups[eventId] = createEventGroupRow(event)
  })

  const result = Object.values(groups).filter((row) => {
    const event = findEventById(row.UF_CRM_1742797326)
    return eventPassesFilters(event)
  })

  // После обработки всех сделок, корректируем значение over для каждого мероприятия
  for (const innerObj of result) {
    innerObj.percent = resolveEventPercent(
      findEventById(innerObj.UF_CRM_1742797326),
      innerObj.summ,
      innerObj.planProfit,
    )

    // РАСЧЕТ СОБРАНО СВЕРХУ: Собранная сумма - План выручки
    const overValue = parseFloat(innerObj.summ) - parseFloat(innerObj.planProfit);
    
    // Проверка значения "over" - показываем только если > 0
    if (overValue > 0) {
      innerObj.over = overValue.toFixed(2); // Форматируем до 2 знаков после запятой
    } else {
      innerObj.over = ''; // Пустая строка, если <= 0
    }
  }

  return result.sort((a, b) => {
    const aHasSumm = parseFloat(a.summ) > 0
    const bHasSumm = parseFloat(b.summ) > 0
    if (aHasSumm === bHasSumm) return 0
    return aHasSumm ? -1 : 1
  })
});

const table1 = ref([]);
const table1Filtered = computed(() => {
  const selectedCategory = new Set(asArray(filters.value.selected.category).map(String))
  const selectedAssigned = new Set(asArray(filters.value.selected.assigned).map(String))
  const selectedEvents = new Set(asArray(filters.value.selected.events).map(String))
  const selectedDepartments = asArray(filters.value.selected.departments).map(String)
  const [dateFrom, dateTo] = formatDateFilterRange(selectedDateIso.value)

  return table1.value.filter((row) => {
    if (selectedCategory.size && !selectedCategory.has(String(row.STAGE_ID))) return false
    if (selectedAssigned.size && !selectedAssigned.has(String(row.user))) return false
    if (selectedEvents.size && !selectedEvents.has(String(row.UF_CRM_1742797326))) return false

    const event = findEventById(row.UF_CRM_1742797326)
    if (!eventMatchesAudienceFilter(event)) return false

    if (selectedDepartments.length) {
      const assignee = asArray(filters.value.value.assigned).find((user) => String(user.ID) === String(row.user))
      if (!assignee || !hasAnyDepartmentMatch(assignee.departmentIds || [], selectedDepartments)) return false
    }

    if (!isDealWithinDateRange(row.UF_CRM_1744096783472, dateFrom, dateTo)) return false
    return true
  })
})
const totalRowFiltered = computed(() => {
  const row = {
    UF_CRM_1745222013992: 0,
    UF_CRM_1759821112055: 0,
    UF_CRM_1742972167794: 0,
    UF_CRM_1742972105926: 0,
    UF_CRM_1744062581756: 0,
  }
  table1Filtered.value.forEach((deal) => {
    row.UF_CRM_1745222013992 += +deal.UF_CRM_1745222013992 || 0
    row.UF_CRM_1759821112055 += +deal.UF_CRM_1759821112055 || 0
    row.UF_CRM_1742972167794 += +deal.UF_CRM_1742972167794 || 0
    row.UF_CRM_1742972105926 += +deal.UF_CRM_1742972105926 || 0
    row.UF_CRM_1744062581756 += +deal.UF_CRM_1744062581756 || 0
  })
  return row
})
const totalRow2 = computed(() => {
  if(groupedEvents.value !== undefined){
    const row = {
      summ: 0,
      pot: 0,
      dog: 0,
      pd: 0,
      over: 0,
      planProfit: 0,
    }

    groupedEvents.value.forEach(deal => {
      row.summ += parseFloat(deal.summ) || 0;
      row.pot += parseFloat(deal.pot) || 0;
      row.dog += parseFloat(deal.dog) || 0;
      row.pd += parseFloat(deal.pd) || 0;
      row.planProfit += parseFloat(deal.planProfit) || 0;
      
      // Для "Собрано сверху" суммируем только положительные значения
      const overValue = parseFloat(deal.over) || 0;
      if (overValue > 0) {
        row.over += overValue;
      }
    });
    
    return row;
  }
  return {
    summ: 0,
    pot: 0,
    dog: 0,
    pd: 0,
    over: 0,
    planProfit: 0,
  };
});


function resolveUserPhotoUrl(photo) {
  const rawPhoto =
    typeof photo === 'string'
      ? photo
      : photo && typeof photo === 'object'
        ? String(photo.src || photo.url || photo.URL || '')
        : '';

  if (!rawPhoto) return '';
  if (rawPhoto.startsWith('http')) return rawPhoto;
  if (rawPhoto.startsWith('//')) return `https:${rawPhoto}`;

  const domain =
    globalThis.BX24?.getAuth?.()?.domain ||
    window.location.hostname;

  return `https://${domain}${rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`}`;
}

function markAvatarFailed(url) {
  if (!url) return;
  failedAvatars.value = new Set([...failedAvatars.value, url]);
}

function getUserInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function registerUserProfile(user) {
  if (!user?.ID) return;

  const name = displayFullName(user.LAST_NAME, user.NAME, user.SECOND_NAME);
  userProfilesById.value[String(user.ID)] = {
    name,
    photo: resolveUserPhotoUrl(user.PERSONAL_PHOTO),
  };
}

function getUserNameById(userId) {
  if (!userId) return '';
  return userProfilesById.value[String(userId)]?.name || '';
}

function getUserPhoto(userId) {
  if (!userId) return '';
  const url = userProfilesById.value[String(userId)]?.photo || '';
  if (!url || failedAvatars.value.has(url)) return '';
  return url;
}

function getEventManagerIds(raw) {
  if (raw == null || raw === '') return [];
  const ids = Array.isArray(raw) ? raw : [raw];
  return ids
    .map((id) => String(id))
    .filter(Boolean);
}

function asArray(value) {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function getFilteredEventIds() {
  const selectedEvents = asArray(filters.value.selected.events)
  const source = selectedEvents.length === 0
    ? asArray(filters.value.value.events)
    : selectedEvents.map((id) => ({ id }))

  return source
    .map((item) => {
      const eventId = String(item.id ?? item)
      const event = findEventById(eventId)
      return event && eventPassesFilters(event) ? eventId : null
    })
    .filter(Boolean)
}

function findEventById(eventId) {
  if (eventId == null || eventId === '') return null
  const id = String(eventId)
  return events.value.find((item) => String(item.id) === id)
    || asArray(filters.value.value.events).find((item) => String(item.id) === id)
    || null
}

function getSelectedDateRange() {
  return formatDateFilterRange(selectedDateIso.value)
}

function eventMatchesDateFilter(event) {
  const [from, to] = getSelectedDateRange()
  return isEventWithinDateRange(event?.ufCrm38_1745307580193, from, to)
}

function eventMatchesEventsFilter(event) {
  const selectedEvents = asArray(filters.value.selected.events)
  if (!selectedEvents.length) return true
  const selectedSet = new Set(selectedEvents.map(String))
  return selectedSet.has(String(event?.id))
}

function eventMatchesDepartmentFilter(event) {
  const departmentIds = filters.value.selected.departments
  if (!departmentIds.length) return true

  const managerIds = getEventManagerIds(event?.ufCrm38_1753082810)
  if (!managerIds.length) return false

  const assigned = asArray(filters.value.value.assigned)
  return managerIds.some((managerId) => {
    const user = assigned.find((item) => String(item.ID) === managerId)
    return user && hasAnyDepartmentMatch(user.departmentIds || [], departmentIds)
  })
}

function eventMatchesAssignedFilter(event) {
  const selectedAssigned = asArray(filters.value.selected.assigned)
  if (!selectedAssigned.length) return true

  const selectedSet = new Set(selectedAssigned.map(String))
  const managerIds = getEventManagerIds(event?.ufCrm38_1753082810)
  return managerIds.some((id) => selectedSet.has(id))
}

function getEventAudienceRaw(event) {
  return event?.[EVENT_AUDIENCE_FIELD]
    ?? event?.UF_CRM_38_1753365559
    ?? event?.ufCrm38_1753365559
}

function normalizeAudienceValues(raw) {
  if (raw == null || raw === '') return []

  const items = Array.isArray(raw) ? raw : [raw]
  return items
    .map((item) => {
      if (typeof item === 'object' && item != null) {
        return String(item.id ?? item.ID ?? item.value ?? item.VALUE ?? item.title ?? item.TITLE ?? '')
      }
      return String(item)
    })
    .filter(Boolean)
}

function buildAudienceOptions(eventItems) {
  const map = new Map()
  const directoryTitleMap = new Map(
    asArray(audienceDirectory.value).map((item) => [String(item.ID), String(item.NAME || item.TITLE || item.ID)])
  )

  asArray(eventItems).forEach((event) => {
    const raw = getEventAudienceRaw(event)
    if (raw == null || raw === '') return

    const items = Array.isArray(raw) ? raw : [raw]
    items.forEach((item) => {
      if (typeof item === 'object' && item != null) {
        const id = String(item.id ?? item.ID ?? item.value ?? item.VALUE ?? item.title ?? item.TITLE ?? '')
        const title = String(item.title ?? item.TITLE ?? directoryTitleMap.get(id) ?? item.value ?? item.VALUE ?? id)
        if (id) map.set(id, { id, title })
        return
      }

      const value = String(item)
      if (value) map.set(value, { id: value, title: directoryTitleMap.get(value) || value })
    })
  })

  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, 'ru'))
}

function eventMatchesAudienceFilter(event) {
  const selectedAudience = asArray(filters.value.selected.audience)
  if (!selectedAudience.length) return true

  const selectedSet = new Set(selectedAudience.map(String))
  const values = normalizeAudienceValues(getEventAudienceRaw(event))
  return values.some((value) => selectedSet.has(value))
}

function eventPassesFilters(event) {
  if (!event) return false
  if (!eventMatchesEventsFilter(event)) return false
  if (!eventMatchesDateFilter(event)) return false
  if (!eventMatchesDepartmentFilter(event)) return false
  if (!eventMatchesAssignedFilter(event)) return false
  if (!eventMatchesAudienceFilter(event)) return false
  return true
}

function parseMoneyField(raw) {
  if (raw == null || raw === '') return 0
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  if (typeof raw === 'object') {
    if (raw.amount != null) return parseMoneyField(raw.amount)
    if (raw.value != null) return parseMoneyField(raw.value)
  }

  const normalized = String(raw).replace(/\|RUB$/i, '').replace(/\s/g, '').replace(',', '.')
  const value = parseFloat(normalized)
  return Number.isFinite(value) ? value : 0
}

function resolveEventPercent(event, summ, planProfit) {
  const plan = parseFloat(planProfit) || 0
  const collected = parseFloat(summ) || 0

  if (plan > 0) {
    return Math.round((collected / plan) * 10000) / 100
  }

  const raw = event?.ufCrm38_1750948951651
  return raw ? Math.round(parseFloat(String(raw)) * 100) / 100 : 0
}

function formatEventAudience(event) {
  const values = normalizeAudienceValues(getEventAudienceRaw(event))
  if (!values.length) return ''

  const options = asArray(filters.value.value.audience)
  const directoryTitleMap = new Map(
    asArray(audienceDirectory.value).map((item) => [String(item.ID), String(item.NAME || item.TITLE || item.ID)])
  )
  return values
    .map((id) => options.find((item) => String(item.id) === id)?.title || directoryTitleMap.get(id) || id)
    .filter(Boolean)
    .join(', ')
}

function createEventGroupRow(event, deal = null) {
  const planProfit = parseMoneyField(event?.ufCrm38_1745221903440)

  return {
    UF_CRM_1742797326: event?.id ?? deal?.UF_CRM_1742797326,
    percent: resolveEventPercent(event, 0, planProfit),
    start: formatEventDates(event),
    summ: 0,
    pot: 0,
    planProfit,
    over: '',
    dog: 0,
    pd: 0,
    UF_CRM_1744062581756: deal?.UF_CRM_1744062581756,
    STAGE_ID: deal?.STAGE_ID,
    event: event?.title || '',
    audience: event ? formatEventAudience(event) : '',
    managers: event ? formatEventManagers(event.ufCrm38_1753082810) : '',
    managerIds: event ? getEventManagerIds(event.ufCrm38_1753082810) : [],
    UF_CRM_1745222013992: deal?.UF_CRM_1745222013992,
  }
}

function formatEventDates(event) {
  const startRaw = event?.ufCrm38_1745307580193
  const endRaw = event?.ufCrm38_1751875905992
  if (!startRaw) return ''
  const start = moment(startRaw.split('T')[0]).format('DD.MM.YYYY')
  if (!endRaw) return start
  const end = moment(endRaw.split('T')[0]).format('DD.MM.YYYY')
  return start === end ? start : `${start} - ${end}`
}

function formatEventManagers(raw) {
  if (raw == null || raw === '') return ''
  const ids = Array.isArray(raw) ? raw : [raw]
  const assigned = Array.isArray(filters.value.value.assigned) ? filters.value.value.assigned : []
  return ids
    .map((id) => {
      const key = String(id)
      if (userProfilesById.value[key]?.name) return userProfilesById.value[key].name
      return assigned.find((u) => String(u.ID) === key)?.FULL_NAME || ''
    })
    .filter(Boolean)
    .join(', ')
}

async function loadEventManagerUsers(eventItems) {
  const managerIds = new Set()
  eventItems.forEach((event) => {
    const raw = event.ufCrm38_1753082810
    if (raw == null || raw === '') return
    const ids = Array.isArray(raw) ? raw : [raw]
    ids.forEach((id) => {
      if (id != null && id !== '') managerIds.add(String(id))
    })
  })

  const missingIds = [...managerIds].filter((id) => !userProfilesById.value[id])
  if (!missingIds.length) return

  const users = await callApi(
    'user.get',
    { ID: missingIds },
    ['ID', 'NAME', 'SECOND_NAME', 'LAST_NAME', 'PERSONAL_PHOTO'],
    null,
    0,
    0,
  )
  ;(Array.isArray(users) ? users : []).forEach(registerUserProfile)
}

function displayFullName(firstName, middleName, lastName) {
    // Создаем массив для хранения частей ФИО
    const fullNameParts = [];

    // Проверяем каждую часть и добавляем в массив, если она существует
    if (firstName) {
        fullNameParts.push(firstName);
    }
    if (middleName) {
        fullNameParts.push(middleName);
    }
    if (lastName) {
        fullNameParts.push(lastName);
    }

    // Объединяем массив в строку, разделяя пробелами
    const fullName = fullNameParts.join(' ');

    // Возвращаем или выводим полное имя
    return fullName || 'Имя не указано';
}

function stageMap(stage){
    let stageName;

    switch (stage) {
        case "C32:UC_LXYCFO":
            stageName = "Потенциал - холодный";
            break;
        case "C32:UC_VJZ0FL":
            stageName = "Потенциал - теплый";
            break;
        case "C32:UC_6VDO9F":
            stageName = "Договоренности - холодные";
            break;
        case "C32:UC_5BBXZ5":
            stageName = "Договоренности - теплые";
            break;
        case "C32:UC_R5DX1H":
            stageName = "Передано";
            break;
        default:
            stageName = "";
            break;
    }

    return stageName;
}

function parsePercent(percent) {
  const value = Number(percent);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function visualPercent(percent) {
  return Math.min(100, parsePercent(percent));
}

function formatPercent(percent) {
  const value = parsePercent(percent);
  return `${Number.isInteger(value) ? value : Math.round(value)}%`;
}

function getPercentBarClass(percent) {
  const value = visualPercent(percent);
  if (value <= 40) return 'percent-cell__fill--red';
  if (value <= 74) return 'percent-cell__fill--orange';
  return 'percent-cell__fill--green';
}

onMounted(async () => {
  mountStickyReportTableHeaders();

  try {
    loadingMessage.value = 'Загрузка списка мероприятий…';
    loadingProgress.value = 12;
    filters.value.value.events = await callApi("crm.item.list", 
      { "!ufCrm38_1751875905992": "null" }, 
      ["id", "title"], 
      1052, 0, 0
    );
    
    loadingMessage.value = 'Загрузка пользователей…';
    loadingProgress.value = 22;
    const assigned = await callApi("user.get", {}, ["NAME", "SECOND_NAME", "LAST_NAME", "ID", "UF_DEPARTMENT", "PERSONAL_PHOTO"], null, 0, 0);

    filters.value.value.assigned = assigned.map((user) => {
      const parts = []
      if (user.NAME) parts.push(user.NAME)
      if (user.SECOND_NAME) parts.push(user.SECOND_NAME)
      if (user.LAST_NAME) parts.push(user.LAST_NAME)

      const mapped = {
        ...user,
        FULL_NAME: parts.join(' '),
        departmentIds: Array.isArray(user.UF_DEPARTMENT)
          ? user.UF_DEPARTMENT.map((id) => String(id))
          : (user.UF_DEPARTMENT ? [String(user.UF_DEPARTMENT)] : []),
      }
      registerUserProfile(mapped)
      return mapped
    })
    
    loadingMessage.value = 'Загрузка отчёта по сделкам…';
    loadingProgress.value = 28;
    await getData();
    isInitialLoadDone.value = true;
    refreshStickyReportTableHeaders();
  } catch (error) {
    console.error('Ошибка при инициализации отчёта:', error);
    showError(error, 'Ошибка при инициализации отчёта');
    finishLoading();
  }
});

onUnmounted(() => {
  unmountStickyReportTableHeaders();
});

watch(
  () => filters.value.selected.departments,
  (newVal) => {
    filters.value.selectAll.departments = newVal.length === filters.value.value.departments.length

    if (newVal.length > 0) {
      syncAssignedFromSelectedDepartments()
    } else {
      filters.value.selected.assigned = []
      filters.value.selectAll.assigned = false
    }
  },
  { deep: true }
)

watch(
  () => filters.value.value.assigned,
  () => syncAssignedFromSelectedDepartments(),
  { deep: true }
)

watch(
  () => deals.value,
  () => {
    if (filters.value.selected.departments.length > 0) {
      syncAssignedFromSelectedDepartments()
      return
    }

    if (deals.value.length > 0) {
      const assignedIds = new Set(deals.value.map((deal) => String(deal.ASSIGNED_BY_ID)))
      filters.value.selected.assigned = filters.value.selected.assigned.filter((userId) =>
        assignedIds.has(String(userId))
      )
    }
  },
  { deep: true }
)

watch(
  () => filters.value.selected.assigned,
  (newVal) => {
    filters.value.selectAll.assigned = newVal.length === filteredAssignedOptions.value.length
  },
  { deep: true }
)

const getData = async () => {
  isLoading.value = true;
  loadingProgress.value = 0;
  loadingMessage.value = 'Подготовка фильтров и запроса…';

  try {
  loadingProgress.value = Math.max(loadingProgress.value, 8);
  loadingMessage.value = 'Подготовка фильтров и запроса…';

  // Сброс итоговых сумм
  totalRow.value = {
    UF_CRM_1745222013992: 0,
    UF_CRM_1759821112055: 0,
    UF_CRM_1742972167794: 0,
    UF_CRM_1742972105926: 0,
    UF_CRM_1744062581756: 0,
  };

  // Подготовка фильтров
  const filterAssigned = filters.value.selected.assigned.length === 0 
    ? filters.value.value.assigned.map(item => item.ID) 
    : filters.value.selected.assigned;
  
  const filterCategory = filters.value.selected.category.length === 0 
    ? filters.value.value.category.map(item => item.id) 
    : filters.value.selected.category;
  
  const filterEvents = asArray(filters.value.selected.events).length === 0 
    ? asArray(filters.value.value.events).map(item => item.id) 
    : asArray(filters.value.selected.events);

  const [dateFrom, dateTo] = formatDateFilterRange(selectedDateIso.value);

  const dealFiltersForCompanies = {
    ...buildCompanyTableDateFilter(selectedDateIso.value),
    "STAGE_ID": filterCategory,
    "ASSIGNED_BY_ID": filterAssigned,
    "UF_CRM_1742797326": filterEvents,
  };

  const dealFiltersForEvents = {
    "STAGE_ID": filterCategory,
    "ASSIGNED_BY_ID": filterAssigned,
    "UF_CRM_1742797326": filterEvents,
  };

  loadingProgress.value = Math.max(loadingProgress.value, 38);
  loadingMessage.value = 'Загрузка сделок для сводной таблицы…';

  // Получаем сделки для второй таблицы (сгруппированные по мероприятиям)
  let dealsLocal2 = [];
  let start = 0;
  const batchSize = 50;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await fetch("https://b24market.webtm.ru/test/handler.php", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "method": "crm.deal.list",
          "filters": dealFiltersForEvents,
          "select": [
            "UF_CRM_1744096783472", 
            'UF_CRM_1742797326',
            "STAGE_ID", 
            "ASSIGNED_BY_ID", 
            'UF_CRM_1744890618774', 
            'UF_CRM_1744062581756', 
            'UF_CRM_1745995594', 
            'UF_CRM_1744064620850', 
            'UF_CRM_1744095783871', 
            'UF_CRM_1742906712910', 
            "UF_CRM_1745222013992", 
            "UF_CRM_1759821112055", 
            "UF_CRM_1742972105926", 
            "UF_CRM_1742972167794", 
            "UF_CRM_1745308616558"
          ],
          "start": start,
          "limit": batchSize
        })
      });

          const data = (await response.json()).data;

          if (data.total >= start) {
            dealsLocal2 = dealsLocal2.concat(data.data);
            start += batchSize;
            if (data.total <= start) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error('Ошибка при получении сделок:', error);
          showError(error, 'Ошибка при загрузке сделок для сводной таблицы');
          hasMore = false;
        }
  }

  loadingProgress.value = Math.max(loadingProgress.value, 56);
  loadingMessage.value = 'Загрузка детальных сделок…';

  // Получаем сделки для первой таблицы (детальная информация)
  let dealsLocal = [];
  start = 0;
  hasMore = true;

  while (hasMore) {
    try {
      const response = await fetch("https://b24market.webtm.ru/test/handler.php", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "method": "crm.deal.list",
          "filters": dealFiltersForCompanies,
          "select": [
            "UF_CRM_1744096783472", 
            'UF_CRM_1742797326',
            "STAGE_ID", 
            "ASSIGNED_BY_ID", 
            'UF_CRM_1744890618774', 
            'UF_CRM_1744062581756', 
            'UF_CRM_1745995594', 
            'UF_CRM_1744064620850', 
            'UF_CRM_1744095783871', 
            'UF_CRM_1742906712910', 
            "UF_CRM_1745222013992", 
            "UF_CRM_1759821112055", 
            "UF_CRM_1742972105926", 
            "UF_CRM_1742972167794", 
            "UF_CRM_1745308616558"
          ],
          "start": start,
          "limit": batchSize
        })
      });

          const data = (await response.json()).data;

          if (data.total >= start) {
            dealsLocal = dealsLocal.concat(data.data);
            start += batchSize;
            if (data.total <= start) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error('Ошибка при получении сделок:', error);
          showError(error, 'Ошибка при загрузке детальных сделок');
          hasMore = false;
        }
  }

  loadingProgress.value = Math.max(loadingProgress.value, 72);
  loadingMessage.value = 'Загрузка мероприятий и статусов CRM…';

  // Получаем дополнительные данные (мероприятия, статусы, пользователи)
  const date = moment();
  const isoDate = date.toISOString();
  
  events.value = await callApi('crm.item.list', {}, null, 1052, 0, 0) || []
  audienceDirectory.value = await getListElements(AUDIENCE_LIST_ID, {}, ['ID', 'NAME']) || []
  await loadEventManagerUsers(events.value)
  filters.value.value.audience = buildAudienceOptions(events.value)

  loadingProgress.value = Math.max(loadingProgress.value, 82);

  const statuses = await callApi('crm.item.list', {}, null, 1080, 0, 0) || []

  loadingProgress.value = Math.max(loadingProgress.value, 88);
  loadingMessage.value = 'Загрузка данных ответственных…';

  const usersFind = Array.from(new Set(dealsLocal.map(deal => deal.ASSIGNED_BY_ID)));
  const users = await callApi("user.get", { "ID": usersFind }, ["ID", "NAME", "SECOND_NAME", "LAST_NAME", "PERSONAL_PHOTO"]);
  ;(Array.isArray(users) ? users : []).forEach(registerUserProfile);

  loadingProgress.value = Math.max(loadingProgress.value, 94);
  loadingMessage.value = 'Обработка таблицы и расчёт итогов…';

  // Обработка данных для первой таблицы
  dealsLocal.forEach(obj => {
    const event = events.value.find(e => e.id == obj.UF_CRM_1742797326);
    const user = users.find(e => e.ID == obj.ASSIGNED_BY_ID);
    const status = statuses.find(e => e.id == obj.UF_CRM_1745995594?.[0]);
    
    obj.UF_CRM_1745995594 = obj.UF_CRM_1745995594?.[0];
    obj.UF_CRM_1745222013992 = obj.UF_CRM_1745222013992 ? obj.UF_CRM_1745222013992.replace('|RUB', "") : 0;
    obj.UF_CRM_1759821112055 = obj.UF_CRM_1759821112055 ? obj.UF_CRM_1759821112055.replace('|RUB', "") : 0;
    obj.UF_CRM_1742972105926 = obj.UF_CRM_1742972105926 ? obj.UF_CRM_1742972105926.replace('|RUB', "") : 0;
    obj.UF_CRM_1742972167794 = obj.UF_CRM_1742972167794 ? obj.UF_CRM_1742972167794.replace('|RUB', "") : 0;
    obj.UF_CRM_1744062581756 = obj.UF_CRM_1744062581756 ? obj.UF_CRM_1744062581756.replace('|RUB', "") : 0;
    
    obj.event = event && event.title ? event.title : "";
    obj.ASSIGNED_BY_ID = displayFullName(user?.LAST_NAME, user?.NAME, user?.SECOND_NAME);
    obj.status = status && status.title ? status.title : "";
    obj.stage = stageMap(obj.STAGE_ID);
    obj.user = user?.ID;
  });

  // Расчет итоговых сумм для первой таблицы
  dealsLocal.forEach(deal => {
    totalRow.value.UF_CRM_1745222013992 += +deal.UF_CRM_1745222013992;
    totalRow.value.UF_CRM_1759821112055 += +deal.UF_CRM_1759821112055;
    totalRow.value.UF_CRM_1742972167794 += +deal.UF_CRM_1742972167794;
    totalRow.value.UF_CRM_1742972105926 += +deal.UF_CRM_1742972105926;
    totalRow.value.UF_CRM_1744062581756 += +deal.UF_CRM_1744062581756;
  });

  table1.value = JSON.parse(JSON.stringify(dealsLocal));
  deals.value = JSON.parse(JSON.stringify(dealsLocal2));

  finishLoading();
  refreshStickyReportTableHeaders();
  } catch (error) {
    console.error('Ошибка при загрузке отчёта:', error);
    showError(error, 'Ошибка при загрузке отчёта');
    finishLoading();
  }
};

</script>

<style lang="sass">
  #app
    margin: 0
    min-height: 100vh
    background: linear-gradient(180deg, #f4f8ff 0%, #f8fafc 100%)
    color: #0f172a

  .v-main.report-page
    background: transparent !important
    display: flex
    flex-direction: column
    gap: 1rem
    padding: 0.75rem
    max-width: 100%
    overflow-x: clip
    overflow-y: visible
    box-sizing: border-box

  .report-page .v-data-table:not(.sticky-report-table)
    width: 100%
    max-width: 100%

    .v-table__wrapper
      overflow-x: auto

  .report-table-section
    display: flex
    flex-direction: column
    gap: 0

  .report-table-card
    display: flex
    flex-direction: column
    gap: 0
    overflow: hidden
    padding: 1rem

  .report-table-card--sticky
    overflow: visible !important

  .v-card.report-table-card--sticky
    overflow: visible !important

  .report-table-title
    font-size: 1.25rem
    font-weight: 700
    color: #0f172a
    padding: 0 !important
    text-align: left
    line-height: 1.3
    margin-bottom: 0.75rem

  .report-data-table
    padding: 0
    margin-bottom: 1rem

    .v-data-table-header__content
      align-items: center
      justify-content: center
      color: #334155 !important

    thead th.v-data-table__th
      background: #f8fafc !important
      color: #334155 !important
      font-weight: 600 !important
      font-size: 1rem
      text-align: center !important
      border: 1px solid rgba(0, 0, 0, 0.12) !important
      border-color: rgba(226, 232, 240, 0.95) !important

      span
        font-weight: 600
        font-size: 1rem

    thead th.v-data-table__th .v-data-table-header__content
      justify-content: center !important

    .v-data-table-header__sort-icon
      display: none !important

    tbody .v-data-table__td
      border: 1px solid rgba(0, 0, 0, 0.12) !important
      border-color: rgba(226, 232, 240, 0.95) !important
      color: #334155
      font-size: 0.875rem

    tbody .v-data-table__tr:nth-child(even) .v-data-table__td,
    tbody .v-data-table__tr:nth-child(odd) .v-data-table__td
      background-color: #ffffff

    tbody .v-data-table__tr:hover .v-data-table__td
      background-color: #f8fafc

    tbody .v-data-table__td:first-child
      text-align: left !important

    tbody .v-data-table__td:not(:first-child)
      text-align: center !important

    tfoot .v-data-table__footer-row td
      background: #f8fafc !important
      font-weight: 600 !important
      color: #334155 !important
      text-align: center !important
      border: 1px solid rgba(0, 0, 0, 0.12) !important
      border-color: rgba(226, 232, 240, 0.95) !important

    tfoot .v-data-table__footer-row td.report-table-footer-label
      text-align: left !important

    &.v-table
      border: none
      border-radius: 0
      overflow: hidden

    &.sticky-report-table.v-table
      overflow: visible

    .v-data-table-footer
      display: none

  .report-data-table--paginated
    .v-data-table-footer
      display: flex
      padding-top: 0.5rem
      justify-content: center

    .v-data-table-footer__items-per-page .v-field__field
      overflow: visible

  .report-data-table.sticky-report-table
    max-width: 100%

    &.v-table
      overflow: visible
      max-width: 100%

    .v-table__wrapper
      overflow-x: auto
      max-width: 100%

  .sticky-report-table-header
    position: fixed
    z-index: 20
    display: none
    overflow: hidden
    pointer-events: none
    background: #f8fafc
    box-shadow: 0 1px 0 rgba(226, 232, 240, 0.95)

    .v-data-table-header__sort-icon,
    .v-icon
      display: none !important

    table
      margin: 0

  .report-data-table.activity-report-table.sticky-report-table
    thead th.v-data-table__th,
    tbody .v-data-table__td,
    tfoot .v-data-table__footer-row td
      padding: 0.50rem !important

    thead th.v-data-table__th .v-data-table-header__content
      padding: 0 !important
      min-height: 0

    .percent-cell
      padding: 0
      gap: 0.2rem
      min-width: 0

    .managers-cell
      gap: 0.2rem

    .responsible-cell
      gap: 0.35rem

  .sticky-report-table-header.activity-report-table-header
    thead th.v-data-table__th
      padding: 0.50rem !important

    .v-data-table-header__content
      padding: 0 !important
      min-height: 0

  .percent-cell
    display: flex
    flex-direction: column
    align-items: center
    gap: 0.35rem
    width: 100%
    min-width: 4.5rem
    padding: 0.15rem 0.25rem

  .percent-cell__value
    font-weight: 700
    font-size: 0.875rem
    color: #1f2937
    line-height: 1.2

  .percent-cell__track
    width: 100%
    height: 8px
    overflow: hidden
    border-radius: 999px
    background: #eef1f5

  .percent-cell__fill
    height: 100%
    max-width: 100%
    border-radius: inherit
    transition: width 0.25s ease

    &--red
      background: #ef5350

    &--orange
      background: #fb8c00

    &--green
      background: #43a047

  .managers-cell
    display: flex
    flex-direction: column
    gap: 0.35rem
    align-items: flex-start
    width: 100%

  .responsible-cell
    display: flex
    align-items: center
    gap: 0.55rem
    min-width: 0
    max-width: 100%

    .v-avatar
      flex-shrink: 0
      align-self: center

  .responsible-name
    flex: 1
    min-width: 0
    color: #1f2937
    white-space: normal
    overflow-wrap: break-word
    word-break: normal
    line-height: 1.35

  .event-link
    background: none
    border: none
    padding: 0
    color: #2563eb
    text-decoration: underline
    cursor: pointer
    text-align: left
    font: inherit
    line-height: 1.35
    white-space: normal

    &:hover
      color: #1d4ed8

  .event-actions
    display: flex
    justify-content: center
    align-items: center

  .event-actions-trigger
    min-width: 32px !important
    width: 32px
    height: 32px
    padding: 0 !important
    border-radius: 8px !important
    border: 1px solid #d1d5db !important
    background: #ffffff !important
    color: #6b7280 !important
    box-shadow: none

    .v-btn__overlay,
    .v-btn__underlay
      opacity: 0

    .v-icon
      font-size: 1.125rem
      color: #6b7280 !important

    &:hover:not(:disabled)
      background: #f9fafb !important
      border-color: #9ca3af !important

  .event-actions-menu-wrapper
    overflow: visible !important

    .v-overlay__content
      overflow: visible !important

  .event-actions-menu
    position: relative
    min-width: 220px
    padding: 6px 0 !important
    border: 1px solid #e5e7eb
    border-radius: 10px
    background: #ffffff
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12)

    &::before
      content: ''
      position: absolute
      top: -5px
      right: 10px
      width: 10px
      height: 10px
      background: #ffffff
      border-top: 1px solid #e5e7eb
      border-left: 1px solid #e5e7eb
      transform: rotate(45deg)

    .event-actions-menu__item
      min-height: 40px
      padding-inline: 14px !important
      color: #111827

      .v-list-item__prepend > .v-icon
        color: #4b5563
        opacity: 1
        font-size: 1.125rem
        margin-inline-end: 10px

      .v-list-item-title
        font-size: 0.875rem
        font-weight: 500
        line-height: 1.25

      &:hover
        background: #f8fafc

  .avatar-initials
    font-size: 0.65rem
    font-weight: 800
    line-height: 1

  .avatar-image
    width: 100%
    height: 100%
    object-fit: cover

  .report-header
    display: flex
    align-items: center
    justify-content: space-between
    gap: 1rem
    margin-bottom: 0

    h1
      margin: 0
      font-size: 1.5rem
      line-height: 1.2
      font-weight: 800

  .report-actions.buttons
    width: auto
    justify-content: flex-end
    margin-bottom: 0
    gap: 12px

    .report-btn
      text-transform: none
      letter-spacing: normal
      font-weight: 500
      font-size: 0.875rem
      line-height: 1.25
      border-radius: 8px
      box-shadow: none
      min-height: 40px
      height: 40px
      padding: 0 16px

      .v-btn__prepend
        margin-inline-end: 8px

      .v-icon
        font-size: 1.125rem
        opacity: 1

    .report-btn--outlined
      background: #ffffff !important
      border: 1px solid #e0e0e0 !important
      color: #0066ff !important

      .v-btn__overlay,
      .v-btn__underlay
        opacity: 0

      .v-icon
        color: #0066ff !important

      &:hover
        background: #f8fafc !important

    .report-btn--filled
      background: #0066ff !important
      border: 1px solid #0066ff !important
      color: #ffffff !important

      .v-btn__overlay,
      .v-btn__underlay
        opacity: 0

      .v-icon
        color: #ffffff !important

      &:hover
        background: #0052cc !important
        border-color: #0052cc !important

  .filter-card,
  .summary-card,
  .v-card
    border: 1px solid rgba(148, 163, 184, 0.16)
    border-radius: 18px !important
    background: rgba(255, 255, 255, 0.94)
    box-shadow: 0 14px 35px rgba(15, 23, 42, 0.07)

  .filter-card
    padding: 1rem
    margin-bottom: 0

  .filter-card .filters
    display: grid
    grid-template-columns: repeat(3, minmax(0, 1fr))
    gap: 0.75rem
    margin-bottom: 0
    align-items: start

    > .filter-item
      min-width: 0
      max-width: 100%

  .filter-item
    display: flex
    flex-direction: column
    gap: 0.35rem

  .filter-label
    display: block
    font-size: 0.875rem
    font-weight: 600
    line-height: 1.2
    color: #334155

  .filter-card .filters .v-field__prepend-inner .v-icon
    color: #2563eb
    opacity: 1

  .filter-card .filters .v-field__field
    max-height: 4.25rem
    overflow: hidden

  .filter-card .filters .v-field
    border-radius: 0.5rem !important

  .filter-card .filters .v-field__outline,
  .filter-card .filters .v-field__overlay
    border-radius: 0.5rem !important

  .filter-card .filters .v-field__input,
  .filter-card .filters .v-select__selection-text,
  .filter-card .filters .v-autocomplete__selection-text
    color: #000000 !important

  .filter-card .filters .v-field__input::placeholder,
  .filter-card .filters input::placeholder
    color: #000000 !important
    opacity: 1 !important

  .filter-card .filters .v-chip
    font-size: 0.75rem

  .filter-item--period
    overflow: visible

  .period-date-filter
    width: 100%
    max-width: 100%
    overflow: visible

    :deep(.date-filter-root)
      width: 100%
      max-width: 100%

    :deep(.filter-date-select)
      width: 100%

      .v-field
        border-radius: 0.5rem !important

      .v-field__outline,
      .v-field__overlay
        border-radius: 0.5rem !important

      .v-field__input,
      .v-select__selection-text,
      .v-autocomplete__selection-text
        color: #000000 !important

      .v-field__input::placeholder,
      input::placeholder
        color: #000000 !important
        opacity: 1 !important

    :deep(.numbers-input)
      max-width: 100%

    :deep(.date-fields)
      width: 100%

    :deep(.date-picker-panels--range)
      overflow: visible

    :deep(.date-picker-panels--range .v-expansion-panel)
      width: 200% !important
      margin-left: -100% !important
      border: 1px solid #000000 !important
      border-radius: 12px
      background: #fff

    :deep(.date-picker-panels--day)
      width: 200%
      max-width: 200%

    :deep(.date-picker-panels--day .v-expansion-panel)
      border: 1px solid #000000 !important
      border-radius: 12px
      background: #fff

    :deep(.calendars--range),
    :deep(.calendars--day)
      width: 100%

    :deep(.calendar--range),
    :deep(.calendar--day)
      border: none !important

    :deep(.v-date-picker)
      width: 100% !important
      min-width: 0
      max-width: 100%

    :deep(.v-date-picker-month)
      min-height: 260px

  .summary-cards
    display: grid
    grid-template-columns: repeat(4, minmax(0, 1fr))
    gap: 1rem
    margin-bottom: 0

  .summary-card
    display: flex
    align-items: center
    gap: 1rem
    min-height: 112px
    padding: 1.25rem

    .v-icon
      flex-shrink: 0
      width: 3rem
      height: 3rem
      border-radius: 50%
      font-size: 1.5rem

    .summary-card__icon
      flex-shrink: 0
      width: 3rem
      height: 3rem
      border-radius: 0.5rem
      object-fit: cover
      display: block

    span
      display: block
      color: #64748b
      font-size: 0.75rem
      font-weight: 600
      letter-spacing: 0.04em
      text-transform: uppercase
      margin-bottom: 0.35rem

    strong
      display: block
      font-size: 1.35rem
      line-height: 1.2
      font-weight: 700
      color: #000000

  .summary-card--green
    .v-icon
      color: #ffffff
      background: #22c55e

  .summary-card--blue
    .v-icon
      color: #ffffff
      background: #3b82f6

  .summary-card--purple
    .v-icon
      color: #ffffff
      background: #8b5cf6

  .summary-card--orange
    .v-icon
      color: #ffffff
      background: #f59e0b

  .v-list-item__content
    display: flex
    align-items: center
    justify-content: space-between

  .v-stepper-actions
    display: none

  .v-stepper-window
    margin: 0.6rem !important

  .buttons
    display: flex
    justify-content: space-between

  .v-messages, .v-input__details
    display: none

  .links
    padding: 0

  .links .v-list-item
    padding: 0

  .links .v-list-item__content
    border-bottom: 1px rgba(var(--v-border-color), 0.5) solid
    padding: 0.5rem
    padding-bottom: 1rem

  .v-card-text
    display: flex
    flex-direction: column
    gap: 1.5rem

  .v-table:not(.report-data-table) .v-table__wrapper > table > tbody > tr > td, .v-table:not(.report-data-table) .v-table__wrapper > table > thead > tr > th, .v-table:not(.report-data-table) .v-table__wrapper > table > tfoot > tr > td
    border: thin solid rgba(var(--v-border-color), var(--v-border-opacity))
    text-align: center

  .v-table:not(.report-data-table)
    border-radius: 0.25rem
    border: 2px solid rgba(var(--v-border-color), var(--v-border-opacity))

  .v-data-table-footer
    justify-content: center

  .filters .v-input__control
    height: 100%
    max-height: 5rem !important
    
  .filters .v-field__field
    overflow: hidden

  .buttons
    width: 100%
    display: flex
    align-items: center
    justify-content: center
    gap: 1rem

  .v-dialog > .v-overlay__content > .v-card, .v-dialog > .v-overlay__content > form > .v-card
    padding: 1em

  @media (max-width: 1200px)
    .filter-card .filters
      grid-template-columns: repeat(2, minmax(0, 1fr))

    .filter-item--period
      grid-column: 1 / -1

    .period-date-filter :deep(.date-picker-panels--range .v-expansion-panel)
      width: 100% !important
      margin-left: 0 !important

    .period-date-filter :deep(.date-picker-panels--day)
      width: 100%
      max-width: 100%

    .summary-cards
      grid-template-columns: repeat(2, minmax(0, 1fr))

    .summary-card
      min-height: 96px
      padding: 1rem

      strong
        font-size: 1.15rem

    .report-table-card
      padding: 0.875rem

    .report-table-title
      font-size: 1.125rem

  @media (max-width: 760px)
    .report-header
      align-items: flex-start
      flex-direction: column

    .report-actions.buttons
      width: 100%
      justify-content: flex-start
      flex-wrap: wrap

    .filter-card .filters,
    .summary-cards
      grid-template-columns: 1fr

    .filter-item--period
      grid-column: auto

    .summary-card
      min-height: 88px

      strong
        font-size: 1.05rem

    .filter-card,
    .report-table-card
      padding: 0.75rem

    .report-page
      padding: 0.75rem

</style>