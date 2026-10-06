<template>
  <div
    ref="rootRef"
    class="rf-autocomplete"
    :class="{
      'rf-autocomplete--open': menuOpen,
      'rf-autocomplete--invalid': invalid,
    }"
  >
    <div
      class="rf-autocomplete__control"
      :class="{ 'rf-autocomplete__control--disabled': disabled }"
      @click="onControlClick"
    >
      <input
        ref="inputRef"
        class="rf-autocomplete__input"
        type="text"
        :value="inputText"
        :placeholder="placeholder"
        :disabled="disabled"
        autocomplete="off"
        @focus="openMenu"
        @input="onInput"
        @keydown.down.prevent="moveActive(1)"
        @keydown.up.prevent="moveActive(-1)"
        @keydown.enter.prevent="selectActive"
        @keydown.esc.prevent="closeMenu"
      >
      <v-progress-circular
        v-if="loading"
        class="rf-autocomplete__loader"
        indeterminate
        size="16"
        width="2"
      />
      <button
        v-if="clearable && hasValue && !disabled"
        type="button"
        class="rf-autocomplete__clear"
        title="Очистить"
        @click.stop="clearValue"
      >
        ×
      </button>
      <span class="rf-autocomplete__chevron" aria-hidden="true">▾</span>
    </div>

    <Teleport to="body">
      <div
        v-if="menuOpen"
        class="rf-autocomplete__menu"
        role="listbox"
        :style="menuStyle"
      >
        <button
          v-for="(item, index) in filteredItems"
          :key="String(resolveValue(item))"
          type="button"
          class="rf-autocomplete__option"
          :class="{ 'rf-autocomplete__option--active': index === activeIndex }"
          role="option"
          @mousedown.prevent="selectItem(item)"
          @mouseenter="activeIndex = index"
        >
          {{ resolveTitle(item) }}
        </button>
        <div v-if="!filteredItems.length" class="rf-autocomplete__empty">
          {{ noDataText }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, Array, null], default: null },
  items: { type: Array, default: () => [] },
  itemTitle: { type: String, default: 'title' },
  itemValue: { type: String, default: 'value' },
  placeholder: { type: String, default: 'Выберите значение' },
  noDataText: { type: String, default: 'Нет вариантов' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  clearable: { type: Boolean, default: true },
  multiple: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'focus', 'open'])

const menuOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const inputRef = ref(null)
const rootRef = ref(null)
const searching = ref(false)
const menuStyle = ref({})

function resolveTitle(item) {
  if (item == null) return ''
  if (typeof item !== 'object') return String(item)
  return String(item[props.itemTitle] ?? item.title ?? item.VALUE ?? item.NAME ?? '')
}

function resolveValue(item) {
  if (item == null) return null
  if (typeof item !== 'object') return item
  return item[props.itemValue] ?? item.value ?? item.id ?? item.ID ?? null
}

const selectedItem = computed(() => {
  const value = props.modelValue
  if (value == null || value === '') return null
  if (props.multiple && Array.isArray(value)) return null
  return (props.items || []).find((item) => String(resolveValue(item)) === String(value)) || null
})

const inputText = computed({
  get() {
    if (searching.value || menuOpen.value) return query.value
    return selectedItem.value ? resolveTitle(selectedItem.value) : ''
  },
  set(value) {
    query.value = value
  },
})

const filteredItems = computed(() => {
  const list = Array.isArray(props.items) ? props.items : []
  const q = String(query.value || '').trim().toLowerCase()
  if (!q || !searching.value) return list
  return list.filter((item) => resolveTitle(item).toLowerCase().includes(q))
})

const hasValue = computed(() => {
  if (props.multiple && Array.isArray(props.modelValue)) return props.modelValue.length > 0
  return props.modelValue != null && props.modelValue !== ''
})

function updateMenuPosition() {
  const el = rootRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const maxHeight = 240
  const spaceBelow = window.innerHeight - rect.bottom - 8
  const openUp = spaceBelow < 140 && rect.top > spaceBelow
  menuStyle.value = {
    position: 'fixed',
    left: `${Math.max(8, rect.left)}px`,
    width: `${Math.max(160, rect.width)}px`,
    maxHeight: `${Math.min(maxHeight, openUp ? rect.top - 8 : spaceBelow)}px`,
    zIndex: 20000,
    ...(openUp
      ? { bottom: `${window.innerHeight - rect.top + 4}px`, top: 'auto' }
      : { top: `${rect.bottom + 4}px`, bottom: 'auto' }),
  }
}

async function openMenu() {
  if (props.disabled) return
  menuOpen.value = true
  searching.value = false
  query.value = selectedItem.value ? resolveTitle(selectedItem.value) : ''
  activeIndex.value = 0
  emit('focus')
  emit('open')
  await nextTick()
  updateMenuPosition()
}

function closeMenu() {
  menuOpen.value = false
  searching.value = false
  query.value = ''
  activeIndex.value = 0
}

function onControlClick() {
  if (props.disabled) return
  if (!menuOpen.value) openMenu()
  inputRef.value?.focus?.()
}

function onInput(event) {
  searching.value = true
  query.value = event?.target?.value ?? ''
  menuOpen.value = true
  activeIndex.value = 0
  updateMenuPosition()
}

function selectItem(item) {
  const next = resolveValue(item)
  if (props.multiple) {
    const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const key = String(next)
    const exists = current.some((value) => String(value) === key)
    emit('update:modelValue', exists
      ? current.filter((value) => String(value) !== key)
      : [...current, next])
  } else {
    emit('update:modelValue', next)
  }
  closeMenu()
}

function clearValue() {
  emit('update:modelValue', props.multiple ? [] : null)
  closeMenu()
}

function moveActive(step) {
  if (!filteredItems.value.length) return
  const total = filteredItems.value.length
  activeIndex.value = (activeIndex.value + step + total) % total
}

function selectActive() {
  const item = filteredItems.value[activeIndex.value]
  if (item) selectItem(item)
}

function onDocumentClick(event) {
  if (!menuOpen.value) return
  const inRoot = rootRef.value?.contains?.(event.target)
  const inMenu = event.target?.closest?.('.rf-autocomplete__menu')
  if (!inRoot && !inMenu) closeMenu()
}

watch(() => props.items, () => {
  activeIndex.value = 0
  if (menuOpen.value) updateMenuPosition()
})

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
  window.addEventListener('resize', updateMenuPosition)
  window.addEventListener('scroll', updateMenuPosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
  window.removeEventListener('resize', updateMenuPosition)
  window.removeEventListener('scroll', updateMenuPosition, true)
})
</script>

<style scoped>
.rf-autocomplete {
  position: relative;
  width: 100%;
  min-width: 0;
}

.rf-autocomplete__control {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 40px;
  padding: 0 0.55rem;
  border: 1px solid #cfd8e3;
  border-radius: 8px;
  background: #fff;
  cursor: text;
}

.rf-autocomplete__control--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f8fafc;
}

.rf-autocomplete--invalid .rf-autocomplete__control {
  border-color: #dc2626;
  box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.15);
}

.rf-autocomplete__input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #0f172a;
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.3;
}

.rf-autocomplete__loader,
.rf-autocomplete__clear,
.rf-autocomplete__chevron {
  flex: 0 0 auto;
  color: #64748b;
}

.rf-autocomplete__clear {
  border: 0;
  background: transparent;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.15rem;
}
</style>

<style>
.rf-autocomplete__menu {
  overflow: auto;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.rf-autocomplete__option {
  display: block;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 0;
  background: transparent;
  color: #0f172a;
  font: inherit;
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
}

.rf-autocomplete__option:hover,
.rf-autocomplete__option--active {
  background: #eff6ff;
}

.rf-autocomplete__empty {
  padding: 0.7rem;
  color: #94a3b8;
  font-size: 0.8125rem;
}
</style>
