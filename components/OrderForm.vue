<template>
  <v-card class="pa-4" elevation="2">
    <v-card-title>Добавить новый заказ</v-card-title>
    
    <v-form @submit.prevent="submitForm">
      <v-text-field
        v-model="order.name"
        label="Название заказа"
        required
      ></v-text-field>
      
      <v-text-field
        v-model.number="order.manDays"
        label="Необходимо ЧД"
        type="number"
        min="1"
        required
      ></v-text-field>
      
      <v-row>
        <v-col cols="6">
          <v-date-picker
            v-model="order.startDate"
            label="Дата начала"
            :max="order.endDate"
          ></v-date-picker>
        </v-col>
        
        <v-col cols="6">
          <v-date-picker
            v-model="order.endDate"
            label="Дата окончания"
            :min="order.startDate"
          ></v-date-picker>
        </v-col>
      </v-row>
      
      <v-card-actions>
        <v-btn type="submit" color="primary" block>Добавить заказ</v-btn>
      </v-card-actions>
    </v-form>
    
    <v-alert v-if="result" :type="result.type" class="mt-4">
      {{ result.message }}
    </v-alert>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useDisplay } from 'vuetify';

const { mobile } = useDisplay();
const emit = defineEmits(['add-order']);

const order = ref({
  name: '',
  manDays: 1,
  startDate: new Date().toISOString().substr(0, 10),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substr(0, 10)
});

const result = ref(null);

const submitForm = () => {
  if (!order.value.name || !order.value.manDays || !order.value.startDate || !order.value.endDate) {
    result.value = { type: 'error', message: 'Заполните все поля' };
    return;
  }
  
  emit('add-order', order.value);
  result.value = { type: 'success', message: 'Заказ добавлен' };
  
  // Сброс формы
  order.value = {
    name: '',
    manDays: 1,
    startDate: new Date().toISOString().substr(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substr(0, 10)
  };
  
  setTimeout(() => {
    result.value = null;
  }, 3000);
};
</script>