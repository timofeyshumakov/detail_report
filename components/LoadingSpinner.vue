<template>
  <div class="loading-overlay" v-if="visible">
    <div class="loading-spinner">
      <div class="spinner-circle"></div>
      <div class="spinner-circle"></div>
      <div class="spinner-circle"></div>
      <div class="spinner-circle"></div>
      <div class="loading-text">{{ text }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    text: {
      type: String,
      default: 'Загрузка...'
    }
  }
}
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-spinner {
  position: relative;
  width: 100px;
  height: 100px;
}

.spinner-circle {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  transform: rotate(225deg);
  animation: orbit 3.5s infinite;
}

.spinner-circle:nth-child(2) {
  animation-delay: 240ms;
}

.spinner-circle:nth-child(3) {
  animation-delay: 480ms;
}

.spinner-circle:nth-child(4) {
  animation-delay: 720ms;
}

.spinner-circle:after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  background: #1976d2; /* Primary color */
  border-radius: 50%;
  top: 0;
  left: 0;
}

@keyframes orbit {
  0% {
    transform: rotate(225deg);
    opacity: 1;
    animation-timing-function: ease-out;
  }
  
  7% {
    transform: rotate(345deg);
    animation-timing-function: linear;
  }
  
  30% {
    transform: rotate(455deg);
    animation-timing-function: ease-in-out;
  }
  
  39% {
    transform: rotate(690deg);
    animation-timing-function: linear;
  }
  
  70% {
    transform: rotate(815deg);
    opacity: 1;
    animation-timing-function: ease-out;
  }
  
  75% {
    transform: rotate(945deg);
    animation-timing-function: ease-out;
  }
  
  76% {
    transform: rotate(945deg);
    opacity: 0;
  }
  
  100% {
    transform: rotate(945deg);
    opacity: 0;
  }
}

.loading-text {
  position: absolute;
  top: 110px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  color: #1976d2;
  font-weight: 500;
  font-size: 0.9rem;
}
</style>