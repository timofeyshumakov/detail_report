<template>
  <div
    v-if="visible"
    class="loading-progress-wrapper"
    :class="{ fullscreen }"
  >
    <div class="loading-overlay"></div>
    <div class="loading-content">
      <div class="progress-container">
        <div
          class="progress-bar"
          :style="{ width: displayProgress + '%' }"
        ></div>
        <div class="progress-label">{{ Math.round(displayProgress) }}%</div>
      </div>

      <div v-if="message" class="loading-message">{{ message }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
  fullscreen: {
    type: Boolean,
    default: true,
  },
  message: {
    type: String,
    default: 'Загрузка...',
  },
  modelValue: {
    type: Number,
    default: null,
  },
  duration: {
    type: Number,
    default: 2000,
  },
  autoHide: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['complete', 'hide'])

const internalProgress = ref(0)
const animationInterval = ref(null)
const isControlled = computed(() => props.modelValue != null)

const displayProgress = computed(() => {
  if (isControlled.value) {
    return Math.min(Math.max(props.modelValue, 0), 100)
  }
  return internalProgress.value
})

const startAnimation = () => {
  if (isControlled.value) return

  clearInterval(animationInterval.value)
  internalProgress.value = 0

  const step = 100 / (props.duration / 50)

  animationInterval.value = setInterval(() => {
    if (internalProgress.value < 100) {
      internalProgress.value = Math.min(internalProgress.value + step, 100)
      return
    }

    clearInterval(animationInterval.value)
    emit('complete')

    if (props.autoHide) {
      setTimeout(() => {
        emit('hide')
      }, 300)
    }
  }, 50)
}

watch(() => props.visible, (newValue) => {
  if (newValue && !isControlled.value) {
    startAnimation()
  }
})

onMounted(() => {
  if (props.visible && !isControlled.value) {
    startAnimation()
  }
})

onUnmounted(() => {
  clearInterval(animationInterval.value)
})
</script>

<style scoped>
.loading-progress-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fadeIn 0.3s ease;
}

.loading-progress-wrapper.fullscreen {
  position: fixed;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(2px);
}

.loading-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 32px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  min-width: 300px;
  max-width: 400px;
}

.progress-container {
  width: 100%;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.progress-bar {
  height: 100%;
  background: linear-gradient(
    90deg,
    #2196F3 0%,
    #21CBF3 25%,
    #03DAC6 50%,
    #21CBF3 75%,
    #2196F3 100%
  );
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

.progress-label {
  position: absolute;
  top: -30px;
  right: 0;
  font-size: 14px;
  font-weight: 600;
  color: #2196F3;
}

.loading-message {
  font-size: 16px;
  font-weight: 500;
  color: #424242;
  text-align: center;
  margin-top: 8px;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
