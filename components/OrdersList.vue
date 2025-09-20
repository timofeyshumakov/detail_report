<template>
  <v-card elevation="2">
    <v-card-title>Список заказов</v-card-title>
    
    <v-card-text>
      <v-table density="compact">
        <thead>
          <tr>
            <th>Название</th>
            <th>ЧД</th>
            <th>Дата начала</th>
            <th>Дата окончания</th>
            <th>Действия</th>
          </tr>
        </thead>
        
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>{{ order.name }}</td>
            <td>{{ order.manDays }}</td>
            <td>{{ formatDate(order.startDate) }}</td>
            <td>{{ formatDate(order.endDate) }}</td>
            <td>
              <v-btn
                icon
                size="small"
                color="error"
                @click="removeOrder(order.id)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const props = defineProps({
  orders: Array
});

const emit = defineEmits(['remove-order']);

const formatDate = (dateString) => {
  return format(parseISO(dateString), 'dd.MM.yyyy', { locale: ru });
};

const removeOrder = (orderId) => {
  emit('remove-order', orderId);
};
</script>