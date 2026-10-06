<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    persistent
    scrollable
    transition="dialog-bottom-transition"
    :z-index="3000"
    class="welcome-mailing-dialog-overlay"
    content-class="welcome-mailing-dialog-wrapper"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="welcome-mailing-dialog">
      <v-toolbar density="compact" color="white" flat class="welcome-mailing-dialog__toolbar">
        <div class="welcome-mailing-dialog__toolbar-text">
          <div class="welcome-mailing-dialog__title">Приветственная рассылка</div>
          <div v-if="eventTitle" class="welcome-mailing-dialog__subtitle">{{ eventTitle }}</div>
        </div>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" aria-label="Закрыть" @click="closeDialog" />
      </v-toolbar>

      <v-card-text class="welcome-mailing-dialog__content">
        <div v-if="loadingData" class="welcome-mailing-dialog__loading">
          <v-progress-circular indeterminate color="primary" />
          <div class="mt-2">Загрузка данных...</div>
        </div>

        <template v-else>
          <v-tabs
            v-model="activeTab"
            class="welcome-mailing-dialog__tabs"
            color="black"
            slider-color="black"
          >
            <v-tab value="send" class="welcome-mailing-dialog__tab">Отправка сообщений</v-tab>
            <v-tab value="contacts" class="welcome-mailing-dialog__tab">Контакты мероприятия</v-tab>
          </v-tabs>

          <v-window v-model="activeTab" class="welcome-mailing-dialog__window">
            <v-window-item value="send">
              <v-form
                ref="form"
                class="welcome-mailing-send-form"
                @submit.prevent="submitForm"
              >
                <v-textarea
                  v-model="formData.input"
                  class="welcome-mailing-send-form__message"
                  label="Сообщение"
                  :rules="requiredRules"
                  required
                  rows="6"
                  auto-grow
                  variant="outlined"
                  hide-details="auto"
                />

                <v-file-input
                  v-model="formData.files"
                  class="welcome-mailing-send-form__files"
                  label="Прикрепить файлы"
                  multiple
                  chips
                  counter
                  show-size
                  prepend-icon="mdi-paperclip"
                  :rules="fileRules"
                  variant="outlined"
                  hide-details="auto"
                />

                <v-btn
                  type="submit"
                  class="welcome-mailing-send-form__submit"
                  variant="text"
                  :loading="loading"
                  :disabled="loading || !isFormValid"
                >
                  Отправить
                </v-btn>
              </v-form>
            </v-window-item>

            <v-window-item value="contacts">
              <div class="welcome-mailing-contacts">
                <div v-if="loadingContacts" class="welcome-mailing-dialog__loading">
                  <v-progress-circular indeterminate color="primary" />
                  <div class="mt-2">Загрузка контактов...</div>
                </div>

                <v-alert v-else-if="errorMessage" type="error" class="mb-4">
                  {{ errorMessage }}
                </v-alert>

                <div v-else-if="userDistributions.length > 0">
                  <div
                    v-for="(userDistribution, userIndex) in userDistributions"
                    :key="userIndex"
                    class="mb-6"
                  >
                    <v-card variant="outlined" class="mb-2">
                      <v-card-text class="pa-3">
                        <div class="d-flex justify-space-between align-center">
                          <div>
                            <strong class="text-h6">{{ userDistribution.userName }}</strong>
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            Рассылок: {{ userDistribution.distributions.length }}
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>

                    <div
                      v-for="(distribution, distIndex) in userDistribution.distributions"
                      :key="distIndex"
                      class="mb-4"
                    >
                      <v-card variant="tonal" class="mb-2">
                        <v-card-text class="pa-2">
                          <div class="d-flex justify-space-between align-center">
                            <div>
                              <strong>Рассылка {{ distIndex + 1 }}</strong>
                              <div class="text-caption">
                                ЦА рассылки: {{ distribution.distributionTargetAudience || 'Не указана' }}
                              </div>
                            </div>
                            <div class="text-caption text-medium-emphasis">
                              Компаний: {{ distribution.companies.length }}
                              <br>
                              Контактов: {{ distribution.totalContacts }}
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <div
                        v-for="(company, companyIndex) in distribution.companies"
                        :key="companyIndex"
                        class="mb-4"
                      >
                        <v-card variant="outlined" class="mb-2">
                          <v-card-text class="pa-2">
                            <div class="d-flex justify-space-between align-center">
                              <div>
                                <strong>{{ company.companyName || 'Без компании' }}</strong>
                              </div>
                              <div class="text-caption text-medium-emphasis">
                                Контактов: {{ company.contacts.length }}
                              </div>
                            </div>
                          </v-card-text>
                        </v-card>

                        <v-table density="compact" class="company-contacts-table mb-4">
                          <thead>
                            <tr>
                              <th>ФИО</th>
                              <th>ЦА контакта</th>
                              <th>Должность</th>
                              <th>Email</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="contact in company.contacts" :key="contact.ID">
                              <td>
                                <a
                                  :href="`https://ittochka.bitrix24.ru/crm/contact/details/${contact.ID}/`"
                                  class="link"
                                  target="_blank"
                                >
                                  {{ contact.LAST_NAME }}
                                  {{ contact.NAME }}
                                  {{ contact.SECOND_NAME }}
                                </a>
                              </td>
                              <td>
                                <span v-if="contact.CONTACT_TARGET_AUDIENCE && contact.CONTACT_TARGET_AUDIENCE !== 'Не указана'">
                                  {{ contact.CONTACT_TARGET_AUDIENCE }}
                                </span>
                                <span v-else class="text-medium-emphasis">Не указана</span>
                              </td>
                              <td>
                                <span v-if="contact.POST">
                                  {{ contact.POST }}
                                </span>
                                <span v-else class="text-medium-emphasis">Не указана</span>
                              </td>
                              <td>
                                <span v-if="contact.EMAIL && contact.EMAIL.length > 0">
                                  {{ contact.EMAIL[0].VALUE }}
                                </span>
                                <span v-else class="text-error">Нет email</span>
                              </td>
                              <td>
                                <v-btn
                                  icon
                                  size="x-small"
                                  :color="isExcluded(contact.ID) ? 'error' : 'success'"
                                  :title="isExcluded(contact.ID) ? 'Включить в рассылку' : 'Исключить из рассылки'"
                                  @click="toggleExcludeContact(contact.ID)"
                                >
                                  <v-icon v-if="isExcluded(contact.ID)">mdi-plus-circle</v-icon>
                                  <v-icon v-else>mdi-close-circle</v-icon>
                                </v-btn>
                              </td>
                            </tr>
                          </tbody>
                        </v-table>
                      </div>
                    </div>
                  </div>
                </div>

                <v-alert v-else type="warning">
                  Контакты не найдены или мероприятие не содержит сделок
                </v-alert>
              </div>
            </v-window-item>
          </v-window>
        </template>
      </v-card-text>

      <v-snackbar v-model="snackbar.show" :color="snackbar.color">
        {{ snackbar.message }}
      </v-snackbar>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
// @ts-nocheck
import { ref, reactive, computed, watch } from 'vue'
import { callApi, callBxMethod, getListElements, callBatchCommands } from '../functions/callApi'
import { ensureUsersByIds } from '../functions/userProfiles'

export default {
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    event: {
      type: Object,
      default: null,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const selectedEventId = computed(() => props.event?.id ?? null)
    const eventTitle = computed(() => props.event?.title || '')

    // Реактивные переменные
    const loadingData = ref(false)
    const loading = ref(false)
    const loadingContacts = ref(false)
    const isValidEntity = ref(true)
    const activeTab = ref('send')
    const form = ref(null)
    const errorMessage = ref('')
    const userDistributions = ref([])

    const formData = reactive({
      input: '',
      files: []
    })
    
    const snackbar = reactive({
      show: false,
      message: '',
      color: 'success'
    })

    const deals = ref([])
    const excludedContacts = ref(new Set());
    const excludedContactsCount = computed(() => {
          return excludedContacts.value.size
    })
// Метод для группировки сделок по пользователям и рассылкам
// Метод для группировки сделок по пользователям и рассылкам
const groupDealsByUserAndDistribution = async () => {
    if (!deals.value.length) return []

    try {
        // Собираем все ID пользователей из сделок
        const allUserIds = [...new Set(deals.value.map(deal => deal.ASSIGNED_BY_ID).filter(id => id))]
        const usersList = await ensureUsersByIds(allUserIds)

        const userMap = new Map()
        usersList.forEach((user) => {
            if (!user?.ID) return
            userMap.set(user.ID, {
                ID: user.ID,
                NAME: user.NAME,
                LAST_NAME: user.LAST_NAME,
                SECOND_NAME: user.SECOND_NAME,
                FULL_NAME: `${user.LAST_NAME || ''} ${user.NAME || ''} ${user.SECOND_NAME || ''}`.trim(),
            })
        })

        // Группируем сделки по пользователям
        const userGroups = new Map()
        
        deals.value.forEach(deal => {
            const userId = deal.ASSIGNED_BY_ID
            if (!userGroups.has(userId)) {
                const userInfo = userMap.get(userId) || {
                    ID: userId,
                    FULL_NAME: `Пользователь ${userId}`
                }
                userGroups.set(userId, {
                    user: userInfo,
                    deals: []
                })
            }
            userGroups.get(userId).deals.push(deal)
        })

        // Для каждого пользователя группируем сделки по рассылкам
        const result = []
        
        for (const [userId, userGroup] of userGroups) {
            // Группируем сделки по ID рассылки (поле UF_CRM_1765531909)
            const distributionGroups = new Map()
            
            userGroup.deals.forEach(deal => {
                const distributionId = deal.UF_CRM_1765531909 || 'no_distribution'
                
                if (!distributionGroups.has(distributionId)) {
                    distributionGroups.set(distributionId, {
                        distributionId,
                        deals: []
                    })
                }
                distributionGroups.get(distributionId).deals.push(deal)
            })

            // Преобразуем группы рассылок в нужный формат
            const distributions = []

            for (const [distId, distGroup] of distributionGroups) {
                // Определяем ЦА рассылки - используем поле DEAL_TARGET_AUDIENCE
                let distributionTargetAudience = 'Не указана'
                if (distGroup.deals.length > 0) {
                    const firstDeal = distGroup.deals[0];
                    // ИСПРАВЛЕНО: обращаемся к DEAL_TARGET_AUDIENCE, который создается в loadContacts
                    distributionTargetAudience = firstDeal.DEAL_TARGET_AUDIENCE || 'Не указана'
                    
                    // Если DEAL_TARGET_AUDIENCE не найден, проверяем UF_CRM_1753365812
                    if (distributionTargetAudience === 'Не указана' && firstDeal.UF_CRM_1753365812) {
                        // Получаем названия ЦА для UF_CRM_1753365812
                        const dealTaIds = Array.isArray(firstDeal.UF_CRM_1753365812) 
                            ? firstDeal.UF_CRM_1753365812 
                            : [firstDeal.UF_CRM_1753365812]
                        
                        if (dealTaIds.length > 0) {
                            const dealTaMap = await getTargetAudienceNames(dealTaIds)
                            const targetAudienceNames = dealTaIds
                                .map(id => dealTaMap.get(parseInt(id)))
                                .filter(name => name)
                            
                            if (targetAudienceNames.length > 0) {
                                distributionTargetAudience = targetAudienceNames.join(', ')
                            }
                        }
                    }
                }

                // Собираем все уникальные контакты для этой рассылки
                const uniqueContactsMap = new Map() // Используем Map для хранения уникальных контактов по ID
                
                distGroup.deals.forEach(deal => {
                    if (deal.contacts && deal.contacts.length > 0) {
                        deal.contacts.forEach(contact => {
                            // Проверяем, нет ли уже такого контакта в Map
                            if (!uniqueContactsMap.has(contact.ID)) {
                                uniqueContactsMap.set(contact.ID, {
                                    ...contact,
                                    dealTitle: deal.TITLE || `Сделка #${deal.ID}`
                                })
                            }
                        })
                    }
                })

                // Преобразуем Map уникальных контактов в массив
                const allContacts = Array.from(uniqueContactsMap.values())

                // Группируем контакты по компаниям
                const companyMap = new Map()
                
                allContacts.forEach(contact => {
                    const companyId = contact.COMPANY_ID || 'no_company'
                    const companyName = contact.COMPANY_TITLE || 'Без компании'
                    const targetAudience = contact.companyTarget || 'Не указана'
                    
                    if (!companyMap.has(companyId)) {
                        companyMap.set(companyId, {
                            companyId,
                            companyName,
                            targetAudience,
                            contacts: []
                        })
                    }
                    
                    // Добавляем контакт только если его еще нет в списке контактов компании
                    const existingContact = companyMap.get(companyId).contacts.find(c => c.ID === contact.ID)
                    if (!existingContact) {
                        companyMap.get(companyId).contacts.push(contact)
                    }
                })

                const totalContacts = allContacts.length

                distributions.push({
                    distributionId: distId,
                    distributionTargetAudience,
                    totalContacts,
                    companies: Array.from(companyMap.values())
                })
            }

            // Собираем все ЦА пользователя (уникальные из всех его рассылок)
            const userTargetAudiences = [...new Set(
                distributions.map(d => d.distributionTargetAudience)
                    .filter(ta => ta !== 'Не указана')
            )]

            result.push({
                userId: userId,
                userName: userGroup.user.FULL_NAME,
                targetAudiences: userTargetAudiences,
                distributions: distributions
            })
        }

        return result
        
    } catch (error) {
        console.error('Ошибка группировки по пользователям:', error)
        return []
    }
}
// Вычисляемое свойство для группировки контактов по компаниям
    const contactsByCompany = computed(() => {
      if (!deals.value.length) return []
      
      // Собираем все контакты из всех сделок
      const allContacts = []
      deals.value.forEach(deal => {
        if (deal.contacts && deal.contacts.length > 0) {
          deal.contacts.forEach(contact => {
            // Добавляем информацию о сделке к контакту
            allContacts.push({
              ...contact,
              dealTitle: deal.TITLE || `Сделка #${deal.ID}`
            })
          })
        }
      })
      
      // Группируем контакты по компании
      const companyMap = new Map()
      
      allContacts.forEach(contact => {
        const companyId = contact.COMPANY_ID || 'no_company'
        const companyName = contact.COMPANY_TITLE || 'Без компании'
        const targetAudience = contact.companyTarget || 'Не указана'
        
        if (!companyMap.has(companyId)) {
          companyMap.set(companyId, {
            companyId,
            companyName,
            targetAudience,
            contacts: []
          })
        }
        
        companyMap.get(companyId).contacts.push(contact)
      })
      
      // Преобразуем Map в массив
      return Array.from(companyMap.values())
    })
    
    const isExcluded = (contactId) => {
      return excludedContacts.value.has(+contactId)
    }

    const toggleExcludeContact = async (contactId) => {
      const wasExcluded = excludedContacts.value.has(+contactId)
      
      if (wasExcluded) {
        excludedContacts.value.delete(+contactId)
      } else {
        excludedContacts.value.add(+contactId)
      }
      
      // Сохраняем изменения в поле сущности
      await saveExcludedContacts()
      showSnackbar(
        wasExcluded ? 'Контакт включен в рассылку' : 'Контакт исключен из рассылки',
        wasExcluded ? 'success' : 'info'
      )
    }
const filteredDeals = computed(() => {
      if (!deals.value.length) return []
      
      return deals.value.map(deal => {
        const filteredDeal = { ...deal }
        filteredDeal.contacts = filteredDeal.contacts.filter(contact => !excludedContacts.value.has(+contact.ID))
        return filteredDeal
      }).filter(deal => deal.contacts.length > 0)
    })

const getExcludedCount = (deal) => {
      if (!deal.contacts) return 0
      
      return deal.contacts.filter(contact => excludedContacts.value.has(+contact.ID)).length
    }

    // Сохранение исключенных контактов в поле сущности
    const saveExcludedContacts = async () => {
      if (!selectedEventId.value) return

      try {
        const excludedString = Array.from(excludedContacts.value).join(',')

        // Обновляем поле через прямой запрос к серверному handler
        const response = await fetch('https://master.rymar-consulting.ru/request/handler.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'crm.item.update',
            filters: { id: selectedEventId.value, entityTypeId: 1052 },
            fields: { ufCrm38ExcludedContacts: excludedString },
          }),
        });
        await response.json();
      } catch (error) {
        console.error('Ошибка при сохранении исключенных контактов:', error)
      }
    }

    const loadExcludedContacts = async () => {
      if (!selectedEventId.value) return

      try {
        const eventDataRaw = await callApi('crm.item.get', { id: selectedEventId.value }, null, 1052, 0, 0)
        const eventData = Array.isArray(eventDataRaw) ? eventDataRaw[0] || {} : eventDataRaw || {}
        const excludedString = eventData.ufCrm38ExcludedContacts || ''
        if (excludedString) {
          excludedContacts.value = new Set(
            excludedString.split(',').map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id)),
          )
        } else {
          excludedContacts.value = new Set()
        }
      } catch (error) {
        console.error('Ошибка при загрузке исключенных контактов:', error)
      }
    }


    const requiredRules = [
      v => !!v || 'Обязательное поле',
      v => (v && v.trim().length > 0) || 'Поле не может быть пустым'
    ]
    
    const fileRules = [
      v => !v || v.length === 0 || v.some(file => file) || 'Загрузите хотя бы один файл'
    ]

    // Вычисляемые свойства
    const isFormValid = computed(() => {
      return formData.input && formData.input.length > 0 && formData.files && formData.files.length > 0
    })

    const totalContacts = computed(() => {
      return deals.value.reduce((total, deal) => total + deal.contacts.length, 0)
    })

    // Методы

    // Оптимизированный метод получения сделок мероприятия
    const getEventDeals = async (eventId, currentUserId) => {
      try {
        const filter = {
          UF_CRM_1742797326: eventId,
          CATEGORY_ID: "32",
          STAGE_ID: "C32:NEW"
        };
        if (currentUserId !== 1612) {
          filter.ASSIGNED_BY_ID = currentUserId;
        }

        const addedDeals = await callApi(
          "crm.deal.list",
          filter,
          ["ID", "TITLE", "UF_CRM_1753365812", "UF_CRM_1765531909", 'ASSIGNED_BY_ID'],
          null,
          0,
          0,
        );
        
        if (!addedDeals || addedDeals.length === 0) {
          return []
        }

        return addedDeals
      } catch (error) {
        console.error('Ошибка получения сделок мероприятия:', error)
        throw error
      }
    }

    // Оптимизированный метод получения контактов сделок
    const getDealsContacts = async (dealIds) => {
      try {
        console.log(dealIds);
        const commands = dealIds.map(dealId => ({
          method: 'crm.deal.contact.items.get',
          params: { id: dealId }
        }))
        
        const results = await callBatchCommands(commands)
                
        const contactsMap = new Map()
        results.forEach((contactItems, index) => {
          const dealId = dealIds[index]
          const contactIds = contactItems ? contactItems.map(item => item.CONTACT_ID) : []
          contactsMap.set(dealId, contactIds)
        })

        return contactsMap
      } catch (error) {
        console.error('Ошибка получения контактов сделок:', error)
        throw error
      }
    }

const getTargetAudienceNames = async (targetAudienceIds) => {
  try {
    const uniqueIds = [...new Set(targetAudienceIds)].map(id => parseInt(id)).filter(id => !isNaN(id));
    
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const results = await getListElements(216, { ID: uniqueIds }, ["ID", "NAME"]);
    
    const nameMap = new Map();
    
    // Исправляем: сопоставляем по ID элемента
    results.forEach((result) => {
      if (result && result.ID) {
        const id = parseInt(result.ID);
        nameMap.set(id, result.NAME || `ЦА #${id}`);
      }
    });

    // Добавляем значения для ID, которые не нашлись
    uniqueIds.forEach(id => {
      if (!nameMap.has(id)) {
        nameMap.set(id, `ЦА #${id}`);
      }
    });

    return nameMap;
  } catch (error) {
    console.error('Ошибка получения названий ЦА:', error);
    const defaultMap = new Map();
    targetAudienceIds.forEach(id => {
      const numId = parseInt(id);
      if (!isNaN(numId)) {
        defaultMap.set(numId, `ЦА #${numId}`);
      }
    });
    return defaultMap;
  }
}

    // Оптимизированный метод получения детальной информации о контактах
// Исправленный метод получения детальной информации о контактах
const getContactsDetails = async (contactIds) => {
  try {
    const uniqueContactIds = [...new Set(contactIds)];

    const chunks = [];
    const chunkSize = 50;
    // Разделяем на чанки
    for (let i = 0; i < uniqueContactIds.length; i += chunkSize) {
      chunks.push(uniqueContactIds.slice(i, i + chunkSize));
    }
    
    const contactResults = [];
    
    // Выполняем запросы последовательно
    for (const chunk of chunks) {
      try {
        // ДОБАВЛЯЕМ UF_CRM_1753364801 В ВЫБОРКУ
        const chunkResults = await callApi('crm.contact.list', { ID: chunk }, [
          "ID", "EMAIL", "NAME", "COMPANY_ID", "LAST_NAME", 
          "FIRST_NAME", "SECOND_NAME", "POST", "UF_CRM_1753364801"
        ], null, 0, 0);
        // Добавляем все результаты
        if (Array.isArray(chunkResults)) {
          contactResults.push(...chunkResults);
        }
      } catch (error) {
        console.error(`Ошибка при выполнении запроса контактов для чанка:`, error);
      }
    }

    // Исправляем: создаем Map, где ключ - ID контакта
    const contactDetailsMap = new Map();
    
    // Заполняем Map данными контактов
    contactResults.forEach((contact) => {
      if (contact && contact.ID) {
        contactDetailsMap.set(parseInt(contact.ID), contact);
      }
    });

    // Собираем ID компаний для дополнительных запросов
    const companyIds = [];
    
    // Проходим по всем запрошенным контактам и собираем ID компаний
    uniqueContactIds.forEach(contactId => {
      const contact = contactDetailsMap.get(parseInt(contactId));
      if (contact && contact.COMPANY_ID) {
        companyIds.push(parseInt(contact.COMPANY_ID));
      }
    });

    // Получаем информацию о компаниях
    if (companyIds.length > 0) {
      const uniqueCompanyIds = [...new Set(companyIds)];

      const companyChunks = [];
      // Разделяем на чанки
      for (let i = 0; i < uniqueCompanyIds.length; i += chunkSize) {
        companyChunks.push(uniqueCompanyIds.slice(i, i + chunkSize));
      }
      
      const companyResults = [];
      
      // Выполняем запросы последовательно
      for (const chunk of companyChunks) {
        try {
          const chunkResults = await callApi('crm.company.list', { ID: chunk }, ["ID", "TITLE", "UF_CRM_1753364407"], null, 0, 0);
          if (Array.isArray(chunkResults)) {
            companyResults.push(...chunkResults);
          }
        } catch (error) {
          console.error(`Ошибка при выполнении запроса компаний для чанка:`, error);
        }
      }

      // Исправляем: создаем Map для компаний, где ключ - ID компании
      const companyMap = new Map();
      companyResults.forEach((company) => {
        if (company && company.ID) {
          companyMap.set(parseInt(company.ID), company);
        }
      });

      // Получаем названия целевых аудиторий компаний
      const allCompanyTaIds = companyResults
        .filter(company => company.UF_CRM_1753364407)
        .flatMap(company => company.UF_CRM_1753364407 || []);
      
      const companyTaMap = await getTargetAudienceNames(allCompanyTaIds);
      
      // Обновляем компании с названиями целевых аудиторий
      companyResults.forEach((company) => {
        if (company && company.ID && company.UF_CRM_1753364407) {
          const taIds = company.UF_CRM_1753364407 || [];
          company.targetAudienceNames = taIds
            .map(id => companyTaMap.get(parseInt(id)))
            .filter(name => name)
            .join(', ');
        }
      });

      // Обновляем Map компаний
      companyResults.forEach((company) => {
        if (company && company.ID) {
          companyMap.set(parseInt(company.ID), company);
        }
      });

      // Обновляем контакты с названиями компаний и целевых аудиторий
      uniqueContactIds.forEach(contactId => {
        const contact = contactDetailsMap.get(parseInt(contactId));
        if (contact && contact.COMPANY_ID) {
          const companyId = parseInt(contact.COMPANY_ID);
          if (companyMap.has(companyId)) {
            const company = companyMap.get(companyId);
            contact.COMPANY_TITLE = company.TITLE || 'Без названия';
            contact.companyTarget = company.targetAudienceNames || 'Не указана';
          }
        }
      });
    }

    return contactDetailsMap;
  } catch (error) {
    console.error('Ошибка получения детальной информации о контактах:', error);
    throw error;
  }
}

const loadContacts = async () => {
  //if (!isValidEntity.value) return

  loadingContacts.value = true
  errorMessage.value = ''
  deals.value = []

  try {
    const currentEventId = selectedEventId.value

    if (!currentEventId) {
      errorMessage.value = 'Не удалось определить мероприятие'
      return
    }

    const currentUserId = await getCurrentUserId()

    const eventDeals = await getEventDeals(currentEventId, currentUserId)

    if (eventDeals.length === 0) {
      errorMessage.value = 'Мероприятие не содержит подходящих сделок'
      return
    }

    // Собираем все ID для batch-запросов
    const allDealIds = eventDeals.map(deal => deal.ID)

    // Получаем контакты всех сделок
    const dealsContactsMap = await getDealsContacts(allDealIds)
    
    // Собираем все ID контактов
    const allContactIds = Array.from(dealsContactsMap.values()).flat()
            
    // Получаем детальную информацию о всех контактах
    const contactsDetailsMap = await getContactsDetails(allContactIds)
    
    // Получаем названия целевых аудиторий для контактов и сделок
    const allContactTargetAudienceIds = []
    const allDealTargetAudienceIds = []
    
    // Собираем ID целевых аудиторий из контактов
    allContactIds.forEach(contactId => {
      const contact = contactsDetailsMap.get(contactId)
      if (contact && contact.UF_CRM_1753364801) {
        const taIds = Array.isArray(contact.UF_CRM_1753364801) ? contact.UF_CRM_1753364801 : [contact.UF_CRM_1753364801]
        allContactTargetAudienceIds.push(...taIds)
      }
    })
    
    // Собираем ID целевых аудиторий из сделок
    eventDeals.forEach(deal => {
      if (deal.UF_CRM_1753365812) {
        const taIds = Array.isArray(deal.UF_CRM_1753365812) ? deal.UF_CRM_1753365812 : [deal.UF_CRM_1753365812]
        allDealTargetAudienceIds.push(...taIds)
      }
    })
    
    // Получаем названия целевых аудиторий
    const contactTaMap = await getTargetAudienceNames(allContactTargetAudienceIds)
    const dealTaMap = await getTargetAudienceNames(allDealTargetAudienceIds)

    // Формируем список сделок с контактами
    const dealsData = []

    for (const deal of eventDeals) {
      const dealObj = {
        ...deal,
        contacts: []
      }

      const contactIds = dealsContactsMap.get(deal.ID) || []
      contactIds.forEach(contactId => {
        const contactDetails = contactsDetailsMap.get(contactId)
        if (contactDetails) {
          // Добавляем информацию о целевой аудитории контакта
          let contactTargetAudience = 'Не указана'
          
          if (contactDetails.UF_CRM_1753364801) {
            const taIds = Array.isArray(contactDetails.UF_CRM_1753364801) 
              ? contactDetails.UF_CRM_1753364801 
              : [contactDetails.UF_CRM_1753364801]
            
            // Получаем названия целевых аудиторий контакта
            const targetAudienceNames = taIds
              .map(id => contactTaMap.get(parseInt(id)))
              .filter(name => name)
            
            if (targetAudienceNames.length > 0) {
              contactTargetAudience = targetAudienceNames.join(', ')
            }
          }
          
          // Добавляем информацию о целевой аудитории сделки
          let dealTargetAudience = 'Не указана'
          if (deal.UF_CRM_1753365812) {
            const dealTaIds = Array.isArray(deal.UF_CRM_1753365812) 
              ? deal.UF_CRM_1753365812 
              : [deal.UF_CRM_1753365812]
            
            const dealTargetAudienceNames = dealTaIds
              .map(id => dealTaMap.get(parseInt(id)))
              .filter(name => name)
            
            if (dealTargetAudienceNames.length > 0) {
              dealTargetAudience = dealTargetAudienceNames.join(', ')
            }
          }
          
          // Сохраняем обе целевые аудитории в контакте
          const enrichedContact = {
            ...contactDetails,
            CONTACT_TARGET_AUDIENCE: contactTargetAudience,
            DEAL_TARGET_AUDIENCE: dealTargetAudience,
            dealTitle: deal.TITLE || `Сделка #${deal.ID}`
          }
          
          dealObj.contacts.push(enrichedContact)
        }
      })

      if (dealObj.contacts.length > 0) {
        dealsData.push(dealObj)
      }
    }
    console.log(eventDeals);
    deals.value = dealsData
    if (deals.value.length > 0) {
      userDistributions.value = await groupDealsByUserAndDistribution()
    }
  } catch (error) {
    console.error('Ошибка загрузки контактов:', error)
    errorMessage.value = 'Ошибка загрузки контактов: ' + error.message
  } finally {
    loadingContacts.value = false
  }
}
    const initializeDialog = async () => {
      if (!selectedEventId.value) return

      loadingData.value = true
      activeTab.value = 'send'
      errorMessage.value = ''
      deals.value = []
      userDistributions.value = []
      formData.input = ''
      formData.files = []

      try {
        await loadExcludedContacts()
        await loadContacts()
      } finally {
        loadingData.value = false
      }
    }

    const resetDialogState = () => {
      activeTab.value = 'send'
      errorMessage.value = ''
      deals.value = []
      userDistributions.value = []
      excludedContacts.value = new Set()
      formData.input = ''
      formData.files = []
      loading.value = false
      loadingContacts.value = false
      loadingData.value = false
    }

    const closeDialog = () => {
      emit('update:modelValue', false)
    }

    const getCurrentUser = () => getCurrentBxUser()

    const getCurrentUserId = async () => {
      const currentUser = await getCurrentUser()
      return currentUser?.ID
    }

    const addDealComment = async (dealId, comment) => {
      try {
        const authorId = await getCurrentUserId()
        await callBxMethod('crm.timeline.comment.add', {
          fields: {
            ENTITY_ID: dealId,
            ENTITY_TYPE: 'deal',
            COMMENT: comment,
            AUTHOR_ID: authorId,
          },
        })
      } catch (error) {
        console.error('Ошибка при добавлении комментария:', error)
      }
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.message = message
      snackbar.color = color
      snackbar.show = true
    }
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const submitForm = async () => {
  if (!form.value.validate()) {
    showSnackbar('Заполните все обязательные поля', 'error')
    return
  }

  if (!formData.input.trim()) {
    showSnackbar('Введите текст сообщения', 'error')
    return
  }

  if (formData.files.length === 0) {
    showSnackbar('Добавьте хотя бы один файл', 'error')
    return
  }

  loading.value = true

  try {
    // Кодируем файлы в base64
    const encodedFiles = await encodeFilesToBase64(formData.files);
    
    // Для первого файла
    const file = encodedFiles[0];
    const currentUser = await getCurrentUser()
    const currentEventId = selectedEventId.value

    if (!currentEventId) {
      showSnackbar('Не удалось определить мероприятие', 'error')
      loading.value = false
      return
    }

    let mailingEventTitle = eventTitle.value
    if (!mailingEventTitle) {
      const eventData = await callApi('crm.item.list', { id: currentEventId }, ['title'], 1052, 0, 0)
      mailingEventTitle = eventData[0]?.title || 'Мероприятие'
    }

    await callBxMethod('crm.item.update', {
      id: currentEventId,
      entityTypeId: 1052,
      fields: {
        ufCrm38_1758702557: [file.name, file.base64],
      },
    })

    // СОБИРАЕМ ВСЕ КОНТАКТЫ ИЗ ВСЕХ РАССЫЛОК ПОЛЬЗОВАТЕЛЕЙ
    // ИСКЛЮЧАЕМ КОНТАКТЫ, КОТОРЫЕ БЫЛИ ИСКЛЮЧЕНЫ ВО ВКЛАДКЕ "КОНТАКТЫ"
    const allContacts = []
    const contactDealMap = new Map() // Связь контакт -> сделка(и)

    // Проходим по всем пользователям и их рассылкам
    for (const userDistribution of userDistributions.value) {
      for (const distribution of userDistribution.distributions) {
        for (const company of distribution.companies) {
          for (const contact of company.contacts) {
            // Проверяем, не исключен ли контакт
            if (excludedContacts.value.has(+contact.ID)) {
              console.log(`Контакт ${contact.ID} исключен из рассылки`)
              continue
            }

            // Проверяем, есть ли у контакта email
            if (!contact.EMAIL || contact.EMAIL.length === 0 || !contact.EMAIL[0]?.VALUE) {
              console.log(`У контакта ${contact.ID} нет email`)
              continue
            }

            // Добавляем контакт только если его еще нет в списке
            const existingContact = allContacts.find(c => c.ID === contact.ID)
            if (!existingContact) {
              allContacts.push(contact)
              
              // Находим связанную сделку для этого контакта
              // ВАЖНО: в вашем коде contact может не содержать информацию о сделке
              // Нужно найти сделку, которая содержит этот контакт
              if (!contactDealMap.has(contact.ID)) {
                contactDealMap.set(contact.ID, [])
              }
              
              // Ищем сделку, в которой есть этот контакт
              for (const deal of deals.value) {
                if (deal.contacts && deal.contacts.some(c => c.ID === contact.ID)) {
                  contactDealMap.get(contact.ID).push(deal.ID)
                  break
                }
              }
            }
          }
        }
      }
    }

    if (allContacts.length === 0) {
      showSnackbar('Нет контактов с email для рассылки', 'warning')
      loading.value = false
      return
    }

    console.log(`Найдено ${allContacts.length} контактов для рассылки`)

    // Подготавливаем batch-запросы для бизнес-процессов
    const batchCommands = []
    const processedDeals = new Set()

    for (const contact of allContacts) {
      // Выбираем ID шаблона в зависимости от типа сущности
      const templateId = 3318
      const documentType = ['crm', 'Bitrix\\Crm\\Integration\\BizProc\\Document\\Dynamic', `DYNAMIC_1052_${currentEventId}`]

      // Получаем ID сделки для этого контакта
      const contactDealIds = contactDealMap.get(contact.ID) || []
      const contactDealId = contactDealIds.length > 0 
        ? contactDealIds[0] 
        : (deals.value.length > 0 ? deals.value[0].ID : null)

      if (!contactDealId) {
        console.warn(`Для контакта ${contact.ID} не найдена связанная сделка`)
        continue
      }

      // Формируем имя для приветствия
      const contactName = contact.NAME || contact.FIRST_NAME || ''
      const greeting = contactName ? `${contactName}, здравствуйте!` : "Здравствуйте!"

      // Формируем имя отправителя
      const senderName = `${currentUser.LAST_NAME || ""} ${currentUser.NAME || ""} ${currentUser.SECOND_NAME || ""}`.trim()

      // Добавляем команду в batch
      batchCommands.push({
        method: 'bizproc.workflow.start',
        params: {
          TEMPLATE_ID: templateId,
          DOCUMENT_ID: documentType,
          PARAMETERS: {
            'fromemail': currentUser.EMAIL,
            'email': contact.EMAIL[0].VALUE,
            'event': mailingEventTitle,
            'text': formData.input,
            'toname': greeting,
            'fromname': senderName,
            'phone': currentUser.PERSONAL_MOBILE ? currentUser.PERSONAL_MOBILE : currentUser.WORK_PHONE,
            'position': currentUser.WORK_POSITION || "",
          },
        }
      })

      // Отмечаем сделку как обработанную
      processedDeals.add(contactDealId)
    }

    // Выполняем batch-запросы
    if (batchCommands.length > 0) {
      const batchResults = await callBatchCommands(batchCommands, 50)

      let successfulSends = 0
      let failedSends = 0

      batchResults.forEach((result, index) => {
        if (result && !result.error) {
          successfulSends++
        } else {
          failedSends++
          console.error(`Ошибка отправки для контакта ${allContacts[index].ID}:`, result?.error)
        }
      })
      // Обновляем стадии обработанных сделок
      for (const dealId of processedDeals) {
        try {
          await callBxMethod('crm.deal.update', {
            id: dealId,
            fields: {
              STAGE_ID: 'C32:PREPARATION',
            },
          })
        } catch (error) {
          console.error(`Ошибка при обновлении стадии сделки ${dealId}:`, error)
        }
      }
      // Добавляем комментарий в мероприятие
      if (successfulSends > 0) {
        try {
          const commentEventId = currentEventId

          if (commentEventId) {
            // Формируем текст комментария
            const userFullName = `${currentUser.LAST_NAME || ''} ${currentUser.NAME || ''} ${currentUser.SECOND_NAME || ''}`.trim()
            
            // Группируем контакты по компаниям для комментария
            const companyContacts = {}
            
            allContacts.forEach(contact => {
              const companyName = contact.COMPANY_TITLE || 'Без компании'
              const email = contact.EMAIL[0].VALUE
              const contactName = `${contact.LAST_NAME || ''} ${contact.NAME || ''} ${contact.SECOND_NAME || ''}`.trim() || 'Без имени'
              
              if (!companyContacts[companyName]) {
                companyContacts[companyName] = []
              }
              companyContacts[companyName].push(`${contactName} (${email})`)
            })

            // Формируем текст комментария
            let commentText = `✉️ ${userFullName} запустил приветственную рассылку:\n\n`
            commentText += `Сообщение: ${formData.input}\n\n`
            commentText += `Отправлено контактов: ${successfulSends}\n\n`
            
            // Добавляем информацию по компаниям
            Object.keys(companyContacts).forEach(companyName => {
              commentText += `Компания: ${companyName}\n`
              companyContacts[companyName].forEach(contactInfo => {
                commentText += `• ${contactInfo}\n`
              })
              commentText += '\n'
            })

            // Добавляем комментарий в мероприятие
            await callBxMethod('crm.timeline.comment.add', {
              fields: {
                ENTITY_ID: commentEventId,
                ENTITY_TYPE: 'dynamic_1052',
                COMMENT: commentText,
                AUTHOR_ID: currentUser.ID,
              },
            })
          }
        } catch (error) {
          console.error('Ошибка при добавлении комментария в мероприятие:', error)
        }
      }

      // Показываем результат
      if (successfulSends > 0) {
        showSnackbar(
          `Рассылка завершена. Успешно: ${successfulSends}, ошибок: ${failedSends}`,
          failedSends > 0 ? 'warning' : 'success'
        )
      } else {
        showSnackbar('Не удалось отправить ни одного сообщения', 'error')
      }

    } else {
      showSnackbar('Нет команд для выполнения', 'warning')
    }

    // Сбрасываем форму
    form.value.reset()
    formData.files = []
    formData.input = ''

  } catch (error) {
    console.error('Общая ошибка:', error)
    showSnackbar('Ошибка: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}
// Вспомогательная функция для добавления задержки
//const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const encodeFilesToBase64 = (files) => {
  return Promise.all(
    files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        
        reader.onload = () => {
          resolve({
            name: file.name,
            base64: reader.result.split(',')[1] // чистый base64 без префикса
          })
        }
        
        reader.onerror = error => reject(error)
        reader.readAsDataURL(file)
      })
    })
  )
}
    // Наблюдатели
    watch(() => formData.input, () => {
      if (form.value) {
        form.value.validate()
      }
    })

    watch(() => formData.files, () => {
      if (form.value) {
        form.value.validate()
      }
    })

    watch(
      () => props.modelValue,
      async (open) => {
        if (open) {
          await initializeDialog()
          return
        }
        resetDialogState()
      },
    )

    watch(activeTab, (newTab) => {
      if (newTab === 'contacts' && props.modelValue && deals.value.length === 0) {
        loadContacts()
      }
    })

    return {
      eventTitle,
      closeDialog,
      loadingData,
      loading,
      loadingContacts,
      isValidEntity,
      activeTab,
      form,
      formData,
      snackbar,
      deals,
      contactsByCompany,
      filteredDeals,
      errorMessage,
      requiredRules,
      fileRules,
      isFormValid,
      totalContacts,
      excludedContactsCount,
      submitForm,
      showSnackbar,
      loadContacts,
      isExcluded,
      toggleExcludeContact,
      getExcludedCount,
      userDistributions,
    }
  }
}
</script>

<style scoped>
.welcome-mailing-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-height: 100%;
  border-radius: 0 !important;
  background: #fff;
}

.welcome-mailing-dialog.v-card {
  border-radius: 0 !important;
}

.welcome-mailing-dialog__toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  border-bottom: 1px solid #eceff3;
}

.welcome-mailing-dialog__toolbar-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  padding-left: 0.5rem;
}

.welcome-mailing-dialog__title {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.2;
  color: #0f172a;
}

.welcome-mailing-dialog__subtitle {
  font-size: 0.875rem;
  line-height: 1.3;
  color: #64748b;
  white-space: normal;
}

.welcome-mailing-dialog__content {
  flex: 1 1 auto;
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 0.75rem 1.5rem 1.5rem !important;
}

.welcome-mailing-dialog__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
}

.welcome-mailing-dialog__tabs {
  margin-bottom: 1.25rem;
}

.welcome-mailing-dialog__tabs :deep(.v-slide-group__content) {
  gap: 0;
}

.welcome-mailing-dialog__tab {
  min-width: auto;
  padding: 0 1rem 0 0 !important;
  margin-right: 1.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase !important;
  color: #1f2937 !important;
  opacity: 1;
}

.welcome-mailing-dialog__tabs :deep(.v-tab--selected) {
  color: #111827 !important;
}

.welcome-mailing-dialog__tabs :deep(.v-tab__slider) {
  height: 2px;
  background: #111827;
}

.welcome-mailing-dialog__window {
  margin-top: 0;
}

.welcome-mailing-send-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 720px;
}

.welcome-mailing-send-form__message :deep(.v-field),
.welcome-mailing-send-form__files :deep(.v-field) {
  border-radius: 4px;
  box-shadow: none;
}

.welcome-mailing-send-form__message :deep(.v-field__outline),
.welcome-mailing-send-form__files :deep(.v-field__outline) {
  --v-field-border-opacity: 0.28;
}

.welcome-mailing-send-form__message :deep(textarea) {
  min-height: 120px;
}

.welcome-mailing-send-form__files :deep(.v-input__prepend) {
  margin-inline-end: 0.5rem;
  padding-top: 0;
  align-self: center;
}

.welcome-mailing-send-form__files :deep(.v-icon) {
  color: #6b7280;
  opacity: 1;
}

.welcome-mailing-send-form__submit {
  align-self: flex-start;
  min-width: auto;
  height: auto !important;
  padding: 0.35rem 0.25rem !important;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase !important;
  color: #9ca3af !important;
}

.welcome-mailing-send-form__submit:not(:disabled) {
  color: #111827 !important;
}

.welcome-mailing-send-form__submit:disabled {
  opacity: 1 !important;
  color: #c4c9d0 !important;
}

.link {
  color: black;
}

.text-error {
  color: #f44336;
}

.text-medium-emphasis {
  color: rgba(0, 0, 0, 0.6);
}

.companies-container {
  margin-bottom: 1rem;
}
</style>

<style>
.welcome-mailing-dialog-overlay.v-overlay,
.v-overlay.welcome-mailing-dialog-overlay {
  z-index: 3000 !important;
}

.welcome-mailing-dialog-overlay .v-overlay__scrim {
  z-index: 3000 !important;
}

.welcome-mailing-dialog-wrapper,
.welcome-mailing-dialog-wrapper .v-overlay__content,
.welcome-mailing-dialog-overlay .v-overlay__content {
  z-index: 3001 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
  border-radius: 0 !important;
}

.welcome-mailing-dialog-wrapper .welcome-mailing-dialog.v-card {
  width: 100%;
  height: 100%;
  border-radius: 0 !important;
}

.welcome-mailing-dialog-wrapper .welcome-mailing-dialog__content.v-card-text {
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  max-width: none;
}
</style>