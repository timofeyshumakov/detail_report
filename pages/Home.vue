<template>
  <v-app>
    <div v-show="isLoading" class="loading">Загрузка...</div>
    <v-main>
      <v-expansion-panels class="panel" v-model="panel">
        <v-expansion-panel>
          <v-expansion-panel-title>Фильтры</v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="filters">
              <v-autocomplete
                v-model="filters.selected.assigned"
                :items="filters.value.assigned"
                item-title="FULL_NAME"
                item-value="ID"
                label="Ответственный"
                single-line
                hide-details
                variant="outlined"
                multiple
                chips
                clearable
              >
                <template v-slot:prepend-item>
                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title>
                        <v-checkbox label="Выбрать всех пользователй" v-model="filters.selectAll.assigned" @change="() => toggleSelectAll('assigned')" /> </v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </template>
              </v-autocomplete>
              <v-autocomplete
                v-model="filters.selected.events"
                :items="filters.value.events"
                item-title="title"
                item-value="id"
                label="Мероприятие"
                single-line
                hide-details
                variant="outlined"
                multiple
                chips
                clearable
              >
                <template v-slot:prepend-item>
                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title>
                        <v-checkbox label="Выбрать все мероприятия" v-model="filters.selectAll.events" @change="() => toggleSelectAll('events')" /> </v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </template>
              </v-autocomplete>
              <v-autocomplete
                v-model="filters.selected.category"
                :items="filters.value.category"
                item-title="title"
                item-value="id"
                label="Категория"
                single-line
                hide-details
                variant="outlined"
                multiple
                chips
                clearable
              >
                <template v-slot:prepend-item>
                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title>
                        <v-checkbox label="Выбрать все категории" v-model="filters.selectAll.category" @change="() => toggleSelectAll('category')" /> </v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </template>
              </v-autocomplete>
              <div class="date-range">
                <v-text-field
                  v-model="dateRangeText"
                  label="Выберите диапазон дат"
                  prepend-inner-icon="mdi-calendar"
                  readonly
                  single-line
                  hide-details
                  variant="outlined"
                  clearable
                  @click="dialogCalendar = true"
                  @click:clear="clearDates"
                ></v-text-field>
                <v-dialog v-model="dialogCalendar" width="auto">
                  <v-card>
                    <v-card-title class="date-title">Выберите диапазон дат<v-btn icon @click="chancelDate" class="ml-auto"><v-icon>mdi-close</v-icon></v-btn>
                    </v-card-title>
                      <v-row>
                        <v-col cols="12" sm="6">
                          <v-date-picker
                            v-model="savedDate[0]"
                            title="Минимальная дата"
                          ></v-date-picker>
                        </v-col>
                        <v-col cols="12" sm="6">
                          <v-date-picker
                            v-model="savedDate[1]"
                            title="Максимальная дата"
                          ></v-date-picker>
                        </v-col>
                      </v-row>
                      <v-card-actions>
                        <v-btn color="primary" @click="confirmDate">Готово</v-btn>
                      </v-card-actions>
                  </v-card>
                </v-dialog>
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <div class="buttons">
        <v-btn color="primary" @click="disableFilters()">отключить фильтры</v-btn>
        <v-btn color="info" @click="getData()">получить данные</v-btn>
        <v-btn color="success" class="takeScreenshot" @click="takeScreenshot">Создать скриншот</v-btn>
      </div>
        <v-card class="my-4">
          <v-card-title class="text-center text-h5">
            Компании по категориям
          </v-card-title>
        </v-card>
        <v-data-table
          :items="table1"
          :headers="headers"
        >
          <template v-slot:item.stage="{ item }">
            <v-chip v-if="item.stage" :color="getStatusColor(item.stage)" dark>
              {{ item.stage }}
            </v-chip>
          </template>
          <template v-slot:item.UF_CRM_1745222013992="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.UF_CRM_1745222013992) }}
          </template>
          <template v-slot:item.UF_CRM_1742971372921="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.UF_CRM_1742971372921) }}
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
          <template v-slot:tfoot>
            <tfoot>
              <tr class="v-data-table__footer-row">
                <td colspan="5" class="text-left">Итого:</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow.UF_CRM_1745222013992) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow.UF_CRM_1742971372921) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow.UF_CRM_1742972167794) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow.UF_CRM_1742972105926) }}</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow.UF_CRM_1744062581756) }}</td>
              </tr>
            </tfoot>
          </template>
        </v-data-table>
        <v-card class="my-4">
          <v-card-title class="text-center text-h5">
            Активность по мероприятию
          </v-card-title>
        </v-card>
        <v-data-table
          :items="groupedEvents"
          :headers="headers2"
          class="table2"
        >
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
                <td colspan="3" class="text-left">Итого:</td>
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
      <v-dialog v-model="errorDialog" max-width="500" class="errorDialog">
        <v-card>
          <v-card-title class="error white--text">Ошибка!</v-card-title>
          <v-card-text color="error" class="v-card-text mt-4 text-center">{{ errorDisplay }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="errorDialog = false">закрыть</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { callApi } from '../functions/callApi';
import moment from 'moment';
import html2canvas from 'html2canvas'; // подключаем библиотеку

const dialogCalendar = ref(false);

const dateRangeText = computed(() => {
  if (filters.value.selected.dateFrom === null || filters.value.selected.dateTo === null) return '';
  return `${formatDate(filters.value.selected.dateFrom)} - ${formatDate(filters.value.selected.dateTo)}`;
});

function formatDate(date) {
  if (!date) return '';
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Date(date).toLocaleDateString('ru-RU', options);
}

function clearDates() {
  filters.value.selected.dateFrom = null;
  filters.value.selected.dateTo = null;
}

function chancelDate() {
  dialogCalendar.value = false;
}

function confirmDate() {
  filters.value.selected.dateFrom = savedDate.value[0];
  filters.value.selected.dateTo = savedDate.value[1];
  dialogCalendar.value = false;
}

const savedDate = ref([]);
const errorDialog = ref(false);
const successDialog = ref(false);
const errorDisplay = ref('');
const isLoading = ref(true);
const deals = ref([]);
const deals2 = ref([]);
const events = ref([]);

const totalRow = ref({
  UF_CRM_1745222013992: 0,
  UF_CRM_1742971372921: 0,
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

async function sendMessage() {
  try {

  if (!selectedChatId.value) return;
  isLoading.value = true;
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

BX24.callMethod(
    'im.disk.file.commit',
    {
        'CHAT_ID': selectedChatId.value,
        'UPLOAD_ID': result.ID,
    },
    function(res){}
);
  } catch (error) {
            errorDisplay.value = error;
            errorDialog.value = true;
        } finally {
            screenshotSrc.value = null;
            dialog.value = false;
            successDialog.value = true;
            isLoading.value = false;
        }
}
const chats = ref([]);
const screenshotSrc = ref(null); // ссылка на изображение скриншота
async function takeScreenshot() {

  document.querySelector(".v-expansion-panels").style.display = 'none';
  document.querySelector(".buttons").style.display = 'none';
  document.querySelector(".takeScreenshot").style.display = 'none';
  try {
    isLoading.value = true;
    // рисуем весь документ body на холсте
    const canvas = await html2canvas(document.body);
    const imageSrc = canvas.toDataURL('image/png'); // сохраняем изображение в base64
    screenshotSrc.value = imageSrc; // устанавливаем ссылку на изображение
  } catch (error) {
            errorDisplay.value = error;
            errorDialog.value = true;
  } finally {
    document.querySelector(".v-expansion-panels").style.display = 'flex';
    document.querySelector(".buttons").style.display = 'flex';
    document.querySelector(".takeScreenshot").style.display = 'block';
    isLoading.value = false;
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
const filters = ref({

value: {
  'assigned': '',
  'events': '',
  'category': [
    {id: "C32:UC_LXYCFO", title: "Потенциал - холодный"},
    {id: "C32:UC_VJZ0FL", title: "Потенциал - теплый"},
    {id: "C32:UC_6VDO9F", title: "Договоренности - холодные"},
    {id: "C32:UC_5BBXZ5", title: "Договоренности - теплые"},
    {id: "C32:UC_R5DX1H", title: "Передано"},
  ],
},

selected: {
  assigned: [],
  events: [],
  category: [],
},

selectAll: {
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
  filters.selected.dateFrom = null;
  filters.selected.dateTo = null;
}

const headers = ref([
  { title: "Мероприятие", key: "event", align: "center"},
  { title: "Компания", key: "UF_CRM_1744890618774", align: "center"},
  { title: "Ответственный", key: "ASSIGNED_BY_ID", align: "center"},
  { title: "Статус", key: "status", align: "center"},
  { title: "Категория", key: "stage", align: "center"},
  { title: "Доходный", key: "UF_CRM_1745222013992", align: "center"},
  { title: "Участие", key: "UF_CRM_1742971372921", align: "center"},
  { title: "Внебюджет", key: "UF_CRM_1742972167794", align: "center"},
  { title: "Доп. продажи", key: "UF_CRM_1742972105926", align: "center"},
  { title: "Общая", key: "UF_CRM_1744062581756", align: "center"},
]);

const headers2 = ref([
  { title: "Мероприятие", key: "event", align: "center"},
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

    if (filters.value.selectAll[type]) {
      filters.value.selected[type] =
      typeof filters.value.value[type][0] === 'object'
        ? filters.value.value[type].map((item) => item.id || item.ID)
        : filters.value.value[type];
    } else {
      filters.value.selected[type] = [];
    }
  };

const groupedEvents = computed(() => {
      const groups = {};
      
      deals.value.forEach(deal => {
        const event = events.value.find(e => e.id == deal.UF_CRM_1742797326);
        console.log(events);
        const planProfit = event && event.ufCrm38_1745221903440 ? event.ufCrm38_1745221903440.replace('|RUB', "") : 0;
        if (!groups[deal.UF_CRM_1742797326]) {
          groups[deal.UF_CRM_1742797326] = {
            UF_CRM_1742797326: deal.UF_CRM_1742797326,
            percent: event && event.ufCrm38_1750948951651 ? Math.round(event.ufCrm38_1750948951651 * 100) / 100 : 0,
            start: event ? moment(event.ufCrm38_1745307580193.split('T')[0]).format('DD.MM.YYYY') + " - " + moment(event.ufCrm38_1751875905992.split('T')[0]).format('DD.MM.YYYY') : null,
            summ: 0,
            pot: 0,
            planProfit: planProfit,
            over: -planProfit,
            dog: 0,
            pd: 0,
            UF_CRM_1744062581756: deal.UF_CRM_1744062581756,
            STAGE_ID: deal.STAGE_ID,
            event: event && event.title ? event.title : '',
            UF_CRM_1745222013992: deal.UF_CRM_1745222013992,
          };
        }
        

        const summDeal = parseInt(deal.UF_CRM_1744062581756);

        //groups[deal.UF_CRM_1742797326].summ += parseInt( groups[deal.UF_CRM_1742797326].UF_CRM_1744062581756.replace(/\s/g, ""));
        if( deal.STAGE_ID === "C32:UC_LXYCFO" || deal.STAGE_ID === "C32:UC_VJZ0FL"){
           groups[deal.UF_CRM_1742797326].pot += summDeal;
        }else if( deal.STAGE_ID === "C32:UC_5BBXZ5" || deal.STAGE_ID === "C32:UC_6VDO9F"){
           groups[deal.UF_CRM_1742797326].dog += summDeal;
        }else if(deal.STAGE_ID === "C32:UC_R5DX1H"){
          groups[deal.UF_CRM_1742797326].summ += summDeal;
        }

        if(deal.STAGE_ID === "C32:UC_LXYCFO" || deal.STAGE_ID === "C32:UC_VJZ0FL" || deal.STAGE_ID === "C32:UC_5BBXZ5" ||  deal.STAGE_ID === "C32:UC_6VDO9F"){
          groups[deal.UF_CRM_1742797326].pd += summDeal;
        }

        if(deal.STAGE_ID === "C32:UC_LXYCFO" || deal.STAGE_ID === "C32:UC_VJZ0FL" || deal.STAGE_ID === "C32:UC_R5DX1H" || deal.STAGE_ID === "C32:UC_5BBXZ5" ||  deal.STAGE_ID === "C32:UC_6VDO9F"){
          groups[deal.UF_CRM_1742797326].over += summDeal;
        }
      });

for (let key in groups) {
    const innerObj = groups[key]; // Получаем внутренний объект
    // Проверка значения свойства "over"
    if (innerObj.over !== undefined && innerObj.over <= 0) {
        innerObj.over = ''; // Меняем на null, если значение меньше или равно 0
    }
}

      return Object.values(groups);
});
const table1 = ref([]);
const totalRow2 = computed(() => {
  /*
    totalRow2.value.pd += innerObj.pd ? +innerObj.pd : 0;
    totalRow2.value.summ += innerObj.summ ? +innerObj.summ : 0;
    totalRow2.value.dog += innerObj.dog ? +innerObj.dog : 0;
    totalRow2.value.planProfit += innerObj.planProfit ? +innerObj.planProfit : 0;
    totalRow2.value.pot += innerObj.pot ? +innerObj.pot : 0;
*/
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

    row.summ += +deal.summ;
    row.pot += +deal.pot;
    row.dog += +deal.dog;
    row.pd += +deal.pd;
    row.over += +deal.over;
    row.planProfit += +deal.planProfit;
  });
  return row;
}
});


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

const menuFrom = ref(false);
const menuTo = ref(false);

const formattedDateFrom = computed(() => filters.selected.dateFrom ? moment(filters.selected.dateFrom).format('DD.MM.YYYY') : null);
const formattedDateTo = computed(() => filters.selected.dateTo ? moment(filters.selected.dateTo).format('DD.MM.YYYY') : null);

onMounted(async() => {
filters.value.value.events = await callApi("crm.item.list", {"!ufCrm38_1751875905992": "null"}, ["id", "title"], 1052, 0, 0);
filters.value.value.events = filters.value.value.events;
const assigned = await callApi("user.get", {}, ["NAME", "SECOND_NAME", "LAST_NAME", "ID"], null, 0, 0);

assigned.forEach(user => {
  const parts = [];
  if (user.NAME) parts.push(user.NAME);
  if (user.SECOND_NAME) parts.push(user.SECOND_NAME);
  if (user.LAST_NAME) parts.push(user.LAST_NAME);
  
  user.FULL_NAME = parts.join(' ');
});
filters.value.value.assigned = JSON.parse(JSON.stringify(assigned));
await getData();
  isLoading.value = false;
})

const getData = (async() => {
  isLoading.value = true;
  totalRow.value = {
  UF_CRM_1745222013992: 0,
  UF_CRM_1742971372921: 0,
  UF_CRM_1742972167794: 0,
  UF_CRM_1742972105926: 0,
  UF_CRM_1744062581756: 0,
};
  const filterAssigned = filters.value.selected.assigned.length === 0 ? filters.value.value.assigned.map(item => item.ID) : filters.value.selected.assigned;
  const filterCategory = filters.value.selected.category.length === 0 ? filters.value.value.category.map(item => item.id) : filters.value.selected.category;
  const filterEvents = filters.value.selected.events.length === 0 ? filters.value.value.events.map(item => item.id) : filters.value.selected.events;
  let dates = [];
  if(filters.value.selected.dateFrom){
    dates[0] = moment(filters.value.selected.dateFrom).format('YYYY-MM-DD');
  }else{
    dates[0] = null;
  }
  if(filters.value.selected.dateTo){
    dates[1] = moment(filters.value.selected.dateTo).format('YYYY-MM-DD');
  }else{
    dates[1] = null;
  }

  //let dealsLocal = await callApi("crm.deal.list", {">DATE_CREATE": dates[0], "<DATE_CREATE": dates[1], "STAGE_ID": filterCategory, "ASSIGNED_BY_ID": filterAssigned, "UF_CRM_1742797326": filterEvents}, ["UF_CRM_1744096783472", 'UF_CRM_1742797326',"STAGE_ID", "ASSIGNED_BY_ID", 'UF_CRM_1744890618774', 'UF_CRM_1744062581756', 'UF_CRM_1745995594', 'UF_CRM_1744064620850', 'UF_CRM_1744095783871', 'UF_CRM_1742906712910', "UF_CRM_1745222013992", "UF_CRM_1742971372921", "UF_CRM_1742972105926", "UF_CRM_1742972167794", "UF_CRM_1745308616558"], null, 0, 0);
        let dealsLocal = [];
      let start = 0;
      const batchSize = 50; // Размер пачки для запроса
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await fetch("https://master.rymar-consulting.ru/request/handler.php", {
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
              "select": ["UF_CRM_1744096783472", 'UF_CRM_1742797326',"STAGE_ID", "ASSIGNED_BY_ID", 'UF_CRM_1744890618774', 'UF_CRM_1744062581756', 'UF_CRM_1745995594', 'UF_CRM_1744064620850', 'UF_CRM_1744095783871', 'UF_CRM_1742906712910', "UF_CRM_1745222013992", "UF_CRM_1742971372921", "UF_CRM_1742972105926", "UF_CRM_1742972167794", "UF_CRM_1745308616558"],
              "start": start,
              "limit": batchSize
            })
          });

          const data = await response.json();
          
          if (data.data && data.data.length > 0) {
            dealsLocal = dealsLocal.concat(data.data);
            start += batchSize;
            
            // Если получено меньше элементов, чем запрошено, значит это последняя страница
            if (data.data.length < batchSize) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.error('Ошибка при получении сделок:', error);
          hasMore = false;
        }
      }

  const date = moment(); // Текущая дата и время
  const isoDate = date.toISOString(); // Форматирование даты в ISO-формат
  events.value = await new Promise((resolve) => {
  BX24.callMethod(
    'crm.item.list', 
    {
        entityTypeId: 1052,
        filter: {
          //">ufCrm38_1751875905992": isoDate 
        },
        order: {
            id: 'DESC',
        },
    },
    (result) => {
        if (result.error())
        {
            console.error(result.error());
            return;
        }
        resolve(result.data().items);
    },
);
});
/*

  if(filters.value.selected.dateFrom || filters.value.selected.dateTo){
    dealsLocal = dealsLocal.filter(item => {
      const date = moment(item.DATE_CREATE);
      let from = filters.value.selected.dateFrom ? moment(filters.value.selected.dateFrom) : null;
      let to = filters.value.selected.dateTo ? moment(filters.value.selected.dateTo) : null;
      if (from && to) {
        return date.isBetween(from, to, null, '[]');
      } else if (from) {
        return date.isSameOrAfter(from);
      } else if (to) {
        return date.isSameOrBefore(to);
      }
      return true;
    });
  }
    */
const statuses = await new Promise((resolve) => {
  BX24.callMethod(
    'crm.item.list', 
    {
        entityTypeId: 1080,
        order: {
            id: 'DESC',
        },
    },
    (result) => {
        if (result.error())
        {
            console.error(result.error());

            return;
        }
        resolve(result.data().items);
    },
);
});

const usersFind = Array.from(new Set(dealsLocal.map(deal => deal.ASSIGNED_BY_ID)));
//const fields = await callApi("crm.deal.fields", {}, ["UF_CRM_1744064620850"]);
const users = await callApi("user.get", {"ID": usersFind}, []);
  dealsLocal.forEach(obj => {
    const event = events.value.find(e => e.id == obj.UF_CRM_1742797326);
    const user = users.find(e => e.ID == obj.ASSIGNED_BY_ID);
    const status = statuses.find(e => e.id == obj.UF_CRM_1745995594[0]);
    obj.UF_CRM_1745995594 = obj.UF_CRM_1745995594[0];
    obj.UF_CRM_1745222013992 = obj.UF_CRM_1745222013992 ? obj.UF_CRM_1745222013992.replace('|RUB', "") : 0;
    obj.UF_CRM_1742971372921 = obj.UF_CRM_1742971372921 ? obj.UF_CRM_1742971372921.replace('|RUB', "") : 0;
    obj.UF_CRM_1742972105926 = obj.UF_CRM_1742972105926 ? obj.UF_CRM_1742972105926.replace('|RUB', "") : 0;
    obj.UF_CRM_1742972167794 = obj.UF_CRM_1742972167794 ? obj.UF_CRM_1742972167794.replace('|RUB', "") : 0;
    obj.UF_CRM_1744062581756 = obj.UF_CRM_1744062581756 ? obj.UF_CRM_1744062581756.replace('|RUB', "") : 0;
    obj.event = event && event.title ? event.title : "";
    obj.ASSIGNED_BY_ID = displayFullName(user.LAST_NAME, user.NAME, user.SECOND_NAME);
    obj.status = status && status.title ? status.title : "";
    obj.stage = stageMap(obj.STAGE_ID);
    obj.user = user.ID;
  });

 const currentUser = await new Promise((resolve) => {
            BX24.callMethod(
          "user.current",
          {},
          function(result)
          {
              if(result.error())
                  console.error(result.error());
              else
                  resolve(result.data());
          }
      )
    });



dealsLocal.forEach(deal => {
  //if(currentUser.ID === deal.user){
      totalRow.value.UF_CRM_1745222013992 += +deal.UF_CRM_1745222013992;
      totalRow.value.UF_CRM_1742971372921 += +deal.UF_CRM_1742971372921;
      totalRow.value.UF_CRM_1742972167794 += +deal.UF_CRM_1742972167794;
      totalRow.value.UF_CRM_1742972105926 += +deal.UF_CRM_1742972105926;
      totalRow.value.UF_CRM_1744062581756 += +deal.UF_CRM_1744062581756;
 // }
});

table1.value = JSON.parse(JSON.stringify(dealsLocal.filter(deal => 
  currentUser.ID === deal.user
)));

deals.value = JSON.parse(JSON.stringify(dealsLocal));

  deals2.value = [];
  isLoading.value = false;
});

</script>

<style lang="sass">

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
    padding: 0 1.5rem 1.5rem 1.5rem

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

  .success.white--text
      background: #4cb050
      display: flex
      align-items: center
      justify-content: center
      padding: 0 1rem
      height: 4rem
      color: white
      font-size: 1.25rem

  .error.white--text
      background: #e30f0f
      display: flex
      align-items: center
      justify-content: center
      padding: 0 1rem
      height: 4rem
      color: white
      font-size: 1.25rem

  .successDialog .v-card-actions, .errorDialog .v-card-actions
      border-top: 1px solid #dddddd

  .loading 
        width: 100%
        height: 100%
        display: flex
        flex-direction: column
        align-items: center
        justify-content: center
        gap: 1rem
        font-size: 2rem
        font-weight: 500

  .v-table .v-table__wrapper > table > tbody > tr > td, .v-table .v-table__wrapper > table > thead > tr > th, .v-table .v-table__wrapper > table > tfoot > tr > td
    border: thin solid rgba(var(--v-border-color), var(--v-border-opacity))
    text-align: center

  .v-table 
    border-radius: 0.25rem
    border: 2px solid rgba(var(--v-border-color), var(--v-border-opacity))

  .v-data-table-footer
    justify-content: center

  .filters
    display: grid
    grid-template-columns: 1fr 1fr
    gap: 1rem
    margin-bottom: 1rem

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
    margin-top: 2rem


  .loading 
        width: 100%
        height: 100%
        display: flex
        flex-direction: column
        align-items: center
        justify-content: center
        gap: 1rem
        font-size: 2rem
        font-weight: 500
        z-index: 5
        position: absolute
        background: white

  .date-title
    display: flex
    justify-content: space-between

  .v-dialog > .v-overlay__content > .v-card, .v-dialog > .v-overlay__content > form > .v-card
    padding: 1em

  .v-data-table__th 
    background: #676767
    color: white

  tbody .v-data-table__tr:nth-child(even)
    background-color: white

  tbody .v-data-table__tr:nth-child(odd)
    background-color: #f2f2f2

  .table2 .v-data-table__tr .v-data-table__td:nth-child(2)
    white-space: nowrap

</style>