<template>
  <v-card elevation="2">
    <v-card-title>График загрузки сотрудников</v-card-title>
    
    <v-card-subtitle>
      <v-row>
        <v-col cols="12" md="6">
          <v-date-picker
            v-model="localDateRange.start"
            label="Дата начала"
            :max="localDateRange.end"
            @update:model-value="updateRange"
          ></v-date-picker>
        </v-col>
        
        <v-col cols="12" md="6">
          <v-date-picker
            v-model="localDateRange.end"
            label="Дата окончания"
            :min="localDateRange.start"
            @update:model-value="updateRange"
          ></v-date-picker>
        </v-col>
      </v-row>
    </v-card-subtitle>
    
    <v-card-text>
      <div ref="chartContainer" style="height: 400px;">
        <canvas ref="chartCanvas"></canvas>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import Chart from 'chart.js/auto';
import { format, parseISO, eachDayOfInterval, isWeekend, isSameDay, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

const props = defineProps({
  orders: Array,
  employees: Array,
  dateRange: Object
});

const emit = defineEmits(['update-date-range']);

const chartCanvas = ref(null);
const chartContainer = ref(null);
let chartInstance = null;

const localDateRange = ref({
  start: props.dateRange.start,
  end: props.dateRange.end
});

const updateRange = () => {
  emit('update-date-range', localDateRange.value);
};

// Рассчитываем доступные ЧД по дням
const availableManDays = computed(() => {
  const startDate = parseISO(localDateRange.value.start);
  const endDate = parseISO(localDateRange.value.end);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  return days.map(date => {
    // Количество сотрудников, работающих в этот день
    const available = props.employees.filter(emp => 
      emp.workDays.includes(date.getDay())
    ).length;
    
    return {
      date,
      available,
      formattedDate: format(date, 'dd.MM.yyyy', { locale: ru })
    };
  });
});

// Рассчитываем занятые ЧД по дням
const usedManDays = computed(() => {
  const days = availableManDays.value.map(day => ({ ...day, used: 0 }));
  
  props.orders.forEach(order => {
    const orderStart = parseISO(order.startDate);
    const orderEnd = parseISO(order.endDate);
    const orderDays = eachDayOfInterval({ start: orderStart, end: orderEnd });
    
    // Рабочие дни в периоде заказа (исключая выходные)
    const workDaysInOrder = orderDays.filter(day => 
      props.employees.some(emp => emp.workDays.includes(day.getDay()))
    ).length;
    
    // Средний коэффициент нагрузки (СКН)
    const skn = workDaysInOrder > 0 ? order.manDays / workDaysInOrder : 0;
    
    // Распределяем нагрузку по дням
    days.forEach(day => {
      if (day.date >= orderStart && day.date <= orderEnd) {
        // Проверяем, рабочий ли это день для хотя бы одного сотрудника
        const isWorkDay = props.employees.some(emp => 
          emp.workDays.includes(day.date.getDay())
        );
        
        if (isWorkDay) {
          day.used += skn;
        }
      }
    });
  });
  
  return days;
});

// Данные для графика
const chartData = computed(() => {
  const labels = usedManDays.value.map(day => day.formattedDate);
  const availableData = usedManDays.value.map(day => day.available);
  const usedData = usedManDays.value.map(day => day.used);
  const thresholdData = usedManDays.value.map(day => day.available * 0.9);
  
  return {
    labels,
    datasets: [
      {
        label: 'Доступные ЧД',
        data: availableData,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Занятые ЧД',
        data: usedData,
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      },
      {
        label: '90% порог',
        data: thresholdData,
        backgroundColor: 'rgba(255, 206, 86, 0.5)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false
      }
    ]
  };
});

// Инициализация и обновление графика
const initChart = () => {
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  const ctx = chartCanvas.value.getContext('2d');
  
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: chartData.value,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: false,
        },
        y: {
          stacked: false,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Человеко-дни (ЧД)'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += Math.round(context.raw * 100) / 100;
              return label;
            }
          }
        },
        legend: {
          position: 'top',
        }
      }
    }
  });
};

// Наблюдаем за изменениями данных и обновляем график
watch([chartData, chartContainer], () => {
  if (chartCanvas.value) {
    initChart();
  }
}, { deep: true, immediate: true });

// Очистка при демонтировании
onMounted(() => {
  window.addEventListener('resize', initChart);
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
  window.removeEventListener('resize', initChart);
});
</script>