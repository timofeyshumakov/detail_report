<template>
  <div class="chart-container">
    <canvas ref="chart"></canvas>
  </div>
</template>

<script>
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale
} from 'chart.js'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale
)

export default {
  name: 'LineChart',
  extends: Line,
  props: {
    chartData: {
      type: Object,
      required: true
    },
    chartOptions: {
      type: Object,
      default: () => ({})
    }
  },
  mounted() {
    this.renderChart(this.chartData, this.chartOptions)
  },
  watch: {
    chartData: {
      handler(newData) {
        this.renderChart(newData, this.chartOptions)
      },
      deep: true
    },
    chartOptions: {
      handler(newOptions) {
        this.renderChart(this.chartData, newOptions)
      },
      deep: true
    }
  }
}
</script>