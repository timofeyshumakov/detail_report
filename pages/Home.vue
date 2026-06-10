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
          <v-btn variant="flat" class="report-btn report-btn--outlined" prepend-icon="mdi-refresh" :loading="isLoading" @click="getData()">Обновить</v-btn>
          <v-btn variant="flat" class="report-btn report-btn--outlined" prepend-icon="mdi-download" @click="noopAction">Экспорт</v-btn>
          <v-btn variant="flat" class="report-btn report-btn--filled takeScreenshot" prepend-icon="mdi-content-save-outline" @click="takeScreenshot">Сохранить отчёт</v-btn>
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
        <article class="summary-card summary-card--green">
          <v-icon icon="mdi-trending-up" />
          <div>
            <span>План выручки</span>
            <strong>{{ formatCurrency(totalRow2.planProfit) }}</strong>
          </div>
        </article>
        <article class="summary-card summary-card--blue">
          <v-icon icon="mdi-cash-multiple" />
          <div>
            <span>Собрано</span>
            <strong>{{ formatCurrency(totalRow2.summ) }}</strong>
          </div>
        </article>
        <article class="summary-card summary-card--purple">
          <v-icon icon="mdi-handshake-outline" />
          <div>
            <span>Сделок за период</span>
            <strong>{{ table1.length }}</strong>
          </div>
        </article>
        <article class="summary-card summary-card--orange">
          <v-icon icon="mdi-calendar-blank-outline" />
          <div>
            <span>Мероприятий</span>
            <strong>{{ groupedEvents.length }}</strong>
          </div>
        </article>
      </section>

      <section class="report-table-section">
        <v-card class="report-table-card">
          <v-card-title class="report-table-title">
            Активность по мероприятию
          </v-card-title>
        <v-data-table
          :items="groupedEvents"
          :headers="headers2"
          class="report-data-table"
          :items-per-page="-1"
        >
          <template v-slot:item.managers="{ item }">
            {{ item.managers }}
          </template>
          <template v-slot:item.start="{ item }">
            {{ item.start }}
          </template>
          <template v-slot:item.percent="{ item }">
            <v-chip :color="percentMap(item.percent)" dark>
              {{ item.percent }}
            </v-chip>
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
          <template v-slot:tfoot>
            <tfoot>
              <tr class="v-data-table__footer-row">
                <td colspan="4" class="text-left">Итого:</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.summ) }}</td>
                <td>{{ totalRow2.over > 0 ? new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.over) : '' }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.planProfit) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.pot) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.dog) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.pd) }}</td>
              </tr>
            </tfoot>
          </template>
        </v-data-table>
        </v-card>
      </section>

      <section class="report-table-section">
        <v-card class="report-table-card">
          <v-card-title class="report-table-title">
            Компании по категориям
          </v-card-title>
        <v-data-table
          :items="table1"
          :headers="headers"
          class="report-data-table report-data-table--paginated"
        >
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
                <td colspan="5" class="text-left">Итого:</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow.UF_CRM_1745222013992) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow.UF_CRM_1759821112055) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow.UF_CRM_1742972167794) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow.UF_CRM_1742972105926) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow.UF_CRM_1744062581756) }}</td>
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
  </div>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { callApi } from '../functions/callApi';
import moment from 'moment';
import html2canvas from 'html2canvas'; // подключаем библиотеку
import DateFilter from '../components/TheForm/Date/Date.vue';
import LoadingProgress from '../components/LoadingProgress.vue';
import { useSnackbar } from '../composables/useSnackbar';

const { snackbar, snackbarText, snackbarColor, showSnackbar } = useSnackbar();

const selectedDateIso = ref([null, null]);
const selectedDateName = ref('Любая дата');
const dateFilterShowInput = ref([false, false, false, false, false, false, false, false]);
const dateFilterKey = ref(0);

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
const usersById = ref({});

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

const filters = ref({

value: {
  'assigned': '',
  'events': '',
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
},

selectAll: {
  'departments': false,
  'assigned': false,
  'events': false,
  'category': false,
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
  { title: "Ответственный", key: "ASSIGNED_BY_ID", align: "center"},
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
  { title: "Ответственные менеджеры", key: "managers", align: "center"},
  { title: "Дата начала мероприятия", key: "start", align: "center"},
  { title: "% Выполнения", key: "percent", align: "center"},
  { title: "Собрано", key: "summ", align: "center"},
  { title: "Собрано сверху", key: "over", align: "center"},
  { title: "План выручки", key: "planProfit", align: "center"},
  { title: "Потенциал", key: "pot", align: "center"},
  { title: "Договоренности", key: "dog", align: "center"},
  { title: "Сумма П/Д", key: "pd", align: "center"},
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
const groupedEvents = computed(() => {
  const groups = {};
  
  deals.value.forEach(deal => {
    const event = events.value.find(e => e.id == deal.UF_CRM_1742797326);

    const planProfit = event && event.ufCrm38_1745221903440 ? parseFloat(event.ufCrm38_1745221903440.replace('|RUB', "")) : 0;
    
    if (!groups[deal.UF_CRM_1742797326]) {
      groups[deal.UF_CRM_1742797326] = {
        UF_CRM_1742797326: deal.UF_CRM_1742797326,
        percent: event && event.ufCrm38_1750948951651 ? Math.round(event.ufCrm38_1750948951651 * 100) / 100 : 0,
        start: formatEventDates(event),
        summ: 0,
        pot: 0,
        planProfit: planProfit,
        over: -planProfit, // Инициализируем отрицательным значением плана
        dog: 0,
        pd: 0,
        UF_CRM_1744062581756: deal.UF_CRM_1744062581756,
        STAGE_ID: deal.STAGE_ID,
        event: event && event.title ? event.title : '',
        managers: event ? formatEventManagers(event.ufCrm38_1753082810) : '',
        UF_CRM_1745222013992: deal.UF_CRM_1745222013992,
      };
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

  // После обработки всех сделок, корректируем значение over для каждого мероприятия
  for (let key in groups) {
    const innerObj = groups[key];
    
    // РАСЧЕТ СОБРАНО СВЕРХУ: План выручки - Собранная сумма
    const overValue = parseFloat(innerObj.summ) - parseFloat(innerObj.planProfit);
    
    // Проверка значения "over" - показываем только если > 0
    if (overValue > 0) {
      innerObj.over = overValue.toFixed(2); // Форматируем до 2 знаков после запятой
    } else {
      innerObj.over = ''; // Пустая строка, если <= 0
    }
  }

  return Object.values(groups).sort((a, b) => {
    const aHasSumm = parseFloat(a.summ) > 0
    const bHasSumm = parseFloat(b.summ) > 0
    if (aHasSumm === bHasSumm) return 0
    return aHasSumm ? -1 : 1
  })
});

const table1 = ref([]);
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


function formatEventDates(event) {
  const startRaw = event?.ufCrm38_1745307580193
  const endRaw = event?.ufCrm38_1751875905992
  if (!startRaw) return ''
  const start = moment(startRaw.split('T')[0]).format('DD.MM.YYYY')
  if (!endRaw) return start
  const end = moment(endRaw.split('T')[0]).format('DD.MM.YYYY')
  return start === end ? start : `${start} - ${end}`
}

function registerUserName(user) {
  if (!user?.ID) return
  const parts = []
  if (user.NAME) parts.push(user.NAME)
  if (user.SECOND_NAME) parts.push(user.SECOND_NAME)
  if (user.LAST_NAME) parts.push(user.LAST_NAME)
  usersById.value[String(user.ID)] = parts.join(' ')
}

function formatEventManagers(raw) {
  if (raw == null || raw === '') return ''
  const ids = Array.isArray(raw) ? raw : [raw]
  const assigned = Array.isArray(filters.value.value.assigned) ? filters.value.value.assigned : []
  return ids
    .map((id) => {
      const key = String(id)
      if (usersById.value[key]) return usersById.value[key]
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

  const missingIds = [...managerIds].filter((id) => !usersById.value[id])
  if (!missingIds.length) return

  const users = await callApi(
    'user.get',
    { ID: missingIds },
    ['ID', 'NAME', 'SECOND_NAME', 'LAST_NAME'],
    null,
    0,
    0,
  )
  ;(Array.isArray(users) ? users : []).forEach(registerUserName)
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

function percentMap(percent){
  if (percent <= 25) return 'red lighten-1';       // ярко-красный
      if (percent <= 49) return 'red darken-2';        // темно-красный
      if (percent <= 70) return 'amber';               // желтый
      if (percent <= 99) return 'light-green';         // зеленый
      return 'green darken-1'; 
}

onMounted(async () => {
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
    const assigned = await callApi("user.get", {}, ["NAME", "SECOND_NAME", "LAST_NAME", "ID", "UF_DEPARTMENT"], null, 0, 0);

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
      registerUserName(mapped)
      return mapped
    })
    
    loadingMessage.value = 'Загрузка отчёта по сделкам…';
    loadingProgress.value = 28;
    await getData();
  } catch (error) {
    console.error('Ошибка при инициализации отчёта:', error);
    showError(error, 'Ошибка при инициализации отчёта');
    finishLoading();
  }
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
  
  const filterEvents = filters.value.selected.events.length === 0 
    ? filters.value.value.events.map(item => item.id) 
    : filters.value.selected.events;

  // Подготовка дат
  let dates = [];
  if (selectedDateIso.value[0]) {
    dates[0] = moment(selectedDateIso.value[0]).format('YYYY-MM-DD');
  } else {
    dates[0] = null;
  }
  if (selectedDateIso.value[1]) {
    dates[1] = moment(selectedDateIso.value[1]).format('YYYY-MM-DD');
  } else {
    dates[1] = null;
  }

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
          "filters": {
            ">DATE_CREATE": dates[0],
            "<DATE_CREATE": dates[1],
            "STAGE_ID": filterCategory,
            "ASSIGNED_BY_ID": filterAssigned,
            "UF_CRM_1742797326": filterEvents,
          },
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
          "filters": {
            ">DATE_CREATE": dates[0],
            "<DATE_CREATE": dates[1],
            "STAGE_ID": filterCategory,
            "ASSIGNED_BY_ID": filterAssigned,
            "UF_CRM_1742797326": filterEvents,
          },
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
  await loadEventManagerUsers(events.value)

  loadingProgress.value = Math.max(loadingProgress.value, 82);

  const statuses = await callApi('crm.item.list', {}, null, 1080, 0, 0) || []

  loadingProgress.value = Math.max(loadingProgress.value, 88);
  loadingMessage.value = 'Загрузка данных ответственных…';

  const usersFind = Array.from(new Set(dealsLocal.map(deal => deal.ASSIGNED_BY_ID)));
  const users = await callApi("user.get", { "ID": usersFind }, []);

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
    padding-right: 0.75rem
    max-width: 100%
    overflow-x: hidden
    box-sizing: border-box

  .report-page .v-data-table
    width: 100%
    max-width: 100%

    .v-table__wrapper
      overflow-x: auto

  .report-table-section
    display: flex
    flex-direction: column
    gap: 0

  .report-table-card
    overflow: hidden
    padding: 1rem

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

    .v-data-table__th
      background: #f8f9fa !important
      color: #1e293b !important
      font-weight: 700
      font-size: 0.875rem
      border-top: none !important
      border-left: none !important
      border-right: none !important
      border-bottom: 1px solid #e2e8f0 !important

    .v-data-table-header__content
      color: #1e293b !important

    .v-data-table__th:first-child .v-data-table-header__content
      justify-content: flex-start

    .v-data-table__td
      border-left: none !important
      border-right: none !important
      border-color: #e2e8f0 !important
      color: #334155
      font-size: 0.875rem

    tbody .v-data-table__tr:nth-child(odd) .v-data-table__td
      background-color: #ffffff

    tbody .v-data-table__tr:nth-child(even) .v-data-table__td
      background-color: #f8f9fa

    tbody .v-data-table__tr:hover .v-data-table__td
      background-color: #f1f5f9

    .v-data-table__th:first-child,
    .v-data-table__td:first-child
      text-align: left

    .v-data-table__th:not(:first-child),
    .v-data-table__td:not(:first-child)
      text-align: center

    tfoot .v-data-table__footer-row td
      background: #f8f9fa !important
      font-weight: 700
      color: #1e293b
      border-top: 1px solid #e2e8f0

    .v-table
      border: none
      border-radius: 0.5rem
      overflow: hidden

    .v-data-table-footer
      display: none

  .report-data-table--paginated
    .v-data-table-footer
      display: flex
      padding-top: 0.5rem

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
    grid-template-columns: repeat(5, minmax(0, 1fr))
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

  .summary-card--green
    .v-icon
      color: #ffffff
      background: #22c55e

    strong
      color: #16a34a

  .summary-card--blue
    .v-icon
      color: #ffffff
      background: #3b82f6

    strong
      color: #2563eb

  .summary-card--purple
    .v-icon
      color: #ffffff
      background: #8b5cf6

    strong
      color: #7c3aed

  .summary-card--orange
    .v-icon
      color: #ffffff
      background: #f59e0b

    strong
      color: #d97706

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

  .v-table .v-table__wrapper > table > tbody > tr > td, .v-table .v-table__wrapper > table > thead > tr > th, .v-table .v-table__wrapper > table > tfoot > tr > td
    border: thin solid rgba(var(--v-border-color), var(--v-border-opacity))
    text-align: center

  .v-table 
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