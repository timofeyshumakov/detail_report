<template>
  <div class="criteria-admin">
    <div class="admin-header">
      <h2>Управление критериями оценки</h2>
      <button @click="showAddForm = true" class="btn btn-primary">
        Добавить критерий
      </button>
    </div>

    <!-- Форма добавления/редактирования критерия -->
    <div v-if="showAddForm" class="criterion-form">
      <h3>{{ editingCriterion ? 'Редактировать' : 'Добавить' }} критерий</h3>
      
      <div class="form-grid">
        <div class="form-group">
          <label>Название критерия *</label>
          <input v-model="formData.name" type="text" />
        </div>
        
        <div class="form-group">
          <label>Тип сущности *</label>
          <select v-model="formData.entityType">
            <option value="lead">Лид</option>
            <option value="deal">Сделка</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Имя поля *</label>
          <input v-model="formData.fieldName" type="text" />
          <small>Будет создано в карточке сущности</small>
        </div>
        
        <div class="form-group">
          <label>Минимальный балл *</label>
          <input v-model="formData.minScore" type="number" />
        </div>
        
        <div class="form-group">
          <label>Максимальный балл *</label>
          <input v-model="formData.maxScore" type="number" />
        </div>
        
        <div class="form-group full-width">
          <label>
            <input v-model="formData.showComment" type="checkbox" />
            Показывать поле комментария
          </label>
        </div>
        
        <div class="form-group full-width">
          <label>
            <input v-model="formData.isRequired" type="checkbox" />
            Обязательный для заполнения
          </label>
        </div>
      </div>
      
      <div class="form-actions">
        <button @click="saveCriterion" class="btn btn-primary">
          Сохранить
        </button>
        <button @click="cancelEdit" class="btn btn-secondary">
          Отмена
        </button>
      </div>
    </div>

    <!-- Список критериев -->
    <div class="criteria-list">
      <div v-for="criterion in criteria" :key="criterion.id" class="criterion-item">
        <div class="criterion-info">
          <h4>{{ criterion.name }}</h4>
          <div class="criterion-details">
            <span>Тип: {{ criterion.entityType === 'lead' ? 'Лид' : 'Сделка' }}</span>
            <span>Поле: {{ criterion.fieldName }}</span>
            <span>Баллы: {{ criterion.minScore }} - {{ criterion.maxScore }}</span>
            <span v-if="criterion.showComment">Комментарий: да</span>
            <span v-if="criterion.isRequired">Обязательный</span>
          </div>
        </div>
        
        <div class="criterion-actions">
          <button @click="editCriterion(criterion)" class="btn btn-sm">
            Редактировать
          </button>
          <button @click="deleteCriterion(criterion.id)" class="btn btn-sm btn-danger">
            Удалить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useScoringStore } from '@/stores/scoring'

const scoringStore = useScoringStore()

const showAddForm = ref(false)
const editingCriterion = ref(null)

const formData = ref({
  name: '',
  entityType: 'lead',
  fieldName: '',
  minScore: 0,
  maxScore: 10,
  showComment: true,
  isRequired: false
})

const criteria = computed(() => scoringStore.criteria)

const resetForm = () => {
  formData.value = {
    name: '',
    entityType: 'lead',
    fieldName: '',
    minScore: 0,
    maxScore: 10,
    showComment: true,
    isRequired: false
  }
  editingCriterion.value = null
  showAddForm.value = false
}

const saveCriterion = async () => {
  try {
    if (editingCriterion.value) {
      await scoringStore.updateCriterion(editingCriterion.value.id, formData.value)
    } else {
      await scoringStore.addCriterion(formData.value)
    }
    resetForm()
  } catch (error) {
    console.error('Error saving criterion:', error)
  }
}

const editCriterion = (criterion) => {
  formData.value = { ...criterion }
  editingCriterion.value = criterion
  showAddForm.value = true
}

const deleteCriterion = async (criterionId) => {
  if (confirm('Вы уверены, что хотите удалить этот критерий?')) {
    await scoringStore.deleteCriterion(criterionId)
  }
}

const cancelEdit = () => {
  resetForm()
}
</script>

<style scoped>
.criteria-admin {
  padding: 20px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.criterion-form {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  background-color: #f9f9f9;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin: 20px 0;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 500;
  margin-bottom: 5px;
}

.form-group input,
.form-group select {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-group small {
  color: #666;
  font-size: 0.8em;
  margin-top: 2px;
}

.form-actions {
  display: flex;
  gap: 10px;
}

.criteria-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.criterion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: white;
}

.criterion-info h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.criterion-details {
  display: flex;
  gap: 15px;
  font-size: 0.9em;
  color: #666;
}

.criterion-details span {
  padding: 2px 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.criterion-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.btn-primary {
  background-color: #2196f3;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-danger {
  background-color: #f44336;
  color: white;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 0.8em;
}
</style>