<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    persistent
    transition="dialog-bottom-transition"
    content-class="event-deals-dialog-wrapper"
    class="event-deals-dialog-overlay"
    scrim="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="event-deals-dialog">
      <div class="event-deals-dialog__top">
        <div class="event-deals-dialog__header">
          <div class="event-deals-dialog__header-main">
            <h1 class="event-deals-dialog__title" :title="eventTitle">{{ eventTitle }}</h1>
            <p v-if="eventSubtitle" class="event-deals-dialog__subtitle" :title="eventSubtitle">{{ eventSubtitle }}</p>
            <div v-if="eventDateLabel || eventCity || eventChecklist.itemId || eventChecklistLoading" class="event-deals-dialog__meta">
              <span v-if="eventDateLabel" class="event-deals-dialog__meta-item">
                <v-icon size="18" icon="mdi-calendar-month-outline" />
                <span>{{ eventDateLabel }}</span>
              </span>
              <span v-if="eventCity" class="event-deals-dialog__meta-item">
                <v-icon size="18" icon="mdi-map-marker-outline" />
                <span>{{ eventCity }}</span>
              </span>

              <span
                v-if="eventDateLabel && (eventChecklistLoading || eventChecklist.itemId || resolveEventId())"
                class="event-deals-dialog__meta-divider"
                aria-hidden="true"
              />

              <div class="event-checklist event-checklist--inline">
                <template v-if="eventChecklistLoading">
                  <span class="event-checklist__loading">Загрузка чек-листа…</span>
                </template>
                <template v-else-if="eventChecklist.itemId">
                  <div class="event-checklist__row">
                    <button
                      type="button"
                      class="event-checklist__tag"
                      title="Открыть чек-лист"
                      @click="openEventChecklistItem"
                    >
                      <span class="event-checklist__label">Чек-лист</span>
                      <span class="event-checklist__count">
                        {{ eventChecklist.filled }}/{{ eventChecklist.total }}
                      </span>
                    </button>
                    <div class="event-checklist__track" aria-hidden="true">
                      <div
                        class="event-checklist__fill"
                        :class="eventChecklistBarClass"
                        :style="{ width: `${eventChecklist.percent}%` }"
                      />
                    </div>
                  </div>
                </template>
                <button
                  v-else
                  type="button"
                  class="event-deals-dialog__text-btn event-checklist__create"
                  title="Создать чек-лист"
                  :disabled="!resolveEventId()"
                  @click="openCreateEventChecklist"
                >
                  Создать чек-лист
                </button>
              </div>
            </div>
          </div>
          <div class="event-deals-dialog__header-tools">
            <AppZoomSlider />
            <button
              type="button"
              class="event-deals-dialog__text-btn"
              title="Обновить"
              :disabled="refreshing"
              @click="emit('refresh')"
            >
              <v-progress-circular
                v-if="refreshing"
                indeterminate
                size="16"
                width="2"
                color="#111827"
              />
              <v-icon v-else size="18" icon="mdi-refresh" />
              <span>Обновить</span>
            </button>
            <button
              type="button"
              class="event-deals-dialog__text-btn"
              title="Закрыть"
              @click="closeDialog"
            >
              <v-icon size="18" icon="mdi-close" />
              <span>Закрыть</span>
            </button>
          </div>
        </div>

        <div class="event-deals-dialog__metrics-row">
          <div v-if="eventMetrics" class="event-deals-dialog__stats">
            <article class="event-deals-dialog__stat event-deals-dialog__stat--percent">
              <span class="event-deals-dialog__stat-label">% выполнения</span>
              <strong class="event-deals-dialog__stat-value">{{ formatEventPercent(eventMetrics.percent) }}</strong>
              <div class="event-deals-dialog__percent-bar" aria-hidden="true">
                <div class="event-deals-dialog__percent-track">
                  <div
                    class="event-deals-dialog__percent-fill event-deals-dialog__percent-fill--plan"
                    :style="{ width: `${percentBarPlanWidth}%` }"
                  />
                  <div
                    v-if="percentBarOverWidth > 0"
                    class="event-deals-dialog__percent-fill event-deals-dialog__percent-fill--over"
                    :style="{ width: `${percentBarOverWidth}%` }"
                  />
                  <span
                    v-if="percentBarOverWidth > 0"
                    class="event-deals-dialog__percent-marker"
                    :style="{ left: `${percentBarPlanWidth}%` }"
                  />
                </div>
                <div class="event-deals-dialog__percent-meta">
                  <span class="event-deals-dialog__percent-cap">100%</span>
                  <span
                    v-if="percentBarOverLabel"
                    class="event-deals-dialog__percent-over"
                  >
                    {{ percentBarOverLabel }}
                  </span>
                </div>
              </div>
            </article>

            <article class="event-deals-dialog__stat">
              <span class="event-deals-dialog__stat-label">План выручки</span>
              <strong class="event-deals-dialog__stat-value">{{ formatMoney(eventMetrics.planProfit) }}</strong>
            </article>

            <article class="event-deals-dialog__stat">
              <span class="event-deals-dialog__stat-label">Собрано</span>
              <strong class="event-deals-dialog__stat-value">{{ formatMoney(eventMetrics.summ) }}</strong>
            </article>

            <article class="event-deals-dialog__stat event-deals-dialog__stat--over">
              <span class="event-deals-dialog__stat-label">Собрано сверху</span>
              <strong
                class="event-deals-dialog__stat-value event-deals-dialog__stat-value--over"
                :class="{ 'event-deals-dialog__stat-value--over-negative': Number(eventMetrics.over) < 0 }"
              >
                {{ formatOverMoney(eventMetrics.over) }}
              </strong>
            </article>
          </div>

          <section class="event-commerce-card">
            <h2 class="event-commerce-card__title">Коммерция</h2>
            <button
              type="button"
              class="event-commerce-card__row"
              :class="{ 'event-commerce-card__row--active': activeCommerceFilter === 'collected' }"
              title="Показать собранные сделки"
              :disabled="commerceFilterLoading"
              @click="setCommerceFilter('collected')"
            >
              <span class="event-commerce-card__label">Собрано</span>
              <strong class="event-commerce-card__value">
                {{ commerceCollectedParts.number }} {{ commerceCollectedParts.word }}
              </strong>
            </button>
            <button
              type="button"
              class="event-commerce-card__row"
              :class="{ 'event-commerce-card__row--active': activeCommerceFilter === 'remaining' }"
              title="Показать сделки, которые осталось собрать"
              :disabled="commerceFilterLoading"
              @click="setCommerceFilter('remaining')"
            >
              <span class="event-commerce-card__label">Осталось собрать</span>
              <strong class="event-commerce-card__value">
                {{ commerceRemainingParts.number }} {{ commerceRemainingParts.word }}
              </strong>
            </button>
          </section>
        </div>
      </div>

      <v-card-text class="event-deals-dialog__content" :style="zoomStyle">
        <div v-if="isDialogLoading" class="event-deals-dialog__loading">
          <v-progress-circular
            indeterminate
            size="42"
            width="3"
            color="#2563eb"
          />
          <span class="event-deals-dialog__loading-text">
            {{ refreshing ? 'Загрузка сделок…' : 'Загрузка контактов…' }}
          </span>
        </div>
        <div v-else class="event-deals-dialog__panels">
          <section class="event-deals-dialog__categories">
            <div class="event-deals-dialog__panel-head">
              <h2 class="event-deals-dialog__panel-title">Категории</h2>
              <div class="event-deals-dialog__actions">
                <div class="event-action-dropdown" @click.stop>
                  <button
                    type="button"
                    class="event-action-btn"
                    :class="{ 'event-action-btn--open': openActionMenu === 'generator' }"
                    @click="toggleActionMenu('generator')"
                  >
                    <v-icon size="16" icon="mdi-database-outline" />
                    <span>Генератор базы данных</span>
                    <v-icon size="14" icon="mdi-chevron-down" />
                  </button>
                  <div
                    v-if="openActionMenu === 'generator'"
                    class="event-action-dropdown__menu"
                  >
                    <button
                      type="button"
                      class="event-action-dropdown__item"
                      @click="emitAction('precise-deal')"
                    >
                      Точечное добавление
                    </button>
                    <button
                      type="button"
                      class="event-action-dropdown__item"
                      @click="emitAction('mass-generation')"
                    >
                      Массовая генерация
                    </button>
                    <button
                      type="button"
                      class="event-action-dropdown__item"
                      @click="emitAction('create-company')"
                    >
                      Создание компании
                    </button>
                  </div>
                </div>

                <div class="event-action-dropdown" @click.stop>
                  <button
                    type="button"
                    class="event-action-btn"
                    :class="{ 'event-action-btn--open': openActionMenu === 'mailing' }"
                    @click="toggleActionMenu('mailing')"
                  >
                    <v-icon size="16" icon="mdi-email-outline" />
                    <span>Отправить рассылку</span>
                    <v-icon size="14" icon="mdi-chevron-down" />
                  </button>
                  <div
                    v-if="openActionMenu === 'mailing'"
                    class="event-action-dropdown__menu"
                  >
                    <button
                      type="button"
                      class="event-action-dropdown__item"
                      @click="emitAction('send-mailing')"
                    >
                      Отправить рассылку
                    </button>
                    <button
                      type="button"
                      class="event-action-dropdown__item"
                      @click="emitAction('welcome-mailing')"
                    >
                      Отправить приветственную рассылку
                    </button>
                  </div>
                </div>

                <div class="event-action-dropdown" @click.stop>
                  <button
                    type="button"
                    class="event-action-btn"
                    :class="{ 'event-action-btn--open': openActionMenu === 'export' }"
                    :disabled="scienceExporting"
                    @click="toggleActionMenu('export')"
                  >
                    <v-icon size="16" icon="mdi-tray-arrow-up" />
                    <span>{{ scienceExporting ? 'Формирование…' : 'Экспорт' }}</span>
                    <v-icon size="14" icon="mdi-chevron-down" />
                  </button>
                  <div
                    v-if="openActionMenu === 'export'"
                    class="event-action-dropdown__menu"
                  >
                    <button
                      type="button"
                      class="event-action-dropdown__item"
                      @click="emitAction('export-excel')"
                    >
                      Экспорт отчета в Excel
                    </button>
                    <button
                      type="button"
                      class="event-action-dropdown__item"
                      :disabled="scienceExporting"
                      @click="emitAction('export-science')"
                    >
                      Экспорт научной программы
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="event-deals-dialog__tabs">
              <button
                v-for="tab in filterTabs"
                :key="tab.id"
                type="button"
                class="event-filter-tab"
                :class="{ 'event-filter-tab--active': activeFilter === tab.id && !activeCommerceFilter }"
                @click="setCategoryFilter(tab.id)"
              >
                <span class="event-filter-tab__label">{{ tab.label }} ({{ tab.count }})</span>
                <span
                  v-if="tab.sum != null"
                  class="event-filter-tab__sum"
                >
                  {{ formatMoney(tab.sum) }}
                </span>
              </button>
            </div>

            <div class="event-deals-dialog__toolbar">
              <v-text-field
                v-model="searchInput"
                class="event-deals-dialog__search"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                prepend-inner-icon="mdi-magnify"
                placeholder="Поиск по компаниям"
              />
            </div>
          </section>
        </div>

        <div class="event-deals-table-card">
          <div class="event-deals-table-wrap">
            <table class="event-deals-table">
              <thead>
                <tr>
                  <th class="selection-column">
                    <label class="table-checkbox">
                      <input
                        type="checkbox"
                        :checked="allPageDealsSelected"
                        :indeterminate.prop="somePageDealsSelected"
                        aria-label="Выбрать все сделки на странице"
                        @change="togglePageSelection"
                      >
                      <span />
                    </label>
                  </th>
                  <th>
                    <div class="selection-summary">
                      <span>Выбрано: {{ selectedDealIds.length }}</span>
                      <button
                        v-if="selectedDealIds.length"
                        type="button"
                        @click="clearSelection"
                      >
                        Снять выбор
                      </button>
                    </div>
                  </th>
                  <th class="col-responsible">Ответственный <span class="sort-arrows">↕</span></th>
                  <th>Этап <span class="sort-arrows">↕</span></th>
                  <th>Дата звонка</th>
                  <th class="col-comment">Комментарий</th>
                  <th class="col-status-participation">Статус участия</th>
                  <th>Предв. сумма</th>
                  <th>Финал. сумма</th>
                  <th>Доверенное лицо</th>
                  <th>Дата передачи</th>
                  <th>Кв.м</th>
                  <th>№ стенда</th>
                  <th class="col-linked-spa">Доп. опции</th>
                  <th class="col-linked-spa">Коммерция</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!pagedDeals.length">
                  <td colspan="15" class="event-deals-table__empty">Сделки не найдены</td>
                </tr>
                <tr
                  v-for="deal in pagedDeals"
                  :key="deal.ID"
                  :class="{ 'event-deals-table__row--selected': isDealSelected(deal.ID) }"
                >
                  <td class="selection-column">
                    <label class="table-checkbox">
                      <input
                        type="checkbox"
                        :checked="isDealSelected(deal.ID)"
                        :aria-label="`Выбрать сделку ${deal.ID}`"
                        @change="toggleDealSelection(deal.ID)"
                      >
                      <span />
                    </label>
                  </td>
                  <td class="deal-company-cell">
                    <div class="deal-company">
                      <button
                        type="button"
                        class="deal-company__deal-link"
                        title="Открыть сделку"
                        @click="openDeal(deal.ID)"
                      >
                        {{ companyName(deal) }}
                      </button>
                      <button
                        type="button"
                        class="deal-company__audience-btn"
                        title="Контакты по ЦА"
                        @click="openAudienceData(deal)"
                      >
                        Контакты по ЦА
                      </button>
                      <div class="deal-company__med-menu">
                        <button
                          type="button"
                          class="deal-company__audience-btn"
                          title="Мед. товары по ЦА"
                          @click.stop="toggleMedicalCatalogMenu(deal)"
                        >
                          Мед. товары по ЦА
                        </button>
                        <div
                          v-if="isMedicalCatalogMenuOpen(deal.ID)"
                          class="deal-company__med-menu-popup"
                          @click.stop
                        >
                          <button
                            type="button"
                            class="deal-company__med-menu-item"
                            @click="openMedicalCatalog(deal, 'medications')"
                          >
                            Препараты
                          </button>
                          <button
                            type="button"
                            class="deal-company__med-menu-item"
                            @click="openMedicalCatalog(deal, 'equipment')"
                          >
                            Оборудование
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="col-responsible">
                    <button
                      v-if="getResponsibleUserId(deal)"
                      type="button"
                      class="responsible-person__avatar-btn"
                      :title="getResponsibleName(deal)"
                      @click="openUserProfile(getResponsibleUserId(deal))"
                    >
                      <img
                        v-if="getResponsiblePhoto(deal)"
                        :src="getResponsiblePhoto(deal)"
                        :alt="getResponsibleName(deal)"
                        class="responsible-person__photo"
                        loading="lazy"
                        referrerpolicy="no-referrer"
                        @error="markAvatarFailed(getResponsiblePhoto(deal))"
                      />
                      <span v-else class="responsible-person__avatar">
                        {{ getUserInitials(getResponsibleName(deal)) }}
                      </span>
                    </button>
                    <span v-else class="muted-cell">—</span>
                  </td>
                  <td>
                    <div class="stage-picker" :class="{ 'stage-picker--saving': isStageSaving(deal.ID) }">
                      <div
                        class="stage-picker__track"
                        :class="[
                          stageBadgeClass(deal),
                          {
                            'stage-picker__track--refusal': isRefusalDeal(deal),
                            'stage-picker__track--success': isSuccessDeal(deal),
                          },
                        ]"
                        role="listbox"
                        :aria-label="`Стадия: ${stageLabel(deal)}`"
                      >
                        <button
                          v-for="(segment, segmentIndex) in STAGE_BAR_SEGMENTS"
                          :key="segment.value"
                          type="button"
                          class="stage-picker__seg"
                          :class="{
                            'stage-picker__seg--filled': isStageBarSegmentFilled(deal, segmentIndex),
                            'stage-picker__seg--current': isStageBarSegmentCurrent(deal, segment),
                            'stage-picker__seg--refusal': segment.isRefusal,
                          }"
                          :title="segment.label"
                          :aria-label="segment.label"
                          :aria-selected="isStageBarSegmentCurrent(deal, segment)"
                          :disabled="isStageSaving(deal.ID)"
                          @click="onStageBarClick(segment, deal)"
                        />
                      </div>
                      <v-chip
                        class="stage-picker__label"
                        :class="stageBadgeClass(deal)"
                        size="small"
                        label
                      >
                        {{ stageLabel(deal) }}
                      </v-chip>
                    </div>
                  </td>
                  <td>
                    <div
                      v-if="isEditingCell(deal.ID, LAST_CALL_DATE_FIELD)"
                      class="cell-editor"
                    >
                      <input
                        :ref="(el) => setCellInputRef(deal.ID, LAST_CALL_DATE_FIELD, el)"
                        v-model="editingCell.draft"
                        type="date"
                        class="cell-editor__input"
                        :disabled="isCellSaving(deal.ID, LAST_CALL_DATE_FIELD)"
                        @keydown.enter.prevent="commitCellEdit(deal)"
                        @keydown.esc.prevent="cancelCellEdit"
                        @blur="commitCellEdit(deal)"
                      >
                    </div>
                    <button
                      v-else
                      type="button"
                      class="editable-cell"
                      :class="{ 'editable-cell--empty': formatDateValue(deal[LAST_CALL_DATE_FIELD]) === '—' }"
                      title="Нажмите, чтобы изменить"
                      @click="startCellEdit(deal, LAST_CALL_DATE_FIELD)"
                    >
                      {{ formatDateValue(deal[LAST_CALL_DATE_FIELD]) }}
                    </button>
                  </td>
                  <td class="col-comment">
                    <button
                      type="button"
                      class="comment-cell"
                      :class="{ 'comment-cell--empty': formatCommentOrDash(deal[COMMENT_FIELD]) === '—' }"
                      :title="formatCommentOrDash(deal[COMMENT_FIELD]) === '—' ? 'Открыть комментарий' : formatCommentText(deal[COMMENT_FIELD])"
                      @click="openCommentDialog(deal)"
                    >
                      <span class="comment-cell__text">
                        {{ formatCommentOrDash(deal[COMMENT_FIELD]) }}
                      </span>
                    </button>
                  </td>
                  <td class="col-status-participation status-participation-cell">
                    <div class="linked-spa-cell status-participation-cell__inner">
                      <v-autocomplete
                        :model-value="getParticipationStatusId(deal)"
                        :items="participationStatusOptions"
                        item-title="title"
                        item-value="id"
                        density="compact"
                        variant="outlined"
                        hide-details
                        clearable
                        placeholder="—"
                        :loading="participationStatusesLoading"
                        :disabled="isParticipationStatusSaving(deal.ID)"
                        class="status-participation-select"
                        @update:model-value="(value) => updateParticipationStatus(deal, value)"
                      />
                      <button
                        type="button"
                        class="linked-spa-add"
                        title="Добавить статус участия"
                        @click="openCreateParticipationStatus(deal)"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td>
                    <div
                      v-if="isEditingCell(deal.ID, PRELIMINARY_SUM_FIELD)"
                      class="cell-editor"
                    >
                      <input
                        :ref="(el) => setCellInputRef(deal.ID, PRELIMINARY_SUM_FIELD, el)"
                        v-model="editingCell.draft"
                        type="text"
                        inputmode="decimal"
                        class="cell-editor__input"
                        :disabled="isCellSaving(deal.ID, PRELIMINARY_SUM_FIELD)"
                        @keydown.enter.prevent="commitCellEdit(deal)"
                        @keydown.esc.prevent="cancelCellEdit"
                        @blur="commitCellEdit(deal)"
                      >
                    </div>
                    <button
                      v-else
                      type="button"
                      class="editable-cell"
                      title="Нажмите, чтобы изменить"
                      @click="startCellEdit(deal, PRELIMINARY_SUM_FIELD)"
                    >
                      {{ formatMoney(deal[PRELIMINARY_SUM_FIELD]) }}
                    </button>
                  </td>
                  <td>
                    <div
                      v-if="isEditingCell(deal.ID, 'UF_CRM_1759821112055')"
                      class="cell-editor"
                    >
                      <input
                        :ref="(el) => setCellInputRef(deal.ID, 'UF_CRM_1759821112055', el)"
                        v-model="editingCell.draft"
                        type="text"
                        inputmode="decimal"
                        class="cell-editor__input"
                        :disabled="isCellSaving(deal.ID, 'UF_CRM_1759821112055')"
                        @keydown.enter.prevent="commitCellEdit(deal)"
                        @keydown.esc.prevent="cancelCellEdit"
                        @blur="commitCellEdit(deal)"
                      >
                    </div>
                    <button
                      v-else
                      type="button"
                      class="editable-cell"
                      title="Нажмите, чтобы изменить"
                      @click="startCellEdit(deal, 'UF_CRM_1759821112055')"
                    >
                      {{ formatMoneyOrDash(deal.UF_CRM_1759821112055) }}
                    </button>
                  </td>
                  <td class="trusted-person-cell">
                    <v-autocomplete
                      :model-value="getTrustedPersonId(deal)"
                      :items="getTrustedPersonOptions(deal)"
                      item-title="title"
                      item-value="id"
                      density="compact"
                      variant="outlined"
                      hide-details
                      clearable
                      auto-select-first
                      :loading="isTrustedPersonSaving(deal.ID) || isDealContactsLoading(deal.ID)"
                      :disabled="isTrustedPersonSaving(deal.ID)"
                      placeholder="Выбрать"
                      class="trusted-person-autocomplete"
                      :menu-props="{ zIndex: 3300 }"
                      @focus="ensureDealContactsLoaded(deal)"
                      @click="ensureDealContactsLoaded(deal)"
                      @update:model-value="(value) => updateTrustedPerson(deal, value)"
                    />
                  </td>
                  <td>
                    <div
                      v-if="isEditingCell(deal.ID, 'UF_CRM_1744096783472')"
                      class="cell-editor"
                    >
                      <input
                        :ref="(el) => setCellInputRef(deal.ID, 'UF_CRM_1744096783472', el)"
                        v-model="editingCell.draft"
                        type="date"
                        class="cell-editor__input"
                        :disabled="isCellSaving(deal.ID, 'UF_CRM_1744096783472')"
                        @keydown.enter.prevent="commitCellEdit(deal)"
                        @keydown.esc.prevent="cancelCellEdit"
                        @blur="commitCellEdit(deal)"
                      >
                    </div>
                    <button
                      v-else
                      type="button"
                      class="editable-cell"
                      title="Нажмите, чтобы изменить"
                      @click="startCellEdit(deal, 'UF_CRM_1744096783472')"
                    >
                      {{ formatDateValue(deal.UF_CRM_1744096783472) }}
                    </button>
                  </td>
                  <td>
                    <div
                      v-if="isEditingCell(deal.ID, 'UF_CRM_1744096312349')"
                      class="cell-editor"
                    >
                      <input
                        :ref="(el) => setCellInputRef(deal.ID, 'UF_CRM_1744096312349', el)"
                        v-model="editingCell.draft"
                        type="text"
                        inputmode="decimal"
                        class="cell-editor__input"
                        :disabled="isCellSaving(deal.ID, 'UF_CRM_1744096312349')"
                        @keydown.enter.prevent="commitCellEdit(deal)"
                        @keydown.esc.prevent="cancelCellEdit"
                        @blur="commitCellEdit(deal)"
                      >
                    </div>
                    <button
                      v-else
                      type="button"
                      class="editable-cell"
                      title="Нажмите, чтобы изменить"
                      @click="startCellEdit(deal, 'UF_CRM_1744096312349')"
                    >
                      {{ formatPlainOrDash(deal.UF_CRM_1744096312349) }}
                    </button>
                  </td>
                  <td>
                    <div
                      v-if="isEditingCell(deal.ID, 'UF_CRM_1755788950300')"
                      class="cell-editor"
                    >
                      <input
                        :ref="(el) => setCellInputRef(deal.ID, 'UF_CRM_1755788950300', el)"
                        v-model="editingCell.draft"
                        type="text"
                        class="cell-editor__input"
                        :disabled="isCellSaving(deal.ID, 'UF_CRM_1755788950300')"
                        @keydown.enter.prevent="commitCellEdit(deal)"
                        @keydown.esc.prevent="cancelCellEdit"
                        @blur="commitCellEdit(deal)"
                      >
                    </div>
                    <button
                      v-else
                      type="button"
                      class="editable-cell"
                      title="Нажмите, чтобы изменить"
                      @click="startCellEdit(deal, 'UF_CRM_1755788950300')"
                    >
                      {{ formatPlainOrDash(deal.UF_CRM_1755788950300) }}
                    </button>
                  </td>
                  <td class="col-linked-spa">
                    <div class="linked-spa-cell">
                      <div class="linked-spa-cell__list">
                        <button
                          v-for="option in getExtraOptions(deal)"
                          :key="option.id"
                          type="button"
                          class="linked-spa-chip"
                          :title="option.title"
                          @click="openExtraOption(deal, option.id)"
                        >
                          {{ option.title }}
                        </button>
                        <span
                          v-if="extraOptionsLoading && !getExtraOptions(deal).length"
                          class="linked-spa-cell__loading"
                        >
                          …
                        </span>
                      </div>
                      <button
                        type="button"
                        class="linked-spa-add"
                        title="Добавить доп. опцию"
                        @click="openCreateExtraOption(deal)"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td class="col-linked-spa">
                    <div class="linked-spa-cell">
                      <div class="linked-spa-cell__list">
                        <button
                          v-for="item in getCommerceItems(deal)"
                          :key="item.id"
                          type="button"
                          class="linked-spa-chip"
                          :class="item.isAlert ? 'linked-spa-chip--danger' : 'linked-spa-chip--ok'"
                          :title="item.title"
                          @click="openCommerceItem(deal, item.id)"
                        >
                          {{ item.title }}
                        </button>
                        <span
                          v-if="commerceLoading && !getCommerceItems(deal).length"
                          class="linked-spa-cell__loading"
                        >
                          …
                        </span>
                      </div>
                      <button
                        type="button"
                        class="linked-spa-add"
                        title="Добавить коммерцию"
                        @click="openCreateCommerce(deal)"
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="event-deals-pagination">
            <div class="event-deals-pagination__info">
              Показано {{ rangeLabel }} из {{ filteredDeals.length }}
            </div>
            <div class="event-deals-pagination__pages">
              <button
                type="button"
                class="page-btn"
                :disabled="page <= 1"
                @click="page -= 1"
              >
                ‹
              </button>
              <button
                v-for="pageNumber in visiblePages"
                :key="pageNumber"
                type="button"
                class="page-btn"
                :class="{ 'page-btn--active': pageNumber === page }"
                @click="page = pageNumber"
              >
                {{ pageNumber }}
              </button>
              <button
                type="button"
                class="page-btn"
                :disabled="page >= totalPages"
                @click="page += 1"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <Teleport to="body">
      <v-dialog
        v-model="requiredFieldsDialog.open"
        max-width="560"
        persistent
        :z-index="4500"
        :retain-focus="false"
        class="required-fields-dialog-overlay"
        content-class="required-fields-dialog-content"
      >
        <v-card class="required-fields-dialog">
          <v-card-title class="required-fields-dialog__title">
            Обязательные поля
          </v-card-title>
          <v-card-subtitle
            v-if="requiredFieldsDialog.stageLabel"
            class="required-fields-dialog__subtitle"
          >
            Для перехода на стадию «{{ requiredFieldsDialog.stageLabel }}»
          </v-card-subtitle>

          <v-card-text class="required-fields-dialog__body">
            <div v-if="requiredFieldsDialog.loading" class="required-fields-dialog__loading">
              <v-progress-circular indeterminate color="primary" size="28" />
              <span>Проверяем обязательные поля...</span>
            </div>

            <template v-else>
              <v-alert
                v-if="requiredFieldsDialog.error"
                type="error"
                variant="tonal"
                class="mb-3"
              >
                {{ requiredFieldsDialog.error }}
              </v-alert>

              <div class="required-fields-dialog__form">
                <div
                  v-for="field in requiredFieldsDialog.fields"
                  :key="field.name"
                  class="required-fields-dialog__field"
                  :class="{ 'required-fields-dialog__field--invalid': isRequiredFieldInvalid(field.name) }"
                >
                <label class="required-fields-dialog__label">
                  {{ field.title }}
                  <span class="required-fields-dialog__asterisk">*</span>
                </label>

                <RequiredFieldAutocomplete
                  v-if="field.type === 'enumeration'"
                  class="required-fields-dialog__autocomplete"
                  :model-value="requiredFieldsDialog.values[field.name]"
                  :items="field.options || []"
                  item-title="title"
                  item-value="value"
                  :multiple="field.multiple"
                  placeholder="Выберите значение"
                  no-data-text="Нет вариантов"
                  :disabled="requiredFieldsDialog.saving"
                  :invalid="isRequiredFieldInvalid(field.name)"
                  @update:model-value="(value) => setRequiredFieldValue(field.name, value)"
                />

                <div
                  v-else-if="field.type === 'crm_status'"
                  class="required-fields-dialog__status"
                >
                  <RequiredFieldAutocomplete
                    class="required-fields-dialog__autocomplete"
                    :model-value="requiredFieldsDialog.values[field.name]"
                    :items="requiredDialogStatusOptions"
                    item-title="title"
                    item-value="id"
                    placeholder="Выберите статус"
                    no-data-text="Нет статусов"
                    :loading="participationStatusesLoading"
                    :disabled="requiredFieldsDialog.saving"
                    :invalid="isRequiredFieldInvalid(field.name)"
                    @open="reloadRequiredStatusOptions"
                    @focus="reloadRequiredStatusOptions"
                    @update:model-value="(value) => setRequiredFieldValue(field.name, value)"
                  />
                  <button
                    type="button"
                    class="linked-spa-add"
                    title="Добавить статус участия"
                    :disabled="requiredFieldsDialog.saving"
                    @click="openCreateParticipationStatus(requiredFieldsDialog.deal)"
                  >
                    +
                  </button>
                </div>

                <RequiredFieldAutocomplete
                  v-else-if="field.type === 'crm_contact'"
                  class="required-fields-dialog__autocomplete"
                  :model-value="requiredFieldsDialog.values[field.name]"
                  :items="requiredDialogContactOptions"
                  item-title="title"
                  item-value="id"
                  placeholder="Выберите доверенное лицо"
                  no-data-text="Нет контактов у сделки"
                  :loading="contactsLoading"
                  :disabled="requiredFieldsDialog.saving"
                  :invalid="isRequiredFieldInvalid(field.name)"
                  @open="reloadRequiredContactOptions"
                  @focus="reloadRequiredContactOptions"
                  @update:model-value="(value) => setRequiredFieldValue(field.name, value)"
                />

                <v-textarea
                  v-else-if="field.type === 'text'"
                  :model-value="requiredFieldsDialog.values[field.name]"
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                  hide-details="auto"
                  :disabled="requiredFieldsDialog.saving"
                  :error="isRequiredFieldInvalid(field.name)"
                  @update:model-value="(value) => setRequiredFieldValue(field.name, value)"
                />

                <v-checkbox
                  v-else-if="field.type === 'boolean'"
                  :model-value="requiredFieldsDialog.values[field.name]"
                  :true-value="'Y'"
                  :false-value="'N'"
                  hide-details
                  density="compact"
                  :disabled="requiredFieldsDialog.saving"
                  label="Да"
                  @update:model-value="(value) => setRequiredFieldValue(field.name, value)"
                />

                <v-text-field
                  v-else-if="field.type === 'date' || field.type === 'datetime'"
                  :model-value="requiredFieldsDialog.values[field.name]"
                  :type="field.type === 'datetime' ? 'datetime-local' : 'date'"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :disabled="requiredFieldsDialog.saving"
                  :error="isRequiredFieldInvalid(field.name)"
                  @update:model-value="(value) => setRequiredFieldValue(field.name, value)"
                />

                <v-text-field
                  v-else
                  :model-value="requiredFieldsDialog.values[field.name]"
                  :type="['integer', 'double', 'money'].includes(field.type) ? 'text' : 'text'"
                  :inputmode="['integer', 'double', 'money'].includes(field.type) ? 'decimal' : 'text'"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :disabled="requiredFieldsDialog.saving"
                  :error="isRequiredFieldInvalid(field.name)"
                  @update:model-value="(value) => setRequiredFieldValue(field.name, value)"
                />
              </div>
              </div>
            </template>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              :disabled="requiredFieldsDialog.saving"
              @click="closeRequiredFieldsDialog"
            >
              Отмена
            </v-btn>
            <div
              class="required-fields-dialog__submit-wrap"
              @click="onRequiredSubmitClick"
            >
              <v-btn
                color="primary"
                :loading="requiredFieldsDialog.saving"
                :disabled="requiredFieldsDialog.loading || !requiredFieldsDialog.fields.length || requiredFieldsDialog.saving"
                :class="{ 'required-fields-dialog__submit--blocked': !areRequiredFieldsComplete }"
                @click.stop="onRequiredSubmitClick"
              >
                Сохранить и сменить стадию
              </v-btn>
            </div>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </Teleport>

    <v-dialog
      v-model="refusalDialog.open"
      max-width="480"
      persistent
      :z-index="3200"
      class="refusal-dialog-overlay"
      content-class="refusal-dialog-content"
    >
      <v-card class="refusal-dialog">
        <v-card-title class="refusal-dialog__title">
          Выбор причины отказа
        </v-card-title>
        <v-card-text class="refusal-dialog__body">
          <div class="refusal-dialog__list" role="radiogroup" aria-label="Причина отказа">
            <label
              v-for="option in REFUSAL_STAGE_OPTIONS"
              :key="option.value"
              class="refusal-dialog__option"
              :class="{ 'refusal-dialog__option--selected': refusalDialog.selectedStageId === option.value }"
            >
              <input
                v-model="refusalDialog.selectedStageId"
                type="radio"
                class="refusal-dialog__radio"
                name="refusal-stage"
                :value="option.value"
                :disabled="refusalDialog.saving"
              >
              <span class="refusal-dialog__option-label">{{ option.label }}</span>
            </label>
          </div>
        </v-card-text>
        <v-card-actions class="refusal-dialog__actions">
          <button
            type="button"
            class="refusal-dialog__save"
            :disabled="refusalDialog.saving || !refusalDialog.selectedStageId"
            @click="submitRefusalDialog"
          >
            {{ refusalDialog.saving ? 'Сохранение…' : 'Сохранить' }}
          </button>
          <button
            type="button"
            class="refusal-dialog__cancel"
            :disabled="refusalDialog.saving"
            @click="closeRefusalDialog"
          >
            Отменить
          </button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="commentDialog.open"
      max-width="520"
      persistent
      :z-index="3200"
      class="comment-dialog-overlay"
      content-class="comment-dialog-content"
    >
      <v-card class="comment-dialog">
        <v-card-title class="comment-dialog__title">
          Комментарий
        </v-card-title>
        <v-card-subtitle
          v-if="commentDialog.dealTitle"
          class="comment-dialog__subtitle"
        >
          {{ commentDialog.dealTitle }}
        </v-card-subtitle>
        <v-card-text class="comment-dialog__body">
          <v-textarea
            v-model="commentDialog.draft"
            variant="outlined"
            density="comfortable"
            rows="8"
            auto-grow
            hide-details="auto"
            placeholder="Текст комментария"
            :disabled="commentDialog.saving"
          />
        </v-card-text>
        <v-card-actions class="comment-dialog__actions">
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="commentDialog.saving"
            @click="closeCommentDialog"
          >
            Отмена
          </v-btn>
          <v-btn
            color="primary"
            :loading="commentDialog.saving"
            @click="submitCommentDialog"
          >
            Сохранить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <AudienceSegmentationDialog
      v-model="audienceDialog.open"
      :deal-id="audienceDialog.dealId"
      :deal-title="audienceDialog.dealTitle"
      :trusted-person-id="audienceDialog.trustedPersonId"
      @trusted-person-updated="handleAudienceTrustedPersonUpdated"
      @update:model-value="handleAudienceDialogToggle"
    />
  </v-dialog>

  <ChecklistTypeDialog
    v-model="checklistTypeDialog.open"
    :z-index="4500"
    @select="createEventChecklistOfType"
  />
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { callApi, callBxMethod, callBatch, callBatchCommands } from '../functions/callApi'
import { resolveDealMetricContribution, resolveDealReportSum } from '../functions/eventReportMetrics'
import AudienceSegmentationDialog from './AudienceSegmentationDialog.vue'
import AppZoomSlider from './AppZoomSlider.vue'
import ChecklistTypeDialog from './ChecklistTypeDialog.vue'
import { useAppZoom } from '../composables/useAppZoom'
import RequiredFieldAutocomplete from './RequiredFieldAutocomplete.vue'
import {
  AGREEMENT_STAGES,
  BASE_STAGES,
  CALL_STAGES,
  DEAL_STAGE_OPTIONS,
  FINAL_SUM_FIELD,
  getRequiredFieldNamesForStage,
  getStageOption,
  MAILING_STAGES,
  PARTICIPATION_STATUS_FIELD,
  POTENTIAL_STAGES,
  PRELIMINARY_SUM_FIELD,
  REFUSAL_STAGE_OPTIONS,
  REFUSAL_STAGES,
  SQM_FIELD,
  STAGE_BAR_SEGMENTS,
  SUCCESS_STAGES,
  TRANSFERRED_STAGE_ID,
  TRANSFERRED_STAGES,
  TRUSTED_PERSON_FIELD,
} from '../domain/dealStages'
import {
  buildCrmItemUpdatePayload,
  buildInputValue,
  COMMENT_FIELD,
  DEAL_CONTACTS_FIELD,
  isEmptyFieldValue,
  LAST_CALL_DATE_FIELD,
  NEVER_REQUIRED_FIELDS,
  normalizeIdList,
  normalizeMoneyInput,
  serializeRequiredFieldValue,
  STAND_NUMBER_FIELD,
  toDateInputValue,
  TRANSFER_DATE_FIELD,
} from '../domain/dealFields'
import { getHostViewportSize } from '../domain/dialogViewport'
import {
  buildEventChecklistCreatePath,
  buildEventChecklistDetailsPath,
  buildEventChecklistProgress,
  EVENT_CHECKLIST_ENTITY_TYPE_ID,
} from '../domain/eventChecklist'
import { loadEventChecklistForEvent } from '../functions/loadEventChecklist'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  event: { type: Object, default: null },
  deals: { type: Array, default: () => [] },
  eventMetrics: { type: Object, default: null },
  userProfiles: { type: Object, default: () => ({}) },
  refreshing: { type: Boolean, default: false },
  scienceExporting: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:modelValue',
  'precise-deal',
  'mass-generation',
  'create-company',
  'send-mailing',
  'welcome-mailing',
  'export-excel',
  'export-science',
  'stage-updated',
  'field-updated',
  'refresh',
])

const { zoomStyle } = useAppZoom()

const EXTRA_OPTIONS_ENTITY_TYPE_ID = 1056
const COMMERCE_ENTITY_TYPE_ID = 1060
const COMMERCE_ALERT_FIELD = 'ufCrm42_1756818192879'
const COMMERCE_ALERT_FIELD_UF = 'UF_CRM_42_1756818192879'
const PARTICIPATION_STATUS_ENTITY_TYPE_ID = 1080
const DEAL_ENTITY_TYPE_ID = 2

const eventChecklist = ref(buildEventChecklistProgress(null))
const eventChecklistLoading = ref(false)
const checklistTypeDialog = ref({ open: false })
const SEARCH_DEBOUNCE_MS = 350
const searchInput = ref('')
const debouncedSearchQuery = ref('')
let searchDebounceTimer = null
const activeFilter = ref('all')
const activeCommerceFilter = ref(null) // 'collected' | 'remaining' | null
const COMMERCE_COLLECTED_FIELD = 'UF_CRM_38_1756819315'
const COMMERCE_REMAINING_FIELD = 'UF_CRM_38_1756819226'
const COMMERCE_COLLECTED_FIELD_CAMEL = 'ufCrm38_1756819315'
const COMMERCE_REMAINING_FIELD_CAMEL = 'ufCrm38_1756819226'
const commerceCollectedDealIds = ref([])
const commerceRemainingDealIds = ref([])
const commerceCollectedSpaCount = ref(0)
const commerceRemainingSpaCount = ref(0)
const commerceFilterLoading = ref(false)
const page = ref(1)
const selectedDealIds = ref([])
const openActionMenu = ref(null)
const openMedicalCatalogDealId = ref(null)
const savingStageDealId = ref(null)
const failedAvatars = ref(new Set())
const editingCell = ref({
  dealId: null,
  field: null,
  draft: '',
  original: '',
})
const savingCell = ref({
  dealId: null,
  field: null,
})
const isCommittingCell = ref(false)
const cellInputRefs = ref({})
const dealUserFieldsCache = ref(null)
const requiredFieldsDialog = ref({
  open: false,
  loading: false,
  saving: false,
  error: '',
  deal: null,
  stageId: null,
  stageLabel: '',
  fields: [],
  values: {},
})
const requiredDialogStatusOptions = ref([])
const requiredDialogContactOptions = ref([])
const requiredFieldsInvalidNames = ref([])
let dialogHostViewport = null
let dialogResizeToken = 0
const refusalDialog = ref({
  open: false,
  saving: false,
  deal: null,
  selectedStageId: null,
})
const commentDialog = ref({
  open: false,
  saving: false,
  deal: null,
  dealTitle: '',
  draft: '',
  original: '',
})
const extraOptionsByDealId = ref({})
const extraOptionsLoading = ref(false)
const commerceByDealId = ref({})
const commerceLoading = ref(false)
const audienceDialog = ref({
  open: false,
  dealId: null,
  dealTitle: '',
  trustedPersonId: null,
})
const contactsById = ref({})
const contactsRevision = ref(0)
const contactsLoading = ref(false)
const contactsLoadingDealIds = ref(new Set())
const companyContactsLoadedDealIds = ref(new Set())
const isContactsBootstrapLoading = ref(false)
let contactsBootstrapToken = 0
const savingTrustedPersonDealId = ref(null)
const participationStatusOptions = ref([])
const participationStatusesLoading = ref(false)
const savingParticipationStatusDealId = ref(null)
const pageSize = 100

const MONEY_FIELDS = new Set([PRELIMINARY_SUM_FIELD, FINAL_SUM_FIELD, 'UF_CRM_1745222013992'])
const DATE_FIELDS = new Set([TRANSFER_DATE_FIELD, LAST_CALL_DATE_FIELD])
const NUMBER_FIELDS = new Set([SQM_FIELD])
const TEXT_FIELDS = new Set([STAND_NUMBER_FIELD, COMMENT_FIELD])
const EDITABLE_FIELDS = new Set([
  ...MONEY_FIELDS,
  ...DATE_FIELDS,
  ...NUMBER_FIELDS,
  ...TEXT_FIELDS,
])

const eventTitle = computed(() => props.event?.title || props.event?.event || 'Мероприятие')
const eventCity = computed(() => String(props.event?.city || '').trim())
const eventSubtitle = computed(() => {
  const value = props.event?.description
    || props.event?.ufCrm38Description
    || props.event?.subtitle
  return value ? String(value).trim() : ''
})

const eventDateLabel = computed(() => {
  const start = props.event?.ufCrm38_1745307580193 || props.event?.start
  const end = props.event?.ufCrm38_1751875905992
  if (!start && !end) return ''
  if (typeof start === 'string' && start.includes(' - ')) return start
  const startLabel = formatDateValue(start)
  const endLabel = formatDateValue(end)
  if (startLabel && endLabel) return `${startLabel}  —  ${endLabel}`
  return startLabel || endLabel
})

const eventChecklistBarClass = computed(() => {
  const value = eventChecklist.value.percent
  if (value <= 40) return 'event-checklist__fill--red'
  if (value <= 74) return 'event-checklist__fill--orange'
  return 'event-checklist__fill--green'
})

const eventPercentValue = computed(() => {
  const value = Number(props.eventMetrics?.percent)
  return Number.isFinite(value) ? Math.max(0, value) : 0
})

const percentBarPlanWidth = computed(() => {
  const percent = eventPercentValue.value
  if (percent <= 0) return 0
  if (percent <= 100) return percent
  return (100 / percent) * 100
})

const percentBarOverWidth = computed(() => {
  const percent = eventPercentValue.value
  if (percent <= 100) return 0
  return ((percent - 100) / percent) * 100
})

const percentBarOverLabel = computed(() => {
  const percent = eventPercentValue.value
  if (percent <= 100) return ''
  const over = Math.round((percent - 100) * 100) / 100
  return `+${over}%`
})

const isDialogLoading = computed(() => (
  props.refreshing || isContactsBootstrapLoading.value
))

function resolveEventId() {
  return props.event?.id
    ?? props.event?.ID
    ?? props.event?.UF_CRM_1742797326
    ?? null
}

async function loadEventChecklist() {
  const eventId = resolveEventId()
  if (!eventId) {
    eventChecklist.value = buildEventChecklistProgress(null)
    return
  }

  eventChecklistLoading.value = true
  try {
    eventChecklist.value = await loadEventChecklistForEvent(eventId)
  } catch (error) {
    console.error('Ошибка загрузки чек-листа мероприятия:', error)
    eventChecklist.value = buildEventChecklistProgress(null)
  } finally {
    eventChecklistLoading.value = false
  }
}

function openEventChecklistItem() {
  const itemId = eventChecklist.value.itemId
  if (!itemId) return
  openBitrixSlider(
    buildEventChecklistDetailsPath(
      itemId,
      eventChecklist.value.entityTypeId || EVENT_CHECKLIST_ENTITY_TYPE_ID,
    ),
    () => {
      loadEventChecklist()
    },
  )
}

function openCreateEventChecklist() {
  if (!resolveEventId()) return
  checklistTypeDialog.value.open = true
}

function createEventChecklistOfType(entityTypeId) {
  const eventId = resolveEventId()
  if (!eventId) return
  openBitrixSlider(
    buildEventChecklistCreatePath(eventId, entityTypeId),
    () => {
      loadEventChecklist()
    },
  )
}

function closeDialog() {
  emit('update:modelValue', false)
}

function toggleActionMenu(menuId) {
  openActionMenu.value = openActionMenu.value === menuId ? null : menuId
}

function emitAction(eventName) {
  openActionMenu.value = null
  emit(eventName)
}

function onDocumentClick() {
  openActionMenu.value = null
  openMedicalCatalogDealId.value = null
}

function isMedicalCatalogMenuOpen(dealId) {
  return openMedicalCatalogDealId.value != null && String(openMedicalCatalogDealId.value) === String(dealId)
}

function toggleMedicalCatalogMenu(deal) {
  const dealId = deal?.ID
  if (dealId == null) return
  openMedicalCatalogDealId.value = isMedicalCatalogMenuOpen(dealId) ? null : dealId
}

const MEDICATION_CATALOG_PATH = '/page/spravochniki/pgirfw/type/189/'
const EQUIPMENT_CATALOG_PATH = '/page/spravochniki/oborudovanie/type/1104/details/'

function buildCompanyCatalogPath(basePath, companyId, companyTitle) {
  if (!companyId) return basePath

  const params = new URLSearchParams()
  params.set('apply_filter', 'Y')
  params.set('COMPANY_ID', String(companyId))
  if (companyTitle) {
    params.set('COMPANY_ID_label', String(companyTitle))
  }
  return `${basePath}?${params.toString()}`
}

async function openMedicalCatalog(deal, type) {
  openMedicalCatalogDealId.value = null
  if (!deal?.ID) return

  await resolveDealsCompanyIds([deal])
  const companyId = deal.COMPANY_ID || deal.companyId || normalizeIdList(deal.COMPANY_IDS)[0] || null
  const basePath = type === 'equipment' ? EQUIPMENT_CATALOG_PATH : MEDICATION_CATALOG_PATH
  const path = buildCompanyCatalogPath(basePath, companyId, companyName(deal))

  if ((window as any).BX24?.openPath) {
    (window as any).BX24.openPath(path, true)
    return
  }

  const domain = (window as any).BX24?.getAuth?.()?.domain
  const origin = domain ? `https://${domain}` : window.location.origin
  window.open(`${origin}${path}`, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

function companyName(deal) {
  return deal?.UF_CRM_1744890618774 || deal?.TITLE || `Сделка #${deal?.ID || ''}`
}

function getResponsibleUserId(deal) {
  return deal?.user || null
}

function getResponsibleName(deal) {
  const userId = getResponsibleUserId(deal)
  if (userId) {
    return props.userProfiles[String(userId)]?.name || deal?.ASSIGNED_BY_ID || ''
  }
  return deal?.ASSIGNED_BY_ID || ''
}

function getResponsiblePhoto(deal) {
  const userId = getResponsibleUserId(deal)
  if (!userId) return ''
  const url = props.userProfiles[String(userId)]?.photo || ''
  if (!url || failedAvatars.value.has(url)) return ''
  return url
}

function markAvatarFailed(url) {
  if (!url) return
  failedAvatars.value = new Set([...failedAvatars.value, url])
}

function getUserInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function openUserProfile(userId) {
  if (!userId) return
  const path = `/company/personal/user/${userId}/`
  if ((window as any).BX24?.openPath) {
    (window as any).BX24.openPath(path, true)
    return
  }
  const domain = (window as any).BX24?.getAuth?.()?.domain
  const origin = domain ? `https://${domain}` : window.location.origin
  window.open(`${origin}${path}`, '_blank', 'noopener,noreferrer')
}


function stageLabel(deal) {
  return getStageOption(deal?.STAGE_ID)?.label || deal?.stage || deal?.status || '—'
}

function getStageBarIndex(stageId) {
  if (!stageId) return -1
  if (REFUSAL_STAGES.includes(stageId)) {
    return STAGE_BAR_SEGMENTS.findIndex((segment) => segment.isRefusal)
  }
  return STAGE_BAR_SEGMENTS.findIndex((segment) => segment.value === stageId)
}

function isRefusalDeal(deal) {
  return REFUSAL_STAGES.includes(deal?.STAGE_ID)
}

function isSuccessDeal(deal) {
  return SUCCESS_STAGES.includes(deal?.STAGE_ID)
}

function isStageBarSegmentFilled(deal, segmentIndex) {
  const segment = STAGE_BAR_SEGMENTS[segmentIndex]
  // «Отказ» — только на отказных стадиях
  if (segment?.isRefusal) return isRefusalDeal(deal)

  const currentIndex = getStageBarIndex(deal?.STAGE_ID)
  if (currentIndex < 0) return false

  // На отказе заливаем все сегменты до отказа включительно
  if (isRefusalDeal(deal)) return true

  // Иначе только до текущей стадии (Передано ≠ Мероприятие завершено)
  return segmentIndex <= currentIndex
}

function isStageBarSegmentCurrent(deal, segment) {
  if (segment?.isRefusal) return isRefusalDeal(deal)
  return deal?.STAGE_ID === segment?.value
}

function onStageBarClick(segment, deal) {
  if (!deal?.ID || !segment || isStageSaving(deal.ID)) return
  if (segment.isRefusal) {
    openRefusalDialog(deal)
    return
  }
  updateDealStage(segment.value, deal)
}

function openRefusalDialog(deal) {
  if (!deal?.ID) return
  const current = REFUSAL_STAGES.includes(deal.STAGE_ID) ? deal.STAGE_ID : null
  refusalDialog.value = {
    open: true,
    saving: false,
    deal,
    selectedStageId: current || REFUSAL_STAGE_OPTIONS[0]?.value || null,
  }
}

function closeRefusalDialog() {
  if (refusalDialog.value.saving) return
  refusalDialog.value = {
    open: false,
    saving: false,
    deal: null,
    selectedStageId: null,
  }
}

function openCommentDialog(deal) {
  if (!deal?.ID) return
  const raw = deal[COMMENT_FIELD] == null ? '' : String(deal[COMMENT_FIELD])
  const value = formatCommentText(raw)
  commentDialog.value = {
    open: true,
    saving: false,
    deal,
    dealTitle: companyName(deal),
    draft: value,
    original: value,
  }
}

function closeCommentDialog() {
  if (commentDialog.value.saving) return
  commentDialog.value = {
    open: false,
    saving: false,
    deal: null,
    dealTitle: '',
    draft: '',
    original: '',
  }
}

async function submitCommentDialog() {
  const dialog = commentDialog.value
  const deal = dialog.deal
  if (!deal?.ID || dialog.saving) return

  const nextValue = String(dialog.draft ?? '')
  if (nextValue === String(dialog.original ?? '')) {
    closeCommentDialog()
    return
  }

  dialog.saving = true
  try {
    await updateDealFields(deal.ID, { [COMMENT_FIELD]: nextValue })
    deal[COMMENT_FIELD] = nextValue
    emit('field-updated', {
      dealId: deal.ID,
      field: COMMENT_FIELD,
      value: nextValue,
    })
    dialog.saving = false
    closeCommentDialog()
  } catch (error) {
    console.error('Ошибка сохранения комментария:', error)
    dialog.saving = false
  }
}

async function submitRefusalDialog() {
  const dialog = refusalDialog.value
  const deal = dialog.deal
  const stageId = dialog.selectedStageId
  if (!deal?.ID || !stageId || dialog.saving) return

  dialog.saving = true
  try {
    await updateDealStage(stageId, deal)
  } finally {
    dialog.saving = false
    closeRefusalDialog()
  }
}

function stageClassByStageId(stageId) {
  return stageBadgeClass({
    STAGE_ID: stageId,
    stage: getStageOption(stageId)?.label || '',
    status: '',
  })
}

function stageBadgeClass(deal) {
  if (REFUSAL_STAGES.includes(deal?.STAGE_ID)) return 'stage-badge--danger'
  if (BASE_STAGES.includes(deal?.STAGE_ID)) return 'stage-badge--sky-light'
  if (MAILING_STAGES.includes(deal?.STAGE_ID)) return 'stage-badge--sky-light'
  if (CALL_STAGES.includes(deal?.STAGE_ID)) return 'stage-badge--sky-light'
  if (deal?.STAGE_ID === 'C32:UC_VJZ0FL' || deal?.STAGE_ID === 'C32:UC_5BBXZ5') {
    return 'stage-badge--warm'
  }
  if (AGREEMENT_STAGES.includes(deal?.STAGE_ID)) return 'stage-badge--sky-strong'
  if (POTENTIAL_STAGES.includes(deal?.STAGE_ID)) return 'stage-badge--sky-strong'
  if (TRANSFERRED_STAGES.includes(deal?.STAGE_ID) || deal?.STAGE_ID === 'C32:WON') {
    return 'stage-badge--green'
  }
  return 'stage-badge--neutral'
}

function formatMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) {
    if (value === 0 || value === '0') {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
      }).format(0)
    }
  }
  if (!Number.isFinite(number)) return '—'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(number)
}

function formatMoneyOrDash(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) return '—'
  return formatMoney(number)
}

function formatEventPercent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return `${Math.round(number * 100) / 100}%`
}

function formatOverMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) return '—'
  return formatMoney(number)
}

function formatPlainOrDash(value) {
  if (value == null || value === '') return '—'
  const text = String(value).trim()
  return text || '—'
}

/** Убирает BB-code / HTML-теги из комментария для отображения */
function formatCommentText(value) {
  if (value == null || value === '') return ''
  return String(value)
    // [URL=...]text[/URL] / [URL]text[/URL] → text
    .replace(/\[url(?:\s*=\s*[^\]]+)?\](.*?)\[\/url\]/gis, '$1')
    // [USER=id]Name[/USER] → Name
    .replace(/\[user(?:\s*=\s*[^\]]+)?\](.*?)\[\/user\]/gis, '$1')
    // Прочие BB-теги: [B], [/B], [COLOR=#fff], [P], [*] и т.п.
    .replace(/\[\/?[^\]]+\]/g, '')
    // HTML-теги на случай смешанного контента
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function formatCommentOrDash(value) {
  const text = formatCommentText(value)
  return text || '—'
}

function formatDateValue(value) {
  if (!value) return '—'
  if (typeof value === 'string' && /^\d{2}\.\d{2}\.\d{4}/.test(value)) {
    return value.split(' ')[0]
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function isStageSaving(dealId) {
  return String(savingStageDealId.value || '') === String(dealId)
}

function cellKey(dealId, field) {
  return `${dealId}:${field}`
}

function setCellInputRef(dealId, field, el) {
  const key = cellKey(dealId, field)
  if (el) cellInputRefs.value[key] = el
  else delete cellInputRefs.value[key]
}

function isEditingCell(dealId, field) {
  return String(editingCell.value.dealId || '') === String(dealId)
    && editingCell.value.field === field
}

function isCellSaving(dealId, field) {
  return String(savingCell.value.dealId || '') === String(dealId)
    && savingCell.value.field === field
}



function getCellDraftValue(deal, field) {
  if (MONEY_FIELDS.has(field)) return normalizeMoneyInput(deal?.[field])
  if (DATE_FIELDS.has(field)) return toDateInputValue(deal?.[field])
  if (NUMBER_FIELDS.has(field)) {
    const value = deal?.[field]
    if (value == null || value === '') return ''
    return String(value).replace(/\s/g, '').replace(',', '.')
  }
  if (TEXT_FIELDS.has(field)) {
    return deal?.[field] == null ? '' : String(deal[field])
  }
  return deal?.[field] == null ? '' : String(deal[field])
}

function parseCellValue(field, draft) {
  if (MONEY_FIELDS.has(field)) {
    const normalized = normalizeMoneyInput(draft)
    if (normalized === '') return { localValue: 0, remoteValue: '0|RUB' }
    const number = Number(normalized)
    if (!Number.isFinite(number)) {
      throw new Error('Введите корректную сумму')
    }
    return {
      localValue: number,
      remoteValue: `${number}|RUB`,
    }
  }

  if (NUMBER_FIELDS.has(field)) {
    const normalized = String(draft || '').trim().replace(/\s/g, '').replace(',', '.')
    if (normalized === '') return { localValue: '', remoteValue: '' }
    const number = Number(normalized)
    if (!Number.isFinite(number)) {
      throw new Error('Введите корректное число')
    }
    return {
      localValue: number,
      remoteValue: number,
    }
  }

  if (DATE_FIELDS.has(field)) {
    const value = String(draft || '').trim()
    if (!value) return { localValue: '', remoteValue: '' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error('Введите корректную дату')
    }
    return { localValue: value, remoteValue: value }
  }

  if (TEXT_FIELDS.has(field)) {
    const value = String(draft || '').trim()
    return { localValue: value, remoteValue: value }
  }

  throw new Error('Поле недоступно для редактирования')
}

async function startCellEdit(deal, field) {
  if (!deal?.ID || !EDITABLE_FIELDS.has(field)) return
  if (isCellSaving(deal.ID, field) || isStageSaving(deal.ID)) return

  const draft = getCellDraftValue(deal, field)
  editingCell.value = {
    dealId: String(deal.ID),
    field,
    draft,
    original: draft,
  }

  await nextTick()
  const input = cellInputRefs.value[cellKey(deal.ID, field)]
  if (input) {
    input.focus()
    if (typeof input.select === 'function' && input.type !== 'date') {
      input.select()
    }
  }
}

function cancelCellEdit() {
  if (savingCell.value.dealId) return
  editingCell.value = {
    dealId: null,
    field: null,
    draft: '',
    original: '',
  }
}

async function updateDealFields(dealId, fields) {
  await callBxMethod('crm.deal.update', {
    id: dealId,
    fields,
  })
}

async function updateDealItemFields(dealId, fields) {
  await callBxMethod('crm.item.update', {
    entityTypeId: DEAL_ENTITY_TYPE_ID,
    id: dealId,
    useOriginalUfNames: 'Y',
    fields: buildCrmItemUpdatePayload(fields),
  })
}


function settingsMentionsStage(settings, stageId) {
  if (!settings || stageId == null) return false
  const target = String(stageId)
  const candidateKeys = [
    'REQUIRED_STAGES',
    'requiredStages',
    'STAGE_ID',
    'stageId',
    'stages',
    'STAGES',
    'stageIds',
  ]

  for (const key of candidateKeys) {
    const value = settings[key]
    if (value == null) continue
    const list = Array.isArray(value) ? value : [value]
    if (list.some((item) => String(item) === target)) return true
  }

  return false
}

function getUserFieldTitle(field) {
  return field?.EDIT_FORM_LABEL
    || field?.LIST_COLUMN_LABEL
    || field?.LIST_FILTER_LABEL
    || field?.FIELD_NAME
    || 'Поле'
}

function normalizeUserFieldMeta(field) {
  const type = field?.USER_TYPE_ID || 'string'
  const list = Array.isArray(field?.LIST)
    ? field.LIST
    : (Array.isArray(field?.list) ? field.list : [])
  const options = list.map((item) => ({
    value: item.ID ?? item.id ?? item.VALUE ?? item.value,
    title: item.VALUE ?? item.value ?? item.NAME ?? item.title ?? String(item.ID ?? item.id ?? ''),
  })).filter((item) => item.value != null && item.value !== '')

  return {
    name: field.FIELD_NAME,
    title: getUserFieldTitle(field),
    type,
    multiple: field.MULTIPLE === 'Y',
    options,
    settings: field.SETTINGS || {},
    mandatory: field.MANDATORY === 'Y',
    userFieldId: field.ID ?? field.id ?? null,
  }
}

async function loadDealUserFields() {
  if (Array.isArray(dealUserFieldsCache.value)) {
    return dealUserFieldsCache.value
  }

  const result = await callBxMethod('crm.deal.userfield.list', {
    order: { SORT: 'ASC', ID: 'ASC' },
    filter: { LANG: 'ru' },
  })

  const list = Array.isArray(result) ? result : (result?.fields || [])
  dealUserFieldsCache.value = list
  return list
}

async function ensureEnumerationOptions(fields) {
  const nextFields = []
  for (const field of fields || []) {
    if (field.type !== 'enumeration') {
      nextFields.push(field)
      continue
    }
    if (Array.isArray(field.options) && field.options.length) {
      nextFields.push(field)
      continue
    }

    if (!field.userFieldId) {
      nextFields.push(field)
      continue
    }

    try {
      const details = await callBxMethod('crm.deal.userfield.get', { id: field.userFieldId })
      const normalized = normalizeUserFieldMeta(details || {})
      nextFields.push({
        ...field,
        options: normalized.options || [],
        multiple: normalized.multiple,
      })
    } catch (error) {
      console.error(`Ошибка загрузки вариантов для ${field.name}:`, error)
      nextFields.push(field)
    }
  }
  return nextFields
}

async function loadDealsByIds(dealIds, select = null) {
  const uniqueIds = [...new Set(
    (dealIds || [])
      .map((id) => String(id))
      .filter(Boolean),
  )]
  if (!uniqueIds.length) return []

  const result = await callApi(
    'crm.deal.list',
    { ID: uniqueIds },
    select,
  )
  if (!Array.isArray(result)) return []
  return result.length && Array.isArray(result[0]) ? result.flat() : result
}

const DEAL_CONTACT_LOAD_SELECT = [
  'ID',
  'CONTACT_ID',
  'CONTACT_IDS',
  DEAL_CONTACTS_FIELD,
  TRUSTED_PERSON_FIELD,
  'COMPANY_ID',
]

function applyDealContactDataFromApi(deal, dealData) {
  if (!deal || !dealData) return

  const fromDeal = [
    ...normalizeIdList(dealData[DEAL_CONTACTS_FIELD]),
    ...normalizeIdList(dealData[TRUSTED_PERSON_FIELD]),
    ...normalizeIdList(dealData.CONTACT_ID),
    ...normalizeIdList(dealData.CONTACT_IDS),
  ]

  if (fromDeal.length) {
    deal[DEAL_CONTACTS_FIELD] = [...new Set([
      ...normalizeIdList(deal[DEAL_CONTACTS_FIELD]),
      ...fromDeal,
    ])]
  }

  if (dealData[TRUSTED_PERSON_FIELD] != null && dealData[TRUSTED_PERSON_FIELD] !== '') {
    deal[TRUSTED_PERSON_FIELD] = dealData[TRUSTED_PERSON_FIELD]
  }
  if (dealData.CONTACT_ID != null && dealData.CONTACT_ID !== '') {
    deal.CONTACT_ID = dealData.CONTACT_ID
  }
  if (dealData.COMPANY_ID != null && dealData.COMPANY_ID !== '') {
    deal.COMPANY_ID = dealData.COMPANY_ID
  }
}

async function loadDealContactItemsBatch(deals) {
  const list = (deals || []).filter((deal) => deal?.ID)
  if (!list.length) return

  const batchSize = 50
  for (let offset = 0; offset < list.length; offset += batchSize) {
    const chunk = list.slice(offset, offset + batchSize)
    const cmd = {}

    chunk.forEach((deal, index) => {
      cmd[`deal${index}`] = {
        method: 'crm.deal.contact.items.get',
        params: { id: deal.ID },
      }
    })

    try {
      const batchResult = await callBatch(cmd)
      chunk.forEach((deal, index) => {
        const raw = batchResult[`deal${index}`]
        const items = Array.isArray(raw) ? raw : (raw?.items || [])
        const fromItems = items
          .map((item) => item?.CONTACT_ID ?? item?.contactId ?? item?.ID ?? item?.id)
          .filter((id) => id != null && id !== '')
          .map(String)
        if (!fromItems.length) return
        deal[DEAL_CONTACTS_FIELD] = [...new Set([
          ...normalizeIdList(deal[DEAL_CONTACTS_FIELD]),
          ...fromItems,
        ])]
      })
    } catch (error) {
      console.error('Ошибка batch-загрузки контактов сделок:', error)
    }
  }
}

async function loadFullDeal(dealId) {
  const items = await loadDealsByIds([dealId])
  return items[0] || {}
}

function isFieldRequiredForStage(fieldMeta, stageId) {
  if (fieldMeta.mandatory) return true
  return settingsMentionsStage(fieldMeta.settings, stageId)
}



function collectRequiredEmptyFields(userFields, dealData, stageId, onlyFieldNames = null) {
  const onlySet = onlyFieldNames
    ? new Set(onlyFieldNames.map((name) => String(name).toUpperCase()))
    : null

  return userFields
    .map(normalizeUserFieldMeta)
    .filter((field) => {
      const fieldName = String(field.name).toUpperCase()
      if (NEVER_REQUIRED_FIELDS.has(fieldName)) return false
      if (onlySet) {
        if (!onlySet.has(fieldName)) return false
      } else if (!isFieldRequiredForStage(field, stageId)) {
        return false
      }
      return isEmptyFieldValue(dealData?.[field.name])
    })
    .map((field) => enrichRequiredFieldMeta(field))
}

function enrichRequiredFieldMeta(field) {
  const name = String(field.name || '').toUpperCase()
  if (name === PARTICIPATION_STATUS_FIELD) {
    return {
      ...field,
      title: 'Статус участия',
      type: 'crm_status',
      multiple: false,
      options: participationStatusOptions.value,
    }
  }
  if (name === TRUSTED_PERSON_FIELD) {
    return {
      ...field,
      title: 'Доверенное лицо',
      type: 'crm_contact',
      multiple: false,
    }
  }
  if (name === PRELIMINARY_SUM_FIELD) {
    return { ...field, title: 'Предварительная сумма участия', type: 'money' }
  }
  if (name === FINAL_SUM_FIELD) {
    return { ...field, title: 'Финальная сумма участия', type: 'money' }
  }
  if (name === SQM_FIELD) {
    return { ...field, title: 'Кв.м' }
  }
  return field
}

function extractRequiredFieldNamesFromError(error, userFields) {
  const message = String(error?.message || error || '')
  const names = new Set()

  const ufMatches = message.match(/UF_CRM_[\w]+/gi) || []
  ufMatches.forEach((name) => {
    const upper = name.toUpperCase()
    if (!NEVER_REQUIRED_FIELDS.has(upper)) names.add(upper)
  })

  const camelMatches = message.match(/ufCrm[\w]+/gi) || []
  camelMatches.forEach((name) => {
    const suffix = String(name).replace(/^ufCrm/i, '')
    if (suffix) {
      const upper = `UF_CRM_${suffix}`
      if (!NEVER_REQUIRED_FIELDS.has(upper)) names.add(upper)
    }
  })

  userFields.forEach((field) => {
    const title = String(getUserFieldTitle(field) || '')
    const fieldName = String(field.FIELD_NAME).toUpperCase()
    if (NEVER_REQUIRED_FIELDS.has(fieldName)) return
    if (title && message.includes(title)) {
      names.add(fieldName)
    }
  })

  return [...names]
}

function setRequiredFieldValue(fieldName, value) {
  requiredFieldsDialog.value.values = {
    ...requiredFieldsDialog.value.values,
    [fieldName]: value,
  }
  if (!isEmptyRequiredDialogValue(fieldName, value)) {
    requiredFieldsInvalidNames.value = requiredFieldsInvalidNames.value.filter(
      (name) => name !== fieldName,
    )
  }
  if (areRequiredFieldsComplete.value) {
    requiredFieldsDialog.value.error = ''
  }
}

function isEmptyRequiredDialogValue(fieldName, value = requiredFieldsDialog.value.values[fieldName]) {
  const field = (requiredFieldsDialog.value.fields || []).find((item) => item.name === fieldName)
  if (field?.type === 'boolean') return false
  return isEmptyFieldValue(value)
}

function isRequiredFieldInvalid(fieldName) {
  return requiredFieldsInvalidNames.value.includes(fieldName)
}

const areRequiredFieldsComplete = computed(() => {
  const fields = requiredFieldsDialog.value.fields || []
  if (!fields.length || requiredFieldsDialog.value.loading) return false
  return fields.every((field) => !isEmptyRequiredDialogValue(field.name))
})

function markEmptyRequiredFields() {
  const emptyNames = (requiredFieldsDialog.value.fields || [])
    .filter((field) => isEmptyRequiredDialogValue(field.name))
    .map((field) => field.name)
  requiredFieldsInvalidNames.value = emptyNames
  return emptyNames
}

function onRequiredSubmitClick() {
  if (requiredFieldsDialog.value.loading || requiredFieldsDialog.value.saving) return
  if (!requiredFieldsDialog.value.fields.length) return

  if (!areRequiredFieldsComplete.value) {
    markEmptyRequiredFields()
    requiredFieldsDialog.value.error = 'Заполните все обязательные поля'
    return
  }

  requiredFieldsInvalidNames.value = []
  requiredFieldsDialog.value.error = ''
  submitRequiredFieldsDialog()
}

async function reloadRequiredStatusOptions() {
  await ensureParticipationStatusesLoaded(true)
  requiredDialogStatusOptions.value = [...participationStatusOptions.value]
}

async function reloadRequiredContactOptions() {
  const deal = requiredFieldsDialog.value.deal
  if (!deal?.ID) {
    requiredDialogContactOptions.value = []
    return
  }
  await ensureDealContactsLoaded(deal)
  requiredDialogContactOptions.value = getTrustedPersonOptions(deal)
}

async function openRequiredFieldsDialog(deal, stageId, fields, dealData = {}) {
  requiredFieldsDialog.value = {
    open: true,
    loading: true,
    saving: false,
    error: '',
    deal,
    stageId,
    stageLabel: getStageOption(stageId)?.label || stageId,
    fields,
    values: {},
  }
  requiredDialogStatusOptions.value = []
  requiredDialogContactOptions.value = []
  requiredFieldsInvalidNames.value = []

  try {
    const enrichedFields = await ensureEnumerationOptions(fields)

    // Force refresh so dialog always gets a fresh option list
    await ensureParticipationStatusesLoaded(true)
    requiredDialogStatusOptions.value = [...participationStatusOptions.value]

    if (deal?.ID) {
      await ensureDealContactsLoaded(deal)
      requiredDialogContactOptions.value = getTrustedPersonOptions(deal)
    } else {
      requiredDialogContactOptions.value = []
    }

    const values = {}
    enrichedFields.forEach((field) => {
      values[field.name] = buildInputValue(field, dealData?.[field.name])
    })

    requiredFieldsDialog.value = {
      ...requiredFieldsDialog.value,
      loading: false,
      fields: enrichedFields,
      values,
    }
  } catch (error) {
    console.error('Ошибка подготовки обязательных полей:', error)
    requiredFieldsDialog.value.loading = false
    requiredFieldsDialog.value.error = error?.message || 'Не удалось загрузить поля'
  }

  // Keep the main event dialog viewport stable; do not remeasure from inflated iframe.
  applyDialogViewportSize()
}

function closeRequiredFieldsDialog() {
  if (requiredFieldsDialog.value.saving) return
  requiredFieldsDialog.value = {
    open: false,
    loading: false,
    saving: false,
    error: '',
    deal: null,
    stageId: null,
    stageLabel: '',
    fields: [],
    values: {},
  }
  requiredDialogContactOptions.value = []
  requiredDialogStatusOptions.value = []
  requiredFieldsInvalidNames.value = []
}

async function prepareStageChange(deal, stageId) {
  const requiredNames = getRequiredFieldNamesForStage(stageId)
  const [userFields, dealData] = await Promise.all([
    loadDealUserFields(),
    loadFullDeal(deal.ID),
    ensureParticipationStatusesLoaded(),
  ])

  // Синхронизируем контакты сделки для выбора доверенного лица
  const contactIdsFromDeal = [
    ...normalizeIdList(dealData?.[DEAL_CONTACTS_FIELD]),
    ...normalizeIdList(dealData?.[TRUSTED_PERSON_FIELD]),
    ...normalizeIdList(dealData?.CONTACT_ID),
  ]
  if (contactIdsFromDeal.length) {
    deal[DEAL_CONTACTS_FIELD] = [...new Set([
      ...normalizeIdList(deal[DEAL_CONTACTS_FIELD]),
      ...contactIdsFromDeal,
    ])]
  }
  if (dealData?.CONTACT_ID != null && dealData.CONTACT_ID !== '') {
    deal.CONTACT_ID = dealData.CONTACT_ID
  }
  if (dealData?.[TRUSTED_PERSON_FIELD] != null && dealData[TRUSTED_PERSON_FIELD] !== '') {
    deal[TRUSTED_PERSON_FIELD] = dealData[TRUSTED_PERSON_FIELD]
  }

  if (requiredNames.includes(TRUSTED_PERSON_FIELD)) {
    await ensureDealContactsLoaded(deal)
  }

  const missing = collectRequiredEmptyFields(
    userFields,
    dealData,
    stageId,
    requiredNames,
  )

  // Ensure all mapped required fields appear even if userfield.list misses them
  const byName = new Map(missing.map((field) => [String(field.name).toUpperCase(), field]))
  requiredNames.forEach((name) => {
    const upper = String(name).toUpperCase()
    if (byName.has(upper)) return
    if (!isEmptyFieldValue(dealData?.[name])) return
    const fromList = userFields.find((field) => String(field.FIELD_NAME).toUpperCase() === upper)
    const base = fromList
      ? normalizeUserFieldMeta(fromList)
      : {
        name,
        title: name,
        type: 'string',
        multiple: false,
        options: [],
        settings: {},
        mandatory: true,
      }
    byName.set(upper, enrichRequiredFieldMeta(base))
  })

  return {
    userFields,
    dealData,
    missing: [...byName.values()],
  }
}

async function applyStageChange(deal, stageId, extraFields = {}) {
  await updateDealItemFields(deal.ID, {
    ...extraFields,
    STAGE_ID: stageId,
  })
  applyStageToDeal(deal, stageId)

  Object.entries(extraFields).forEach(([field, value]) => {
    if (!(Object.prototype.hasOwnProperty.call(deal, field) || field.startsWith('UF_CRM_') || field === 'COMMENTS')) {
      return
    }

    if (field === PARTICIPATION_STATUS_FIELD) {
      const statusId = normalizeIdList(value)[0] || ''
      deal[field] = statusId
      deal.status = getParticipationStatusTitle(statusId)
      emit('field-updated', { dealId: deal.ID, field, value: statusId })
      emit('field-updated', { dealId: deal.ID, field: 'status', value: deal.status })
      return
    }

    if (field === TRUSTED_PERSON_FIELD) {
      const contactId = value ? String(value) : ''
      deal[field] = contactId
      emit('field-updated', { dealId: deal.ID, field, value: contactId })
      return
    }

    const localValue = MONEY_FIELDS.has(field)
      ? Number(normalizeMoneyInput(value))
      : value
    deal[field] = localValue
    emit('field-updated', {
      dealId: deal.ID,
      field,
      value: localValue,
    })
  })
}

async function updateDealStage(stageId, deal) {
  if (!deal?.ID || !stageId || stageId === deal.STAGE_ID) {
    return
  }

  savingStageDealId.value = String(deal.ID)

  try {
    const { userFields, dealData, missing } = await prepareStageChange(deal, stageId)

    if (missing.length) {
      await openRequiredFieldsDialog(deal, stageId, missing, dealData)
      return
    }

    try {
      await applyStageChange(deal, stageId)
    } catch (error) {
      const requiredNames = extractRequiredFieldNamesFromError(error, userFields)
        .filter((name) => !NEVER_REQUIRED_FIELDS.has(String(name).toUpperCase()))
      if (requiredNames.length) {
        const forcedMissing = collectRequiredEmptyFields(
          userFields,
          dealData,
          stageId,
          requiredNames,
        )
        const fallbackMissing = forcedMissing.length
          ? forcedMissing
          : userFields
            .map(normalizeUserFieldMeta)
            .filter((field) => requiredNames.includes(String(field.name).toUpperCase()))
            .map(enrichRequiredFieldMeta)

        if (fallbackMissing.length) {
          await openRequiredFieldsDialog(deal, stageId, fallbackMissing, dealData)
          return
        }
      }
      throw error
    }
  } catch (error) {
    console.error('Ошибка обновления стадии сделки:', error)
  } finally {
    savingStageDealId.value = null
  }
}

async function submitRequiredFieldsDialog() {
  const dialog = requiredFieldsDialog.value
  const deal = dialog.deal
  const stageId = dialog.stageId
  if (!deal?.ID || !stageId || dialog.saving) return

  dialog.error = ''

  const emptyNames = markEmptyRequiredFields()
  if (emptyNames.length) {
    dialog.error = 'Заполните все обязательные поля'
    return
  }

  dialog.saving = true

  try {
    const extraFields = {}
    dialog.fields.forEach((field) => {
      extraFields[field.name] = serializeRequiredFieldValue(field, dialog.values[field.name])
    })

    await applyStageChange(deal, stageId, extraFields)
    dialog.saving = false
    closeRequiredFieldsDialog()
  } catch (error) {
    console.error('Ошибка сохранения обязательных полей:', error)
    dialog.error = error?.message || 'Не удалось сохранить обязательные поля'
    dialog.saving = false
  }
}

function applyStageToDeal(deal, stageId) {
  const option = getStageOption(stageId)
  deal.STAGE_ID = stageId
  deal.stage = option?.label || deal.stage || ''
  emit('stage-updated', {
    dealId: deal.ID,
    stageId,
    stageLabel: deal.stage,
  })
}

async function commitCellEdit(deal) {
  const { dealId, field, draft, original } = editingCell.value
  if (!dealId || !field || String(deal?.ID) !== String(dealId)) return
  if (isCellSaving(dealId, field) || isCommittingCell.value) return

  if (String(draft) === String(original)) {
    cancelCellEdit()
    return
  }

  let parsed
  try {
    parsed = parseCellValue(field, draft)
  } catch (error) {
    console.error(error)
    cancelCellEdit()
    return
  }

  isCommittingCell.value = true
  savingCell.value = { dealId: String(dealId), field }

  try {
    await updateDealFields(dealId, { [field]: parsed.remoteValue })
    deal[field] = parsed.localValue
    emit('field-updated', {
      dealId,
      field,
      value: parsed.localValue,
    })
    editingCell.value = {
      dealId: null,
      field: null,
      draft: '',
      original: '',
    }
  } catch (error) {
    console.error('Ошибка обновления поля сделки:', error)
    editingCell.value.draft = original
  } finally {
    savingCell.value = { dealId: null, field: null }
    isCommittingCell.value = false
  }
}

function matchesStatusKeyword(deal, keyword) {
  const status = String(deal?.status || '').toLowerCase()
  const stage = String(deal?.stage || '').toLowerCase()
  return status.includes(keyword) || stage.includes(keyword)
}

function matchesTab(deal, tabId) {
  switch (tabId) {
    case 'all':
      return true
    case 'base':
      return BASE_STAGES.includes(deal?.STAGE_ID)
    case 'potential':
      return POTENTIAL_STAGES.includes(deal?.STAGE_ID)
    case 'agreements':
      return AGREEMENT_STAGES.includes(deal?.STAGE_ID)
    case 'transferred':
      return TRANSFERRED_STAGES.includes(deal?.STAGE_ID)
    case 'mailings':
      return MAILING_STAGES.includes(deal?.STAGE_ID) || matchesStatusKeyword(deal, 'рассыл')
    case 'calls':
      return CALL_STAGES.includes(deal?.STAGE_ID)
        || matchesStatusKeyword(deal, 'звон')
        || matchesStatusKeyword(deal, 'нет ответа')
    case 'refusals':
      return REFUSAL_STAGES.includes(deal?.STAGE_ID) || matchesStatusKeyword(deal, 'отказ')
    default:
      return true
  }
}

function matchesSearch(deal, query) {
  if (!query) return true
  const haystack = [
    deal?.UF_CRM_1744890618774,
    deal?.TITLE,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function readEventCrmBindingIds(fieldUf, fieldCamel) {
  const event = props.event || {}
  const raw = event[fieldUf]
    ?? event[fieldCamel]
    ?? event[fieldUf.toLowerCase()]
    ?? null
  return normalizeIdList(raw)
    .map((value) => String(value).replace(/^T\d+_/i, '').trim())
    .filter(Boolean)
}

async function loadCommerceFilterDealIds() {
  if (!props.modelValue) return

  const collectedSpaIds = readEventCrmBindingIds(
    COMMERCE_COLLECTED_FIELD,
    COMMERCE_COLLECTED_FIELD_CAMEL,
  )
  const remainingSpaIds = readEventCrmBindingIds(
    COMMERCE_REMAINING_FIELD,
    COMMERCE_REMAINING_FIELD_CAMEL,
  )
  const collectedSet = new Set(collectedSpaIds.map(String))
  const remainingSet = new Set(remainingSpaIds.map(String))
  const allSpaIds = [...new Set([...collectedSpaIds, ...remainingSpaIds])]

  if (!allSpaIds.length) {
    commerceCollectedDealIds.value = []
    commerceRemainingDealIds.value = []
    commerceCollectedSpaCount.value = 0
    commerceRemainingSpaCount.value = 0
    return
  }

  commerceCollectedSpaCount.value = collectedSpaIds.length
  commerceRemainingSpaCount.value = remainingSpaIds.length
  commerceFilterLoading.value = true
  try {
    const result = await callApi(
      'crm.item.list',
      { id: allSpaIds },
      ['id', 'parentId2'],
      COMMERCE_ENTITY_TYPE_ID,
      0,
      0,
    )
    const items = normalizeSpaItems(result)
    const collected = []
    const remaining = []

    items.forEach((item) => {
      const spaId = String(item?.id ?? item?.ID ?? '')
      const dealId = item?.parentId2 ?? item?.PARENT_ID_2
      if (!spaId || dealId == null || dealId === '') return
      const dealIdStr = String(dealId)
      if (collectedSet.has(spaId)) collected.push(dealIdStr)
      if (remainingSet.has(spaId)) remaining.push(dealIdStr)
    })

    commerceCollectedDealIds.value = [...new Set(collected)]
    commerceRemainingDealIds.value = [...new Set(remaining)]
  } catch (error) {
    console.error('Ошибка загрузки коммерции для фильтра:', error)
    commerceCollectedDealIds.value = []
    commerceRemainingDealIds.value = []
  } finally {
    commerceFilterLoading.value = false
  }
}

function formatDealCountParts(count) {
  const n = Number(count) || 0
  const abs = Math.abs(n) % 100
  const last = abs % 10
  let word = 'сделок'
  if (abs < 11 || abs > 14) {
    if (last === 1) word = 'сделка'
    else if (last >= 2 && last <= 4) word = 'сделки'
  }
  return { number: String(n), word }
}

function setCategoryFilter(tabId) {
  activeFilter.value = tabId
  activeCommerceFilter.value = null
  page.value = 1
}

function setCommerceFilter(type) {
  activeCommerceFilter.value = activeCommerceFilter.value === type ? null : type
  if (activeCommerceFilter.value) {
    activeFilter.value = 'all'
  }
  page.value = 1
}

const filteredDeals = computed(() => {
  const query = String(debouncedSearchQuery.value || '').trim().toLowerCase()
  let deals = props.deals || []

  if (activeCommerceFilter.value === 'collected') {
    const ids = new Set(commerceCollectedDealIds.value)
    deals = deals.filter((deal) => ids.has(String(deal?.ID ?? deal?.id)))
  } else if (activeCommerceFilter.value === 'remaining') {
    const ids = new Set(commerceRemainingDealIds.value)
    deals = deals.filter((deal) => ids.has(String(deal?.ID ?? deal?.id)))
  } else {
    deals = deals.filter((deal) => matchesTab(deal, activeFilter.value))
  }

  return deals.filter((deal) => matchesSearch(deal, query))
})

function clearSearchDebounceTimer() {
  if (searchDebounceTimer == null) return
  window.clearTimeout(searchDebounceTimer)
  searchDebounceTimer = null
}

function applyDebouncedSearch(value = searchInput.value) {
  const next = String(value || '')
  debouncedSearchQuery.value = next
  page.value = 1
}

function resetSearchState() {
  clearSearchDebounceTimer()
  searchInput.value = ''
  debouncedSearchQuery.value = ''
}

watch(searchInput, (value) => {
  // Очистка — сразу, чтобы не ждать debounce
  if (!String(value || '').trim()) {
    clearSearchDebounceTimer()
    applyDebouncedSearch('')
    return
  }

  clearSearchDebounceTimer()
  searchDebounceTimer = window.setTimeout(() => {
    searchDebounceTimer = null
    applyDebouncedSearch(value)
  }, SEARCH_DEBOUNCE_MS)
})

const commerceCollectedParts = computed(() => formatDealCountParts(commerceCollectedSpaCount.value))
const commerceRemainingParts = computed(() => formatDealCountParts(commerceRemainingSpaCount.value))

const filterTabs = computed(() => {
  const allDeals = props.deals || []
  const dealsFor = (tabId) => allDeals.filter((deal) => matchesTab(deal, tabId))
  const countFor = (tabId) => dealsFor(tabId).length
  const sumForMetric = (metric) => allDeals.reduce(
    (acc, deal) => acc + resolveDealMetricContribution(deal, metric),
    0,
  )

  return [
    { id: 'all', label: 'Все компании', icon: 'mdi-office-building-outline', count: countFor('all') },
    { id: 'base', label: 'База', icon: 'mdi-database-outline', count: countFor('base') },
    { id: 'mailings', label: 'Рассылки', icon: 'mdi-email-outline', count: countFor('mailings') },
    { id: 'calls', label: 'Звонки', icon: 'mdi-phone-outline', count: countFor('calls') },
    { id: 'potential', label: 'Потенциал', icon: 'mdi-lightning-bolt-outline', count: countFor('potential'), sum: sumForMetric('pot') },
    { id: 'agreements', label: 'Договоренности', icon: 'mdi-file-document-outline', count: countFor('agreements'), sum: sumForMetric('dog') },
    { id: 'transferred', label: 'Передано', icon: 'mdi-handshake-outline', count: countFor('transferred'), sum: sumForMetric('summ') },
    { id: 'refusals', label: 'Отказы', icon: 'mdi-close-circle-outline', count: countFor('refusals') },
  ]
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredDeals.value.length / pageSize)))

const pagedDeals = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredDeals.value.slice(start, start + pageSize)
})

const allPageDealsSelected = computed(() => (
  pagedDeals.value.length > 0
  && pagedDeals.value.every((deal) => selectedDealIds.value.includes(String(deal.ID)))
))

const somePageDealsSelected = computed(() => (
  !allPageDealsSelected.value
  && pagedDeals.value.some((deal) => selectedDealIds.value.includes(String(deal.ID)))
))

function isDealSelected(dealId) {
  return selectedDealIds.value.includes(String(dealId))
}

function toggleDealSelection(dealId) {
  const id = String(dealId)
  selectedDealIds.value = isDealSelected(id)
    ? selectedDealIds.value.filter((selectedId) => selectedId !== id)
    : [...selectedDealIds.value, id]
}

function togglePageSelection() {
  const pageIds = pagedDeals.value.map((deal) => String(deal.ID))
  if (allPageDealsSelected.value) {
    selectedDealIds.value = selectedDealIds.value.filter((id) => !pageIds.includes(id))
    return
  }
  selectedDealIds.value = [...new Set([...selectedDealIds.value, ...pageIds])]
}

function clearSelection() {
  selectedDealIds.value = []
}

const rangeLabel = computed(() => {
  const total = filteredDeals.value.length
  if (!total) return '0–0'
  const start = (page.value - 1) * pageSize + 1
  const end = Math.min(page.value * pageSize, total)
  return `${start}–${end}`
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = page.value
  const pages = []
  const windowSize = 5
  let start = Math.max(1, current - Math.floor(windowSize / 2))
  let end = Math.min(total, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)
  for (let i = start; i <= end; i += 1) pages.push(i)
  return pages
})

function openDeal(dealId) {
  if (!dealId) return
  const path = `/crm/deal/details/${dealId}/`
  openBitrixSlider(path)
}

function getExtraOptions(deal) {
  if (!deal?.ID) return []
  return extraOptionsByDealId.value[String(deal.ID)] || []
}

function getCommerceItems(deal) {
  if (!deal?.ID) return []
  return commerceByDealId.value[String(deal.ID)] || []
}

function openBitrixSlider(path, onClose) {
  const handleClose = typeof onClose === 'function'
    ? (result) => {
      if (result?.result === 'error') return
      onClose(result)
    }
    : undefined

  if ((window as any).BX24?.openPath) {
    if (handleClose) {
      (window as any).BX24.openPath(path, handleClose)
      return
    }
    (window as any).BX24.openPath(path, true)
    return
  }

  const domain = (window as any).BX24?.getAuth?.()?.domain
  const origin = domain ? `https://${domain}` : window.location.origin
  window.open(`${origin}${path}`, '_blank', 'noopener,noreferrer')
  if (handleClose) {
    window.setTimeout(() => handleClose({ result: 'close' }), 1000)
  }
}

function buildExtraOptionCreatePath(dealId) {
  return `/page/spravochniki/dop_optsii/type/${EXTRA_OPTIONS_ENTITY_TYPE_ID}/details/0/?parentTypeId=${DEAL_ENTITY_TYPE_ID}&parentId=${dealId}`
}

function buildExtraOptionDetailsPath(optionId) {
  return `/page/spravochniki/dop_optsii/type/${EXTRA_OPTIONS_ENTITY_TYPE_ID}/details/${optionId}/`
}

function buildCommerceCreatePath(dealId) {
  return `/page/spravochniki/kommertsiya/type/${COMMERCE_ENTITY_TYPE_ID}/details/0/?parentTypeId=${DEAL_ENTITY_TYPE_ID}&parentId=${dealId}`
}

function buildCommerceDetailsPath(itemId) {
  return `/page/spravochniki/kommertsiya/type/${COMMERCE_ENTITY_TYPE_ID}/details/${itemId}/`
}

function openCreateExtraOption(deal) {
  if (!deal?.ID) return
  openBitrixSlider(buildExtraOptionCreatePath(deal.ID), () => {
    void refreshExtraOptionsForDeal(deal)
  })
}

function openExtraOption(deal, optionId) {
  if (!optionId) return
  openBitrixSlider(buildExtraOptionDetailsPath(optionId), () => {
    if (deal?.ID) {
      void refreshExtraOptionsForDeal(deal)
    }
  })
}

function openCreateCommerce(deal) {
  if (!deal?.ID) return
  openBitrixSlider(buildCommerceCreatePath(deal.ID), () => {
    void refreshCommerceForDeal(deal)
  })
}

function openCommerceItem(deal, itemId) {
  if (!itemId) return
  openBitrixSlider(buildCommerceDetailsPath(itemId), () => {
    if (deal?.ID) {
      void refreshCommerceForDeal(deal)
    }
  })
}

function buildParticipationStatusCreatePath() {
  return `/crm/type/${PARTICIPATION_STATUS_ENTITY_TYPE_ID}/details/0/`
}

function buildParticipationStatusDetailsPath(statusId) {
  return `/crm/type/${PARTICIPATION_STATUS_ENTITY_TYPE_ID}/details/${statusId}/`
}

function getParticipationStatusId(deal) {
  const ids = normalizeIdList(deal?.[PARTICIPATION_STATUS_FIELD])
  if (ids.length) return ids[0]
  // legacy normalized single value / title lookup
  if (deal?.status) {
    const byTitle = participationStatusOptions.value.find(
      (item) => item.title === deal.status,
    )
    if (byTitle) return byTitle.id
  }
  return null
}

function getParticipationStatusTitle(statusId) {
  if (!statusId) return ''
  return participationStatusOptions.value.find((item) => String(item.id) === String(statusId))?.title || ''
}

function isParticipationStatusSaving(dealId) {
  return String(savingParticipationStatusDealId.value || '') === String(dealId)
}

function applyParticipationStatusToDeal(dealId, statusId) {
  const id = String(dealId)
  const nextId = statusId ? String(statusId) : ''
  const title = getParticipationStatusTitle(nextId)

  ;(props.deals || []).forEach((deal) => {
    if (String(deal.ID) !== id) return
    deal[PARTICIPATION_STATUS_FIELD] = nextId
    deal.status = title
  })

  if (
    requiredFieldsDialog.value.open
    && String(requiredFieldsDialog.value.deal?.ID || '') === id
  ) {
    requiredFieldsDialog.value.values[PARTICIPATION_STATUS_FIELD] = nextId || null
  }

  emit('field-updated', {
    dealId,
    field: PARTICIPATION_STATUS_FIELD,
    value: nextId,
  })
  emit('field-updated', {
    dealId,
    field: 'status',
    value: title,
  })
}

async function ensureParticipationStatusesLoaded(force = false) {
  if (!force && participationStatusOptions.value.length) return participationStatusOptions.value
  participationStatusesLoading.value = true
  try {
    const raw = await callApi('crm.item.list', {}, null, PARTICIPATION_STATUS_ENTITY_TYPE_ID, 0, 0)
    const list = normalizeSpaItems(raw)
    participationStatusOptions.value = list
      .map((item) => ({
        id: String(item.id ?? item.ID ?? ''),
        title: String(item.title ?? item.TITLE ?? '').trim() || `Статус #${item.id ?? item.ID}`,
      }))
      .filter((item) => item.id)
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'))
    return participationStatusOptions.value
  } catch (error) {
    console.error('Ошибка загрузки статусов участия:', error)
    return participationStatusOptions.value
  } finally {
    participationStatusesLoading.value = false
  }
}

async function updateParticipationStatus(deal, statusId) {
  if (!deal?.ID) return
  const nextId = statusId != null && statusId !== '' ? String(statusId) : null
  const currentId = getParticipationStatusId(deal)
  if (String(currentId || '') === String(nextId || '')) return

  savingParticipationStatusDealId.value = deal.ID
  try {
    await updateDealFields(deal.ID, {
      [PARTICIPATION_STATUS_FIELD]: nextId ? [nextId] : [],
    })
    applyParticipationStatusToDeal(deal.ID, nextId)
  } catch (error) {
    console.error('Ошибка обновления статуса участия:', error)
  } finally {
    savingParticipationStatusDealId.value = null
  }
}

function openCreateParticipationStatus(deal) {
  openBitrixSlider(buildParticipationStatusCreatePath(), async () => {
    await ensureParticipationStatusesLoaded(true)
    if (requiredFieldsDialog.value.open) {
      requiredDialogStatusOptions.value = [...participationStatusOptions.value]
    }
    if (deal?.ID) {
      // refresh deal status binding in case user linked it in Bitrix UI
      try {
        const dealData = await loadFullDeal(deal.ID)
        const statusId = normalizeIdList(dealData?.[PARTICIPATION_STATUS_FIELD])[0] || null
        if (statusId) applyParticipationStatusToDeal(deal.ID, statusId)
      } catch (_) {
        // ignore
      }
    }
  })
}

function openAudienceData(deal) {
  if (!deal?.ID) return
  audienceDialog.value = {
    open: true,
    dealId: deal.ID,
    dealTitle: companyName(deal),
    trustedPersonId: getTrustedPersonId(deal),
  }
}


function getTrustedPersonId(deal) {
  const ids = normalizeIdList(deal?.[TRUSTED_PERSON_FIELD])
  return ids[0] || null
}

function formatContactTitle(contact) {
  if (!contact) return ''
  const fullName = [contact.LAST_NAME, contact.NAME, contact.SECOND_NAME]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
  if (fullName) return fullName
  return contact.TITLE || `Контакт #${contact.ID}`
}

function collectDealContactIds(deal) {
  return [...new Set([
    ...normalizeIdList(deal?.[DEAL_CONTACTS_FIELD]),
    ...normalizeIdList(deal?.[TRUSTED_PERSON_FIELD]),
    ...normalizeIdList(deal?.CONTACT_ID),
    ...normalizeIdList(deal?.CONTACT_IDS),
  ].filter(Boolean))]
}

function getTrustedPersonOptions(deal) {
  // Зависимость от revision, чтобы таблица перерисовалась после догрузки имён
  void contactsRevision.value
  const contactIds = new Set(collectDealContactIds(deal))

  return [...contactIds]
    .map((id) => {
      const contact = contactsById.value[String(id)]
      return {
        id: String(id),
        title: contact ? formatContactTitle(contact) : `Контакт #${id}`,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'ru'))
}

function isDealContactsLoading(dealId) {
  return contactsLoadingDealIds.value.has(String(dealId))
}

function markCompanyContactsLoaded(dealIds) {
  const next = new Set(companyContactsLoadedDealIds.value)
  dealIds.forEach((id) => next.add(String(id)))
  companyContactsLoadedDealIds.value = next
}

function resetCompanyContactsLoadingState() {
  contactsBootstrapToken += 1
  companyContactsLoadedDealIds.value = new Set()
  contactsLoadingDealIds.value = new Set()
  isContactsBootstrapLoading.value = false
}

async function withDealContactsLoading(dealIds, callback) {
  const ids = [...new Set((dealIds || []).map((id) => String(id)).filter(Boolean))]
  if (!ids.length) {
    await callback()
    return
  }

  const next = new Set(contactsLoadingDealIds.value)
  ids.forEach((id) => next.add(id))
  contactsLoadingDealIds.value = next

  try {
    await callback()
  } finally {
    const cleaned = new Set(contactsLoadingDealIds.value)
    ids.forEach((id) => cleaned.delete(id))
    contactsLoadingDealIds.value = cleaned
  }
}

async function batchCompanyContactLinks(companyIds) {
  const uniqueIds = [...new Set((companyIds || []).map((id) => String(id)).filter(Boolean))]
  const map = new Map()
  if (!uniqueIds.length) return map

  const batchSize = 50
  for (let offset = 0; offset < uniqueIds.length; offset += batchSize) {
    const chunk = uniqueIds.slice(offset, offset + batchSize)
    const cmd = {}

    chunk.forEach((companyId, index) => {
      cmd[`company${index}`] = {
        method: 'crm.company.contact.items.get',
        params: { id: companyId },
      }
    })

    try {
      const batchResult = await callBatch(cmd)
      chunk.forEach((companyId, index) => {
        const raw = batchResult[`company${index}`]
        const items = Array.isArray(raw) ? raw : (raw?.items || [])
        const contactIds = items
          .map((item) => item?.CONTACT_ID ?? item?.contactId ?? item?.ID ?? item?.id)
          .filter((id) => id != null && id !== '')
          .map(String)
        map.set(String(companyId), contactIds)
      })
    } catch (error) {
      console.error('Ошибка batch-загрузки контактов компаний:', error)
    }
  }

  return map
}

async function resolveDealsCompanyIds(deals) {
  const unresolved = (deals || []).filter((deal) => {
    if (!deal?.ID) return false
    return !(deal.COMPANY_ID || deal.companyId || normalizeIdList(deal.COMPANY_IDS)[0])
  })
  if (!unresolved.length) return

  try {
    const loaded = await loadDealsByIds(
      unresolved.map((deal) => deal.ID),
      ['COMPANY_ID', 'COMPANY_IDS'],
    )
    const byId = new Map(loaded.map((item) => [String(item.ID ?? item.id), item]))
    unresolved.forEach((deal) => {
      const data = byId.get(String(deal.ID))
      if (!data) return
      if (data.COMPANY_ID != null && data.COMPANY_ID !== '') {
        deal.COMPANY_ID = data.COMPANY_ID
      }
    })
  } catch (error) {
    console.error('Ошибка загрузки компаний сделок:', error)
  }
}

async function applyCompanyContactsToDealsBatch(deals) {
  const pending = (deals || []).filter(
    (deal) => deal?.ID && !companyContactsLoadedDealIds.value.has(String(deal.ID)),
  )
  if (!pending.length) return

  await resolveDealsCompanyIds(pending)

  const companyIds = pending
    .map((deal) => deal.COMPANY_ID || deal.companyId || normalizeIdList(deal.COMPANY_IDS)[0])
    .filter(Boolean)
    .map(String)

  const linksByCompany = await batchCompanyContactLinks(companyIds)

  pending.forEach((deal) => {
    const companyId = String(
      deal.COMPANY_ID || deal.companyId || normalizeIdList(deal.COMPANY_IDS)[0] || '',
    )
    if (!companyId) {
      markCompanyContactsLoaded([deal.ID])
      return
    }

    const fromCompany = linksByCompany.get(companyId) || []
    if (fromCompany.length) {
      deal[DEAL_CONTACTS_FIELD] = [...new Set([
        ...normalizeIdList(deal[DEAL_CONTACTS_FIELD]),
        ...fromCompany,
      ])]
    }
    markCompanyContactsLoaded([deal.ID])
  })
}

async function loadDealContactIdsForDeals(deals) {
  const list = (deals || []).filter((deal) => deal?.ID)
  if (!list.length) return

  const missing = list.filter((deal) => !collectDealContactIds(deal).length)
  if (!missing.length) return

  try {
    const loadedDeals = await loadDealsByIds(
      missing.map((deal) => deal.ID),
      DEAL_CONTACT_LOAD_SELECT,
    )
    const dealsById = new Map(
      loadedDeals.map((item) => [String(item.ID ?? item.id), item]),
    )
    missing.forEach((deal) => {
      const dealData = dealsById.get(String(deal.ID))
      if (dealData) applyDealContactDataFromApi(deal, dealData)
    })
  } catch (error) {
    console.error('Ошибка пакетной загрузки полей сделок:', error)
  }

  const stillMissing = missing.filter((deal) => !collectDealContactIds(deal).length)
  if (stillMissing.length) {
    await loadDealContactItemsBatch(stillMissing)
  }
}

async function loadContactsForDeals(deals, { loadCompanyContacts = false } = {}) {
  const list = (deals || []).filter((deal) => deal?.ID)
  if (!list.length) return

  await withDealContactsLoading(list.map((deal) => deal.ID), async () => {
    await loadDealContactIdsForDeals(list)
    if (loadCompanyContacts) {
      await applyCompanyContactsToDealsBatch(list)
    }

    const contactIds = []
    list.forEach((deal) => {
      contactIds.push(...collectDealContactIds(deal))
    })
    await loadContactsByIds(contactIds)
  })
}

async function loadContactsForVisibleDeals() {
  if (!props.modelValue) return
  await loadContactsForDeals(pagedDeals.value, { loadCompanyContacts: true })
}

function invalidateCompanyContactsCacheForDeals(deals) {
  const ids = new Set(
    (deals || [])
      .map((deal) => String(deal?.ID ?? ''))
      .filter(Boolean),
  )
  if (!ids.size) return

  companyContactsLoadedDealIds.value = new Set(
    [...companyContactsLoadedDealIds.value].filter((id) => !ids.has(id)),
  )
}

async function bootstrapVisibleCompanyContacts({ silent = false } = {}) {
  if (!props.modelValue) return

  // Пока сделки ещё грузятся — держим overlay и ждём окончания refresh
  if (props.refreshing) {
    if (!silent) isContactsBootstrapLoading.value = true
    return
  }

  const token = ++contactsBootstrapToken
  if (!silent) {
    isContactsBootstrapLoading.value = true
  }
  try {
    const visibleDeals = pagedDeals.value
    invalidateCompanyContactsCacheForDeals(visibleDeals)
    await loadContactsForDeals(visibleDeals, { loadCompanyContacts: true })
  } finally {
    // Не снимаем loading, если уже стартовал более новый bootstrap или снова начался refresh
    if (!silent && token === contactsBootstrapToken && !props.refreshing) {
      isContactsBootstrapLoading.value = false
    }
  }
}

async function ensureDealContactsLoaded(deal) {
  if (!deal?.ID) return []

  // Всегда подтягиваем связанные контакты сделки из CRM
  try {
    const items = await callBxMethod('crm.deal.contact.items.get', { id: deal.ID })
    const list = Array.isArray(items) ? items : []
    const fromItems = list
      .map((item) => item?.CONTACT_ID ?? item?.contactId ?? item?.ID ?? item?.id)
      .filter((id) => id != null && id !== '')
      .map(String)
    if (fromItems.length) {
      deal[DEAL_CONTACTS_FIELD] = [...new Set([
        ...normalizeIdList(deal[DEAL_CONTACTS_FIELD]),
        ...fromItems,
      ])]
    }
  } catch (error) {
    console.error('Ошибка загрузки контактов сделки:', error)
  }

  let ids = collectDealContactIds(deal)

  if (!ids.length || !normalizeIdList(deal?.[DEAL_CONTACTS_FIELD]).length) {
    try {
      const loaded = await loadDealsByIds([deal.ID], DEAL_CONTACT_LOAD_SELECT)
      if (loaded[0]) {
        applyDealContactDataFromApi(deal, loaded[0])
        ids = collectDealContactIds(deal)
      }
    } catch (error) {
      console.error('Ошибка обновления контактов сделки:', error)
    }
  }

  await ensureCompanyContactsLoaded(deal)
  ids = collectDealContactIds(deal)
  await loadContactsByIds(ids)
  return ids
}

async function ensureCompanyContactsLoaded(deal) {
  if (!deal?.ID) return []

  await applyCompanyContactsToDealsBatch([deal])
  const ids = collectDealContactIds(deal)
  await loadContactsByIds(ids)
  return ids
}

function isTrustedPersonSaving(dealId) {
  return String(savingTrustedPersonDealId.value || '') === String(dealId)
}

function applyTrustedPersonToDeal(dealId, contactId, contactIds = null) {
  const id = String(dealId)
  const nextValue = contactId ? String(contactId) : ''

  ;(props.deals || []).forEach((deal) => {
    if (String(deal.ID) !== id) return
    deal[TRUSTED_PERSON_FIELD] = nextValue
    if (Array.isArray(contactIds)) {
      deal[DEAL_CONTACTS_FIELD] = contactIds
    }
  })

  if (String(audienceDialog.value.dealId || '') === id) {
    audienceDialog.value.trustedPersonId = contactId ? String(contactId) : null
  }

  emit('field-updated', {
    dealId,
    field: TRUSTED_PERSON_FIELD,
    value: nextValue,
  })

  if (Array.isArray(contactIds)) {
    emit('field-updated', {
      dealId,
      field: DEAL_CONTACTS_FIELD,
      value: contactIds,
    })
  }
}

async function updateTrustedPerson(deal, contactId) {
  if (!deal?.ID) return
  const nextId = contactId != null && contactId !== '' ? String(contactId) : null
  const currentId = getTrustedPersonId(deal)
  if (String(currentId || '') === String(nextId || '')) return

  savingTrustedPersonDealId.value = deal.ID
  try {
    await updateDealFields(deal.ID, {
      [TRUSTED_PERSON_FIELD]: nextId || '',
    })
    applyTrustedPersonToDeal(deal.ID, nextId)
  } catch (error) {
    console.error('Ошибка обновления доверенного лица:', error)
  } finally {
    savingTrustedPersonDealId.value = null
  }
}

function handleAudienceTrustedPersonUpdated({ dealId, contactId, contactIds }) {
  if (!dealId) return
  applyTrustedPersonToDeal(dealId, contactId, contactIds)
  if (Array.isArray(contactIds) && contactIds.length) {
    loadContactsByIds(contactIds)
  }
}

async function handleAudienceDialogToggle(open) {
  if (open) return
  const dealId = audienceDialog.value.dealId
  if (!dealId) return
  await refreshDealTrustedPersonData(dealId)
}

async function refreshDealTrustedPersonData(dealId) {
  try {
    const deals = await callApi(
      'crm.deal.list',
      { ID: dealId },
      [TRUSTED_PERSON_FIELD, DEAL_CONTACTS_FIELD, 'COMPANY_ID'],
    )
    const dealData = Array.isArray(deals) ? deals[0] : null
    if (!dealData) return

    const trustedId = normalizeIdList(dealData[TRUSTED_PERSON_FIELD])[0] || null
    const contactIds = normalizeIdList(dealData[DEAL_CONTACTS_FIELD])
    const deal = (props.deals || []).find((item) => String(item.ID) === String(dealId))

    if (deal) {
      applyTrustedPersonToDeal(dealId, trustedId, contactIds)
      if (dealData.COMPANY_ID != null && dealData.COMPANY_ID !== '') {
        deal.COMPANY_ID = dealData.COMPANY_ID
      }
      await ensureCompanyContactsLoaded(deal)
      await loadContactsByIds(collectDealContactIds(deal))
      return
    }

    applyTrustedPersonToDeal(dealId, trustedId, contactIds)
    await loadContactsByIds([
      ...contactIds,
      ...(trustedId ? [trustedId] : []),
    ])
  } catch (error) {
    console.error('Ошибка обновления данных доверенного лица:', error)
  }
}

async function loadContactsByIds(ids) {
  const uniqueIds = [...new Set(
    (ids || [])
      .map((id) => String(id))
      .filter((id) => id && !contactsById.value[id]),
  )]
  if (!uniqueIds.length) return

  contactsLoading.value = true
  try {
    const nextMap = { ...contactsById.value }
    // callApi сам режет ID на чанки по 50 и забирает через BX24.callBatch
    const result = await callApi(
      'crm.contact.list',
      { ID: uniqueIds },
      ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'POST'],
    )
    const items = Array.isArray(result)
      ? (result.length && Array.isArray(result[0]) ? result.flat() : result)
      : []
    items.forEach((contact) => {
      const id = String(contact.ID ?? contact.id ?? '')
      if (!id) return
      nextMap[id] = contact
    })
    contactsById.value = nextMap
    contactsRevision.value += 1
  } catch (error) {
    console.error('Ошибка загрузки контактов для доверенного лица:', error)
  } finally {
    contactsLoading.value = false
  }
}

async function loadTrustedPersonContactsForDeals(deals) {
  await loadContactsForDeals(deals, { loadCompanyContacts: false })
}

function normalizeSpaItems(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    if (raw.length && Array.isArray(raw[0])) return raw.flat()
    return raw
  }
  if (Array.isArray(raw.items)) return raw.items
  return []
}

function groupSpaItemsByDeal(dealIds, items, fallbackLabel, options = {}) {
  const map = {}
  dealIds.forEach((id) => {
    map[String(id)] = []
  })

  items.forEach((item) => {
    const parentId = String(item.parentId2 ?? item.PARENT_ID_2 ?? '')
    if (!parentId) return
    if (!map[parentId]) map[parentId] = []
    const id = item.id ?? item.ID
    const entry = {
      id,
      title: item.title || item.TITLE || `${fallbackLabel} #${id}`,
    }
    if (typeof options.mapItem === 'function') {
      Object.assign(entry, options.mapItem(item) || {})
    }
    map[parentId].push(entry)
  })

  return map
}

function isCommerceAlertFlag(value) {
  return value === 'Y' || value === true || value === 1 || value === '1'
}

function mapCommerceSpaItem(item) {
  const raw = item?.[COMMERCE_ALERT_FIELD]
    ?? item?.[COMMERCE_ALERT_FIELD_UF]
    ?? item?.ufCrm_42_1756818192879
  return { isAlert: isCommerceAlertFlag(raw) }
}

async function loadSpaItemsForDeals(deals, entityTypeId, targetRef, loadingRef, fallbackLabel, options = {}) {
  const dealIds = [...new Set(
    (deals || [])
      .map((deal) => deal?.ID)
      .filter((id) => id != null && id !== ''),
  )]

  if (!dealIds.length) {
    if (!options.merge) {
      targetRef.value = {}
    }
    return
  }

  loadingRef.value = true

  try {
    const select = ['id', 'title', 'parentId2', ...(options.selectFields || [])]
    const result = await callApi(
      'crm.item.list',
      { parentId2: dealIds },
      select,
      entityTypeId,
      0,
      0,
    )

    const grouped = groupSpaItemsByDeal(
      dealIds,
      normalizeSpaItems(result),
      fallbackLabel,
      options,
    )
    targetRef.value = options.merge
      ? { ...targetRef.value, ...grouped }
      : grouped
  } catch (error) {
    console.error(`Ошибка загрузки ${fallbackLabel}:`, error)
  } finally {
    loadingRef.value = false
  }
}

function waitMs(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function refreshExtraOptionsForDeal(deal, attempt = 0) {
  if (!deal?.ID) return

  const dealId = String(deal.ID)
  const previousCount = extraOptionsByDealId.value[dealId]?.length ?? 0

  await loadSpaItemsForDeals(
    [deal],
    EXTRA_OPTIONS_ENTITY_TYPE_ID,
    extraOptionsByDealId,
    extraOptionsLoading,
    'Опция',
    { merge: true },
  )

  const nextCount = extraOptionsByDealId.value[dealId]?.length ?? 0
  if (nextCount <= previousCount && attempt < 4) {
    await waitMs(350 * (attempt + 1))
    await refreshExtraOptionsForDeal(deal, attempt + 1)
  }
}

async function refreshCommerceForDeal(deal, attempt = 0) {
  if (!deal?.ID) return

  const dealId = String(deal.ID)
  const previousCount = commerceByDealId.value[dealId]?.length ?? 0

  await loadSpaItemsForDeals(
    [deal],
    COMMERCE_ENTITY_TYPE_ID,
    commerceByDealId,
    commerceLoading,
    'Коммерция',
    {
      merge: true,
      selectFields: [COMMERCE_ALERT_FIELD],
      mapItem: mapCommerceSpaItem,
    },
  )

  const nextCount = commerceByDealId.value[dealId]?.length ?? 0
  if (nextCount <= previousCount && attempt < 4) {
    await waitMs(350 * (attempt + 1))
    await refreshCommerceForDeal(deal, attempt + 1)
  }
}

async function loadLinkedSpaForDeals(deals) {
  await Promise.all([
    loadSpaItemsForDeals(
      deals,
      EXTRA_OPTIONS_ENTITY_TYPE_ID,
      extraOptionsByDealId,
      extraOptionsLoading,
      'Опция',
    ),
    loadSpaItemsForDeals(
      deals,
      COMMERCE_ENTITY_TYPE_ID,
      commerceByDealId,
      commerceLoading,
      'Коммерция',
      {
        selectFields: [COMMERCE_ALERT_FIELD],
        mapItem: mapCommerceSpaItem,
      },
    ),
  ])
}


function applyDialogViewportSize() {
  if (!props.modelValue) return

  const token = ++dialogResizeToken
  if (!dialogHostViewport) {
    dialogHostViewport = getHostViewportSize()
  }
  const { width, height } = dialogHostViewport

  document.documentElement.style.setProperty('--event-deals-dialog-max-height', `${height}px`)
  document.documentElement.style.setProperty('--event-deals-dialog-height', `${height}px`)
  document.documentElement.style.setProperty('--event-deals-dialog-width', `${width}px`)

  const dialog = document.querySelector('.event-deals-dialog-wrapper .event-deals-dialog')
  if (dialog) {
    dialog.style.height = `${height}px`
    dialog.style.maxHeight = `${height}px`
  }

  const runResize = () => {
    if (token !== dialogResizeToken || !props.modelValue) return
    try {
      (window as any).BX24?.resizeWindow?.(width, height)
    } catch (_) {
      // ignore
    }
  }

  nextTick(() => {
    requestAnimationFrame(() => {
      runResize()
      window.setTimeout(runResize, 120)
    })
  })
}

function clearDialogViewportSize() {
  dialogResizeToken += 1
  dialogHostViewport = null

  const dialog = document.querySelector('.event-deals-dialog-wrapper .event-deals-dialog')
  if (dialog) {
    dialog.style.height = ''
    dialog.style.maxHeight = ''
  }
  document.documentElement.style.removeProperty('--event-deals-dialog-height')
  document.documentElement.style.removeProperty('--event-deals-dialog-width')
  document.documentElement.style.removeProperty('--event-deals-dialog-max-height')
  try {
    (window as any).BX24?.fitWindow?.()
  } catch (_) {
    // ignore
  }
}

watch(
  () => props.modelValue,
  (open) => {
    const root = document.documentElement
    if (open) {
      // Capture host size once per open session before any BX24.resizeWindow.
      dialogHostViewport = getHostViewportSize()
      root.classList.add('event-deals-dialog-open')
      window.scrollTo(0, 0)
      applyDialogViewportSize()
      try {
        (window as any).BX24?.scrollParentWindow?.(0)
      } catch (_) {
        // ignore
      }
    } else {
      root.classList.remove('event-deals-dialog-open')
      clearDialogViewportSize()
    }

    if (!open) {
      resetCompanyContactsLoadingState()
      return
    }

    resetSearchState()
    activeFilter.value = 'all'
    activeCommerceFilter.value = null
    page.value = 1
    selectedDealIds.value = []
    openActionMenu.value = null
    savingStageDealId.value = null
    failedAvatars.value = new Set()
    cancelCellEdit()
    savingCell.value = { dealId: null, field: null }
    closeRequiredFieldsDialog()
    closeRefusalDialog()
    closeCommentDialog()
    audienceDialog.value = { open: false, dealId: null, dealTitle: '', trustedPersonId: null }
    isContactsBootstrapLoading.value = true
    loadLinkedSpaForDeals(props.deals)
    ensureParticipationStatusesLoaded()
    loadEventChecklist()
    loadCommerceFilterDealIds()
    if (!props.refreshing) {
      void bootstrapVisibleCompanyContacts()
    }
  },
)

watch(
  () => [
    props.event?.[COMMERCE_COLLECTED_FIELD],
    props.event?.[COMMERCE_COLLECTED_FIELD_CAMEL],
    props.event?.[COMMERCE_REMAINING_FIELD],
    props.event?.[COMMERCE_REMAINING_FIELD_CAMEL],
    props.event?.id,
    props.event?.ID,
  ],
  () => {
    if (!props.modelValue) return
    loadCommerceFilterDealIds()
  },
)

onBeforeUnmount(() => {
  clearSearchDebounceTimer()
  document.removeEventListener('click', onDocumentClick)
  document.documentElement.classList.remove('event-deals-dialog-open')
  clearDialogViewportSize()
})

watch(
  () => props.deals,
  (deals) => {
    if (!props.modelValue) return

    const dealIds = new Set((deals || []).map((deal) => String(deal.ID)))
    companyContactsLoadedDealIds.value = new Set(
      [...companyContactsLoadedDealIds.value].filter((id) => dealIds.has(id)),
    )

    loadLinkedSpaForDeals(deals)
    ensureParticipationStatusesLoaded()
    applyDialogViewportSize()

    if (!props.refreshing) {
      void bootstrapVisibleCompanyContacts()
    } else {
      isContactsBootstrapLoading.value = true
    }
  },
)

watch(filteredDeals, () => {
  if (!props.modelValue) return
  if (page.value > totalPages.value) page.value = totalPages.value
  applyDialogViewportSize()
  // silent: не прячем UI overlay'ем, иначе поле поиска теряет фокус
  if (!props.refreshing && !isDialogLoading.value) {
    void bootstrapVisibleCompanyContacts({ silent: true })
  }
})

watch(page, () => {
  if (!props.modelValue) return
  if (page.value > totalPages.value) page.value = totalPages.value
  applyDialogViewportSize()
  if (!props.refreshing && !isDialogLoading.value) {
    void bootstrapVisibleCompanyContacts({ silent: true })
  }
})

watch(
  () => props.refreshing,
  (isRefreshing, wasRefreshing) => {
    if (!props.modelValue) return

    if (isRefreshing) {
      isContactsBootstrapLoading.value = true
      return
    }

    if (wasRefreshing) {
      // Сделки уже пришли — догружаем контакты компаний и только потом снимаем overlay
      void bootstrapVisibleCompanyContacts()
    }

    loadEventChecklist()
    loadCommerceFilterDealIds()
    applyDialogViewportSize()
  },
)

watch(
  () => resolveEventId(),
  (eventId) => {
    if (!props.modelValue || !eventId) return
    loadEventChecklist()
  },
)
</script>

<style scoped>
.event-deals-dialog {
  display: flex;
  flex-direction: column;
  height: auto;
  max-height: var(--event-deals-dialog-max-height, 100dvh);
  width: 100%;
  border-radius: 0 !important;
  background: #fff;
  overflow: hidden;
  padding: 0;
}

.event-deals-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem 0.85rem;
  background: #fff;
  border-bottom: 0;
  flex: 0 0 auto;
  min-width: 0;
  overflow: hidden;
}

.event-deals-dialog__top {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 0 0 auto;
  margin: 0.75rem;
  padding-bottom: 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}

.event-deals-dialog__header-main {
  flex: 1 1 10rem;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.event-deals-dialog__metrics-row {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
  padding: 0 1.25rem;
}

.event-deals-dialog__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
  flex: 1 1 auto;
  min-width: 0;
}

.event-commerce-card {
  display: flex;
  flex-direction: column;
  flex: 0 0 15rem;
  min-width: 13.5rem;
  max-width: 17rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.event-commerce-card__title {
  margin: 0 0 0.55rem;
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
}

.event-commerce-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  margin: 0;
  padding: 0.45rem 0;
  border: 0;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: color 0.15s ease;
}

.event-commerce-card__row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.event-commerce-card__row:first-of-type {
  padding-top: 0.15rem;
}

.event-commerce-card__row:hover:not(:disabled) .event-commerce-card__label,
.event-commerce-card__row:hover:not(:disabled) .event-commerce-card__value {
  color: #2563eb;
}

.event-commerce-card__row:disabled {
  opacity: 0.65;
  cursor: wait;
}

.event-commerce-card__row--active .event-commerce-card__label,
.event-commerce-card__row--active .event-commerce-card__value {
  color: #2563eb;
}

.event-commerce-card__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
}

.event-commerce-card__value {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}

.event-deals-dialog__stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.25rem;
  min-width: 0;
  padding: 0.75rem 0.9rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.event-deals-dialog__stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
}

.event-deals-dialog__stat-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  white-space: nowrap;
}

.event-deals-dialog__stat-value--over {
  color: #16a34a;
}

.event-deals-dialog__stat-value--over-negative {
  color: #f87171;
}

.event-deals-dialog__percent-bar {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 100%;
  margin-top: 0.25rem;
}

.event-deals-dialog__percent-track {
  position: relative;
  display: flex;
  width: 100%;
  height: 0.45rem;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.event-deals-dialog__percent-fill {
  height: 100%;
}

.event-deals-dialog__percent-fill--plan {
  background: #3b82f6;
}

.event-deals-dialog__percent-fill--over {
  background: #22c55e;
}

.event-deals-dialog__percent-marker {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  margin-left: -1px;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
  pointer-events: none;
}

.event-deals-dialog__percent-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  min-height: 0.9rem;
}

.event-deals-dialog__percent-cap {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
}

.event-deals-dialog__percent-over {
  margin-left: auto;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #16a34a;
  white-space: nowrap;
}

.event-deals-dialog__header-tools {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex: 0 0 auto;
  margin-left: auto;
}

.event-deals-dialog__text-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.25rem;
  padding: 0 0.85rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: #fff;
  color: #111827;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.event-deals-dialog__text-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.event-deals-dialog__text-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.event-deals-dialog__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: #fff;
  color: #111827;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.event-deals-dialog__icon-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.event-deals-dialog__icon-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.event-deals-dialog__title {
  text-align: start;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
  max-width: 100%;
}

.event-deals-dialog__subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #64748b;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
  max-width: 100%;
}

.event-deals-dialog__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  color: #64748b;
}

.event-deals-dialog__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.event-deals-dialog__meta-divider {
  width: 1px;
  height: 1.25rem;
  margin: 0 1rem;
  background: #e2e8f0;
  flex: 0 0 auto;
}

.event-checklist {
  margin-top: 0.65rem;
  max-width: min(280px, 100%);
  padding: 0.55rem 0.65rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}

.event-checklist--inline {
  margin-top: 0;
  max-width: min(320px, 100%);
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  display: inline-flex;
  flex: 1 1 auto;
  min-width: 180px;
}

.event-checklist--inline .event-checklist__row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  min-width: 0;
}

.event-checklist--inline .event-checklist__tag {
  justify-content: flex-start;
  gap: 0.35rem;
  width: auto;
  flex: 0 0 auto;
  white-space: nowrap;
}

.event-checklist--inline .event-checklist__label {
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #64748b;
}

.event-checklist--inline .event-checklist__count {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #334155;
}

.event-checklist--inline .event-checklist__track {
  margin-top: 0;
  flex: 1 1 auto;
  min-width: 80px;
  max-width: 180px;
  height: 5px;
}

.event-checklist--inline .event-checklist__create {
  width: auto;
  flex: 0 0 auto;
}

.event-checklist--inline .event-checklist__loading {
  font-size: 0.8125rem;
}

.event-checklist__loading {
  font-size: 0.75rem;
  color: #94a3b8;
}

.event-checklist__tag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: #0f172a;
  cursor: pointer;
  text-align: left;
}

.event-checklist__tag:hover .event-checklist__label,
.event-checklist__tag:hover .event-checklist__count {
  color: #0f766e;
}

.event-checklist__label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #475569;
}

.event-checklist__count {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #0f172a;
}

.event-checklist__track {
  margin-top: 0.4rem;
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.event-checklist__fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.25s ease;
  background: #22c55e;
}

.event-checklist__fill--red {
  background: #ef4444;
}

.event-checklist__fill--orange {
  background: #f59e0b;
}

.event-checklist__fill--green {
  background: #22c55e;
}

.event-checklist__create:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.event-deals-dialog__content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  height: auto;
  gap: 0.75rem !important;
  overflow: hidden;
  padding: 0 1.25rem 1rem !important;
  position: relative;
}

.event-deals-dialog__toolbar {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  overflow: visible;
  position: relative;
  z-index: 6;
}

.event-deals-dialog__search {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  max-height: 3rem;
  margin-top: auto;
  position: relative;
  z-index: 3;
  pointer-events: auto;
}

.event-deals-dialog__search :deep(.v-input__control) {
  height: 3rem;
  min-height: 3rem;
}

.event-deals-dialog__search :deep(.v-field) {
  background: #fff;
  border-radius: 0.65rem;
  pointer-events: auto;
  min-height: 3rem !important;
  height: 3rem !important;
  --v-field-padding-top: 0px;
  --v-field-padding-bottom: 0px;
  box-shadow: none;
}

.event-deals-dialog__search :deep(.v-field__input) {
  min-height: 3rem !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 0.975rem;
  align-items: center;
}

.event-deals-dialog__search :deep(.v-field__prepend-inner),
.event-deals-dialog__search :deep(.v-field__append-inner),
.event-deals-dialog__search :deep(.v-field__clearable) {
  padding-top: 0 !important;
  align-items: center;
}

.event-deals-dialog__search :deep(input) {
  pointer-events: auto;
  cursor: text;
}

.event-deals-dialog__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  min-height: 18rem;
  height: 100%;
  padding: 2rem 1rem;
  color: #64748b;
}

.event-deals-dialog__loading-text {
  font-size: 0.875rem;
  font-weight: 600;
}

.event-deals-dialog__panels {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-bottom: 0;
  flex: 0 0 auto;
  min-width: 0;
  position: relative;
  z-index: 5;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
  overflow: visible;
}

.event-deals-dialog__panel-head {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.event-deals-dialog__panel-title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  color: #94a3b8;
}

.event-deals-dialog__categories .event-deals-dialog__panel-title {
  color: #0f172a;
}

.event-deals-dialog__categories {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 0.65rem;
  min-width: 0;
  padding: 0.85rem 1rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  justify-content: flex-start;
}

.event-deals-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.35rem;
  position: relative;
  z-index: 5;
}

.event-action-dropdown {
  position: relative;
  flex: 0 0 auto;
  width: auto;
}

.event-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  width: auto;
  padding: 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.4rem;
  background: #fff;
  color: #334155;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
  text-align: left;
}

.event-action-btn :deep(.v-icon) {
  color: #64748b;
  flex: 0 0 auto;
}

.event-action-btn > span:nth-child(2) {
  flex: 0 0 auto;
}

.event-action-btn:hover,
.event-action-btn--open {
  background: #f8fafc;
}

.event-action-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.event-action-dropdown__menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: auto;
  z-index: 20;
  min-width: 240px;
  padding: 0.35rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.65rem;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
}

.event-action-dropdown__item {
  display: block;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  color: #334155;
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.event-action-dropdown__item:hover {
  background: #f1f5f9;
}

.event-deals-dialog__tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex: 0 1 auto;
  align-content: flex-start;
  border: 0;
  border-radius: 0;
  overflow: visible;
  background: transparent;
}

.event-filter-tab {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #fff;
  color: #334155;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.event-filter-tab__label {
  line-height: 1.2;
}

.event-filter-tab__sum {
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  color: #64748b;
}

.event-filter-tab--active .event-filter-tab__sum {
  color: rgba(255, 255, 255, 0.92);
}

.event-filter-tab:hover:not(.event-filter-tab--active) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.event-filter-tab--active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.event-deals-table-card {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  align-self: stretch;
  min-height: 0;
  height: 100%;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  box-shadow: none;
  overflow: hidden;
}

.event-deals-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.event-deals-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1320px;
  table-layout: auto;
}

.event-deals-table th,
.event-deals-table td {
  padding: 0.75rem 0.7rem;
  border-bottom: 1px solid #eef2f7;
  border-right: 1px solid #eef2f7;
  text-align: left;
  vertical-align: middle;
  font-size: 0.8125rem;
  color: #334155;
}

.event-deals-table td.deal-company-cell,
.event-deals-table td.deal-company-cell * {
  overflow-wrap: break-word;
  word-break: break-all;
  white-space: normal;
}

.event-deals-table th:last-child,
.event-deals-table td:last-child {
  border-right: 0;
}

.event-deals-table th {
  height: 52px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #64748b;
  background: #f8fafc;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}

.event-deals-table tbody tr {
  background: #fff;
  transition: background-color 0.15s ease;
}

.event-deals-table tbody tr:hover {
  background: #f8fbfd;
}

.event-deals-table tbody .event-deals-table__row--selected {
  background: #eef9fb;
}

.event-deals-table tbody .event-deals-table__row--selected:hover {
  background: #e8f6f9;
}

.event-deals-table__empty {
  text-align: center !important;
  color: #94a3b8;
  padding: 2rem 1rem !important;
}

.deal-company {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  min-width: 155px;
  max-width: 300px;
  width: 100%;
  overflow: hidden;
}

.deal-company__text {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.deal-company__deal-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: #15958d;
  font: inherit;
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deal-company__deal-link:hover {
  text-decoration: underline;
}

.deal-company__audience-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #1d4ed8;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}

.deal-company__audience-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

.deal-company__med-menu {
  position: relative;
}

.deal-company__med-menu-popup {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.25rem);
  left: 0;
  min-width: 10rem;
  padding: 0.3rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(23, 43, 77, 0.14);
}

.deal-company__med-menu-item {
  display: block;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: #263447;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
}

.deal-company__med-menu-item:hover {
  background: #eef3ff;
  color: #2864df;
}

.deal-company__open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  flex: 0 0 auto;
}

.deal-company__open:hover {
  background: #f1f5f9;
  color: #475569;
}

.editable-cell {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  min-width: 1.5rem;
  min-height: 1.25rem;
}

.editable-cell:hover {
  background: #f8fafc;
  box-shadow: inset 0 0 0 1px #dbe3ee;
}

.editable-cell--empty {
  color: #94a3b8;
}

.cell-editor {
  min-width: 110px;
}

.cell-editor__input {
  width: 100%;
  min-width: 110px;
  padding: 0.35rem 0.45rem;
  border: 1px solid #94a3b8;
  border-radius: 0.35rem;
  background: #fff;
  color: #0f172a;
  font: inherit;
  outline: none;
}

.cell-editor__input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.muted-cell {
  color: #94a3b8;
}

.selection-column {
  width: 40px;
  min-width: 40px;
  padding-right: 0.45rem !important;
  padding-left: 0.75rem !important;
  text-align: center !important;
}

.table-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.table-checkbox input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.table-checkbox span {
  position: relative;
  width: 17px;
  height: 17px;
  border: 1px solid #aeb8c4;
  border-radius: 3px;
  background: #fff;
}

.table-checkbox input:checked + span,
.table-checkbox input:indeterminate + span {
  border-color: #13958c;
  background: #13958c;
}

.table-checkbox input:checked + span::after {
  content: "";
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.table-checkbox input:indeterminate + span::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 7px;
  width: 7px;
  height: 2px;
  background: #fff;
}

.selection-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 140px;
}

.selection-summary button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #15958d;
  font-size: inherit;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.sort-arrows {
  color: #94a3b8;
  font-size: 0.75rem;
}

.col-responsible {
  text-align: center !important;
  vertical-align: middle !important;
}

.col-responsible .muted-cell {
  display: inline-block;
}

.responsible-person__avatar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0 auto;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
}

.responsible-person__avatar-btn:hover {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
}

.responsible-person__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.responsible-person__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(145deg, #dbeafe, #d1fae5);
  color: #334155;
  font-size: 0.7rem;
  font-weight: 700;
}

.date-time-cell {
  min-width: 110px;
  line-height: 1.45;
}

.number-cell {
  text-align: center !important;
}

.trusted-person-cell {
  min-width: 180px;
  max-width: 240px;
}

.trusted-person-autocomplete {
  min-width: 160px;
}

.trusted-person-autocomplete :deep(.v-field) {
  border-radius: 0.35rem;
  font-size: 0.75rem;
}

.trusted-person-autocomplete :deep(.v-field__input) {
  min-height: 32px;
  padding-top: 0;
  padding-bottom: 0;
}

.stage-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.stage-badge-button {
  border: 0;
  cursor: pointer;
}

.stage-picker {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 176px; /* 220px - 20% */
  max-width: 256px; /* 320px - 20% */
}

.stage-picker--saving {
  opacity: 0.65;
}

.stage-picker__track {
  display: flex;
  width: 100%;
  min-height: 12.8px; /* 16px - 20% */
}

.stage-picker__seg {
  flex: 1 1 0;
  min-width: 8px; /* 10px - 20% */
  height: 12.8px; /* 16px - 20% */
  padding: 0;
  margin: 0 0 0 -1px;
  border: 1px solid #cfd7de;
  border-radius: 0;
  background: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.stage-picker__seg:first-child {
  margin-left: 0;
  border-radius: 2px 0 0 2px;
}

.stage-picker__seg:last-child {
  border-radius: 0 2px 2px 0;
}

.stage-picker__seg:hover:not(:disabled) {
  z-index: 1;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.18);
}

.stage-picker__seg--filled,
.stage-picker__seg--current:not(.stage-picker__seg--refusal) {
  background: #aae9fb;
  border-color: #7ec8db;
}

/* Цвета сегментов = цвета v-chip (stage-badge) */
.stage-picker__track.stage-badge--sky-light .stage-picker__seg--filled,
.stage-picker__track.stage-badge--sky-light .stage-picker__seg--current:not(.stage-picker__seg--refusal) {
  background: #aae9fb;
  border-color: #7ec8db;
}

.stage-picker__track.stage-badge--sky-strong .stage-picker__seg--filled,
.stage-picker__track.stage-badge--sky-strong .stage-picker__seg--current:not(.stage-picker__seg--refusal) {
  background: #67cef9;
  border-color: #3bb4e6;
}

.stage-picker__track.stage-badge--warm .stage-picker__seg--filled,
.stage-picker__track.stage-badge--warm .stage-picker__seg--current:not(.stage-picker__seg--refusal) {
  background: #fff893;
  border-color: #e6d85c;
}

.stage-picker__track.stage-badge--green .stage-picker__seg--filled,
.stage-picker__track.stage-badge--green .stage-picker__seg--current:not(.stage-picker__seg--refusal),
.stage-picker__track--success .stage-picker__seg--filled,
.stage-picker__track--success .stage-picker__seg--current:not(.stage-picker__seg--refusal) {
  background: #7bc56e;
  border-color: #5aa84d;
}

.stage-picker__track.stage-badge--neutral .stage-picker__seg--filled,
.stage-picker__track.stage-badge--neutral .stage-picker__seg--current:not(.stage-picker__seg--refusal) {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.stage-picker__track.stage-badge--danger .stage-picker__seg,
.stage-picker__track.stage-badge--danger .stage-picker__seg--filled,
.stage-picker__track.stage-badge--danger .stage-picker__seg--current,
.stage-picker__track--refusal .stage-picker__seg,
.stage-picker__track--refusal .stage-picker__seg--filled,
.stage-picker__track--refusal .stage-picker__seg--current {
  background: #fee2e2;
  border-color: #cfd7de;
}

.stage-picker__seg--refusal {
  position: relative;
  z-index: 1;
  margin-left: 0;
  border-left: 1px solid #cfd7de;
  border-right: 1px solid #cfd7de;
}

.stage-picker__track--refusal .stage-picker__seg--refusal,
.stage-picker__track.stage-badge--danger .stage-picker__seg--refusal {
  border-left-color: #cfd7de;
  border-right-color: #cfd7de;
}

.stage-picker__track--success .stage-picker__seg--refusal,
.stage-picker__track--success .stage-picker__seg--refusal.stage-picker__seg--filled,
.stage-picker__track.stage-badge--green .stage-picker__seg--refusal,
.stage-picker__track.stage-badge--green .stage-picker__seg--refusal.stage-picker__seg--filled {
  background: #ffffff;
  border-color: #cfd7de;
}

.stage-picker__seg:disabled {
  cursor: wait;
}

.stage-picker__label {
  align-self: flex-start;
  height: auto !important;
  min-height: 24px;
  padding: 0.1rem 0.55rem !important;
  font-size: 0.75rem !important;
  font-weight: 700 !important;
  border: 0 !important;
}

.stage-picker__label.stage-badge--sky-light {
  background: #aae9fb !important;
  color: #0f4c5c !important;
}

.stage-picker__label.stage-badge--sky-strong {
  background: #67cef9 !important;
  color: #0f4c5c !important;
}

.stage-picker__label.stage-badge--warm {
  background: #fff893 !important;
  color: #6b5a00 !important;
}

.stage-picker__label.stage-badge--danger {
  background: #fee2e2 !important;
  color: #b91c1c !important;
}

.stage-picker__label.stage-badge--green {
  background: #7bc56e !important;
  color: #134e13 !important;
}

.stage-picker__label.stage-badge--neutral {
  background: #e2e8f0 !important;
  color: #475569 !important;
}

.stage-badge--sky-light {
  background: #aae9fb;
  color: #0f4c5c;
}

.stage-badge--sky-strong {
  background: #67cef9;
  color: #0f4c5c;
}

.stage-badge--warm {
  background: #fff893;
  color: #6b5a00;
}

.stage-badge--danger {
  background: #fee2e2;
  color: #b91c1c;
}

.stage-badge--green {
  background: #7bc56e;
  color: #134e13;
}

.stage-badge--neutral {
  background: #e2e8f0;
  color: #475569;
}

.refusal-dialog {
  overflow: hidden;
}

.refusal-dialog__title {
  font-size: 1.05rem !important;
  font-weight: 700 !important;
  color: #1e293b !important;
  padding: 1rem 1.25rem 0.5rem !important;
}

.refusal-dialog__body {
  padding: 0.5rem 1.25rem 0.25rem !important;
}

.refusal-dialog__list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.75rem 1rem;
  background: #eef2f6;
  border-radius: 2px;
  max-height: min(60vh, 420px);
  overflow: auto;
}

.refusal-dialog__option {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.35rem 0.25rem;
  cursor: pointer;
  color: #1e293b;
  font-size: 0.92rem;
  line-height: 1.35;
}

.refusal-dialog__option:hover {
  background: rgba(255, 255, 255, 0.55);
}

.refusal-dialog__option--selected {
  background: rgba(255, 255, 255, 0.7);
}

.refusal-dialog__radio {
  margin-top: 0.2rem;
  accent-color: #2196f3;
  flex-shrink: 0;
}

.refusal-dialog__option-label {
  flex: 1;
}

.refusal-dialog__actions {
  display: flex !important;
  justify-content: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem 1.25rem !important;
}

.refusal-dialog__save {
  min-width: 140px;
  padding: 0.55rem 1.25rem;
  border: 0;
  border-radius: 2px;
  background: #c6e700;
  color: #1e293b;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.refusal-dialog__save:hover:not(:disabled) {
  filter: brightness(0.97);
}

.refusal-dialog__save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.refusal-dialog__cancel {
  border: 0;
  background: transparent;
  color: #e53935;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 0.55rem 0.25rem;
}

.refusal-dialog__cancel:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.commerce-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
}

.event-deals-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-top: 1px solid #eef2f7;
  flex: 0 0 auto;
  margin-top: auto;
  position: sticky;
  bottom: 0;
  z-index: 4;
  background: #fff;
  box-shadow: 0 -6px 16px rgba(15, 23, 42, 0.06);
}

.event-deals-pagination__info {
  font-size: 0.875rem;
  color: #64748b;
}

.event-deals-pagination__pages {
  display: flex;
  gap: 0.35rem;
}

.page-btn {
  min-width: 2rem;
  height: 2rem;
  border: 1px solid #dbe3ee;
  border-radius: 0.45rem;
  background: #fff;
  color: #475569;
  cursor: pointer;
}

.page-btn--active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.required-fields-dialog {
  display: flex;
  flex-direction: column;
  max-height: min(90dvh, 720px);
  overflow: hidden;
  background: #fff;
}

.required-fields-dialog__title {
  flex: 0 0 auto;
  color: #0f172a !important;
  background: #fff !important;
  font-size: 1.25rem !important;
  font-weight: 700 !important;
  line-height: 1.35 !important;
  letter-spacing: normal !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  opacity: 1 !important;
  padding: 1rem 1.25rem 0.35rem !important;
  min-height: auto !important;
  height: auto !important;
}

.required-fields-dialog__subtitle {
  flex: 0 0 auto;
  color: #64748b !important;
  opacity: 1 !important;
  padding: 0 1.25rem 0.75rem !important;
  white-space: normal !important;
}

.required-fields-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-top: 0.25rem !important;
}

.required-fields-dialog :deep(.v-card-actions) {
  flex: 0 0 auto;
  background: #fff;
}

.required-fields-dialog__loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  color: #475569;
}

.required-fields-dialog__form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.required-fields-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  position: relative;
  z-index: 1;
}

.required-fields-dialog__field:focus-within {
  z-index: 5;
}

.required-fields-dialog__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #334155;
}

.required-fields-dialog__asterisk {
  color: #dc2626;
  margin-left: 0.15rem;
}

.event-deals-table th.col-comment,
.event-deals-table td.col-comment {
  width: 120px;
  min-width: 120px;
  max-width: 120px;
  box-sizing: border-box;
}

.event-deals-table td.col-comment {
  overflow: hidden;
}

.comment-cell {
  display: block;
  width: 100%;
  max-width: 100%;
  padding: 0.15rem 0.2rem;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.comment-cell:hover {
  background: #f8fafc;
  box-shadow: inset 0 0 0 1px #dbe3ee;
}

.comment-cell--empty {
  color: #94a3b8;
}

.comment-cell__text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-dialog__title {
  font-size: 1.05rem !important;
  font-weight: 700 !important;
  color: #1e293b !important;
  padding: 1rem 1.25rem 0.25rem !important;
}

.comment-dialog__subtitle {
  color: #64748b !important;
  padding: 0 1.25rem !important;
  opacity: 1 !important;
}

.comment-dialog__body {
  padding: 0.75rem 1.25rem 0.25rem !important;
}

.comment-dialog__actions {
  padding: 0.5rem 1rem 1rem !important;
}

.event-deals-table th.col-linked-spa {
  width: 1%;
  white-space: nowrap;
  line-height: 1.15;
  text-align: center;
  padding-left: 0.45rem;
  padding-right: 0.45rem;
}

.event-deals-table td.col-linked-spa {
  width: 1%;
  max-width: 0;
  padding-left: 0.45rem;
  padding-right: 0.45rem;
  vertical-align: top;
}

.linked-spa-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.status-participation-cell .linked-spa-cell,
.status-participation-cell__inner {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.event-deals-table th.col-status-participation,
.event-deals-table td.col-status-participation {
  width: 10.35rem; /* 9rem + 15% */
  min-width: 10.35rem;
  max-width: 10.35rem;
  padding-left: 0.4rem;
  padding-right: 0.4rem;
  box-sizing: border-box;
  overflow: hidden;
  vertical-align: middle;
}

.event-deals-table th.col-status-participation {
  white-space: normal;
  line-height: 1.15;
  text-align: center;
}

.status-participation-select {
  flex: 1 1 auto;
  min-width: 0 !important;
  max-width: 100% !important;
  width: 100%;
}

.status-participation-select :deep(.v-input__control),
.status-participation-select :deep(.v-field) {
  width: 100%;
  max-width: 100%;
}

.status-participation-select :deep(.v-field) {
  font-size: 0.6875rem;
  min-height: 28px !important;
}

.status-participation-select :deep(.v-field__input) {
  min-height: 28px !important;
  padding-top: 2px !important;
  padding-bottom: 2px !important;
  padding-inline: 6px !important;
}

.status-participation-select :deep(.v-field__append-inner),
.status-participation-select :deep(.v-field__clearable) {
  padding-top: 0 !important;
  padding-inline: 2px !important;
}

.status-participation-select :deep(.v-icon) {
  font-size: 1rem !important;
}

.status-participation-cell .linked-spa-add {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  min-width: 22px;
  padding: 0;
  font-size: 0.85rem;
}

.required-fields-dialog__field--invalid .required-fields-dialog__label {
  color: #dc2626;
}

.required-fields-dialog__field--invalid :deep(.v-field) {
  --v-field-border-opacity: 1;
  border-color: #dc2626 !important;
}

.required-fields-dialog__field--invalid :deep(.v-field__outline) {
  color: #dc2626 !important;
}

.required-fields-dialog__submit-wrap {
  position: relative;
  display: inline-flex;
}

.required-fields-dialog__submit--blocked {
  opacity: 0.55 !important;
  cursor: not-allowed !important;
}

.required-fields-dialog__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.required-fields-dialog__status .linked-spa-add {
  flex: 0 0 auto;
  align-self: center;
}

.required-fields-dialog__autocomplete {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.linked-spa-cell__list {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem;
  min-width: 0;
  width: 100%;
}

.linked-spa-cell__loading {
  color: #94a3b8;
  font-size: 0.75rem;
  text-align: center;
}

.linked-spa-chip {
  display: block;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  padding: 0.15rem 0.25rem;
  border: 1px solid #dbe3ee;
  border-radius: 6px;
  background: #f8fafc;
  color: #15958d;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  text-align: center;
}

.linked-spa-chip:hover {
  background: #eef9fb;
  border-color: #9fd6d1;
}

.linked-spa-chip--ok {
  color: #15958d;
  border-color: #9fd6d1;
  background: #eef9fb;
}

.linked-spa-chip--ok:hover {
  background: #dff5f2;
  border-color: #6fc4bc;
}

.linked-spa-chip--danger {
  color: #dc2626;
  border-color: #fca5a5;
  background: #fef2f2;
}

.linked-spa-chip--danger:hover {
  background: #fee2e2;
  border-color: #f87171;
}

.linked-spa-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  border: 1px solid #dbe3ee;
  border-radius: 6px;
  background: #fff;
  color: #2563eb;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.linked-spa-add:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}
</style>

<style>
.event-deals-dialog-overlay.v-overlay {
  position: fixed !important;
  inset: 0 !important;
  width: 100% !important;
  height: var(--event-deals-dialog-height, 100dvh) !important;
  max-height: var(--event-deals-dialog-max-height, 100dvh) !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: flex-start !important;
  overflow: hidden !important;
  pointer-events: auto !important;
  z-index: 2400 !important;
}

.event-deals-dialog-overlay .v-overlay__scrim {
  pointer-events: none !important;
}

.event-deals-dialog-wrapper,
.event-deals-dialog-wrapper.v-overlay__content {
  position: relative !important;
  inset: auto !important;
  top: 0 !important;
  left: 0 !important;
  align-self: flex-start !important;
  width: 100% !important;
  height: var(--event-deals-dialog-height, auto) !important;
  max-width: 100% !important;
  max-height: var(--event-deals-dialog-max-height, 100dvh) !important;
  margin: 0 !important;
  border-radius: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  transform: none !important;
  pointer-events: auto !important;
  z-index: 1 !important;
}

.event-deals-dialog-wrapper .event-deals-dialog.v-card {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 auto !important;
  width: 100%;
  height: var(--event-deals-dialog-height, 100dvh) !important;
  max-height: var(--event-deals-dialog-max-height, 100dvh) !important;
  min-height: 0 !important;
  border-radius: 0 !important;
  overflow: hidden !important;
  pointer-events: auto !important;
  padding: 0 !important;
}

.event-deals-dialog-wrapper .event-deals-dialog__content.v-card-text {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 auto !important;
  width: 100%;
  height: 100% !important;
  max-height: none !important;
  min-height: 0 !important;
  max-width: none;
  gap: 0.75rem !important;
  padding: 0 1.25rem 1rem !important;
  overflow: hidden !important;
  pointer-events: auto !important;
  align-content: flex-start !important;
  justify-content: flex-start !important;
}

.event-deals-dialog-wrapper .event-deals-dialog__toolbar,
.event-deals-dialog-wrapper .event-deals-dialog__search {
  position: relative;
  z-index: 3;
  pointer-events: auto !important;
  overflow: visible;
}

.event-deals-dialog-wrapper .event-deals-table-card {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: 100% !important;
  margin-bottom: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

.event-deals-dialog-wrapper .event-deals-table-wrap {
  flex: 1 1 auto !important;
  min-height: 120px !important;
  max-height: none !important;
  overflow: auto !important;
}

.event-deals-dialog-wrapper .event-deals-pagination {
  flex: 0 0 auto !important;
  margin-top: auto !important;
  position: sticky !important;
  bottom: 0 !important;
  z-index: 5 !important;
  background: #ffffff !important;
  box-shadow: 0 -6px 16px rgba(15, 23, 42, 0.06);
}

html.event-deals-dialog-open,
html.event-deals-dialog-open body {
  overflow: hidden !important;
  overscroll-behavior: none;
}

.required-fields-dialog-overlay.v-overlay,
.v-overlay.required-fields-dialog-overlay {
  z-index: 4500 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: auto !important;
  padding: 1rem !important;
}

.required-fields-dialog-overlay .v-overlay__scrim {
  z-index: 4500 !important;
}

.required-fields-dialog-overlay .v-overlay__content,
.required-fields-dialog-content {
  z-index: 4501 !important;
  position: relative !important;
  margin: auto !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
  max-width: min(560px, calc(100vw - 2rem)) !important;
  max-height: min(90dvh, 720px) !important;
  overflow: visible !important;
}
</style>
