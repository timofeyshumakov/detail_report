import fs from 'node:fs'

const file = 'src/components/EventDealsDialog.vue'
let content = fs.readFileSync(file, 'utf8')

const importBlock = `<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { callApi, callRestWebhook, isBx24Available } from '../functions/callApi'
import AudienceSegmentationDialog from './AudienceSegmentationDialog.vue'
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
`

// Replace opening script + imports through emit definition start
content = content.replace(
  /<script setup(?: lang="ts")?>[\s\S]*?const DEAL_STAGE_OPTIONS = \[[\s\S]*?function getRequiredFieldNamesForStage\(stageId\) \{[\s\S]*?return names\n\}\n\n/,
  `${importBlock}
const EXTRA_OPTIONS_ENTITY_TYPE_ID = 1056
const COMMERCE_ENTITY_TYPE_ID = 1060
const PARTICIPATION_STATUS_ENTITY_TYPE_ID = 1080
const DEAL_ENTITY_TYPE_ID = 2

`,
)

// Keep props/emits that were between Audience import and DEAL_STAGE_OPTIONS
// The regex above may have removed props — check and fix if needed.
if (!content.includes('defineProps')) {
  content = content.replace(
    'const EXTRA_OPTIONS_ENTITY_TYPE_ID = 1056',
    `const props = defineProps({
  modelValue: { type: Boolean, default: false },
  event: { type: Object, default: null },
  deals: { type: Array, default: () => [] },
  userProfiles: { type: Object, default: () => ({}) },
  refreshing: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:modelValue',
  'precise-deal',
  'mass-generation',
  'send-mailing',
  'welcome-mailing',
  'export-excel',
  'export-science',
  'stage-updated',
  'field-updated',
  'refresh',
])

const EXTRA_OPTIONS_ENTITY_TYPE_ID = 1056`,
  )
}

function removeFunction(src, name) {
  const re = new RegExp(`\\nfunction ${name}\\([\\s\\S]*?\\n\\}\\n`, 'm')
  return src.replace(re, '\n')
}

for (const name of [
  'isEmptyFieldValue',
  'buildInputValue',
  'serializeRequiredFieldValue',
  'normalizeIdList',
  'getHostViewportSize',
  'normalizeMoneyInput',
  'toDateInputValue',
  'getStageOption',
]) {
  content = removeFunction(content, name)
}

// Keep local enrichRequiredFieldMeta (uses participationStatusOptions)

fs.writeFileSync(file, content)
console.log('EventDealsDialog domain wired, length', content.length)
console.log('has defineProps', content.includes('defineProps'))
console.log('has DEAL_STAGE_OPTIONS local?', /const DEAL_STAGE_OPTIONS = \[/.test(content))
console.log('has domain import', content.includes("from '../domain/dealStages'"))
