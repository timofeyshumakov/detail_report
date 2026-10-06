<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    persistent
    scrollable
    transition="dialog-bottom-transition"
    content-class="audience-segmentation-dialog-wrapper"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="audience-segmentation-dialog">
      <v-toolbar density="compact" color="white" flat class="audience-segmentation-dialog__toolbar">
        <div class="audience-segmentation-dialog__toolbar-text">
          <div class="audience-segmentation-dialog__title">Данные ЦА</div>
          <div v-if="subtitle" class="audience-segmentation-dialog__subtitle">{{ subtitle }}</div>
        </div>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" aria-label="Закрыть" @click="closeDialog" />
      </v-toolbar>

      <v-card-text class="audience-segmentation-dialog__content">
        <AudienceSegmentationView
          v-if="modelValue && dealId"
          :key="String(dealId)"
          embedded
          :deal-id="dealId"
          :trusted-person-id="trustedPersonId"
          @trusted-person-updated="emit('trusted-person-updated', $event)"
        />
        <div v-else class="audience-segmentation-dialog__empty">
          Не выбрана сделка
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed } from 'vue'
import AudienceSegmentationView from './AudienceSegmentationView.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  dealId: { type: [Number, String], default: null },
  dealTitle: { type: String, default: '' },
  trustedPersonId: { type: [Number, String], default: null },
})

const emit = defineEmits(['update:modelValue', 'trusted-person-updated'])

const subtitle = computed(() => {
  const title = String(props.dealTitle || '').trim()
  const id = props.dealId != null && props.dealId !== '' ? String(props.dealId) : ''
  if (title && id) return `${title} · сделка #${id}`
  if (title) return title
  if (id) return `Сделка #${id}`
  return ''
})

function closeDialog() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.audience-segmentation-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  border-radius: 0 !important;
  background: #f5f7fb;
}

.audience-segmentation-dialog__toolbar {
  border-bottom: 1px solid #e2e8f0;
  flex: 0 0 auto;
}

.audience-segmentation-dialog__toolbar-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  padding-left: 0.5rem;
}

.audience-segmentation-dialog__title {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.audience-segmentation-dialog__subtitle {
  font-size: 0.8rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audience-segmentation-dialog__content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0 !important;
}

.audience-segmentation-dialog__empty {
  color: #64748b;
  font-size: 0.95rem;
  padding: 2rem 0;
  text-align: center;
}
</style>

<style>
.audience-segmentation-dialog-wrapper,
.audience-segmentation-dialog-wrapper .v-overlay__content {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  margin: 0 !important;
}
</style>
