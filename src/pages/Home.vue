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
        <div class="report-header__brand">
          <img
            :src="crmLogo"
            alt="ЦРМ — Цифровое рабочее место"
            class="report-header__logo"
          />
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

      <div class="report-page__zoom" :style="zoomStyle">
      <section class="filter-card panel workspace-panel">
        <div class="workspace-tabs" role="tablist" aria-label="Разделы рабочего места">
          <div
            v-for="tab in workspaceTabs"
            :key="tab.id"
            class="workspace-tabs__item-wrap"
          >
            <button
              type="button"
              role="tab"
              class="workspace-tabs__item"
              :class="{ 'workspace-tabs__item--active': activeWorkspaceTab === tab.id }"
              :aria-selected="activeWorkspaceTab === tab.id"
              @click="onWorkspaceTabClick(tab.id)"
            >
              {{ tab.title }}
              <span v-if="tab.id === 'database-work' || tab.id === 'reports'" class="workspace-tabs__chevron">▾</span>
            </button>

            <div
              v-if="tab.id === 'database-work' && isDatabaseMenuOpen"
              class="database-menu__popup"
            >
              <button
                v-for="child in databaseMenuChildren"
                :key="child.id"
                type="button"
                class="database-menu__popup-item"
                @click="openDatabasePath(child.path)"
              >
                <span class="database-menu__popup-icon" aria-hidden="true">
                  <v-icon size="18" :icon="child.icon" />
                </span>
                <span>{{ child.title }}</span>
              </button>
            </div>

            <div
              v-if="tab.id === 'reports' && isReportsMenuOpen"
              class="database-menu__popup reports-menu__popup"
            >
              <div
                v-for="item in reportsMenu"
                :key="item.id"
                class="reports-menu__group"
                :class="{ 'reports-menu__group--open': isReportsGroupOpen(item) }"
              >
                <button
                  type="button"
                  class="database-menu__popup-item"
                  @click="onReportsMenuItemClick(item)"
                >
                  <span class="database-menu__popup-icon" aria-hidden="true">
                    <v-icon size="18" :icon="item.icon" />
                  </span>
                  <span>{{ item.title }}</span>
                  <v-icon
                    v-if="item.children"
                    class="reports-menu__chevron"
                    size="16"
                    :icon="isReportsGroupOpen(item) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  />
                </button>

                <div v-if="item.children && isReportsGroupOpen(item)" class="reports-menu__children">
                  <button
                    v-for="child in item.children"
                    :key="child.id"
                    type="button"
                    class="database-menu__popup-item database-menu__popup-item--child"
                    @click="openReportLink(child.url)"
                  >
                    <span class="database-menu__popup-icon" aria-hidden="true">
                      <v-icon size="16" :icon="child.icon" />
                    </span>
                    <span>{{ child.title }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <AppZoomSlider class="workspace-tabs__zoom" />
        </div>

        <div v-if="activeWorkspaceTab === 'digital-workplace'" class="filters">
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
              ref="dateFilterRef"
              class="period-date-filter"
              :key="dateFilterKey"
              :show-input="dateFilterShowInput"
              :selected-date-name="selectedDateName"
              :selected-date-iso="selectedDateIso"
              @update:selectedDateName="onDateFilterNameChange"
              @sendValue="onDateFilterChange"
            />
          </div>
        </div>

        <div v-if="activeWorkspaceTab !== 'digital-workplace' && activeWorkspaceTab !== 'database-work' && activeWorkspaceTab !== 'reports'" class="workspace-tab-empty" aria-hidden="true" />
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
          class="report-data-table report-data-table--paginated activity-report-table sticky-report-table"
          :items-per-page="100"
        >
          <template v-slot:item.event="{ item }">
            <div class="event-cell">
              <div class="event-cell__title-row">
                <button
                  v-if="item.UF_CRM_1742797326"
                  type="button"
                  class="event-link"
                  :title="'Открыть сделки: ' + item.event"
                  @click="openEventDealsDialog(item)"
                >
                  {{ item.event }}
                </button>
                <span v-else>{{ item.event }}</span>

                <button
                  v-if="item.UF_CRM_1742797326"
                  type="button"
                  class="event-open-btn"
                  title="Открыть мероприятие в Bitrix"
                  aria-label="Открыть мероприятие в Bitrix"
                  @click.stop="openEventInBitrix(item)"
                >
                  <v-icon size="14" icon="mdi-view-grid-outline" />
                  <v-icon size="14" icon="mdi-arrow-right" />
                </button>
              </div>

              <div class="event-checklist-inline">
                <button
                  v-if="getEventChecklist(item)?.itemId"
                  type="button"
                  class="event-checklist-inline__tag"
                  title="Открыть чек-лист"
                  @click.stop="openEventChecklistFromTable(item)"
                >
                  <span>
                    Чек-лист
                    {{ getEventChecklist(item).filled }}/{{ getEventChecklist(item).total }}
                  </span>
                  <span class="event-checklist-inline__bar" aria-hidden="true">
                    <span
                      class="event-checklist-inline__fill"
                      :class="getChecklistBarClass(getEventChecklist(item).percent)"
                      :style="{ width: `${getEventChecklist(item).percent}%` }"
                    />
                  </span>
                </button>
                <button
                  v-else-if="item.UF_CRM_1742797326"
                  type="button"
                  class="event-checklist-inline__create"
                  title="Создать чек-лист"
                  @click.stop="createEventChecklistFromTable(item)"
                >
                  Создать чек-лист
                </button>
              </div>
            </div>
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
                    :alt="getUserShortNameById(managerId)"
                    class="avatar-image"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                    @error="markAvatarFailed(getUserPhoto(managerId))"
                  />
                  <span v-else class="avatar-initials">
                    {{ getUserInitials(getUserShortNameById(managerId)) }}
                  </span>
                </v-avatar>
                <span class="responsible-name" :title="getUserShortNameById(managerId)">
                  {{ getUserShortNameById(managerId) }}
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
                  :style="{ width: visualPercent(item.percent) + '%' }"
                />
              </div>
            </div>
          </template>
          <template v-slot:item.summ="{ item }">
            {{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(item.summ) }}
          </template>
          <template v-slot:item.over="{ item }">
            {{ formatOverCurrency(item.over) }}
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
                <td colspan="5" class="report-table-footer-label">Итого:</td>
                <td>{{ new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(totalRow2.summ) }}</td>
                <td>{{ formatOverCurrency(totalRow2.over) }}</td>
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
        <v-card class="report-table-card report-table-card--sticky">
          <v-card-title class="report-table-title">
            Компании по категориям
          </v-card-title>
        <v-data-table
          :items="table1Filtered"
          :headers="headers"
          class="report-data-table report-data-table--paginated sticky-report-table"
          :items-per-page="10"
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
      </div>
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

    <EventDealsDialog
      v-model="eventDealsDialog.open"
      :event="eventDealsDialog.event"
      :deals="eventDealsDialog.deals"
      :event-metrics="eventDealsDialogMetrics"
      :user-profiles="userProfilesById"
      :refreshing="eventDealsDialog.refreshing"
      :science-exporting="eventDealsDialog.scienceExporting"
      @precise-deal="openPreciseDealForEvent(getEventDealsActionItem())"
      @mass-generation="openMassGenerationForEvent(getEventDealsActionItem())"
      @create-company="openCreateCompanyForEvent(getEventDealsActionItem())"
      @send-mailing="onEventActionMock(getEventDealsActionItem(), 'Отправить рассылку')"
      @welcome-mailing="openWelcomeMailingForEvent(getEventDealsActionItem())"
      @export-excel="exportEventExcel(getEventDealsActionItem())"
      @export-science="exportEventScienceProgram(getEventDealsActionItem())"
      @stage-updated="handleEventDealStageUpdated"
      @field-updated="handleEventDealFieldUpdated"
      @refresh="refreshEventDealsDialog"
    />

    <DealGeneratorDialog
      v-model="dealGeneratorDialog.open"
      :mode="dealGeneratorDialog.mode"
      :event="dealGeneratorDialog.event"
      @generated="onDealGeneratorCompleted"
    />

    <WelcomeMailingDialog
      v-model="welcomeMailingDialog.open"
      :event="welcomeMailingDialog.event"
    />

    <ChecklistTypeDialog
      v-model="checklistTypeDialog.open"
      @select="createEventChecklistOfType"
    />
  </div>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { callApi, callBxMethod, getListElements } from '../functions/callApi';
import { useStickyReportTableHeaders } from '../composables/useStickyReportTableHeaders';
import moment from 'moment';
import html2canvas from 'html2canvas'; // подключаем библиотеку
import DateFilter from '../components/TheForm/Date/Date.vue';
import LoadingProgress from '../components/LoadingProgress.vue';
import DealGeneratorDialog from '../components/DealGeneratorDialog.vue';
import WelcomeMailingDialog from '../components/WelcomeMailingDialog.vue';
import EventDealsDialog from '../components/EventDealsDialog.vue';
import ChecklistTypeDialog from '../components/ChecklistTypeDialog.vue';
import { useSnackbar } from '../composables/useSnackbar';
import { formatDateFilterRange, isDealWithinDateRange, isEventWithinDateRange } from '../functions/dateFilter';
import {
  DEAL_SELECT_FIELDS_WITH_COMMENTS,
  EVENT_DEAL_STAGES,
  buildEventDealFilter,
  fetchDealsFromHandler,
} from '../functions/reportHandler';
import { BitrixRateLimitError, setBitrixRateLimitNotifier } from '../functions/bitrixRateLimit';
import {
  ensureUsersByIds,
  registerUserProfile,
  mapUserForAssignedFilter,
  userProfilesById,
  usersById,
  USER_SELECT_FIELDS,
} from '../functions/userProfiles';
import { exportEventReportToExcel, EXPORT_DEAL_STAGE_IDS } from '../functions/exportEventReport';
import {
  isDealSumRelatedField,
  resolveDealReportSum,
  computeDealReportSum,
  buildEventMetricsRow,
  DEAL_REPORT_SUM_FIELD,
} from '../functions/eventReportMetrics';
import { exportScienceProgram } from '../functions/exportScienceProgram';
import {
  buildEventChecklistCreatePath,
  buildEventChecklistDetailsPath,
  EVENT_CHECKLIST_ENTITY_TYPE_ID,
} from '../domain/eventChecklist';
import { loadEventChecklistsMap } from '../functions/loadEventChecklist';
import {
  appendDealIdsToEvent,
  attachCompanySliderCloseTracker,
  buildCompanyCreatePath,
  createDealForEventCompany,
  fetchRecentCompanies,
  getCurrentBxUser,
  resolveCreatedCompanyAfterClose,
} from '../functions/createEventCompanyDeal';
import summaryTotalIcon from '../assets/summary/total.png';
import summaryRevenuePlanIcon from '../assets/summary/revenue-plan.png';
import summaryEventsIcon from '../assets/summary/events.png';
import summaryDealsIcon from '../assets/summary/deals.png';
import crmLogo from '../assets/crm-logo.png';
import AppZoomSlider from '../components/AppZoomSlider.vue';
import { useAppZoom } from '../composables/useAppZoom';

const { snackbar, snackbarText, snackbarColor, showSnackbar } = useSnackbar();
const { zoomStyle } = useAppZoom();
const {
  mountStickyReportTableHeaders,
  refreshStickyReportTableHeaders,
  unmountStickyReportTableHeaders,
} = useStickyReportTableHeaders();

const DEFAULT_DATE_FILTER_NAME = 'Квартал';

function buildDateFilterShowInput(dateName = DEFAULT_DATE_FILTER_NAME) {
  return [
    dateName === 'Последние N дней',
    dateName === 'Месяц',
    dateName === 'Квартал',
    dateName === 'Год',
    dateName === 'Диапазон',
    dateName === 'Точная дата',
    dateName === 'Следующие N дней',
    dateName === 'Полугодие',
  ]
}

const selectedDateIso = ref([null, null]);
const selectedDateName = ref(DEFAULT_DATE_FILTER_NAME);
const dateFilterShowInput = ref(buildDateFilterShowInput(DEFAULT_DATE_FILTER_NAME));
const dateFilterKey = ref(0);
const dateFilterRef = ref(null);
const isInitialLoadDone = ref(false);
const activeWorkspaceTab = ref('digital-workplace');
const checklistByEventId = ref({});
const checklistTypeDialog = ref({
  open: false,
  eventId: null,
});
const SPONSOR_COMPANY_TYPE_ID = '2'
const SPONSOR_COMPANY_ASSIGNED_BY_ID = '1614'
const workspaceTabs = [
  { id: 'digital-workplace', title: 'Цифровое рабочее место' },
  { id: 'database-work', title: 'Работа с базой' },
  { id: 'reports', title: 'Отчеты' },
  { id: 'disk', title: 'Диск' },
  { id: 'scientific-program', title: 'Назначение менеджеров' },
  { id: 'activity-feed', title: 'Лента активности' },
];

const reportsMenu = [
  {
    id: 'employees',
    title: 'По сотрудникам',
    icon: 'mdi-account-multiple-outline',
    url: '/marketplace/app/202/',
  },
  {
    id: 'sponsors',
    title: 'По спонсорам',
    icon: 'mdi-handshake-outline',
    children: [
      {
        id: 'total-contribution',
        title: 'Общий вклад',
        icon: 'mdi-chart-bar',
        url: '/marketplace/app/234/',
      },
      {
        id: 'top-sponsors',
        title: 'Топ спонсоров по ЦА',
        icon: 'mdi-star-outline',
        url: '/marketplace/app/246/',
      },
    ],
  },

  {
    id: 'annual-events',
    title: 'Ежегодные мероприятия',
    icon: 'mdi-calendar-month-outline',
    url: '/marketplace/app/144/',
  },
  {
    id: 'commercial-potential',
    title: 'Коммерческий потенциал направлений',
    icon: 'mdi-chart-pie',
    url: '/marketplace/app/244/',
  },
];

const databaseMenuChildren = [
  {
    id: 'companies',
    title: 'Компании',
    icon: 'mdi-domain',
    path: '/crm/company/list/',
  },
  {
    id: 'contacts',
    title: 'Контакты',
    icon: 'mdi-account',
    path: '/crm/contact/list/',
  },
];

const openReportsGroups = ref([]);
const isDatabaseMenuOpen = ref(false);
const isReportsMenuOpen = ref(false);

function toggleDatabaseMenu() {
  isReportsMenuOpen.value = false
  isDatabaseMenuOpen.value = !isDatabaseMenuOpen.value
}

function toggleReportsMenu() {
  isDatabaseMenuOpen.value = false
  isReportsMenuOpen.value = !isReportsMenuOpen.value
  if (!isReportsMenuOpen.value) {
    openReportsGroups.value = []
  }
}

function openDatabasePath(path) {
  if (!path) return
  BX24.openPath(path)
  isDatabaseMenuOpen.value = false
}

function isReportsGroupOpen(item) {
  return Boolean(item?.children) && openReportsGroups.value.includes(item.id)
}

function toggleReportsGroup(itemId) {
  if (openReportsGroups.value.includes(itemId)) {
    openReportsGroups.value = openReportsGroups.value.filter((id) => id !== itemId)
    return
  }
  openReportsGroups.value = [...openReportsGroups.value, itemId]
}

function openReportLink(url) {
  if (!url) return
  const fullUrl = url.startsWith('http') ? url : `${getBitrixPortalOrigin()}${url}`
  window.open(fullUrl, '_blank', 'noopener,noreferrer')
  isReportsMenuOpen.value = false
  openReportsGroups.value = []
}

function onReportsMenuItemClick(item) {
  if (item?.children?.length) {
    toggleReportsGroup(item.id)
    return
  }
  openReportLink(item?.url)
}

function onWorkspaceTabClick(tabId) {
  if (tabId === 'disk') {
    const fullUrl = `${getBitrixPortalOrigin()}/docs/path/%D0%9F%D1%80%D0%B8%D0%B2%D0%BB%D0%B5%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%81%D0%BF%D0%BE%D0%BD%D1%81%D0%BE%D1%80%D0%BE%D0%B2/`
    window.open(fullUrl, '_blank', 'noopener,noreferrer')
    return
  }
  if (tabId === 'database-work') {
    toggleDatabaseMenu()
    return
  }
  if (tabId === 'reports') {
    toggleReportsMenu()
    return
  }
  isDatabaseMenuOpen.value = false
  isReportsMenuOpen.value = false
  openReportsGroups.value = []
  activeWorkspaceTab.value = tabId
}

function buildSponsorCompanyListPath() {
  const params = new URLSearchParams()
  params.set('apply_filter', 'Y')
  params.set('COMPANY_TYPE', SPONSOR_COMPANY_TYPE_ID)
  params.set('COMPANY_TYPE_label', 'Спонсор')
  params.set('ASSIGNED_BY_ID', SPONSOR_COMPANY_ASSIGNED_BY_ID)
  params.set('ASSIGNED_BY_ID_label', SPONSOR_COMPANY_ASSIGNED_BY_ID)
  return `/crm/company/list/?${params.toString()}`
}

function openSponsorCompaniesList() {
  const path = buildSponsorCompanyListPath()
  if ((window as any).BX24?.openPath) {
    (window as any).BX24.openPath(path)
    return
  }
  openBitrixPath(path)
}

function onDateFilterChange(value) {
  selectedDateIso.value = Array.isArray(value)
    ? [value[0] || null, value[1] || null]
    : [null, null];
}

function onDateFilterNameChange(name) {
  const nextName = name || DEFAULT_DATE_FILTER_NAME;
  selectedDateName.value = nextName;
  dateFilterShowInput.value = buildDateFilterShowInput(nextName);
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

function formatOverCurrency(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) return ''
  return formatCurrency(number)
}

function noopAction() {}

const EVENT_ENTITY_TYPE_ID = 1052
const DEAL_EVENT_FIELD = 'UF_CRM_1742797326'
const DEAL_CATEGORY_ID = 32
const EVENT_DIALOG_DEAL_STAGES = [
  'C32:NEW',
  'C32:PREPARATION',
  'C32:UC_GKSSJ3',
  'C32:UC_HPGIL5',
  'C32:UC_LXYCFO',
  'C32:UC_VJZ0FL',
  'C32:UC_6VDO9F',
  'C32:UC_5BBXZ5',
  'C32:UC_R5DX1H',
  'C32:WON',
  'C32:LOSE',
  'C32:APOLOGY',
  'C32:1',
  'C32:2',
  'C32:3',
  'C32:4',
  'C32:5',
  'C32:6',
  'C32:7',
  'C32:8',
  'C32:9',
]
const EVENT_DIALOG_DEAL_SELECT = [
  'ID',
  'TITLE',
  'COMMENTS',
  'UF_CRM_1744096783472',
  'UF_CRM_1742797326',
  'STAGE_ID',
  'ASSIGNED_BY_ID',
  'UF_CRM_1744890618774',
  'UF_CRM_1744062581756',
  'UF_CRM_1745995594',
  'UF_CRM_1744064620850',
  'UF_CRM_1744095783871',
  'UF_CRM_1742906712910',
  'UF_CRM_1742971372921',
  'UF_CRM_1745222013992',
  'UF_CRM_1759821112055',
  'UF_CRM_1744096312349',
  'UF_CRM_1755788950300',
  'UF_CRM_1756807710',
  'UF_CRM_1754290331',
  'CONTACT_ID',
  'COMPANY_ID',
  'UF_CRM_1742972105926',
  'UF_CRM_1742972167794',
  'UF_CRM_1745308616558',
  'UF_CRM_1769784388444',
]

function getBitrixPortalOrigin() {
  const domain = (window as any).BX24?.getAuth?.()?.domain
  if (domain) return `https://${domain}`
  return window.location.origin
}

function openBitrixPath(path, { newTab = true, onClose = null } = {}) {
  const url = path.startsWith('http') ? path : `${getBitrixPortalOrigin()}${path}`

  if ((window as any).BX24?.openPath && typeof onClose === 'function') {
    (window as any).BX24.openPath(path, onClose)
    return
  }

  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer')
    if (typeof onClose === 'function') {
      window.setTimeout(onClose, 1000)
    }
    return
  }

  if ((window as any).BX24?.openPath) {
    (window as any).BX24.openPath(path, true)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
  if (typeof onClose === 'function') {
    window.setTimeout(onClose, 1000)
  }
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
  params.set('category_id', '32')
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

  if ((window as any).BX24?.openPath) {
    (window as any).BX24.openPath(path, true)
    return
  }

  openBitrixPath(path)
}

function buildEventDetailsPath(eventId) {
  return `/crm/type/${EVENT_ENTITY_TYPE_ID}/details/${eventId}/`
}

function openEventInBitrix(item) {
  const eventId = item?.UF_CRM_1742797326
  if (eventId == null || eventId === '') return

  const path = buildEventDetailsPath(eventId)
  if ((window as any).BX24?.openPath) {
    (window as any).BX24.openPath(path)
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

const welcomeMailingDialog = ref({
  open: false,
  event: null,
})

const eventDealsDialog = ref({
  open: false,
  event: null,
  deals: [],
  sourceItem: null,
  refreshing: false,
  scienceExporting: false,
})

const eventDealsDialogMetrics = computed(() => {
  if (!eventDealsDialog.value.open) return null

  const eventId = eventDealsDialog.value.event?.id
    ?? eventDealsDialog.value.event?.ID
    ?? eventDealsDialog.value.sourceItem?.UF_CRM_1742797326

  if (eventId == null || eventId === '') return null

  const event = findEventById(eventId)
  const dialogDeals = (eventDealsDialog.value.deals || []).filter(
    (deal) => String(deal.UF_CRM_1742797326) === String(eventId),
  )

  return buildEventMetricsRow(event, dialogDeals, resolveEventPercent)
})

function getOpenEventDealsDialogId() {
  if (!eventDealsDialog.value.open) return null
  return eventDealsDialog.value.event?.id
    ?? eventDealsDialog.value.event?.ID
    ?? eventDealsDialog.value.sourceItem?.UF_CRM_1742797326
    ?? null
}

function mergeDealForStore(existing, dialogDeal) {
  const merged = {
    ...(existing || {}),
    ...dialogDeal,
  }

  if (existing) {
    merged.ASSIGNED_BY_ID = existing.ASSIGNED_BY_ID
    merged.user = existing.user ?? dialogDeal.user
  } else {
    merged.ASSIGNED_BY_ID = dialogDeal.user ?? dialogDeal.ASSIGNED_BY_ID
    merged.user = dialogDeal.user ?? dialogDeal.ASSIGNED_BY_ID
  }

  return merged
}

function getEventDealsActionItem() {
  if (eventDealsDialog.value.sourceItem) return eventDealsDialog.value.sourceItem

  const event = eventDealsDialog.value.event
  if (!event) return null

  return {
    UF_CRM_1742797326: event.id,
    event: event.title || '',
    start: event.start || '',
    city: event.city || '',
  }
}

function ensureNestedDialogViewport() {
  try {
    const heightCandidates = [window.innerHeight]
    const widthCandidates = [window.innerWidth]
    if (window.parent && window.parent !== window) {
      if (window.parent.innerWidth) widthCandidates.push(window.parent.innerWidth)
      if (window.parent.innerHeight) heightCandidates.push(window.parent.innerHeight)
    }
    if (window.visualViewport?.height) heightCandidates.push(Math.ceil(window.visualViewport.height))
    if (window.visualViewport?.width) widthCandidates.push(Math.ceil(window.visualViewport.width))
    const screenHeight = window.screen?.availHeight || window.screen?.height || 1080
    const screenWidth = window.screen?.availWidth || window.screen?.width || 1920
    heightCandidates.push(screenHeight)
    widthCandidates.push(screenWidth)

    const height = Math.max(480, Math.min(...heightCandidates.filter((v) => v > 0)) - 16)
    const width = Math.max(320, Math.min(...widthCandidates.filter((v) => v > 0)))
    document.documentElement.style.setProperty('--event-deals-dialog-max-height', `${height}px`)
    document.documentElement.style.setProperty('--event-deals-dialog-height', `${height}px`)
    (window as any).BX24?.resizeWindow?.(width, height)
  } catch (_) {
    // ignore
  }
}

function openWelcomeMailingForEvent(item) {
  const event = resolveEventForDealGenerator(item)
  if (!event) {
    showSnackbar('Не удалось определить мероприятие', 'error')
    return
  }

  ensureNestedDialogViewport()
  welcomeMailingDialog.value = {
    open: true,
    event,
  }
}

function openDealGeneratorAction(item, mode) {
  const event = resolveEventForDealGenerator(item)
  if (!event) {
    showSnackbar('Не удалось определить мероприятие', 'error')
    return
  }

  ensureNestedDialogViewport()
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

async function onDealGeneratorCompleted(result) {
  const createdIds = Array.isArray(result?.createdDealIds) ? result.createdDealIds : []
  if (!result?.createdCount || !createdIds.length) return

  const eventId = dealGeneratorDialog.value.event?.id
    ?? dealGeneratorDialog.value.event?.ID
    ?? getOpenEventDealsDialogId()

  if (eventId == null || eventId === '') return

  await refreshDealsAfterCreation(createdIds, eventId, { silent: true })
}

async function openCreateCompanyForEvent(item) {
  const event = resolveEventForDealGenerator(item)
  if (!event?.id) {
    showSnackbar('Не удалось определить мероприятие', 'error')
    return
  }

  let beforeCompanies = []
  let sliderUrl = ''
  const detachCompanySliderTracker = attachCompanySliderCloseTracker((url) => {
    sliderUrl = url
  })

  try {
    beforeCompanies = await fetchRecentCompanies(100)
  } catch (error) {
    detachCompanySliderTracker()
    console.error(error)
    showSnackbar('Не удалось подготовить создание компании', 'error')
    return
  }

  const maxBeforeId = Math.max(
    0,
    ...beforeCompanies.map((company) => Number(company.ID)).filter((id) => Number.isFinite(id)),
  )
  const authorPromise = getCurrentBxUser()

  openBitrixPath(buildCompanyCreatePath(), {
    newTab: false,
    onClose: async (result) => {
      detachCompanySliderTracker()

      if (result?.result === 'error') {
        showSnackbar('Не удалось открыть создание компании', 'error')
        return
      }

      try {
        showSnackbar('Проверяем созданную компанию…', 'info')
        const company = await resolveCreatedCompanyAfterClose(beforeCompanies, {
          sliderUrl,
          maxBeforeId,
        })
        if (!company?.ID) {
          showSnackbar('Компания не создана — сделка не сформирована', 'info')
          return
        }

        const author = await authorPromise
        if (!author?.ID) {
          showSnackbar('Не удалось определить текущего пользователя', 'error')
          return
        }

        const dealId = await createDealForEventCompany(company, event, author)
        try {
          await appendDealIdsToEvent(event.id, [dealId])
        } catch (error) {
          console.error('Не удалось обновить список сделок мероприятия:', error)
        }

        showSnackbar(`Создана сделка «${company.TITLE}»`, 'success')

        await refreshDealsAfterCreation([dealId], event.id, { silent: true })
      } catch (error) {
        console.error(error)
        showSnackbar('Не удалось создать сделку по компании', 'error')
      }
    },
  })
}

function onEventActionMock(item, actionTitle) {
  const eventTitle = item?.event || `мероприятие #${item?.UF_CRM_1742797326 || ''}`
  showSnackbar(`«${actionTitle}» — пока мок (${eventTitle})`, 'info')
}

function patchDealInCollection(collection, dealId, patch) {
  const id = String(dealId)
  let changed = false
  const next = (collection || []).map((deal) => {
    if (String(deal.ID) !== id) return deal
    changed = true
    return { ...deal, ...patch }
  })
  return changed ? next : collection
}

function syncDealPatchEverywhere(dealId, patch) {
  table1.value = patchDealInCollection(table1.value, dealId, patch)
  deals.value = patchDealInCollection(deals.value, dealId, patch)
  eventDealsDialog.value = {
    ...eventDealsDialog.value,
    deals: patchDealInCollection(eventDealsDialog.value.deals, dealId, patch),
  }
}

function findDealInStores(dealId) {
  const id = String(dealId)
  return eventDealsDialog.value.deals.find((deal) => String(deal.ID) === id)
    || deals.value.find((deal) => String(deal.ID) === id)
    || table1.value.find((deal) => String(deal.ID) === id)
    || null
}

function buildDealPatch(dealId, field, value) {
  const patch = { [field]: value }
  if (!isDealSumRelatedField(field) || field === DEAL_REPORT_SUM_FIELD) {
    return patch
  }

  const deal = findDealInStores(dealId)
  if (!deal) return patch

  patch[DEAL_REPORT_SUM_FIELD] = computeDealReportSum({ ...deal, ...patch })
  return patch
}

function ensureDealInDeals(dealId) {
  const id = String(dealId)
  if (deals.value.some((deal) => String(deal.ID) === id)) return

  const fromDialog = eventDealsDialog.value.deals.find((deal) => String(deal.ID) === id)
  if (!fromDialog) return

  deals.value = [...deals.value, mergeDealForStore(null, fromDialog)]
}

function handleEventDealStageUpdated({ dealId, stageId, stageLabel }) {
  if (!dealId || !stageId) return

  const nextLabel = String(stageLabel || stageMap(stageId) || '')
  ensureDealInDeals(dealId)
  syncDealPatchEverywhere(dealId, {
    STAGE_ID: stageId,
    stage: nextLabel,
  })

  showSnackbar('Стадия сделки обновлена', 'success')
}

function handleEventDealFieldUpdated({ dealId, field, value }) {
  if (!dealId || !field) return

  ensureDealInDeals(dealId)
  syncDealPatchEverywhere(dealId, buildDealPatch(dealId, field, value))

  if (field !== 'status') {
    showSnackbar(
      isDealSumRelatedField(field) ? 'Сумма обновлена' : 'Значение обновлено',
      'success',
    )
  }
}

async function exportEventExcel(item) {
  if (!item?.UF_CRM_1742797326) {
    showSnackbar('Не удалось определить мероприятие', 'error')
    return
  }

  const eventId = item.UF_CRM_1742797326

  try {
    showSnackbar('Формирование Excel…', 'info')

    // Как в ODK: грузим сделки по стадиям Потенциал / Договоренности / Передано / Отказ
    let exportDeals = await callApi(
      'crm.deal.list',
      {
        UF_CRM_1742797326: eventId,
        STAGE_ID: EXPORT_DEAL_STAGE_IDS,
      },
      [
        'ID',
        'STAGE_ID',
        'COMMENTS',
        'UF_CRM_1744890618774',
        'UF_CRM_1744062581756',
        'UF_CRM_1745995594',
        'UF_CRM_1756807710',
        'UF_CRM_1742797326',
      ],
      null,
      0,
      0,
    ) || []

    exportDeals = Array.isArray(exportDeals)
      ? (exportDeals.length && Array.isArray(exportDeals[0]) ? exportDeals.flat() : exportDeals)
      : []

    // Статусы участия
    let statusesById = {}
    try {
      const statuses = await callApi('crm.item.list', {}, null, 1080, 0, 0) || []
      const statusList = Array.isArray(statuses)
        ? (statuses.length && Array.isArray(statuses[0]) ? statuses.flat() : statuses)
        : []
      statusesById = Object.fromEntries(
        statusList.map((s) => [String(s.id ?? s.ID), s]),
      )
    } catch (error) {
      console.error('Ошибка загрузки статусов для экспорта:', error)
    }

    // Доверенные лица
    const trustedIds = [...new Set(
      exportDeals
        .map((deal) => (Array.isArray(deal.UF_CRM_1756807710)
          ? deal.UF_CRM_1756807710[0]
          : deal.UF_CRM_1756807710))
        .filter((id) => id != null && id !== ''),
    )]
    let contactsById = {}
    if (trustedIds.length) {
      const contacts = await callApi(
        'crm.contact.list',
        { ID: trustedIds },
        ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME'],
      ) || []
      const contactsList = Array.isArray(contacts)
        ? (contacts.length && Array.isArray(contacts[0]) ? contacts.flat() : contacts)
        : []
      contactsById = Object.fromEntries(
        contactsList.map((c) => [String(c.ID), c]),
      )
    }

    // Подмешиваем уже обогащённые данные из table1 (если есть)
    const tableById = Object.fromEntries(
      (table1.value || [])
        .filter((deal) => String(deal.UF_CRM_1742797326) === String(eventId))
        .map((deal) => [String(deal.ID), deal]),
    )

    exportDeals = exportDeals.map((deal) => {
      const fromTable = tableById[String(deal.ID)] || {}
      const statusId = Array.isArray(deal.UF_CRM_1745995594)
        ? deal.UF_CRM_1745995594[0]
        : deal.UF_CRM_1745995594
      const statusItem = statusesById[String(statusId)]
      const trustedId = Array.isArray(deal.UF_CRM_1756807710)
        ? deal.UF_CRM_1756807710[0]
        : deal.UF_CRM_1756807710
      const contact = contactsById[String(trustedId)]

      return {
        ...deal,
        UF_CRM_1744062581756: String(deal.UF_CRM_1744062581756 || '')
          .replace(/\|RUB$/i, ''),
        status: fromTable.status || statusItem?.title || '',
        stage: fromTable.stage || stageMap(deal.STAGE_ID),
        STAGE_ID: deal.STAGE_ID,
        COMMENTS: deal.COMMENTS ?? fromTable.COMMENTS ?? '',
        trustedPerson: fromTable.trustedPerson
          && fromTable.trustedPerson !== 'Не указано'
          ? fromTable.trustedPerson
          : (contact
            ? displayFullName(contact.LAST_NAME, contact.NAME, contact.SECOND_NAME)
            : 'Не указано'),
      }
    })

    const fileName = exportEventReportToExcel(item, exportDeals, formatDate)
    showSnackbar(`Отчет выгружен: ${fileName}`, 'success')
  } catch (error) {
    console.error(error)
    showSnackbar('Не удалось выгрузить отчет в Excel', 'error')
  }
}

async function exportEventScienceProgram(item) {
  const eventId = item?.UF_CRM_1742797326
    ?? eventDealsDialog.value.event?.id
    ?? eventDealsDialog.value.event?.ID
  if (eventId == null || eventId === '') {
    showSnackbar('Не удалось определить мероприятие', 'error')
    return
  }
  if (eventDealsDialog.value.scienceExporting) return

  eventDealsDialog.value.scienceExporting = true
  try {
    await exportScienceProgram(eventId, {
      onStatus: (message) => showSnackbar(message, 'info'),
    })
    showSnackbar('Научная программа скачана', 'success')
  } catch (error) {
    console.error(error)
    showSnackbar(formatErrorMessage(error, 'Не удалось выгрузить научную программу'), 'error')
  } finally {
    eventDealsDialog.value.scienceExporting = false
  }
}


function formatErrorMessage(error, fallback = 'Произошла ошибка') {
  if (error instanceof BitrixRateLimitError) return error.message || fallback
  if (error instanceof Error) return error.message || fallback
  if (typeof error === 'string') return error || fallback
  if (error?.message) return String(error.message)
  return fallback
}

function notifyRateLimit(retryInMs) {
  const seconds = Math.max(1, Math.ceil(retryInMs / 1000))
  loadingMessage.value = `Превышен лимит запросов Bitrix24. Повтор через ${seconds} сек…`
  showSnackbar('Превышен лимит запросов Bitrix24. Запрос будет повторён через минуту.', 'warning')
}

const rateLimitFetchOptions = {
  onRateLimit: (retryInMs) => notifyRateLimit(retryInMs),
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
const cityDirectory = ref([]);
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
  let result = await callBxMethod('disk.folder.uploadfile', {
    id: 1143900,
    data: {
      NAME: 'report.jpg',
    },
    fileContent: document.getElementById('screenshotImg').src.replace('data:image/png;base64,', ''),
    generateUniqueName: true,
  });

  loadingProgress.value = 72;
  loadingMessage.value = 'Отправка файла в чат…';

  await callBxMethod('im.disk.file.commit', {
    CHAT_ID: selectedChatId.value,
    UPLOAD_ID: result.ID,
  });
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
const CITY_ENTITY_TYPE_ID = 1094
const EVENT_CITY_FIELD = 'ufCrm38_1753082280'

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
  selectedDateName.value = DEFAULT_DATE_FILTER_NAME;
  dateFilterShowInput.value = buildDateFilterShowInput(DEFAULT_DATE_FILTER_NAME);
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
  {
    title: "Дата",
    key: "start",
    align: "center",
    sort: (a, b) => {
      const parseDate = (str) => {
        if (!str) return 0;
        const datePart = str.split(' - ')[0];
        const parts = datePart.split('.');
        if (parts.length !== 3) return 0;
        return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
      };
      return parseDate(a) - parseDate(b);
    }
  },
  { title: "% Выполнения", key: "percent", align: "center"},
  { title: "Собрано", key: "summ", align: "center"},
  {
    title: "Собрано сверху",
    key: "over",
    align: "center",
    sort: (a, b) => {
      const numA = parseFloat(a) || 0;
      const numB = parseFloat(b) || 0;
      return numA - numB;
    }
  },
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
  const managerIds = collectEventManagerIds(events.value)
  let users = asArray(filters.value.value.assigned).filter((user) =>
    managerIds.has(String(user.ID)),
  )

  if (filters.value.selected.departments.length > 0) {
    users = users.filter((user) =>
      hasAnyDepartmentMatch(user.departmentIds || [], filters.value.selected.departments)
    )
  }

  return users.sort((a, b) => String(a.FULL_NAME || '').localeCompare(String(b.FULL_NAME || ''), 'ru'))
})

const filteredDealsForEvents = computed(() => {
  const selectedCategory = new Set(asArray(filters.value.selected.category).map(String))
  const selectedEvents = new Set(asArray(filters.value.selected.events).map(String))

  // Фильтр "Ответственный" сюда намеренно не применяется: агрегаты по
  // мероприятию (% сбора, суммы) должны считаться по всем сделкам мероприятия,
  // а не только по сделкам выбранного ответственного. Какие мероприятия
  // показывать при выборе ответственного — решает eventMatchesAssignedFilter.
  const filtered = deals.value.filter((deal) => {
    if (selectedCategory.size && !selectedCategory.has(String(deal.STAGE_ID))) return false
    if (selectedEvents.size && !selectedEvents.has(String(deal.UF_CRM_1742797326))) return false
    return true
  })

  // eslint-disable-next-line no-console
  console.log('🔍 [filteredDealsForEvents] computed:', {
    dealsTotal: deals.value.length,
    filteredCount: filtered.length,
    selectedCategorySize: selectedCategory.size,
    selectedEventsSize: selectedEvents.size,
    firstDeal: filtered[0] ? {
      ID: filtered[0].ID,
      STAGE_ID: filtered[0].STAGE_ID,
      ASSIGNED_BY_ID: filtered[0].ASSIGNED_BY_ID,
      UF_CRM_1742797326: filtered[0].UF_CRM_1742797326,
    } : null,
  })

  return filtered
})

const dealsForGroupedEvents = computed(() => {
  const base = filteredDealsForEvents.value
  const eventId = getOpenEventDealsDialogId()
  if (eventId == null || eventId === '') {
    // eslint-disable-next-line no-console
    console.log('🔍 [dealsForGroupedEvents] returning base:', base.length)
    return base
  }

  const dialogDeals = eventDealsDialog.value.deals || []
  if (!dialogDeals.length) return base

  const mergedById = new Map()

  base.forEach((deal) => {
    if (String(deal.UF_CRM_1742797326) !== String(eventId)) return
    mergedById.set(String(deal.ID), deal)
  })

  dialogDeals.forEach((dialogDeal) => {
    const id = String(dialogDeal.ID)
    mergedById.set(id, mergeDealForStore(mergedById.get(id), dialogDeal))
  })

  const mergedIds = new Set(mergedById.keys())
  const rest = base.filter((deal) => {
    if (String(deal.UF_CRM_1742797326) !== String(eventId)) return true
    return !mergedIds.has(String(deal.ID))
  })

  const result = [...rest, ...mergedById.values()]
  // eslint-disable-next-line no-console
  console.log('🔍 [dealsForGroupedEvents] with dialog merge:', result.length)
  return result
})

const groupedEvents = computed(() => {
  const dealsByEvent = new Map()

  const dealsFromGrouped = dealsForGroupedEvents.value
  // eslint-disable-next-line no-console
  console.log('🔍 [groupedEvents] starts with:', dealsFromGrouped.length, 'deals')

  dealsFromGrouped.forEach((deal) => {
    const event = findEventById(deal.UF_CRM_1742797326)
    if (!eventPassesFilters(event)) return

    const eventId = String(deal.UF_CRM_1742797326)
    if (!dealsByEvent.has(eventId)) dealsByEvent.set(eventId, [])
    dealsByEvent.get(eventId).push(deal)
  })

  // eslint-disable-next-line no-console
  console.log('🔍 [groupedEvents] dealsByEvent after deals:', dealsByEvent.size, 'events')

  getFilteredEventIds().forEach((eventId) => {
    const key = String(eventId)
    if (!dealsByEvent.has(key)) dealsByEvent.set(key, [])
  })

  // eslint-disable-next-line no-console
  console.log('🔍 [groupedEvents] dealsByEvent after filtered:', dealsByEvent.size, 'events')

  const result = []

  dealsByEvent.forEach((eventDeals, eventId) => {
    const event = findEventById(eventId)
    if (!event || !eventPassesFilters(event)) return

    const baseRow = createEventGroupRow(event, eventDeals[0])
    const metrics = buildEventMetricsRow(event, eventDeals, resolveEventPercent)

    result.push({
      ...baseRow,
      ...metrics,
      event: event?.title || baseRow.event,
    })
  })

  // eslint-disable-next-line no-console
  console.log('🔍 [groupedEvents] final result:', result.length, 'events')

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
    });

    row.over = row.summ - row.planProfit;
    
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
    (window as any).BX24?.getAuth?.()?.domain ||
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

function getUserNameById(userId) {
  if (!userId) return '';
  return userProfilesById.value[String(userId)]?.name || '';
}

function getUserShortNameById(userId) {
  if (!userId) return '';
  const profile = userProfilesById.value[String(userId)];
  if (!profile) return '';
  return profile.shortName || profile.name || '';
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

function collectEventManagerIds(eventItems) {
  const managerIds = new Set()
  asArray(eventItems).forEach((event) => {
    getEventManagerIds(event?.ufCrm38_1753082810).forEach((id) => managerIds.add(id))
  })
  return managerIds
}

function buildAssignedUsersFromEvents(eventItems) {
  return [...collectEventManagerIds(eventItems)]
    .map((id) => usersById.value[id])
    .filter(Boolean)
    .map((user) => {
      registerUserProfile(user)
      return mapUserForAssignedFilter(user)
    })
    .sort((a, b) => String(a.FULL_NAME || '').localeCompare(String(b.FULL_NAME || ''), 'ru'))
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
  const found = events.value.find((item) => String(item.id) === id)
    || asArray(filters.value.value.events).find((item) => String(item.id) === id)
    || null
  
  // eslint-disable-next-line no-console
  if (found) console.log('🔍 [findEventById] found:', id, found.title?.substring(0, 40))
  
  return found
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
        if (!id || !directoryTitleMap.has(id)) return
        const title = directoryTitleMap.get(id)
        map.set(id, { id, title })
        return
      }

      const value = String(item)
      if (!value || !directoryTitleMap.has(value)) return
      map.set(value, { id: value, title: directoryTitleMap.get(value) })
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

function normalizeSmartProcessBindingIds(rawValue, entityTypeId) {
  return asArray(rawValue)
    .map((value) => {
      if (value && typeof value === 'object') {
        return value.id ?? value.ID ?? value.value ?? value.VALUE
      }
      return value
    })
    .flatMap((value) => asArray(value))
    .map((value) => {
      const normalized = String(value ?? '').trim()
      const bindingMatch = normalized.match(
        new RegExp(`^(?:DYNAMIC_|T)?${entityTypeId}[_:](\\d+)$`, 'i'),
      )
      return bindingMatch?.[1] || normalized
    })
    .filter(Boolean)
}

function formatEventCity(event) {
  const cityIds = normalizeSmartProcessBindingIds(
    event?.[EVENT_CITY_FIELD],
    CITY_ENTITY_TYPE_ID,
  )
  if (!cityIds.length) return ''

  const cityTitles = new Map(
    asArray(cityDirectory.value).map((city) => [
      String(city.id ?? city.ID),
      String(city.title ?? city.TITLE ?? city.id ?? city.ID),
    ]),
  )

  return cityIds
    .map((cityId) => cityTitles.get(String(cityId)) || String(cityId))
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
    over: 0,
    dog: 0,
    pd: 0,
    UF_CRM_1744062581756: deal?.UF_CRM_1744062581756,
    STAGE_ID: deal?.STAGE_ID,
    event: event?.title || '',
    city: formatEventCity(event),
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
      const shortName = userProfilesById.value[key]?.shortName
      if (shortName) return shortName
      if (userProfilesById.value[key]?.name) {
        // fallback без отчества, если shortName ещё нет
        const user = assigned.find((u) => String(u.ID) === key)
        if (user) return displayNameWithoutPatronymic(user.LAST_NAME, user.NAME)
        return userProfilesById.value[key].name
      }
      const user = assigned.find((u) => String(u.ID) === key)
      if (user) return displayNameWithoutPatronymic(user.LAST_NAME, user.NAME)
      return ''
    })
    .filter(Boolean)
    .join(', ')
}

async function loadEventManagerUsers(eventItems) {
  const managerIds = collectEventManagerIds(eventItems)
  await ensureUsersByIds([...managerIds])
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

/** Фамилия + имя без отчества */
function displayNameWithoutPatronymic(lastName, name) {
  const parts = [lastName, name].map((part) => String(part || '').trim()).filter(Boolean)
  return parts.join(' ') || 'Имя не указано'
}

function stageMap(stage){
    let stageName;

    switch (stage) {
        case "C32:NEW":
            stageName = "База";
            break;
        case "C32:PREPARATION":
            stageName = "Рассылка";
            break;
        case "C32:UC_GKSSJ3":
            stageName = "Обзвон";
            break;
        case "C32:UC_HPGIL5":
            stageName = "Нет ответа";
            break;
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
        case "C32:WON":
            stageName = "Мероприятие завершено";
            break;
        case "C32:LOSE":
            stageName = "Сделка провалена";
            break;
        case "C32:APOLOGY":
            stageName = "Нет денег";
            break;
        case "C32:1":
            stageName = "Не заложили в бюджет";
            break;
        case "C32:2":
            stageName = "Не продвигается препарат в данном направлении";
            break;
        case "C32:3":
            stageName = "Не подались в РЗН";
            break;
        case "C32:4":
            stageName = "Не работаем с клиентом";
            break;
        case "C32:5":
            stageName = "Урезали бюджет";
            break;
        case "C32:7":
            stageName = "Не успели согласовать документы";
            break;
        case "C32:8":
            stageName = "Не проходит площадка проведения";
            break;
        case "C32:9":
            stageName = "Плохой опыт участия в данном проекте (явка)";
            break;
        case "C32:6":
            stageName = "Другое";
            break;
        default:
            stageName = "";
            break;
    }

    return stageName;
}

function flattenCallApiDeals(rawDeals) {
  if (!Array.isArray(rawDeals)) return []
  return rawDeals.length && Array.isArray(rawDeals[0]) ? rawDeals.flat() : rawDeals
}

function waitMs(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function enrichEventDialogDeals(dealsList) {
  const userIds = [...new Set(
    dealsList
      .map((deal) => deal.ASSIGNED_BY_ID)
      .filter((id) => id != null && id !== ''),
  )]

  if (userIds.length) {
    await ensureUsersByIds(userIds)
  }

  const usersByIdMap = Object.fromEntries(
    userIds.map((id) => [String(id), usersById.value[String(id)]]).filter(([, user]) => user),
  )

  let statusesById = {}
  try {
    const statuses = await callApi('crm.item.list', {}, null, 1080, 0, 0) || []
    const statusList = flattenCallApiDeals(statuses)
    statusesById = Object.fromEntries(
      statusList.map((item) => [String(item.id ?? item.ID), item]),
    )
  } catch (error) {
    console.error('Ошибка загрузки статусов для диалога сделок:', error)
  }

  return dealsList.map((deal) => normalizeEventDialogDeal(deal, usersByIdMap, statusesById))
}

async function fetchEventDialogDealsByIds(dealIds) {
  const ids = [...new Set(
    (dealIds || [])
      .map((id) => String(id).trim())
      .filter(Boolean),
  )]
  if (!ids.length) return []

  const rawDeals = await callApi(
    'crm.deal.list',
    { ID: ids },
    EVENT_DIALOG_DEAL_SELECT,
    null,
    0,
    0,
  ) || []

  return enrichEventDialogDeals(flattenCallApiDeals(rawDeals))
}

function mergeGeneratedDealsIntoStores(normalizedDeals, eventId) {
  if (!normalizedDeals.length) return

  const eventKey = String(eventId)
  const dialogOpenForEvent = eventDealsDialog.value.open
    && String(getOpenEventDealsDialogId()) === eventKey

  if (dialogOpenForEvent) {
    eventDealsDialog.value.deals = mergeEventDialogDealsById(
      eventDealsDialog.value.deals,
      normalizedDeals,
    )
  }

  normalizedDeals.forEach((dialogDeal) => {
    const dealId = String(dialogDeal.ID)
    const existingTable = table1.value.find((deal) => String(deal.ID) === dealId)
    const mergedForTable = mergeDealForStore(existingTable, dialogDeal)

    if (existingTable) {
      table1.value = patchDealInCollection(table1.value, dealId, mergedForTable)
    } else {
      table1.value = [...table1.value, mergedForTable]
    }

    const existingDeal = deals.value.find((deal) => String(deal.ID) === dealId)
    if (existingDeal) {
      deals.value = patchDealInCollection(
        deals.value,
        dealId,
        mergeDealForStore(existingDeal, dialogDeal),
      )
    } else {
      deals.value = [...deals.value, mergeDealForStore(null, dialogDeal)]
    }
  })
}

async function refreshDealsAfterCreation(createdDealIds, eventId, { silent = true } = {}) {
  const ids = [...new Set(
    (createdDealIds || [])
      .map((id) => String(id).trim())
      .filter(Boolean),
  )]
  if (!ids.length || eventId == null || eventId === '') return

  let fetchedDeals = await fetchEventDialogDealsByIds(ids)
  if (fetchedDeals.length) {
    mergeGeneratedDealsIntoStores(fetchedDeals, eventId)
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const missingIds = ids.filter((id) => !findDealInStores(id))
    if (!missingIds.length) break

    if (attempt > 0) {
      await waitMs(350 * attempt)
    }

    fetchedDeals = await fetchEventDialogDealsByIds(missingIds)
    if (fetchedDeals.length) {
      mergeGeneratedDealsIntoStores(fetchedDeals, eventId)
    }
  }

  const dialogOpenForEvent = eventDealsDialog.value.open
    && String(getOpenEventDealsDialogId()) === String(eventId)

  if (dialogOpenForEvent && !eventDealsDialog.value.refreshing) {
    await refreshEventDealsDialog({ silent })
  }
}

function normalizeMoneyField(value) {
  if (value == null || value === '') return 0
  return String(value).replace(/\|RUB$/i, '')
}

function normalizeEventDialogDeal(deal, usersById = {}, statusesById = {}) {
  const assignedId = deal.ASSIGNED_BY_ID
  const user = usersById[String(assignedId)] || null
  const statusId = Array.isArray(deal.UF_CRM_1745995594)
    ? deal.UF_CRM_1745995594[0]
    : deal.UF_CRM_1745995594
  const status = statusesById[String(statusId)] || null

  return {
    ...deal,
    UF_CRM_1745995594: statusId,
    UF_CRM_1742971372921: normalizeMoneyField(deal.UF_CRM_1742971372921),
    UF_CRM_1745222013992: normalizeMoneyField(deal.UF_CRM_1745222013992),
    UF_CRM_1759821112055: normalizeMoneyField(deal.UF_CRM_1759821112055),
    UF_CRM_1742972105926: normalizeMoneyField(deal.UF_CRM_1742972105926),
    UF_CRM_1742972167794: normalizeMoneyField(deal.UF_CRM_1742972167794),
    UF_CRM_1744062581756: normalizeMoneyField(deal.UF_CRM_1744062581756),
    ASSIGNED_BY_ID: displayFullName(user?.LAST_NAME, user?.NAME, user?.SECOND_NAME),
    status: status?.title || '',
    stage: stageMap(deal.STAGE_ID),
    user: user?.ID || assignedId,
  }
}

async function loadDealsForEventDialog(eventId) {
  const rawDeals = await callApi(
    'crm.deal.list',
    {
      [DEAL_EVENT_FIELD]: eventId,
      STAGE_ID: EVENT_DIALOG_DEAL_STAGES,
    },
    EVENT_DIALOG_DEAL_SELECT,
    null,
    0,
    0,
  ) || []

  return enrichEventDialogDeals(flattenCallApiDeals(rawDeals))
}

async function loadEventItemForDialog(eventId) {
  if (eventId == null || eventId === '') return null
  try {
    const result = await callApi('crm.item.list', { id: eventId }, null, EVENT_ENTITY_TYPE_ID, 0, 0)
    const items = Array.isArray(result) ? result : []
    return items[0] || null
  } catch (error) {
    console.error('Ошибка загрузки мероприятия для диалога сделок:', error)
    return null
  }
}

async function openEventDealsDialog(item) {
  const event = resolveEventForDealGenerator(item)
  if (!event) {
    showSnackbar('Не удалось определить мероприятие', 'error')
    return
  }

  const eventId = event.id ?? item?.UF_CRM_1742797326
  eventDealsDialog.value = {
    open: true,
    event: {
      ...event,
      title: event.title || item?.event || '',
      start: item?.start || event.start,
      city: formatEventCity(event) || item?.city || '',
    },
    deals: [],
    sourceItem: item,
    refreshing: true,
    scienceExporting: false,
  }

  try {
    const [deals, freshEvent] = await Promise.all([
      loadDealsForEventDialog(eventId),
      loadEventItemForDialog(eventId),
    ])
    eventDealsDialog.value.deals = deals
    if (freshEvent) {
      eventDealsDialog.value.event = {
        ...eventDealsDialog.value.event,
        ...freshEvent,
        title: freshEvent.title || eventDealsDialog.value.event.title,
        city: formatEventCity(freshEvent) || eventDealsDialog.value.event.city,
      }
    }
  } catch (error) {
    console.error(error)
    showSnackbar('Не удалось загрузить сделки мероприятия', 'error')
    eventDealsDialog.value.deals = table1.value.filter(
      (deal) => String(deal.UF_CRM_1742797326) === String(eventId),
    )
  } finally {
    eventDealsDialog.value.refreshing = false
  }
}

function mergeEventDialogDealsById(existingDeals, incomingDeals) {
  const byId = new Map(
    (existingDeals || []).map((deal) => [String(deal.ID), deal]),
  )
  ;(incomingDeals || []).forEach((deal) => {
    byId.set(String(deal.ID), deal)
  })
  return Array.from(byId.values())
}

async function refreshEventDealsDialog({ silent = false } = {}) {
  if (!eventDealsDialog.value.open || eventDealsDialog.value.refreshing) return

  const item = getEventDealsActionItem()
  const eventId = item?.UF_CRM_1742797326 || eventDealsDialog.value.event?.id
  if (eventId == null || eventId === '') {
    if (!silent) {
      showSnackbar('Не удалось определить мероприятие', 'error')
    }
    return
  }

  eventDealsDialog.value.refreshing = true
  try {
    const [deals, freshEvent] = await Promise.all([
      loadDealsForEventDialog(eventId),
      loadEventItemForDialog(eventId),
    ])
    eventDealsDialog.value.deals = mergeEventDialogDealsById(eventDealsDialog.value.deals, deals)
    if (freshEvent) {
      eventDealsDialog.value.event = {
        ...eventDealsDialog.value.event,
        ...freshEvent,
        title: freshEvent.title || eventDealsDialog.value.event?.title,
        city: formatEventCity(freshEvent) || eventDealsDialog.value.event?.city,
      }
    }
    if (!silent) {
      showSnackbar('Данные обновлены', 'success')
    }
  } catch (error) {
    console.error(error)
    if (!silent) {
      showSnackbar('Не удалось обновить данные', 'error')
    }
  } finally {
    eventDealsDialog.value.refreshing = false
  }
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

function getChecklistBarClass(percent) {
  const value = Number(percent) || 0
  if (value <= 40) return 'event-checklist-inline__fill--red'
  if (value <= 74) return 'event-checklist-inline__fill--orange'
  return 'event-checklist-inline__fill--green'
}

function getEventChecklist(item) {
  const eventId = item?.UF_CRM_1742797326
  if (eventId == null || eventId === '') return null
  return checklistByEventId.value[String(eventId)] || null
}

async function loadEventChecklists(eventItems = events.value) {

  const eventIds = [...new Set(
    (eventItems || [])
      .map((event) => event?.id ?? event?.ID)
      .filter((id) => id != null && id !== ''),
  )]

  if (!eventIds.length) {
    checklistByEventId.value = {}
    return
  }

  try {
    checklistByEventId.value = await loadEventChecklistsMap(eventIds)
  } catch (error) {
    console.error('Ошибка загрузки чек-листов мероприятий:', error)
    checklistByEventId.value = {}
  }
}

function openEventChecklistFromTable(item) {
  const checklist = getEventChecklist(item)
  if (!checklist?.itemId) return
  openBitrixPath(
    buildEventChecklistDetailsPath(
      checklist.itemId,
      checklist.entityTypeId || EVENT_CHECKLIST_ENTITY_TYPE_ID,
    ),
    {
      newTab: false,
      onClose: () => loadEventChecklists(),
    },
  )
}

function createEventChecklistFromTable(item) {
  const eventId = item?.UF_CRM_1742797326
  if (eventId == null || eventId === '') return
  checklistTypeDialog.value = { open: true, eventId }
}

function createEventChecklistOfType(entityTypeId) {
  const eventId = checklistTypeDialog.value.eventId
  if (eventId == null || eventId === '') return
  openBitrixPath(buildEventChecklistCreatePath(eventId, entityTypeId), {
    newTab: false,
    onClose: () => loadEventChecklists(),
  })
}

onMounted(async () => {
  setBitrixRateLimitNotifier((retryInMs) => notifyRateLimit(retryInMs));
  mountStickyReportTableHeaders();

  try {
    loadingMessage.value = 'Загрузка списка мероприятий…';
    loadingProgress.value = 12;
    filters.value.value.events = await callApi("crm.item.list", 
      { "!ufCrm38_1751875905992": "null" }, 
      ["id", "title"], 
      1052, 0, 0
    );
    
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
  setBitrixRateLimitNotifier(null);
  cancelFilterAutoRefresh();
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

/** Пауза после последнего изменения фильтра, чтобы дождаться конца ввода */
const FILTER_AUTO_REFRESH_DELAY_MS = 800;
let filterAutoRefreshTimer = null;
let appliedFilterSignature = '';

function buildFilterSignature() {
  const ids = (value) => asArray(value).map(String).sort();

  return JSON.stringify({
    departments: ids(filters.value.selected.departments),
    category: ids(filters.value.selected.category),
    dateName: selectedDateName.value,
    dateFrom: selectedDateIso.value?.[0] || null,
    dateTo: selectedDateIso.value?.[1] || null,
  });
}

function cancelFilterAutoRefresh() {
  if (filterAutoRefreshTimer == null) return;
  window.clearTimeout(filterAutoRefreshTimer);
  filterAutoRefreshTimer = null;
}

function scheduleFilterAutoRefresh() {
  if (!isInitialLoadDone.value) return;
  if (buildFilterSignature() === appliedFilterSignature) return;

  cancelFilterAutoRefresh();
  filterAutoRefreshTimer = window.setTimeout(() => {
    filterAutoRefreshTimer = null;

    // Данные ещё грузятся — пробуем позже, чтобы не слать параллельные запросы
    if (isLoading.value) {
      scheduleFilterAutoRefresh();
      return;
    }

    if (buildFilterSignature() === appliedFilterSignature) return;
    void getData();
  }, FILTER_AUTO_REFRESH_DELAY_MS);
}

watch(
  () => [
    filters.value.selected.departments,
    filters.value.selected.category,
    selectedDateName.value,
    selectedDateIso.value,
  ],
  () => scheduleFilterAutoRefresh(),
  { deep: true },
)

function resolveReportEventIds(eventItems, dateFrom, dateTo, selectedEventIds = []) {
  const selected = asArray(selectedEventIds).map(String).filter(Boolean)
  const selectedSet = selected.length ? new Set(selected) : null

  return asArray(eventItems)
    .filter((event) => {
      const id = String(event?.id ?? event?.ID ?? '')
      if (!id) return false
      if (selectedSet && !selectedSet.has(id)) return false
      return isEventWithinDateRange(event?.ufCrm38_1745307580193, dateFrom, dateTo)
    })
    .map((event) => event.id ?? event.ID)
}

const getData = async () => {
  cancelFilterAutoRefresh();
  isLoading.value = true;
  loadingProgress.value = 0;
  loadingMessage.value = 'Подготовка фильтров и запроса…';

  try {
  // Синхронизируем дату из DateFilter перед запросом
  if (dateFilterRef.value && typeof dateFilterRef.value.flush === 'function') {
    const flushed = dateFilterRef.value.flush()
    if (Array.isArray(flushed)) {
      selectedDateIso.value = [flushed[0] || null, flushed[1] || null]
    }
  }

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

  const selectedCategory = asArray(filters.value.selected.category)
  const selectedEvents = asArray(filters.value.selected.events)

  const filterCategory = selectedCategory.length === 0
    ? asArray(filters.value.value.category).map((item) => item.id)
    : selectedCategory

  const [dateFrom, dateTo] = formatDateFilterRange(selectedDateIso.value)

  loadingProgress.value = Math.max(loadingProgress.value, 18)
  loadingMessage.value = 'Загрузка мероприятий…'

  events.value = await callApi('crm.item.list', {}, null, 1052, 0, 0) || []
  filters.value.value.events = asArray(events.value)
    .filter((item) => {
      const value = item?.ufCrm38_1751875905992
      return value != null && value !== ''
    })
    .map((item) => ({
      id: item.id ?? item.ID,
      title: item.title ?? item.TITLE ?? '',
    }))
    .filter((item) => item.id != null && item.id !== '')
  cityDirectory.value = await callApi(
    'crm.item.list',
    {},
    ['id', 'title'],
    CITY_ENTITY_TYPE_ID,
    0,
    0,
  ) || []
  audienceDirectory.value = await getListElements(AUDIENCE_LIST_ID, {}, ['ID', 'NAME']) || []
  await loadEventManagerUsers(events.value)
  filters.value.value.assigned = buildAssignedUsersFromEvents(events.value)
  const allowedAssignedIds = new Set(filters.value.value.assigned.map((user) => String(user.ID)))
  filters.value.selected.assigned = asArray(filters.value.selected.assigned)
    .filter((userId) => allowedAssignedIds.has(String(userId)))
  await loadEventChecklists(events.value)
  filters.value.value.audience = buildAudienceOptions(events.value)

  // Дата = период мероприятий: сначала ID событий, потом сделки только по ним.
  // Фильтр по конкретным выбранным мероприятиям намеренно не передаём сюда —
  // он применяется на клиенте (filteredDealsForEvents/table1Filtered), чтобы
  // смена выбранных мероприятий не требовала повторной загрузки с сервера.
  const filterEvents = resolveReportEventIds(
    events.value,
    dateFrom,
    dateTo,
  )

  // Ответственный фильтруется на клиенте (table1Filtered), в запрос не передаём,
  // чтобы смена ответственного не требовала повторной загрузки с сервера
  // и не влияла на агрегаты по мероприятию (% сбора и т.п.)

  // Используем DYNAMIC_1052 вместо UF_CRM_1742797326 для handler
  const eventIdsForFilter = filterEvents.length
    ? filterEvents
    : asArray(filters.value.value.events).map((item) => String(item.id))

  // eslint-disable-next-line no-console
  console.log('🔍 [getData] Event filter debug:', {
    filterEventsCount: filterEvents.length,
    selectedEventsCount: selectedEvents.length,
    eventIdsForFilterCount: eventIdsForFilter.length,
    firstEventIds: eventIdsForFilter.slice(0, 5),
  })

  const eventFilter = buildEventDealFilter(eventIdsForFilter)

  const dealFiltersForEvents = {
    STAGE_ID: filterCategory,
    ...eventFilter,
  }

  loadingProgress.value = Math.max(loadingProgress.value, 38);
  loadingMessage.value = 'Загрузка сделок…';

  // Один запрос вместо двух: сводная и детальная таблицы отличаются только
  // фильтром даты передачи — его применяем на клиенте (isDealWithinDateRange).
  let dealsLocal2 = [];
  let dealsLocal = [];
  try {
    if (!filterEvents.length) {
      dealsLocal2 = []
      dealsLocal = []
    } else {
      dealsLocal2 = await fetchDealsFromHandler(
        dealFiltersForEvents,
        DEAL_SELECT_FIELDS_WITH_COMMENTS,
        rateLimitFetchOptions,
      );
      const [dateFromDeal, dateToDeal] = formatDateFilterRange(selectedDateIso.value)
      const hasDealDateFilter = Boolean(dateFromDeal || dateToDeal)
      dealsLocal = hasDealDateFilter
        ? dealsLocal2.filter((deal) => isDealWithinDateRange(
          deal?.UF_CRM_1744096783472,
          dateFromDeal,
          dateToDeal,
        ))
        : dealsLocal2
    }
  } catch (error) {
    console.error('Ошибка при получении сделок:', error);
    showError(error, 'Ошибка при загрузке сделок');
  }

  loadingProgress.value = Math.max(loadingProgress.value, 56);

  loadingProgress.value = Math.max(loadingProgress.value, 82);

  // eslint-disable-next-line no-console
  console.log('🔍 [getData] Deals loaded:', {
    dealsLocalCount: dealsLocal.length,
    dealsLocal2Count: dealsLocal2.length,
    firstDealsLocalDeal: dealsLocal[0] ? {
      ID: dealsLocal[0].ID,
      TITLE: dealsLocal[0].TITLE,
      UF_CRM_1742797326: dealsLocal[0].UF_CRM_1742797326,
      STAGE_ID: dealsLocal[0].STAGE_ID,
      UF_CRM_1744062581756: dealsLocal[0].UF_CRM_1744062581756,
    } : null,
    firstDealsLocal2Deal: dealsLocal2[0] ? {
      ID: dealsLocal2[0].ID,
      TITLE: dealsLocal2[0].TITLE,
      UF_CRM_1742797326: dealsLocal2[0].UF_CRM_1742797326,
      STAGE_ID: dealsLocal2[0].STAGE_ID,
      UF_CRM_1744062581756: dealsLocal2[0].UF_CRM_1744062581756,
    } : null,
  })

  const statuses = await callApi('crm.item.list', {}, null, 1080, 0, 0) || []

  loadingProgress.value = Math.max(loadingProgress.value, 88);
  loadingMessage.value = 'Загрузка данных ответственных…';

  const usersFind = Array.from(new Set(dealsLocal.map(deal => deal.ASSIGNED_BY_ID)));
  await ensureUsersByIds(usersFind, USER_SELECT_FIELDS);
  const users = usersFind.map((id) => usersById.value[String(id)]).filter(Boolean);

  loadingProgress.value = Math.max(loadingProgress.value, 94);
  loadingMessage.value = 'Обработка таблицы и расчёт итогов…';

  // Загружаем контакты через CONTACT_ID из сделок (через batch handler)
  const contactIds = Array.from(new Set(
    dealsLocal
      .map((deal) => {
        // Сначала пробуем CONTACT_ID
        if (deal.CONTACT_ID) {
          const value = deal.CONTACT_ID
          if (Array.isArray(value)) return value[0]
          return value
        }
        // Fallback на UF_CRM_1756807710 (доверенные лица)
        const value = deal.UF_CRM_1756807710
        if (Array.isArray(value)) return value[0]
        return value
      })
      .filter((id) => id != null && id !== ''),
  ))
  let contacts = []
  if (contactIds.length) {
    contacts = await callApi(
      'crm.contact.list',
      { ID: contactIds },
      ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME'],
    ) || []
  }
  const contactsList = Array.isArray(contacts)
    ? (contacts.length && Array.isArray(contacts[0]) ? contacts.flat() : contacts)
    : []

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

    // Приоритет: CONTACT_ID из сделки, fallback на UF_CRM_1756807710
    let contactId = obj.CONTACT_ID
    if (contactId) {
      contactId = Array.isArray(contactId) ? contactId[0] : contactId
    } else {
      const ufValue = obj.UF_CRM_1756807710
      contactId = Array.isArray(ufValue) ? ufValue[0] : ufValue
    }
    const contact = contactsList.find((con) => String(con.ID) === String(contactId))
    obj.trustedPerson = contact
      ? displayFullName(contact.LAST_NAME, contact.NAME, contact.SECOND_NAME)
      : 'Не указано'
  });

  // Обработка dealsLocal2 (сделки для сводной таблицы) — аналогично dealsLocal
  dealsLocal2.forEach(obj => {
    obj.UF_CRM_1745995594 = obj.UF_CRM_1745995594?.[0];
    // Парсим все числовые поля — убираем |RUB и конвертируем в число
    const parseMoney = (val) => {
      if (val == null || val === '') return 0
      const cleaned = String(val).replace('|RUB', '').replace(/\s/g, '').replace(',', '.')
      const parsed = parseFloat(cleaned)
      return Number.isFinite(parsed) ? parsed : 0
    }
    obj.UF_CRM_1745222013992 = parseMoney(obj.UF_CRM_1745222013992)
    obj.UF_CRM_1759821112055 = parseMoney(obj.UF_CRM_1759821112055)
    obj.UF_CRM_1742972105926 = parseMoney(obj.UF_CRM_1742972105926)
    obj.UF_CRM_1742972167794 = parseMoney(obj.UF_CRM_1742972167794)
    obj.UF_CRM_1744062581756 = parseMoney(obj.UF_CRM_1744062581756)
  });

  // eslint-disable-next-line no-console
  console.log('🔍 [getData] dealsLocal2 after parse:', {
    firstDeal: dealsLocal2[0] ? {
      ID: dealsLocal2[0].ID,
      TITLE: dealsLocal2[0].TITLE,
      STAGE_ID: dealsLocal2[0].STAGE_ID,
      UF_CRM_1745222013992: dealsLocal2[0].UF_CRM_1745222013992,
      UF_CRM_1744062581756: dealsLocal2[0].UF_CRM_1744062581756,
    } : null,
    dealsWithSumm: dealsLocal2.filter(d => d.UF_CRM_1744062581756 > 0).length,
    totalSumm: dealsLocal2.reduce((acc, d) => acc + (d.UF_CRM_1744062581756 || 0), 0),
  });

  dealsLocal.forEach(deal => {
    totalRow.value.UF_CRM_1745222013992 += +deal.UF_CRM_1745222013992;
    totalRow.value.UF_CRM_1759821112055 += +deal.UF_CRM_1759821112055;
    totalRow.value.UF_CRM_1742972167794 += +deal.UF_CRM_1742972167794;
    totalRow.value.UF_CRM_1742972105926 += +deal.UF_CRM_1742972105926;
    totalRow.value.UF_CRM_1744062581756 += +deal.UF_CRM_1744062581756;
  });

  table1.value = JSON.parse(JSON.stringify(dealsLocal));
  deals.value = JSON.parse(JSON.stringify(dealsLocal2));

  // eslint-disable-next-line no-console
  console.log('🔍 [getData] table1 set:', {
    table1Length: table1.value.length,
    table1FilteredLength: table1Filtered.value.length,
    groupedEventsLength: groupedEvents.value?.length,
    firstTable1Item: table1.value[0] ? {
      ID: table1.value[0].ID,
      event: table1.value[0].event,
      UF_CRM_1742797326: table1.value[0].UF_CRM_1742797326,
      user: table1.value[0].user,
    } : null,
  })

  appliedFilterSignature = buildFilterSignature();
  finishLoading();
  refreshStickyReportTableHeaders();
  } catch (error) {
    console.error('Ошибка при загрузке отчёта:', error);
    showError(error, 'Ошибка при загрузке отчёта');
    appliedFilterSignature = buildFilterSignature();
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

  .report-page__zoom
    display: flex
    flex-direction: column
    gap: 1rem
    width: 100%
    flex: 1 1 auto
    min-height: 0

  .report-page .v-data-table:not(.sticky-report-table)
    width: 100%
    max-width: 100%

    .v-table__wrapper
      overflow-x: auto

  .report-table-section
    display: flex
    flex-direction: column
    gap: 0

  .report-table-header
    display: flex
    align-items: center
    gap: 1rem
    margin-bottom: 0.75rem

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
    margin-bottom: 0 !important
    flex: 1 1 auto

  .report-table-card > .report-table-title
    margin-bottom: 0.75rem !important

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

  .event-cell
    display: flex
    flex-direction: column
    align-items: flex-start
    gap: 0.35rem
    min-width: 0

  .event-cell__title-row
    display: flex
    align-items: center
    gap: 0.35rem
    min-width: 0
    width: 100%

  .event-cell__title-row .event-link,
  .event-cell__title-row > span
    flex: 1 1 auto
    min-width: 0

  .event-open-btn
    display: inline-flex
    align-items: center
    justify-content: center
    gap: 0.1rem
    flex: 0 0 auto
    min-width: 36px
    height: 22px
    padding: 0 0.3rem
    border: 1px solid #d1d5db
    border-radius: 4px
    background: #ffffff
    color: #374151
    cursor: pointer
    line-height: 1

    &:hover
      background: #f3f4f6
      border-color: #9ca3af
      color: #111827

  .event-checklist-inline
    width: 100%
    max-width: 220px

  .event-checklist-inline__tag
    display: flex
    flex-direction: column
    gap: 0.2rem
    width: 100%
    padding: 0.2rem 0.35rem
    border: 1px solid #cfe8e5
    border-radius: 6px
    background: #f0faf8
    color: #0f766e
    font-size: 0.6875rem
    font-weight: 700
    line-height: 1.2
    text-align: left
    cursor: pointer

    &:hover
      background: #dff5f2
      border-color: #9fd6d1

  .event-checklist-inline__bar
    display: block
    width: 100%
    height: 4px
    border-radius: 999px
    background: #dbe7e5
    overflow: hidden

  .event-checklist-inline__fill
    display: block
    height: 100%
    border-radius: inherit
    background: #22c55e

  .event-checklist-inline__fill--red
    background: #ef4444

  .event-checklist-inline__fill--orange
    background: #f59e0b

  .event-checklist-inline__fill--green
    background: #22c55e

  .event-checklist-inline__create
    display: inline-flex
    align-items: center
    padding: 0.2rem 0.4rem
    border: 1px dashed #94a3b8
    border-radius: 6px
    background: #fff
    color: #2563eb
    font-size: 0.6875rem
    font-weight: 600
    cursor: pointer

    &:hover
      background: #eff6ff
      border-color: #60a5fa

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
    min-width: 280px
    padding: 0 !important
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

    &--submenu
      min-width: 240px

      &::before
        display: none

    .event-actions-menu__item
      min-height: 44px
      padding-inline: 14px !important
      color: #374151
      border-bottom: 1px solid #edf0f3

      &:last-child
        border-bottom: none

      .v-list-item__prepend > .v-icon,
      .v-list-item__append > .v-icon
        color: #4b5563
        opacity: 1
        font-size: 1.125rem

      .v-list-item__prepend > .v-icon
        margin-inline-end: 10px

      .v-list-item-title
        display: flex
        align-items: center
        gap: 0.5rem
        font-size: 0.875rem
        font-weight: 500
        line-height: 1.25
        color: #374151

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

    &__brand
      display: flex
      align-items: center

    &__logo
      display: block
      width: auto
      height: 3.25rem
      max-width: min(100%, 20rem)
      object-fit: contain

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
      border-radius: 0.25rem
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
      border: 1px solid #d1d5db !important
      color: #111827 !important

      .v-btn__overlay,
      .v-btn__underlay
        opacity: 0

      .v-icon
        color: #111827 !important

      &:hover
        background: #f9fafb !important
        border-color: #9ca3af !important

    .report-btn--filled
      background: #ffffff !important
      border: 1px solid #d1d5db !important
      color: #111827 !important

      .v-btn__overlay,
      .v-btn__underlay
        opacity: 0

      .v-icon
        color: #111827 !important

      &:hover
        background: #f9fafb !important
        border-color: #9ca3af !important

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

  .workspace-panel
    display: flex
    flex-direction: column
    gap: 1rem

  .workspace-tabs
    display: flex
    flex-wrap: nowrap
    align-items: stretch
    width: 100%
    gap: 0.5rem

  .workspace-tabs__item
    flex: 1 1 0
    min-width: 0
    width: 100%
    height: 100%
    text-align: center
    border: 1px solid #dbe3ee
    border-radius: 0.75rem
    background: #f8fafc
    color: #334155
    font: inherit
    font-size: 0.875rem
    font-weight: 600
    line-height: 1.2
    padding: 0.65rem 1rem
    cursor: pointer
    display: inline-flex
    align-items: center
    justify-content: center
    text-align: center
    white-space: normal
    gap: 0.4rem
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease

    &:hover:not(.workspace-tabs__item--active)
      background: #f1f5f9
      border-color: #cbd5e1

    &--active
      background: #2563eb
      border-color: #2563eb
      color: #ffffff
      box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22)

  .workspace-tabs__item-wrap
    position: relative
    display: flex
    align-items: stretch
    flex: 1 1 0
    min-width: 0

  .workspace-tabs__chevron
    font-size: 0.7rem
    line-height: 1

  .workspace-tabs__zoom
    flex: 0 0 auto
    margin-left: 0.5rem

  .workspace-tab-empty
    display: flex
    align-items: center
    justify-content: center
    min-height: 8rem
    border: 1px dashed #dbe3ee
    border-radius: 0.75rem
    background: #f8fafc
    color: #64748b
    font-size: 0.9375rem
    text-align: center
    padding: 1.5rem

  .database-menu__popup
    position: absolute
    z-index: 20
    top: calc(100% + 0.35rem)
    left: 0
    right: 0
    min-width: 15rem
    padding: 0.45rem
    border: 1px solid #dce2ea
    border-radius: 0.625rem
    background: #ffffff
    box-shadow: 0 12px 28px rgba(23, 43, 77, 0.13)

  .database-menu__popup-item
    display: block
    width: 100%
    padding: 0.7rem 0.75rem
    border: 0
    border-radius: 0.45rem
    background: transparent
    color: #263447
    font: inherit
    font-size: 0.875rem
    text-align: left
    cursor: pointer
    transition: background-color 0.15s ease, color 0.15s ease
    display: flex
    align-items: center
    gap: 0.5rem

    &:hover
      background: #eef3ff
      color: #2864df

  .database-menu__popup-icon
    display: inline-flex
    align-items: center
    justify-content: center
    flex-shrink: 0

  .database-menu__popup-item--child
    padding-left: 2.1rem

  .reports-menu__popup
    display: flex
    flex-direction: column
    gap: 0.15rem
    min-width: 22rem
    max-width: 26rem
    max-height: 70vh
    overflow-y: auto

  .reports-menu__group
    display: flex
    flex-direction: column

  .reports-menu__chevron
    flex: 0 0 auto
    margin-left: auto
    color: #94a3b8

  .reports-menu__children
    display: flex
    flex-direction: column

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