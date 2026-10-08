<template>
  <div class="app-zoom" aria-label="Масштаб приложения">
    <button
      type="button"
      class="app-zoom__btn"
      aria-label="Уменьшить масштаб"
      title="Уменьшить на 10%"
      :disabled="zoom <= minZoom"
      @click="zoomOut"
    >
      −
    </button>
    <span class="app-zoom__value">{{ zoom }}%</span>
    <button
      type="button"
      class="app-zoom__btn"
      aria-label="Увеличить масштаб"
      title="Увеличить на 10%"
      :disabled="zoom >= maxZoom"
      @click="zoomIn"
    >
      +
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAppZoom } from '../composables/useAppZoom';

const { zoom, minZoom, maxZoom, zoomIn, zoomOut } = useAppZoom();
</script>

<style scoped>
.app-zoom {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.app-zoom__btn {
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
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.app-zoom__btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.app-zoom__btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.app-zoom__value {
  min-width: 2.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  text-align: center;
  white-space: nowrap;
}
</style>
