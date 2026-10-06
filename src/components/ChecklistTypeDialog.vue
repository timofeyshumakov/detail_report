<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    persistent
    attach="body"
    scroll-strategy="none"
    :z-index="zIndex"
    class="checklist-type-dialog-overlay"
    content-class="checklist-type-dialog-content"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="checklist-type-dialog">
      <v-card-title class="checklist-type-dialog__title">
        Выбор типа чек-листа
      </v-card-title>
      <v-card-text class="checklist-type-dialog__body">
        <div class="checklist-type-dialog__list" role="radiogroup" aria-label="Тип чек-листа">
          <label
            v-for="type in EVENT_CHECKLIST_TYPES"
            :key="type.entityTypeId"
            class="checklist-type-dialog__option"
            :class="{ 'checklist-type-dialog__option--selected': Number(selectedId) === type.entityTypeId }"
          >
            <input
              v-model="selectedId"
              type="radio"
              class="checklist-type-dialog__radio"
              name="checklist-type"
              :value="type.entityTypeId"
            >
            <span class="checklist-type-dialog__option-label">{{ type.label }}</span>
          </label>
        </div>
      </v-card-text>
      <v-card-actions class="checklist-type-dialog__actions">
        <button
          type="button"
          class="checklist-type-dialog__save"
          :disabled="!selectedId"
          @click="confirm"
        >
          Создать
        </button>
        <button
          type="button"
          class="checklist-type-dialog__cancel"
          @click="close"
        >
          Отменить
        </button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getVisibleOverlayRect } from '../domain/dialogViewport'
import {
  EVENT_CHECKLIST_ENTITY_TYPE_ID,
  EVENT_CHECKLIST_TYPES,
} from '../domain/eventChecklist'

const OVERLAY_CLOSE_MS = 320
const OVERLAY_TOP_VAR = '--checklist-overlay-top'
const OVERLAY_HEIGHT_VAR = '--checklist-overlay-height'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  zIndex: { type: Number, default: 3200 },
})

const emit = defineEmits(['update:modelValue', 'select'])

const selectedId = ref(EVENT_CHECKLIST_ENTITY_TYPE_ID)
const pendingEntityTypeId = ref(null)

let overlayPinBound = false
let parentScrollTarget: Window | null = null

watch(
  () => props.modelValue,
  async (open, wasOpen) => {
    if (open) {
      selectedId.value = EVENT_CHECKLIST_ENTITY_TYPE_ID
      await nextTick()
      bindOverlayViewportPin()
      requestAnimationFrame(() => {
        applyOverlayViewportPin()
        window.setTimeout(applyOverlayViewportPin, 50)
      })
      return
    }

    unbindOverlayViewportPin()

    const entityTypeId = pendingEntityTypeId.value
    pendingEntityTypeId.value = null
    if (!wasOpen || !entityTypeId) return

    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, OVERLAY_CLOSE_MS))
    cleanupChecklistTypeOverlay()
    emit('select', entityTypeId)
  },
)

onBeforeUnmount(() => {
  unbindOverlayViewportPin()
})

function applyOverlayViewportPin() {
  const rect = getVisibleOverlayRect()
  const top = `${rect.top}px`
  const height = `${rect.height}px`
  document.documentElement.style.setProperty(OVERLAY_TOP_VAR, top)
  document.documentElement.style.setProperty(OVERLAY_HEIGHT_VAR, height)
  document.querySelectorAll('.checklist-type-dialog-overlay').forEach((node) => {
    const el = node as HTMLElement
    el.style.setProperty(OVERLAY_TOP_VAR, top)
    el.style.setProperty(OVERLAY_HEIGHT_VAR, height)
  })
}

function bindOverlayViewportPin() {
  const rect = getVisibleOverlayRect()
  if (rect.top === 0 && window.innerHeight > rect.height * 1.35) {
    try {
      window.BX24?.scrollParentWindow?.(0)
    } catch {
      // ignore
    }
  }
  applyOverlayViewportPin()
  if (overlayPinBound) return
  overlayPinBound = true
  window.addEventListener('resize', applyOverlayViewportPin)
  window.addEventListener('scroll', applyOverlayViewportPin, true)
  window.visualViewport?.addEventListener('resize', applyOverlayViewportPin)
  window.visualViewport?.addEventListener('scroll', applyOverlayViewportPin)
  try {
    if (window.parent && window.parent !== window) {
      window.parent.addEventListener('scroll', applyOverlayViewportPin, true)
      parentScrollTarget = window.parent
    }
  } catch {
    parentScrollTarget = null
  }
}

function unbindOverlayViewportPin() {
  if (!overlayPinBound) {
    clearOverlayViewportPin()
    return
  }
  overlayPinBound = false
  window.removeEventListener('resize', applyOverlayViewportPin)
  window.removeEventListener('scroll', applyOverlayViewportPin, true)
  window.visualViewport?.removeEventListener('resize', applyOverlayViewportPin)
  window.visualViewport?.removeEventListener('scroll', applyOverlayViewportPin)
  try {
    parentScrollTarget?.removeEventListener('scroll', applyOverlayViewportPin, true)
  } catch {
    // ignore
  }
  parentScrollTarget = null
  clearOverlayViewportPin()
}

function clearOverlayViewportPin() {
  document.documentElement.style.removeProperty(OVERLAY_TOP_VAR)
  document.documentElement.style.removeProperty(OVERLAY_HEIGHT_VAR)
}

function cleanupChecklistTypeOverlay() {
  document.querySelectorAll('.checklist-type-dialog-overlay').forEach((el) => {
    if (el.classList.contains('v-overlay--active')) return
    el.remove()
  })
  document.body.classList.remove('v-overlay-scroll-blocked')
  document.documentElement.classList.remove('v-overlay-scroll-blocked')
}

function close() {
  pendingEntityTypeId.value = null
  emit('update:modelValue', false)
}

function confirm() {
  const entityTypeId = Number(selectedId.value)
  if (!entityTypeId) return
  pendingEntityTypeId.value = entityTypeId
  emit('update:modelValue', false)
}
</script>

<style scoped>
.checklist-type-dialog {
  overflow: hidden;
}

.checklist-type-dialog__title {
  font-size: 1.05rem !important;
  font-weight: 700 !important;
  color: #1e293b !important;
  padding: 1rem 1.25rem 0.5rem !important;
}

.checklist-type-dialog__body {
  padding: 0.5rem 1.25rem 0.25rem !important;
}

.checklist-type-dialog__list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.75rem 1rem;
  background: #eef2f6;
  border-radius: 2px;
}

.checklist-type-dialog__option {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.35rem 0.25rem;
  cursor: pointer;
  color: #1e293b;
  font-size: 0.92rem;
  line-height: 1.35;
}

.checklist-type-dialog__option:hover {
  background: rgba(255, 255, 255, 0.55);
}

.checklist-type-dialog__option--selected {
  font-weight: 600;
}

.checklist-type-dialog__radio {
  margin-top: 0.2rem;
  flex: 0 0 auto;
}

.checklist-type-dialog__option-label {
  flex: 1 1 auto;
}

.checklist-type-dialog__actions {
  justify-content: flex-start !important;
  gap: 0.65rem;
  padding: 0.85rem 1.25rem 1.15rem !important;
}

.checklist-type-dialog__save {
  min-width: 108px;
  height: 36px;
  border: 0;
  border-radius: 2px;
  background: #3bc8f5;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.checklist-type-dialog__save:hover:not(:disabled) {
  background: #2bb6e3;
}

.checklist-type-dialog__save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.checklist-type-dialog__cancel {
  min-width: 108px;
  height: 36px;
  border: 1px solid #d0d7de;
  border-radius: 2px;
  background: #fff;
  color: #525c69;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}
</style>

<style>
.checklist-type-dialog-overlay.v-overlay,
.v-overlay.checklist-type-dialog-overlay {
  position: fixed !important;
  inset: auto !important;
  top: var(--checklist-overlay-top, 0px) !important;
  left: 0 !important;
  right: 0 !important;
  bottom: auto !important;
  width: 100% !important;
  height: var(--checklist-overlay-height, 100dvh) !important;
  max-height: var(--checklist-overlay-height, 100dvh) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: hidden !important;
}

.checklist-type-dialog-overlay .v-overlay__scrim {
  position: absolute !important;
  inset: 0 !important;
}

.checklist-type-dialog-overlay .v-overlay__content,
.checklist-type-dialog-content {
  position: relative !important;
  margin: 0 auto !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
  align-self: center !important;
}

.checklist-type-dialog-overlay:not(.v-overlay--active) {
  display: none !important;
  pointer-events: none !important;
}
</style>
