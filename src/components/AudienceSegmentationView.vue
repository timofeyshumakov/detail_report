<template>
  <div v-if="loading" class="page-loading">Загрузка...</div>
  <div v-else class="app-shell" :class="{ 'app-shell--embedded': embedded }">
    <LoadingSpinner :visible="detachLoading" :text="detachLoadingText" />

    <div class="report-card" :class="{ 'report-card--embedded': embedded }">
      <header class="report-header">
        <div class="brand-block">
          <div class="brand-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path d="M12 3l7 3.5v5.2c0 4.2-2.9 8-7 9.3-4.1-1.3-7-5.1-7-9.3V6.5L12 3z" stroke="#fff" stroke-width="1.8"/>
              <path d="M9.2 12.2l1.9 1.9 3.8-4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="brand-text">
            <h1 class="brand-title">{{ companyName || 'Название компании' }}</h1>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon">
              <v-icon size="20" color="#2A9B8E">mdi-account-group-outline</v-icon>
            </div>
            <div class="stat-meta">
              <div class="stat-label">Всего контактов</div>
              <div class="stat-value">{{ totalContactsCount }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <v-icon size="20" color="#2A9B8E">mdi-target</v-icon>
            </div>
            <div class="stat-meta">
              <div class="stat-label">Целевых аудиторий</div>
              <div class="stat-value">{{ audiencesCount }}</div>
            </div>
          </div>
        </div>

        <button
          class="btn-primary"
          type="button"
          @click="openCreateDialog"
          :disabled="detachLoading"
        >
          + Добавить контакт
        </button>
      </header>

      <div class="filters-bar">
        <div class="search-field">
          <v-icon size="18" class="field-icon">mdi-magnify</v-icon>
          <input
            v-model="searchInput"
            type="text"
            placeholder="Поиск по контакту: ФИО, e-mail, телефон"
            @keyup.enter="applyFilters"
          />
        </div>
        <div class="select-field">
          <v-icon size="18" class="field-icon">mdi-filter-variant</v-icon>
          <select v-model="selectedAudienceFilter">
            <option
              v-for="opt in audienceFilterOptions"
              :key="String(opt.id)"
              :value="opt.id"
            >
              {{ opt.title }}
            </option>
          </select>
          <v-icon size="18" class="select-caret">mdi-chevron-down</v-icon>
        </div>
        <button class="btn-primary btn-filter" type="button" @click="applyFilters">
          Применить фильтр
        </button>
      </div>

      <section
        class="audience-section"
        v-for="(audience, audienceName) in displayedGroupedByAudience"
        :key="audienceName"
        :id="'audience-' + String(audienceName).replace(/\s+/g, '-')"
      >
        <div class="section-head">
          <h2 class="section-title">{{ audienceTitles.get(audienceName) || audienceName }}</h2>
          <span class="count-pill">{{ formatContactCount(audience.length) }}</span>
        </div>

        <div class="table-wrap">
          <table class="contacts-table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Должность</th>
                <th>Город</th>
                <th>Целевые аудитории</th>
                <th>E-mail</th>
                <th>Телефон</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="contact in audience"
                :key="contact.ID"
                class="contact-row"
                @click="editContact(contact)"
              >
                <td>
                  <div class="name-cell">
                    <a
                      class="contact-name"
                      target="_blank"
                      :href="'https://' + domain + '/crm/contact/details/' + contact.ID + '/'"
                      @click.stop
                    >{{ contact.FULL_NAME }}</a>
                    <span v-if="getContactTypeLabel(contact)" class="type-label">
                      {{ getContactTypeLabel(contact) }}
                    </span>
                    <div
                      v-if="contact.medications && contact.medications.length"
                      class="meds-inline"
                      @click.stop
                    >
                      <div
                        v-for="(medication, m) in contact.medications"
                        :key="'cm-' + m"
                        class="meds-line"
                      >
                        <a
                          target="_blank"
                          :href="'https://' + domain + '/page/spravochniki/pgirfw/type/189/details/' + contact.UF_CRM_1750766630[m] + '/'"
                        >{{ medication }}</a>
                        <template v-if="contact.directions && contact.directions[m] && contact.directions[m].length">
                          — {{ contact.directions[m].join(', ') }}
                        </template>
                      </div>
                    </div>
                  </div>
                </td>
                <td>{{ contact.POST || '—' }}</td>
                <td>{{ getCity(contact) }}</td>
                <td>
                  <div class="tags" v-if="getContactAudienceTitles(contact).length">
                    <span
                      v-for="(title, ti) in getContactAudienceTitles(contact)"
                      :key="ti"
                      class="tag"
                    >{{ title }}</span>
                  </div>
                  <span v-else class="muted">не указаны</span>
                </td>
                <td>
                  <a
                    v-if="getEmail(contact)"
                    class="email-link"
                    :href="'mailto:' + getEmail(contact)"
                    @click.stop
                  >{{ getEmail(contact) }}</a>
                  <span v-else class="muted">—</span>
                </td>
                <td>{{ getPhone(contact) || '—' }}</td>
                <td>
                  <div class="actions-cell" @click.stop>
                    <button
                      v-if="enityId === 'CRM_DEAL_DETAIL_TAB'"
                      type="button"
                      class="btn-key"
                      :class="{ active: isKeyPerson(contact.ID) }"
                      @click="toggleKeyPerson(contact.ID)"
                      :disabled="detachLoading"
                      title="Доверенное лицо"
                    >
                      <v-icon size="16">{{ isKeyPerson(contact.ID) ? 'mdi-check' : 'mdi-account' }}</v-icon>
                    </button>
                    <button
                      type="button"
                      class="btn-detach"
                      @click="detachContact(contact.ID)"
                      :disabled="detachLoading"
                    >
                      Открепить
                    </button>
                    <button
                      type="button"
                      class="btn-change-company"
                      @click="openChangeCompanyDialog(contact)"
                      :disabled="detachLoading || changeCompanyDialog.saving"
                    >
                      Смена компании
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          class="section-extra"
          v-if="(filteredAudienceMedications[audienceName] && filteredAudienceMedications[audienceName].length) || (filteredAudienceEquipment[audienceName] && filteredAudienceEquipment[audienceName].length)"
        >
          <div v-if="filteredAudienceMedications[audienceName] && filteredAudienceMedications[audienceName].length" class="extra-line">
            <span class="extra-label">Препараты:</span>
            <a
              v-for="(medication, m) in filteredAudienceMedications[audienceName]"
              :key="'med-' + m"
              target="_blank"
              :href="'https://' + domain + '/page/spravochniki/pgirfw/type/189/details/' + medication.id + '/'"
            >{{ medication.title }}<template v-if="m < filteredAudienceMedications[audienceName].length - 1">, </template></a>
          </div>
          <div v-if="filteredAudienceEquipment[audienceName] && filteredAudienceEquipment[audienceName].length" class="extra-line">
            <span class="extra-label">Оборудование:</span>
            <a
              v-for="(equipmentItem, e) in filteredAudienceEquipment[audienceName]"
              :key="'eq-' + e"
              target="_blank"
              :href="'https://' + domain + '/crm/type/1104/details/' + equipmentItem.id + '/'"
            >{{ equipmentItem.title }}<template v-if="e < filteredAudienceEquipment[audienceName].length - 1">, </template></a>
          </div>
        </div>
      </section>

      <section
        class="audience-section"
        v-if="displayedContactsWithoutAudience.length > 0"
        id="no-audience-block"
      >
        <div class="section-head">
          <h2 class="section-title">Другие</h2>
          <span class="count-pill">{{ formatContactCount(displayedContactsWithoutAudience.length) }}</span>
        </div>

        <div class="table-wrap">
          <table class="contacts-table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Должность</th>
                <th>Город</th>
                <th>Целевые аудитории</th>
                <th>E-mail</th>
                <th>Телефон</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="contact in displayedContactsWithoutAudience"
                :key="contact.ID"
                class="contact-row"
                @click="editContact(contact)"
              >
                <td>
                  <div class="name-cell">
                    <a
                      class="contact-name"
                      target="_blank"
                      :href="'https://' + domain + '/crm/contact/details/' + contact.ID + '/'"
                      @click.stop
                    >{{ contact.FULL_NAME }}</a>
                    <span v-if="getContactTypeLabel(contact)" class="type-label">
                      {{ getContactTypeLabel(contact) }}
                    </span>
                    <div
                      v-if="contact.medications && contact.medications.length"
                      class="meds-inline"
                      @click.stop
                    >
                      <div
                        v-for="(medication, m) in contact.medications"
                        :key="'cm-o-' + m"
                        class="meds-line"
                      >
                        <a
                          target="_blank"
                          :href="'https://' + domain + '/page/baza_preparatov/preparaty/type/189/details/' + contact.UF_CRM_1750766630[m] + '/'"
                        >{{ medication }}</a>
                        <template v-if="contact.directions && contact.directions[m] && contact.directions[m].length">
                          — {{ contact.directions[m].join(', ') }}
                        </template>
                      </div>
                    </div>
                  </div>
                </td>
                <td>{{ contact.POST || '—' }}</td>
                <td>{{ getCity(contact) }}</td>
                <td><span class="muted">не указаны</span></td>
                <td>
                  <a
                    v-if="getEmail(contact)"
                    class="email-link"
                    :href="'mailto:' + getEmail(contact)"
                    @click.stop
                  >{{ getEmail(contact) }}</a>
                  <span v-else class="muted">—</span>
                </td>
                <td>{{ getPhone(contact) || '—' }}</td>
                <td>
                  <div class="actions-cell" @click.stop>
                    <button
                      v-if="enityId === 'CRM_DEAL_DETAIL_TAB'"
                      type="button"
                      class="btn-key"
                      :class="{ active: isKeyPerson(contact.ID) }"
                      @click="toggleKeyPerson(contact.ID)"
                      :disabled="detachLoading"
                      title="Доверенное лицо"
                    >
                      <v-icon size="16">{{ isKeyPerson(contact.ID) ? 'mdi-check' : 'mdi-account' }}</v-icon>
                    </button>
                    <button
                      type="button"
                      class="btn-detach"
                      @click="detachContact(contact.ID)"
                      :disabled="detachLoading"
                    >
                      Открепить
                    </button>
                    <button
                      type="button"
                      class="btn-change-company"
                      @click="openChangeCompanyDialog(contact)"
                      :disabled="detachLoading || changeCompanyDialog.saving"
                    >
                      Смена компании
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        class="audience-section"
        v-for="(audience, audienceName) in displayedAudiencesWithoutContacts"
        :key="'no-contacts-' + audienceName"
      >
        <div class="section-head">
          <h2 class="section-title">{{ audienceTitles.get(audienceName) || audienceName }}</h2>
          <span class="count-pill">{{ formatContactCount(0) }}</span>
        </div>
        <div class="section-extra always">
          <div v-if="audience.medications && audience.medications.length" class="extra-line">
            <span class="extra-label">Препараты:</span>
            <a
              v-for="(medication, m) in audience.medications"
              :key="'med-nc-' + m"
              target="_blank"
              :href="'https://' + domain + '/page/spravochniki/pgirfw/type/189/details/' + medication.id + '/'"
            >{{ medication.title }}<template v-if="m < audience.medications.length - 1">, </template></a>
          </div>
          <div v-if="audience.equipment && audience.equipment.length" class="extra-line">
            <span class="extra-label">Оборудование:</span>
            <a
              v-for="(equipmentItem, e) in audience.equipment"
              :key="'eq-nc-' + e"
              target="_blank"
              :href="'https://' + domain + '/crm/type/1104/details/' + equipmentItem.id + '/'"
            >{{ equipmentItem.title }}<template v-if="e < audience.equipment.length - 1">, </template></a>
          </div>
        </div>
      </section>
    </div>

    <v-dialog v-model="editDialog" max-width="600px" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-title">Редактирование контакта</v-card-title>
        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editContactData.LAST_NAME" label="Фамилия" variant="outlined" density="comfortable"></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editContactData.NAME" label="Имя" variant="outlined" density="comfortable"></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editContactData.SECOND_NAME" label="Отчество" variant="outlined" density="comfortable" clearable></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="editContactData.POST" label="Должность" variant="outlined" density="comfortable" clearable></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="editContactData.UF_CRM_1753083765"
                :items="cityOptions"
                item-title="title"
                item-value="id"
                label="Город"
                variant="outlined"
                density="comfortable"
                clearable
                :loading="citiesLoading"
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="editContactData.UF_CRM_1753364801"
                :items="audienceOptions"
                item-title="title"
                item-value="id"
                label="Целевые аудитории"
                multiple
                chips
                variant="outlined"
                density="comfortable"
                clearable
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="editContactData.emailValue" label="Email" variant="outlined" density="comfortable" clearable></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="editContactData.phoneValue" label="Телефон" variant="outlined" density="comfortable" clearable></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="cancelEdit" :disabled="saveLoading">Отменить</v-btn>
          <v-btn color="primary" @click="saveEdit" :loading="saveLoading" :disabled="saveLoading">Сохранить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="createDialog" max-width="600px" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-title">Новый контакт</v-card-title>
        <v-card-text class="pa-4">
          <v-alert v-if="duplicateMessages.length > 0" type="warning" density="compact" class="mb-4">
            <div v-for="(message, index) in duplicateMessages" :key="index" class="mb-1">
              {{ message.message }}
              <a
                v-if="message.contactId"
                :href="'https://' + domain + '/crm/contact/details/' + message.contactId + '/'"
                target="_blank"
                class="ml-1 text-decoration-underline white"
                @click.stop
              >{{ message.contactName }}</a>
            </div>
          </v-alert>
          <v-row>
            <v-col cols="12" sm="4">
              <v-text-field v-model="newContactData.LAST_NAME" label="Фамилия *" variant="outlined" density="comfortable" required></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="newContactData.NAME" label="Имя *" variant="outlined" density="comfortable" required></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="newContactData.SECOND_NAME" label="Отчество" variant="outlined" density="comfortable" clearable></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="newContactData.POST" label="Должность" variant="outlined" density="comfortable" clearable></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="newContactData.UF_CRM_1753083765"
                :items="cityOptions"
                item-title="title"
                item-value="id"
                label="Город"
                variant="outlined"
                density="comfortable"
                clearable
                :loading="citiesLoading"
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="newContactData.UF_CRM_1753364801"
                :items="audienceOptions"
                item-title="title"
                item-value="id"
                label="Целевые аудитории"
                multiple
                chips
                variant="outlined"
                density="comfortable"
                clearable
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="newContactData.emailValue" label="Email" variant="outlined" density="comfortable" clearable @input="checkDuplicates"></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="newContactData.phoneValue" label="Телефон" variant="outlined" density="comfortable" clearable @input="checkDuplicates"></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="cancelCreate" :disabled="createLoading">Отменить</v-btn>
          <v-btn color="primary" @click="createContact" :loading="createLoading" :disabled="createLoading">Создать</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="changeCompanyDialog.open" max-width="560px" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-title">Смена компании</v-card-title>
        <v-card-text class="pa-4">
          <p v-if="changeCompanyDialog.contactName" class="change-company-hint">
            Контакт: <strong>{{ changeCompanyDialog.contactName }}</strong>
          </p>
          <p class="change-company-hint">
            Выберите компанию из списка. Контакт будет откреплён от текущей и привязан к новой.
          </p>
          <v-autocomplete
            v-model="changeCompanyDialog.selectedId"
            :items="changeCompanyDialog.options"
            item-title="title"
            item-value="id"
            label="Компания"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            clearable
            auto-select-first
            :loading="changeCompanyDialog.loading"
            :disabled="changeCompanyDialog.saving"
            @update:search="searchCompanies"
          />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            :disabled="changeCompanyDialog.saving"
            @click="closeChangeCompanyDialog"
          >
            Отменить
          </v-btn>
          <v-btn
            color="primary"
            :loading="changeCompanyDialog.saving"
            :disabled="!changeCompanyDialog.selectedId || changeCompanyDialog.saving"
            @click="submitChangeCompany"
          >
            Сохранить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, reactive, nextTick } from 'vue';
import { callApi, callBxMethod, getListElements } from '../functions/callApi';
import LoadingSpinner from './LoadingSpinner.vue';

export default {
  name: 'AudienceSegmentationView',
  components: {
    LoadingSpinner
  },
  props: {
    dealId: {
      type: [Number, String],
      default: null,
    },
    trustedPersonId: {
      type: [Number, String],
      default: null,
    },
    embedded: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['trusted-person-updated'],
  setup(props, { emit }) {
    const normalizeIdList = (value) => {
      if (value == null || value === '') return [];
      if (Array.isArray(value)) {
        return value
          .map((item) => {
            if (item == null || item === '') return null;
            if (typeof item === 'object') return String(item.ID ?? item.id ?? item.CONTACT_ID ?? item.VALUE ?? '');
            return String(item);
          })
          .filter(Boolean);
      }
      if (typeof value === 'object') {
        const id = value.ID ?? value.id ?? value.CONTACT_ID ?? value.VALUE;
        return id != null && id !== '' ? [String(id)] : [];
      }
      if (typeof value === 'string' && value.includes(',')) {
        return value.split(',').map((part) => part.trim()).filter(Boolean);
      }
      return [String(value)];
    };

    const normalizeListElements = (items) => {
      if (!items) return [];
      if (Array.isArray(items)) return items.flat();
      if (typeof items === 'object') return Object.values(items);
      return [items];
    };

    const buildAudienceTitlesMap = (items) => {
      const map = new Map();
      normalizeListElements(items).forEach((item) => {
        const id = item?.ID ?? item?.id;
        const name = item?.NAME ?? item?.name ?? item?.TITLE ?? item?.title;
        if (id != null && id !== '' && name != null && String(name).trim() !== '') {
          map.set(String(id), String(name));
        }
      });
      return map;
    };

    const normalizeContactAudienceField = (contact) => {
      if (!contact || typeof contact !== 'object') return;
      contact.UF_CRM_1753364801 = normalizeIdList(contact.UF_CRM_1753364801);
    };

    const loadCompanyContactIds = async (targetCompanyId) => {
      const items = await callBxMethod('crm.company.contact.items.get', { id: targetCompanyId });
      return normalizeListElements(items)
        .map((item) => {
          if (item == null || item === '') return null;
          if (typeof item === 'object') {
            return String(item.CONTACT_ID ?? item.ID ?? item.id ?? '');
          }
          return String(item);
        })
        .filter(Boolean);
    };
    const loading = ref(true);
    const detachLoading = ref(false);
    const detachLoadingText = ref('Открепление контакта...');
    const companyName = ref('');
    const searchInput = ref('');
    const appliedSearch = ref('');
    const appliedAudienceFilter = ref('');
    const editDialog = ref(false);
    const saveLoading = ref(false);
    const citiesLoading = ref(false);
    const error = ref(null);
    const contacts = ref([]);
    const contactsIds = ref([]);
    const domain = ref('');
    const audienceTitles = ref(new Map());
    const cityTitles = ref(new Map());
    const products = ref([]);
    const equipment = ref([]);
    const companyId = ref(0);
    const dealId = ref(0);
    const enityId = ref("");
    const dealAudience = ref([]);
    const companyTargetAudience = ref(new Map());
    const keyPersons = ref([]);
const selectedAudienceFilter = ref('');
    const audienceFilterOptions = computed(() => {
  const allOption = { id: '', title: 'Все целевые аудитории' };
  const options = [];
  const allAudienceIds = new Set();
  
  contacts.value.forEach(contact => {
    if (contact.UF_CRM_1753364801 && contact.UF_CRM_1753364801.length > 0) {
      contact.UF_CRM_1753364801.forEach(audienceId => {
        const audienceTitle = audienceTitles.value.get(String(audienceId));
        if (audienceTitle && audienceTitle.trim() !== '' && !allAudienceIds.has(String(audienceId))) {
          allAudienceIds.add(String(audienceId));
          options.push({
            id: String(audienceId),
            title: audienceTitle
          });
        }
      });
    }
  });
  
  Object.keys(audiencesWithoutContacts.value).forEach(audienceTitle => {
    const audienceId = Array.from(audienceTitles.value.entries())
      .find(([id, title]) => title === audienceTitle)?.[0];
    
    if (audienceId && !allAudienceIds.has(audienceId)) {
      allAudienceIds.add(audienceId);
      options.push({
        id: audienceId,
        title: audienceTitle
      });
    }
  });
  
  if (contactsWithoutAudience.value.length > 0) {
    options.push({ 
      id: 'no-audience', 
      title: 'Другие' 
    });
  }
  
  return [allOption, ...options.sort((a, b) => a.title.localeCompare(b.title))];
});

    const scrollToAudience = async (audienceId) => {
      if (!audienceId) {
        // Если фильтр сброшен, прокручиваем наверх
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      
      await nextTick();
      
      let elementId;
      let element;
      
      if (audienceId === 'no-audience') {
        elementId = 'no-audience-block';
        element = document.getElementById(elementId);
        
        if (!element) {
          document.querySelectorAll('.section-title').forEach(block => {
            if (block.textContent.trim() === 'Другие') {
              element = block.closest('.audience-section');
            }
          });
        }
      } else {
        const audienceTitle = audienceTitles.value.get(String(audienceId)) || audienceId;
        elementId = `audience-${String(audienceTitle).replace(/\s+/g, '-')}`;
        element = document.getElementById(elementId);
        
        if (!element) {
          document.querySelectorAll('.section-title').forEach(block => {
            if (block.textContent.trim() === audienceTitle) {
              element = block.closest('.audience-section');
            }
          });
        }
      }
      
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        
        element.style.transition = 'all 0.3s ease';
        element.style.boxShadow = '0 0 0 3px rgba(42, 155, 142, 0.35)';
        
        setTimeout(() => {
          element.style.boxShadow = '';
        }, 1500);
      }
    };

    // Данные для редактирования контакта
    const editContactData = reactive({
      ID: null,
      NAME: '',
      LAST_NAME: '',
      SECOND_NAME: '',
      POST: '',
      UF_CRM_1753083765: null,
      UF_CRM_1753364801: [],
      emailValue: '',
      phoneValue: ''
    });

    // Оригинальные данные для отмены изменений
    const originalContactData = reactive({
      ID: null,
      NAME: '',
      LAST_NAME: '',
      SECOND_NAME: '',
      POST: '',
      UF_CRM_1753083765: null,
      UF_CRM_1753364801: [],
      emailValue: '',
      phoneValue: ''
    });

    // Опции для выбора
    const audienceOptions = computed(() => {
      const options = [];
      audienceTitles.value.forEach((title, id) => {
        if (title && title.trim() !== '') {
          options.push({
            id: String(id),
            title: title
          });
        }
      });
      return options;
    });

    const cityOptions = computed(() => {
      const options = [];
      cityTitles.value.forEach((title, id) => {
        if (title && title.trim() !== '') {
          options.push({
            id: String(id),
            title: title
          });
        }
      });
      return options;
    });

    // Функция для открытия диалога редактирования
    const editContact = (contact) => {
      // Сохраняем оригинальные данные
      Object.keys(originalContactData).forEach(key => {
        originalContactData[key] = contact[key] || null;
      });
      
      // Заполняем данные для редактирования
      editContactData.ID = contact.ID;
      editContactData.LAST_NAME = contact.LAST_NAME || '';
      editContactData.NAME = contact.NAME || '';
      editContactData.SECOND_NAME = contact.SECOND_NAME || '';
      editContactData.POST = contact.POST || '';
      editContactData.UF_CRM_1753083765 = contact.UF_CRM_1753083765 ? String(contact.UF_CRM_1753083765) : null;
      editContactData.UF_CRM_1753364801 = contact.UF_CRM_1753364801 ? 
        contact.UF_CRM_1753364801.map(id => String(id)) : [];
      
      // Извлекаем первый email
      editContactData.emailValue = contact.EMAIL && contact.EMAIL[0] ? 
        contact.EMAIL[0].VALUE : '';
      
      // Извлекаем первый телефон
      editContactData.phoneValue = contact.PHONE && contact.PHONE[0] ? 
        contact.PHONE[0].VALUE : '';
      
      editDialog.value = true;
    };

    // Функция для сохранения изменений
    const saveEdit = async () => {
      try {
        saveLoading.value = true;
        
        // Подготавливаем данные для обновления
        const updateData = {
          ID: editContactData.ID,
          NAME: editContactData.NAME || '',
          LAST_NAME: editContactData.LAST_NAME || '',
          SECOND_NAME: editContactData.SECOND_NAME || '',
          POST: editContactData.POST || ''
        };
        
        // Город (один)
        if (editContactData.UF_CRM_1753083765) {
          updateData.UF_CRM_1753083765 = editContactData.UF_CRM_1753083765;
        } else {
          updateData.UF_CRM_1753083765 = '';
        }
        
        // Целевые аудитории (массив)
        if (editContactData.UF_CRM_1753364801 && editContactData.UF_CRM_1753364801.length > 0) {
          updateData.UF_CRM_1753364801 = editContactData.UF_CRM_1753364801;
        } else {
          updateData.UF_CRM_1753364801 = [];
        }
        
        // Email (если изменился)
        if (editContactData.emailValue !== originalContactData.emailValue) {
          updateData.EMAIL = editContactData.emailValue ? 
            [{ VALUE: editContactData.emailValue, VALUE_TYPE: 'WORK' }] : 
            [];
        }
        
        // Телефон (если изменился)
        if (editContactData.phoneValue !== originalContactData.phoneValue) {
          updateData.PHONE = editContactData.phoneValue ? 
            [{ VALUE: editContactData.phoneValue, VALUE_TYPE: 'WORK' }] : 
            [];
        }
        
        console.log('Обновление контакта:', updateData);
        
        // Вызов API для обновления контакта
        await new Promise((resolve, reject) => {
          BX24.callMethod('crm.contact.update', {
            'id': updateData.ID,
            'fields': updateData,
          }, (response) => {
            if (response.error()) {
              reject(response.error());
            } else {
              resolve(response.data());
            }
          });
        });
        
        // Обновляем контакт в локальном списке
        const contactIndex = contacts.value.findIndex(c => c.ID === editContactData.ID);
        if (contactIndex !== -1) {
          const updatedContact = { ...contacts.value[contactIndex] };
          
          // Обновляем поля
          updatedContact.POST = updateData.POST;
          updatedContact.UF_CRM_1753083765 = updateData.UF_CRM_1753083765;
          updatedContact.UF_CRM_1753364801 = updateData.UF_CRM_1753364801;
          
          // Обновляем email и телефон
          if (updateData.EMAIL) {
            updatedContact.EMAIL = updateData.EMAIL;
          }
          
          if (updateData.PHONE) {
            updatedContact.PHONE = updateData.PHONE;
          }
          
          // Заменяем контакт в массиве
          contacts.value[contactIndex] = updatedContact;
          
          // Триггерим реактивность
          contacts.value = [...contacts.value];
        }
        
        // Закрываем диалог
        editDialog.value = false;
        
        // Показываем уведомление
        alert('Контакт успешно обновлен');
        
      } catch (error) {
        console.error('Ошибка при обновлении контакта:', error);
        alert('Произошла ошибка при обновлении контакта');
      } finally {
        saveLoading.value = false;
      }
    };

    // Функция для отмены редактирования
    const cancelEdit = () => {
      editDialog.value = false;
      
      // Сбрасываем данные
      setTimeout(() => {
        Object.keys(editContactData).forEach(key => {
          editContactData[key] = '';
        });
        Object.keys(originalContactData).forEach(key => {
          originalContactData[key] = '';
        });
      }, 300);
    };

    // Функция для получения названий целевых аудиторий контакта
    const getContactAudienceTitles = (contact) => {
      if (!contact.UF_CRM_1753364801 || contact.UF_CRM_1753364801.length === 0) {
        return [];
      }
      
      return contact.UF_CRM_1753364801
        .map(audienceId => audienceTitles.value.get(String(audienceId)) || String(audienceId))
        .filter(title => title && title.trim() !== '');
    };

    // Функция для открепления контакта от компании
    const detachContact = async (contactId) => {
      try {
        if (confirm('Вы действительно хотите открепить этот контакт от компании?')) {
          detachLoading.value = true;
          detachLoadingText.value = 'Открепление контакта...';
          
          const result = await detachContacts(companyId.value, [contactId]);
          
          if (result.success) {
            contacts.value = contacts.value.filter(contact => contact.ID !== contactId);
            
            setTimeout(() => {
              alert('Контакт успешно откреплен');
            }, 100);
          } else {
            setTimeout(() => {
              alert(`Ошибка при откреплении контакта: ${result.errors.join(', ')}`);
            }, 100);
          }
        }
      } catch (error) {
        console.error('Ошибка при откреплении контакта:', error);
        setTimeout(() => {
          alert('Произошла ошибка при откреплении контакта');
        }, 100);
      } finally {
        setTimeout(() => {
          detachLoading.value = false;
        }, 300);
      }
    };

    // Остальной код без изменений...
    const parseCompanyTargetAudience = (fieldValue) => {
      const result = new Map();
      if (!fieldValue) return result;
      
      const lines = fieldValue.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const match = line.match(/^(\d+)\s*-\s*(.+)$/);
        if (match) {
          const companyId = match[1].trim();
          const audienceIds = match[2].split(',')
            .map(id => id.trim())
            .filter(id => id && id !== '');
          
          result.set(companyId, audienceIds);
        }
      });
      return result;
    };

    const normalizeTrustedPersonValue = (value) => {
      if (value == null || value === '') return [];
      if (Array.isArray(value)) {
        return value
          .map((item) => {
            if (item == null || item === '') return null;
            if (typeof item === 'object') return String(item.ID ?? item.id ?? item.VALUE ?? '');
            return String(item);
          })
          .filter(Boolean);
      }
      if (typeof value === 'object') {
        const id = value.ID ?? value.id ?? value.VALUE;
        return id != null && id !== '' ? [String(id)] : [];
      }
      return [String(value)];
    };

    const isKeyPerson = (contactId) => {
      return keyPersons.value.includes(String(contactId));
    };

    const dealContactsIdsSnapshot = () => {
      return (contacts.value || [])
        .map((contact) => contact?.ID)
        .filter((id) => id != null && id !== '')
        .map(String);
    };

    const toggleKeyPerson = async (contactId) => {
      try {
        if (detachLoading.value) return;
        if (!dealId.value) return;

        const nextId = String(contactId);
        const isSame = keyPersons.value.length === 1 && keyPersons.value[0] === nextId;
        const nextValue = isSame ? [] : [nextId];
        const remoteValue = isSame ? '' : nextId;

        keyPersons.value = nextValue;
        await new Promise((resolve, reject) => {
          BX24.callMethod(
            'crm.deal.update',
            { id: dealId.value, fields: { UF_CRM_1756807710: remoteValue } },
            (result) => {
              if (result.error()) reject(result.error());
              else resolve(result.data());
            },
          );
        });

        emit('trusted-person-updated', {
          dealId: dealId.value,
          contactId: isSame ? null : nextId,
          contactIds: dealContactsIdsSnapshot(),
        });
      } catch (error) {
        console.error('Ошибка при обновлении доверенного лица:', error);
      }
    };

    const fetchKeyPersons = async () => {
      try {
        if (props.trustedPersonId != null && props.trustedPersonId !== '') {
          keyPersons.value = [String(props.trustedPersonId)];
          return;
        }

        if (enityId.value === 'CRM_DEAL_DETAIL_TAB') {
          const deal = await callApi("crm.deal.list", { 
            ID: dealId.value 
          }, ["UF_CRM_1756807710"]);
          
          if (deal[0] && deal[0].UF_CRM_1756807710 != null && deal[0].UF_CRM_1756807710 !== '') {
            keyPersons.value = normalizeTrustedPersonValue(deal[0].UF_CRM_1756807710);
          } else {
            keyPersons.value = [];
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке доверенного лица:', error);
      }
    };

    const resolveExternalDealId = () => {
      if (props.dealId != null && props.dealId !== '') {
        return String(props.dealId);
      }

      try {
        const placementInfo = globalThis.BX24?.placement?.info?.() || {};
        const options = placementInfo.options || {};
        const fromOptions = options.dealId || options.DEAL_ID || options.ID;
        if (placementInfo.placement === 'CRM_DEAL_DETAIL_TAB' && fromOptions) {
          return String(fromOptions);
        }
        if (options.dealId || options.DEAL_ID) {
          return String(options.dealId || options.DEAL_ID);
        }
      } catch (_) {
        // ignore placement read errors
      }

      const params = new URLSearchParams(window.location.search);
      return params.get('dealId') || params.get('DEAL_ID') || null;
    };

    const fetchCompanyData = async () => {
      domain.value = globalThis.BX24?.getDomain?.() || window.location.hostname;
      const externalDealId = resolveExternalDealId();

      if (externalDealId) {
        enityId.value = 'CRM_DEAL_DETAIL_TAB';
      } else {
        const placementInfo = globalThis.BX24?.placement?.info?.() || {};
        enityId.value = placementInfo.placement ?? 'CRM_COMPANY_DETAIL_TAB';
        enityId.value = enityId.value === 'DEFAULT' ? 'CRM_COMPANY_DETAIL_TAB' : enityId.value;
      }
      console.log(enityId.value, externalDealId);
      let contactsList = "";

      try {
        if (enityId.value === "CRM_DEAL_DETAIL_TAB") {
          const targetDealId = externalDealId || globalThis.BX24?.placement?.info?.()?.options?.ID;
          const deal = await callApi("crm.deal.list", { ID: targetDealId}, ["ID", "COMPANY_ID", "UF_CRM_1754290331", "UF_CRM_1753365812", "UF_CRM_1758377551"]);
          if (!deal?.[0]) {
            throw new Error(`Сделка #${targetDealId ?? '—'} не найдена`);
          }
          if (!deal[0].COMPANY_ID || Number(deal[0].COMPANY_ID) === 0) {
            throw new Error(`У сделки #${deal[0].ID} не указана компания`);
          }
          dealId.value = deal[0].ID;
          companyId.value = deal[0].COMPANY_ID;
          dealAudience.value = normalizeIdList(deal[0].UF_CRM_1753365812);

          contactsList = await loadCompanyContactIds(companyId.value);

          if (deal[0] && deal[0].UF_CRM_1758377551) {
            const hiddenContactIds = normalizeIdList(deal[0].UF_CRM_1758377551);
            const hiddenContacts = new Set(hiddenContactIds.map((id) => Number(id)));
            contactsList = contactsList.filter((item) => !hiddenContacts.has(Number(item)));
          }
        } else if(enityId.value === "CRM_COMPANY_DETAIL_TAB") {
          console.log(globalThis.BX24?.placement?.info?.());
          companyId.value = globalThis.BX24?.placement?.info?.()?.options?.ID ?? 16648;
          contactsList = await loadCompanyContactIds(companyId.value);
        }

        const company = await callBxMethod('crm.company.get', { id: companyId.value });

        companyTargetAudience.value = parseCompanyTargetAudience(company.UF_CRM_1756633452);
        companyName.value = company.TITLE || company.NAME || '';

        return [contactsList, company.UF_CRM_1745407296, company.UF_CRM_1753257731];
      } catch (err) {
        console.error('Ошибка:', err);
        error.value = err.message;
        throw err;
      }
    };

    const fetchData = async () => {
      try {
        loading.value = true;
        const [users, productsToFetch, equipmentToFetch] = await fetchCompanyData();
        await fetchKeyPersons();
        const userData = await callApi("crm.contact.list", { ID: users }, ["UF_CRM_1750766630", "NAME", "LAST_NAME", "SECOND_NAME", "POST", "TYPE_ID", "EMAIL", "PHONE", "UF_CRM_1753364801", "UF_CRM_1753083765", "UF_CRM_1756633452"]);
        
        products.value = await callApi("crm.item.list", {id: productsToFetch}, ["id", "title", "ufCrm26_1753365041"], 189);
        equipment.value = await callApi("crm.item.list", {id: equipmentToFetch}, ["id", "title", "ufCrm62_1753365319"], 1104);
        
        const productsFields = await getListElements(216, {}, ["ID", "NAME"]);
        
        const cities = await callApi("crm.item.list", {}, ["id", "title"], 1094, 0, 0);
        
        audienceTitles.value = buildAudienceTitlesMap(productsFields);
        cityTitles.value = new Map(normalizeListElements(cities).map(item => [String(item.id ?? item.ID), item.title ?? item.TITLE ?? item.NAME]));

        userData.forEach((contact) => {
          normalizeContactAudienceField(contact);
          contact.FULL_NAME = `${contact.LAST_NAME ? contact.LAST_NAME : ""} ${contact.NAME ? contact.NAME : ""} ${contact.SECOND_NAME ? contact.SECOND_NAME : ""}`;
          if (contact.UF_CRM_1750766630 && contact.UF_CRM_1750766630.length > 0) {
            const productIds = contact.UF_CRM_1750766630.map(id => Number(id));

            const medications = productIds
              .map(id => products.value.find(product => product.id == Number(id)))
              .map(product => product && product.title)
              .filter(name => name !== undefined);

            const directions = productIds
              .map(id => products.value.find(product => product.id === Number(id)))
              .map(product => {
                if (!product) return [];
                let values = Array.isArray(product.ufCrm26_1753365041) ?
                  product.ufCrm26_1753365041 :
                  [product.ufCrm26_1753365041];
                return values.map(value => audienceTitles.value.get(String(value)) || String(value)).filter(d => d !== undefined);
              });

            contact.medications = medications;
            contact.directions = directions;
          }
        });

        contacts.value = userData;
        contactsIds.value = userData.map((item) => item.ID);
      } catch (err) {
        error.value = err.message || 'Ошибка загрузки данных';
        console.error('Ошибка:', err);
      } finally {
        loading.value = false;
      }
    };

    const isEmbeddedDealView = computed(() => props.dealId != null && props.dealId !== '');

    const shouldShowAllContactAudiences = computed(() =>
      enityId.value === 'CRM_COMPANY_DETAIL_TAB' || isEmbeddedDealView.value,
    );

    const isContactInTargetAudience = (contact) => {
      if (shouldShowAllContactAudiences.value) {
        return true;
      }

      if (!contact.UF_CRM_1753364801 || contact.UF_CRM_1753364801.length === 0) {
        return false;
      }

      const targetAudiences = enityId.value === 'CRM_DEAL_DETAIL_TAB' ? 
        dealAudience.value.map(id => String(id)) : 
        (companyTargetAudience.value.get(String(companyId.value)) || []);
      
      if (targetAudiences.length === 0) {
        return true;
      }
      
      return contact.UF_CRM_1753364801.some(audienceId => 
        targetAudiences.includes(String(audienceId))
      );
    };

    const contactsWithoutAudience = computed(() => {
      return contacts.value.filter(contact => 
        !contact.UF_CRM_1753364801 || 
        contact.UF_CRM_1753364801.length === 0
      );
    });

    const audiencesWithoutContacts = computed(() => {
      const result = {};
      
      if (enityId.value === 'CRM_COMPANY_DETAIL_TAB') {
        const allAudiences = new Set();
        
        products.value.forEach(product => {
          let audiences = Array.isArray(product.ufCrm26_1753365041) ? 
            product.ufCrm26_1753365041 : 
            [product.ufCrm26_1753365041];
          audiences.forEach(audienceId => {
            const audienceTitle = audienceTitles.value.get(String(audienceId)) || String(audienceId);
            if (audienceTitle && audienceTitle.trim() !== '') {
              allAudiences.add(String(audienceId));
            }
          });
        });
        
        equipment.value.forEach(equip => {
          let audiences = Array.isArray(equip.ufCrm62_1753365319) ? 
            equip.ufCrm62_1753365319 : 
            [equip.ufCrm62_1753365319];
          audiences.forEach(audienceId => {
            const audienceTitle = audienceTitles.value.get(String(audienceId)) || String(audienceId);
            if (audienceTitle && audienceTitle.trim() !== '') {
              allAudiences.add(String(audienceId));
            }
          });
        });
        
        allAudiences.forEach(audienceId => {
          const audienceTitle = audienceTitles.value.get(String(audienceId)) || String(audienceId);
          
          if (!audienceTitle || audienceTitle.trim() === '') {
            return;
          }
          
          if (!filteredGroupedByAudience.value[audienceTitle] || 
              filteredGroupedByAudience.value[audienceTitle].length === 0) {
            
            const hasMedications = filteredAudienceMedications.value[audienceTitle] && 
                                  filteredAudienceMedications.value[audienceTitle].length > 0;
            const hasEquipment = filteredAudienceEquipment.value[audienceTitle] && 
                                filteredAudienceEquipment.value[audienceTitle].length > 0;
            
            if (hasMedications || hasEquipment) {
              result[audienceTitle] = {
                medications: filteredAudienceMedications.value[audienceTitle] || [],
                equipment: filteredAudienceEquipment.value[audienceTitle] || []
              };
            }
          }
        });
      } else {
        const targetAudiences = dealAudience.value.map(id => String(id));
        
        if (targetAudiences.length === 0) {
          return result;
        }
        
        targetAudiences.forEach(audienceId => {
          const audienceTitle = audienceTitles.value.get(String(audienceId)) || String(audienceId);
          
          if (!audienceTitle || audienceTitle.trim() === '') {
            return;
          }
          
          if (!filteredGroupedByAudience.value[audienceTitle] || 
              filteredGroupedByAudience.value[audienceTitle].length === 0) {
            
            const hasMedications = filteredAudienceMedications.value[audienceTitle] && 
                                  filteredAudienceMedications.value[audienceTitle].length > 0;
            const hasEquipment = filteredAudienceEquipment.value[audienceTitle] && 
                                filteredAudienceEquipment.value[audienceTitle].length > 0;
            
            if (hasMedications || hasEquipment) {
              result[audienceTitle] = {
                medications: filteredAudienceMedications.value[audienceTitle] || [],
                equipment: filteredAudienceEquipment.value[audienceTitle] || []
              };
            }
          }
        });
      }
      
      return result;
    });

    const filteredAudienceEquipment = computed(() => {
      const equipByAudience = {};
      const targetAudiences = enityId.value === 'CRM_DEAL_DETAIL_TAB' ? 
        dealAudience.value.map(id => String(id)) : 
        (companyTargetAudience.value.get(String(companyId.value)) || []);
      
      const showAll = enityId.value === 'CRM_COMPANY_DETAIL_TAB' || targetAudiences.length === 0;
      
      equipment.value.forEach(equip => {
        let audiences = Array.isArray(equip.ufCrm62_1753365319) ? 
          equip.ufCrm62_1753365319 : 
          [equip.ufCrm62_1753365319];
        audiences.forEach(audienceId => {
          const audienceTitle = audienceTitles.value.get(String(audienceId)) || String(audienceId);
          
          if (!audienceTitle || audienceTitle.trim() === '') {
            return;
          }
          
          if (showAll || targetAudiences.includes(String(audienceId))) {
            if (!equipByAudience[audienceTitle]) {
              equipByAudience[audienceTitle] = [];
            }
            if (!equipByAudience[audienceTitle].some(e => e.id === equip.id)) {
              equipByAudience[audienceTitle].push({ id: equip.id, title: equip.title });
            }
          }
        });
      });
      return equipByAudience;
    });

    const filteredGroupedByAudience = computed(() => {
  const groups = new Map();
  
  const showAllForCompany = shouldShowAllContactAudiences.value;
  
  contacts.value
    .filter(contact => {
      // Исключаем контакты без целевых аудиторий
      if (!contact.UF_CRM_1753364801 || contact.UF_CRM_1753364801.length === 0) {
        return false;
      }
      
      return showAllForCompany || isContactInTargetAudience(contact);
    })
    .forEach(contact => {
      contact.UF_CRM_1753364801.forEach(audienceId => {
        const audienceTitle = audienceTitles.value.get(String(audienceId)) || String(audienceId);
        
        if (!audienceTitle || audienceTitle.trim() === '') {
          return;
        }
        
        const targetAudiencesForThis = enityId.value === 'CRM_DEAL_DETAIL_TAB' ? 
          dealAudience.value.map(id => String(id)) :
          (contact.UF_CRM_1756633452 ? 
            parseCompanyTargetAudience(contact.UF_CRM_1756633452).get(String(companyId.value)) || [] :
            companyTargetAudience.value.get(String(companyId.value)) || []);
        
        if (showAllForCompany || targetAudiencesForThis.length === 0 || targetAudiencesForThis.includes(String(audienceId))) {
          if (!groups.has(audienceTitle)) {
            groups.set(audienceTitle, []);
          }
          if (!groups.get(audienceTitle).some(c => c.ID === contact.ID)) {
            groups.get(audienceTitle).push(contact);
          }
        }
      });
    });
  return Object.fromEntries(groups);
});

    const filteredAudienceMedications = computed(() => {
      const medsByAudience = {};
      const targetAudiences = enityId.value === 'CRM_DEAL_DETAIL_TAB' ? 
        dealAudience.value.map(id => String(id)) : 
        (companyTargetAudience.value.get(String(companyId.value)) || []);
      
      const showAll = enityId.value === 'CRM_COMPANY_DETAIL_TAB' || targetAudiences.length === 0;
      
      products.value.forEach(product => {
        let audiences = Array.isArray(product.ufCrm26_1753365041) ? 
          product.ufCrm26_1753365041 : 
          [product.ufCrm26_1753365041];
        audiences.forEach(audienceId => {
          const audienceTitle = audienceTitles.value.get(String(audienceId)) || String(audienceId);
          
          if (!audienceTitle || audienceTitle.trim() === '') {
            return;
          }
          
          if (showAll || targetAudiences.includes(String(audienceId))) {
            if (!medsByAudience[audienceTitle]) {
              medsByAudience[audienceTitle] = [];
            }
            if (!medsByAudience[audienceTitle].some(med => med.id === product.id)) {
              medsByAudience[audienceTitle].push({ id: product.id, title: product.title });
            }
          }
        });
      });
      return medsByAudience;
    });
// Данные для создания нового контакта
const newContactData = reactive({
    LAST_NAME: '',
    NAME: '',
    SECOND_NAME: '',
    POST: '',
    UF_CRM_1753083765: null,
    UF_CRM_1753364801: [],
    emailValue: '',
    phoneValue: ''
});

// Флаги для диалога создания
    const createDialog = ref(false);
    const createLoading = ref(false);
    const changeCompanyDialog = reactive({
      open: false,
      loading: false,
      saving: false,
      selectedId: null,
      contactId: null,
      contactName: '',
      options: [],
    });
    let companySearchTimer = null;

// Сообщения о дубликатах
const duplicateMessages = ref([]);

// Функция для открытия диалога создания контакта
const openCreateDialog = () => {
  // Сбрасываем данные
  Object.keys(newContactData).forEach(key => {
    if (key.includes('UF_CRM')) {
      newContactData[key] = key.includes('1753364801') ? [] : null;
    } else {
      newContactData[key] = '';
    }
  });
  
  // Сбрасываем сообщения о дубликатах
  duplicateMessages.value = [];
  
  createDialog.value = true;
};

// Функция для проверки дубликатов
const checkDuplicates = () => {
    duplicateMessages.value = [];
    
    const lastName = newContactData.LAST_NAME?.trim().toLowerCase();
    const firstName = newContactData.NAME?.trim().toLowerCase();
    const middleName = newContactData.SECOND_NAME?.trim().toLowerCase();
    const fullName = `${lastName} ${firstName} ${middleName}`.trim().toLowerCase();
    const email = newContactData.emailValue?.trim().toLowerCase();
    const phone = newContactData.phoneValue?.trim();
    if (lastName || firstName) {
    // Ищем контакты с похожим ФИО
    const nameDuplicates = contacts.value.filter(contact => {
      const contactLastName = contact.LAST_NAME?.toLowerCase() || '';
      const contactFirstName = contact.NAME?.toLowerCase() || '';
      const contactMiddleName = contact.SECOND_NAME?.toLowerCase() || '';
      const contactFullName = `${contactLastName} ${contactFirstName} ${contactMiddleName}`.trim().toLowerCase();
      
      // Проверяем совпадение фамилии и имени
      const lastNameMatch = lastName && contactLastName && 
        (contactLastName === lastName || 
         contactLastName.includes(lastName) || 
         lastName.includes(contactLastName));
      
      const firstNameMatch = firstName && contactFirstName && 
        (contactFirstName === firstName || 
         contactFirstName.includes(firstName) || 
         firstName.includes(contactFirstName));
      
      // Полное ФИО для более точной проверки
      const fullNameMatch = fullName && contactFullName && 
        (contactFullName === fullName || 
         contactFullName.includes(fullName) || 
         fullName.includes(contactFullName));
      
      return lastNameMatch || firstNameMatch || fullNameMatch;
    });
    
    nameDuplicates.forEach(duplicate => {
      duplicateMessages.value.push({
        type: 'fio',
        message: `Контакт с похожим ФИО уже существует: `,
        contactId: duplicate.ID,
        contactName: duplicate.FULL_NAME
      });
    });
  }
  
    return duplicateMessages.value.length === 0;
};

// Функция для создания контакта
const createContact = async () => {
    try {
        // Проверяем обязательные поля
        if (!newContactData.LAST_NAME?.trim() || !newContactData.NAME?.trim()) {
          alert('Поля "Фамилия" и "Имя" обязательны для заполнения');
          return;
        }
            
        // Проверяем дубликаты
        if (!checkDuplicates()) {
            const confirmCreate = confirm('Найдены возможные дубликаты. Хотите продолжить создание?\n\n' + 
                duplicateMessages.value.join('\n'));
            if (!confirmCreate) {
                return;
            }
        }
        
        createLoading.value = true;
        
        // Подготавливаем данные для создания
        const createData = {
          NAME: newContactData.NAME,
          LAST_NAME: newContactData.LAST_NAME,
          SECOND_NAME: newContactData.SECOND_NAME || '',
          POST: newContactData.POST || '',
          TYPE_ID: 'CLIENT'
        };
        
        // Город
        if (newContactData.UF_CRM_1753083765) {
            createData.UF_CRM_1753083765 = newContactData.UF_CRM_1753083765;
        }
        
        // Целевые аудитории
        if (newContactData.UF_CRM_1753364801 && newContactData.UF_CRM_1753364801.length > 0) {
            createData.UF_CRM_1753364801 = newContactData.UF_CRM_1753364801;
        }
        
        // Email
        if (newContactData.emailValue) {
            createData.EMAIL = [{
                VALUE: newContactData.emailValue,
                VALUE_TYPE: 'WORK'
            }];
        }
        
        // Телефон
        if (newContactData.phoneValue) {
            createData.PHONE = [{
                VALUE: newContactData.phoneValue,
                VALUE_TYPE: 'WORK'
            }];
        }
        
        console.log('Создание контакта:', createData);
        
        // 1. Создаем контакт
        const createdContact = await new Promise((resolve, reject) => {
            BX24.callMethod('crm.contact.add', {
                'fields': createData,
            }, (response) => {
                if (response.error()) {
                    reject(response.error());
                } else {
                    resolve(response.data());
                }
            });
        });

        await new Promise((resolve, reject) => {
          BX24.callMethod('crm.company.contact.add', {
            'ID': companyId.value,
            'FIELDS': { 'CONTACT_ID': createdContact }
          }, (response) => {
            if (response.error()) {
              reject(response.error());
            } else {
              resolve(response.data());
            }
          });
        });

        BX24.callMethod(	
          'bizproc.workflow.start',
          {
              TEMPLATE_ID: 3246,
              DOCUMENT_ID: [
                  'crm',
                  'CCrmDocumentCompany',
                  'COMPANY_' + companyId.value
              ],
          }
        );
        // 3. Загружаем созданный контакт для отображения
        const loadedContact = await callApi(
            "crm.contact.list", 
            { ID: createdContact }, 
            ["UF_CRM_1750766630", "NAME", "LAST_NAME", "SECOND_NAME", "POST", "TYPE_ID", "EMAIL", "PHONE", "UF_CRM_1753364801", "UF_CRM_1753083765", "UF_CRM_1756633452"]
        );
        
        if (loadedContact[0]) {
            // Форматируем ФИО
            loadedContact[0].FULL_NAME = `${loadedContact[0].LAST_NAME ? loadedContact[0].LAST_NAME : ""} ${loadedContact[0].NAME ? loadedContact[0].NAME : ""} ${loadedContact[0].SECOND_NAME ? loadedContact[0].SECOND_NAME : ""}`;
            
            // Добавляем препараты и направления (если есть)
            if (loadedContact[0].UF_CRM_1750766630 && loadedContact[0].UF_CRM_1750766630.length > 0) {
                const productIds = loadedContact[0].UF_CRM_1750766630.map(id => Number(id));

                const medications = productIds
                    .map(id => products.value.find(product => product.id == Number(id)))
                    .map(product => product && product.title)
                    .filter(name => name !== undefined);

                const directions = productIds
                    .map(id => products.value.find(product => product.id === Number(id)))
                    .map(product => {
                        if (!product) return [];
                        let values = Array.isArray(product.ufCrm26_1753365041) ?
                            product.ufCrm26_1753365041 :
                            [product.ufCrm26_1753365041];
                        return values.map(value => audienceTitles.value.get(String(value)) || String(value)).filter(d => d !== undefined);
                    });

                loadedContact[0].medications = medications;
                loadedContact[0].directions = directions;
            }
            
            // Добавляем в список контактов
            contacts.value = [...contacts.value, loadedContact[0]];
        }
        
        // Закрываем диалог
        createDialog.value = false;
        
        // Показываем уведомление
        alert('Контакт успешно создан и привязан к компании');
        
        // Сбрасываем данные
        Object.keys(newContactData).forEach(key => {
            newContactData[key] = key.includes('UF_CRM') ? (key.includes('1753364801') ? [] : null) : '';
        });
        
    } catch (error) {
        console.error('Ошибка при создании контакта:', error);
        alert('Произошла ошибка при создании контакта');
    } finally {
        createLoading.value = false;
    }
};

// Функция для отмены создания
const cancelCreate = () => {
    createDialog.value = false;
    
    // Сбрасываем данные
    setTimeout(() => {
        Object.keys(newContactData).forEach(key => {
            newContactData[key] = key.includes('UF_CRM') ? (key.includes('1753364801') ? [] : null) : '';
        });
        duplicateMessages.value = [];
    }, 300);
};


    const matchesSearch = (contact) => {
      const q = (appliedSearch.value || '').trim().toLowerCase();
      if (!q) return true;
      const name = (contact.FULL_NAME || '').toLowerCase();
      const email = (contact.EMAIL && contact.EMAIL[0] ? contact.EMAIL[0].VALUE : '').toLowerCase();
      const phone = (contact.PHONE && contact.PHONE[0] ? contact.PHONE[0].VALUE : '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    };

    const applyFilters = () => {
      appliedSearch.value = searchInput.value;
      appliedAudienceFilter.value = selectedAudienceFilter.value;
      if (selectedAudienceFilter.value) {
        scrollToAudience(selectedAudienceFilter.value);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const isAudienceVisible = (audienceTitle) => {
      const filter = appliedAudienceFilter.value;
      if (!filter) return true;
      if (filter === 'no-audience') return false;
      const filterTitle = audienceTitles.value.get(String(filter)) || String(filter);
      return audienceTitle === filterTitle;
    };

    const displayedGroupedByAudience = computed(() => {
      const result = {};
      Object.entries(filteredGroupedByAudience.value).forEach(([audienceName, list]) => {
        if (!isAudienceVisible(audienceName)) return;
        const filtered = list.filter(matchesSearch);
        if (filtered.length > 0) {
          result[audienceName] = filtered;
        }
      });
      return result;
    });

    const displayedContactsWithoutAudience = computed(() => {
      if (appliedAudienceFilter.value && appliedAudienceFilter.value !== 'no-audience') {
        return [];
      }
      return contactsWithoutAudience.value.filter(matchesSearch);
    });

    const displayedAudiencesWithoutContacts = computed(() => {
      const result = {};
      Object.entries(audiencesWithoutContacts.value).forEach(([audienceName, data]) => {
        if (!isAudienceVisible(audienceName)) return;
        if ((appliedSearch.value || '').trim()) return;
        result[audienceName] = data;
      });
      return result;
    });

    const totalContactsCount = computed(() => contacts.value.length);

    const audiencesCount = computed(() => {
      const names = new Set([
        ...Object.keys(filteredGroupedByAudience.value),
        ...Object.keys(audiencesWithoutContacts.value),
      ]);
      if (contactsWithoutAudience.value.length > 0) {
        names.add('Другие');
      }
      return names.size;
    });

    const formatContactCount = (count) => {
      const n = Number(count) || 0;
      const mod10 = n % 10;
      const mod100 = n % 100;
      let word = 'КОНТАКТОВ';
      if (mod10 === 1 && mod100 !== 11) word = 'КОНТАКТ';
      else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = 'КОНТАКТА';
      return `${n} ${word}`;
    };

    const getContactTypeLabel = (contact) => {
      if (enityId.value === 'CRM_DEAL_DETAIL_TAB' && isKeyPerson(contact.ID)) {
        return 'ЛПР';
      }
      const map = {
        CLIENT: 'Основной контакт',
        SUPPLIER: 'Поставщик',
        PARTNER: 'Партнёр',
        OTHER: 'Региональный контакт',
      };
      return map[contact.TYPE_ID] || '';
    };

    const getEmail = (contact) => contact.EMAIL && contact.EMAIL[0] ? contact.EMAIL[0].VALUE : '';
    const getPhone = (contact) => contact.PHONE && contact.PHONE[0] ? contact.PHONE[0].VALUE : '';
    const getCity = (contact) => cityTitles.value.get(String(contact.UF_CRM_1753083765)) || contact.UF_CRM_1753083765 || '—';

    const mapCompanyOptions = (items) => normalizeListElements(items)
      .map((company) => ({
        id: String(company.ID ?? company.id),
        title: company.TITLE || company.title || `Компания #${company.ID ?? company.id}`,
      }))
      .filter((item) => item.id && String(item.id) !== String(companyId.value));

    const loadCompanyOptions = async (query = '') => {
      changeCompanyDialog.loading = true;
      try {
        const filter = String(query || '').trim() ? { '%TITLE': String(query).trim() } : {};
        const items = await callApi(
          'crm.company.list',
          filter,
          ['ID', 'TITLE'],
          null,
          0,
          0,
        );
        changeCompanyDialog.options = mapCompanyOptions(items);
      } catch (error) {
        console.error('Ошибка загрузки списка компаний:', error);
      } finally {
        changeCompanyDialog.loading = false;
      }
    };

    const searchCompanies = (query) => {
      if (companySearchTimer) clearTimeout(companySearchTimer);
      companySearchTimer = setTimeout(() => {
        loadCompanyOptions(query);
      }, 300);
    };

    const openChangeCompanyDialog = async (contact) => {
      if (!contact?.ID) return;
      changeCompanyDialog.open = true;
      changeCompanyDialog.contactId = contact.ID;
      changeCompanyDialog.contactName = contact.FULL_NAME || `Контакт #${contact.ID}`;
      changeCompanyDialog.selectedId = null;
      changeCompanyDialog.saving = false;
      await loadCompanyOptions('');
    };

    const closeChangeCompanyDialog = () => {
      if (changeCompanyDialog.saving) return;
      changeCompanyDialog.open = false;
      changeCompanyDialog.selectedId = null;
      changeCompanyDialog.contactId = null;
      changeCompanyDialog.contactName = '';
    };

    const submitChangeCompany = async () => {
      const nextCompanyId = changeCompanyDialog.selectedId;
      const contactId = changeCompanyDialog.contactId;
      if (!contactId || !nextCompanyId || String(nextCompanyId) === String(companyId.value)) {
        closeChangeCompanyDialog();
        return;
      }

      changeCompanyDialog.saving = true;
      detachLoading.value = true;
      detachLoadingText.value = 'Смена компании...';

      try {
        const detachResult = await detachContacts(companyId.value, [contactId]);
        if (!detachResult.success) {
          throw new Error(detachResult.errors.join(', ') || 'Не удалось открепить контакт');
        }

        await callBxMethod('crm.company.contact.add', {
          id: nextCompanyId,
          fields: { CONTACT_ID: contactId },
        });

        if (isKeyPerson(contactId)) {
          keyPersons.value = [];
          if (dealId.value) {
            await callBxMethod('crm.deal.update', {
              id: dealId.value,
              fields: { UF_CRM_1756807710: '' },
            });
            emit('trusted-person-updated', {
              dealId: dealId.value,
              contactId: null,
              contactIds: contacts.value
                .filter((item) => String(item.ID) !== String(contactId))
                .map((item) => String(item.ID)),
            });
          }
        }

        contacts.value = contacts.value.filter((item) => String(item.ID) !== String(contactId));
        closeChangeCompanyDialog();
        setTimeout(() => {
          alert('Компания контакта успешно изменена');
        }, 100);
      } catch (error) {
        console.error('Ошибка смены компании контакта:', error);
        alert(error?.message || 'Не удалось сменить компанию');
      } finally {
        changeCompanyDialog.saving = false;
        detachLoading.value = false;
        detachLoadingText.value = 'Открепление контакта...';
      }
    };

    const runFetch = () => {
      const start = () => {
        fetchData();
      };

      if (globalThis.BX24?.ready) {
        BX24.ready(() => {
          if (typeof BX24.init === 'function') {
            BX24.init(() => {
              start();
            });
          } else {
            start();
          }
        });
        return;
      }

      start();
    };

    onMounted(() => {
      runFetch();
    });

    watch(
      () => props.dealId,
      (next, prev) => {
        if (next == null || next === '' || String(next) === String(prev ?? '')) return;
        runFetch();
      },
    );

    watch(
      () => props.trustedPersonId,
      (next) => {
        if (next == null || next === '') {
          keyPersons.value = [];
          return;
        }
        keyPersons.value = [String(next)];
      },
    );

    return {
      loading,
      detachLoading,
      detachLoadingText,
      companyName,
      searchInput,
      editDialog,
      saveLoading,
      citiesLoading,
      error,
      contacts,
      domain,
      filteredGroupedByAudience,
      displayedGroupedByAudience,
      contactsWithoutAudience,
      displayedContactsWithoutAudience,
      audienceTitles,
      cityTitles,
      filteredAudienceMedications,
      filteredAudienceEquipment,
      enityId,
      audiencesWithoutContacts,
      displayedAudiencesWithoutContacts,
      isKeyPerson,
      toggleKeyPerson,
      keyPersons,
      getContactAudienceTitles,
      detachContact,
      editContact,
      saveEdit,
      cancelEdit,
      editContactData,
      audienceOptions,
      cityOptions,
      createDialog,
      createLoading,
      newContactData,
      duplicateMessages,
      openCreateDialog,
      createContact,
      cancelCreate,
      checkDuplicates,
      selectedAudienceFilter,
      audienceFilterOptions,
      scrollToAudience,
      applyFilters,
      totalContactsCount,
      audiencesCount,
      formatContactCount,
      getContactTypeLabel,
      getEmail,
      getPhone,
      getCity,
      changeCompanyDialog,
      openChangeCompanyDialog,
      closeChangeCompanyDialog,
      searchCompanies,
      submitChangeCompany,
    };
  }
}
</script>

<style>
:root {
  --teal: #2A9B8E;
  --teal-soft: #E6F5F3;
  --ink: #1B3A4B;
  --muted: #8A97A3;
  --line: #E6EBEE;
  --bg: #F3F5F7;
  --danger-bg: #FDECEC;
  --danger-border: #F5C2C2;
}

.page-loading {
  padding: 2rem;
  color: var(--muted);
  font-size: 1rem;
}

.app-shell {
  min-height: 100%;
  background: var(--bg);
  padding: 16px;
  font-family: "montserrat", system-ui, sans-serif;
  color: var(--ink);
}

.report-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(27, 58, 75, 0.06);
  padding: 24px 28px 28px;
}

.report-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 20px;
}

.brand-block {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  flex: 1 1 auto;
  min-width: 260px;
}

.brand-logo {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--teal);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-title {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.2;
  text-align: left;
  width: auto;
}

.stats-row {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 14px;
  min-width: 150px;
  background: #fff;
}

.stat-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--teal-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-label {
  color: var(--muted);
  font-size: 0.72rem;
  margin-bottom: 2px;
}

.stat-value {
  color: var(--teal);
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
}

.btn-primary {
  background: var(--teal);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 12px 18px;
  font-size: 0.92rem;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.15s ease, opacity 0.15s ease;
  flex-shrink: 0;
  align-self: flex-start;
}

.btn-primary:hover:not(:disabled) {
  background: #248a7e;
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.report-header__actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  align-self: flex-start;
}

.btn-secondary {
  background: #fff;
  color: var(--teal);
  border: 1px solid var(--teal);
  border-radius: 10px;
  padding: 12px 18px;
  font-size: 0.92rem;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--teal-soft);
}

.btn-secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.change-company-hint {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.45;
}

.filters-bar {
  display: flex;
  gap: 12px;
  align-items: stretch;
  margin-top: 0.75rem;
  margin-bottom: 28px;
}

.app-shell--embedded {
  min-height: 100%;
  padding: 0;
}

.report-card--embedded {
  border-radius: 0;
  box-shadow: none;
  padding: 0.75rem 1rem 1rem;
}

.report-card--embedded .report-header {
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.report-card--embedded .report-header__actions {
  order: 10;
  width: 100%;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.search-field,
.select-field {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  min-height: 44px;
}

.search-field {
  flex: 1 1 auto;
}

.select-field {
  flex: 0 1 280px;
  min-width: 220px;
}

.field-icon {
  margin-left: 12px;
  color: var(--muted) !important;
  flex-shrink: 0;
}

.search-field input,
.select-field select {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  padding: 10px 12px;
  font: inherit;
  font-size: 0.9rem;
  color: var(--ink);
  appearance: none;
}

.select-caret {
  position: absolute;
  right: 10px;
  pointer-events: none;
  color: var(--muted) !important;
}

.btn-filter {
  padding-inline: 20px;
}

.audience-section {
  margin-bottom: 28px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
  text-align: left;
  width: auto;
}

.count-pill {
  background: #E8F1FB;
  color: #5B7FA6;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 6px 12px;
  border-radius: 999px;
  text-transform: uppercase;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.contacts-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 960px;
  border: 1px solid var(--line);
}

.contacts-table th {
  text-align: left;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  border-right: 1px solid var(--line);
  background: #FAFBFC;
  white-space: nowrap;
}

.contacts-table th:last-child {
  border-right: none;
}

.contacts-table td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--line);
  border-right: 1px solid var(--line);
  font-size: 0.9rem;
  vertical-align: middle;
  color: #243447;
}

.contacts-table td:last-child {
  border-right: none;
}

.contact-row {
  cursor: pointer;
  transition: background 0.15s ease;
}

.contact-row:hover {
  background: #F7FBFA;
}

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-name {
  color: #111827 !important;
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
}

.contact-name:hover {
  color: var(--teal) !important;
}

.type-label {
  color: var(--muted);
  font-size: 0.78rem;
}

.meds-inline {
  margin-top: 4px;
}

.meds-line {
  font-size: 0.75rem;
  color: var(--muted);
  line-height: 1.35;
}

.meds-line a {
  color: var(--teal) !important;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  background: var(--teal-soft);
  color: var(--teal);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.email-link {
  color: var(--teal) !important;
  text-decoration: none;
  font-weight: 500;
}

.email-link:hover {
  text-decoration: underline;
}

.muted {
  color: #A0AAB4;
  font-style: italic;
  font-size: 0.85rem;
}

.actions-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-change-company {
  background: #fff;
  color: var(--teal);
  border: 1px solid var(--teal);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
}

.btn-change-company:hover:not(:disabled) {
  background: var(--teal-soft);
}

.btn-change-company:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-detach {
  background: var(--danger-bg);
  color: #D35B5B;
  border: 1px solid var(--danger-border);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
}

.btn-detach:hover:not(:disabled) {
  background: #fadede;
}

.btn-detach:disabled,
.btn-key:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-key {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: #f3f4f6;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-key.active {
  background: var(--teal-soft);
  border-color: var(--teal);
  color: var(--teal);
}

.section-extra {
  padding: 12px 4px 0;
  color: #4b5563;
  font-size: 0.88rem;
  line-height: 1.5;
}

.section-extra.always {
  padding-top: 4px;
}

.extra-line + .extra-line {
  margin-top: 4px;
}

.extra-label {
  font-weight: 600;
  margin-right: 4px;
}

.section-extra a {
  color: var(--teal) !important;
}

.dialog-card {
  border-radius: 14px !important;
  overflow: hidden;
}

.dialog-title {
  background: var(--teal) !important;
  color: #fff !important;
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  padding: 16px 24px !important;
}

.v-input__details {
  display: none;
}

.v-dialog .v-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
}

.white {
  color: white;
}

@media (max-width: 1100px) {
  .report-header {
    flex-wrap: wrap;
  }

  .stats-row {
    order: 3;
    width: 100%;
  }

  .btn-primary {
    margin-left: auto;
  }

  .report-header__actions {
    width: 100%;
    flex-wrap: wrap;
  }
}

@media (max-width: 760px) {
  .app-shell {
    padding: 10px;
  }

  .report-card {
    padding: 16px;
    border-radius: 12px;
  }

  .filters-bar {
    flex-direction: column;
  }

  .select-field {
    width: 100%;
    flex: 1 1 auto;
  }

  .stats-row {
    flex-direction: column;
  }

  .stat-card {
    width: 100%;
  }
}
</style>
