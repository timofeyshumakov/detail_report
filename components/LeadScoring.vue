<template>
  <div class="scoring-section">
    <div class="scoring-header">
      <h3>Оценка качества работы</h3>
      <div class="scoring-stats" v-if="calculationResults">
        <span>Набрано баллов: {{ calculationResults.actualScore }}/{{ calculationResults.maxPossibleScore }}</span>
        <span>Качество: {{ calculationResults.qualityPercentage }}%</span>
      </div>
    </div>

    <div class="criteria-blocks">
      <div 
        v-for="block in criteriaBlocks" 
        :key="block.id" 
        class="criteria-block"
      >
        <h4 class="block-title">{{ block.name }}</h4>
        <div class="criteria-list">
          <div 
            v-for="criterion in getCriteriaInBlock(block)" 
            :key="criterion.id"
            class="criterion-item"
          >
            <div class="criterion-info">
              <span class="criterion-name">{{ criterion.name }}</span>
              <span class="score-range">({{ criterion.minScore }} - {{ criterion.maxScore }} баллов)</span>
            </div>
            
            <div class="score-input-section">
              <input
                v-model="userScores[criterion.id]"
                type="number"
                :min="criterion.minScore"
                :max="criterion.maxScore"
                :class="{ 'error': !isScoreValid(criterion) }"
                class="score-input"
                @change="validateInput(criterion)"
              />
              <div v-if="criterion.showComment" class="comment-section">
                <textarea
                  v-model="userComments[criterion.id]"
                  placeholder="Комментарий..."
                  class="comment-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="scoring-actions">
      <button 
        @click="saveDraft" 
        class="btn btn-save"
        :disabled="!hasChanges"
      >
        Сохранить
      </button>
      <button 
        @click="completeScoring" 
        class="btn btn-complete"
        :disabled="!isCompleteValid"
      >
        Завершить оценку
      </button>
      <button @click="cancelScoring" class="btn btn-cancel">
        Отмена
      </button>
    </div>

    <div v-if="validationErrors.length" class="validation-errors">
      <div v-for="error in validationErrors" :key="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useScoringStore } from '../stores/scoring'
import { calculateScoring, validateScore } from '../utils/scoringCalculations'

const props = defineProps({
  entityType: {
    type: String,
    required: true,
    validator: (value) => ['lead', 'deal'].includes(value)
  },
  entityId: {
    type: String,
    required: true
  }
})

const scoringStore = useScoringStore()

const userScores = ref({})
const userComments = ref({})
const validationErrors = ref([])

// Загрузка данных при монтировании
onMounted(() => {
  loadScoringData()
})

const criteria = computed(() => 
  scoringStore.getActiveCriteria(props.entityType, props.entityId)
)

const criteriaBlocks = computed(() => 
  scoringStore.getCriteriaBlocks(props.entityType)
)

const calculationResults = computed(() => 
  calculateScoring(criteria.value, userScores.value)
)

const hasChanges = computed(() => 
  Object.keys(userScores.value).length > 0
)

const isCompleteValid = computed(() => {
  if (!hasChanges.value) return false
  
  // Проверяем, что все обязательные критерии заполнены
  const requiredCriteria = criteria.value.filter(c => c.isRequired)
  const filledRequired = requiredCriteria.every(c => 
    userScores.value[c.id] !== undefined && 
    userScores.value[c.id] !== null && 
    userScores.value[c.id] !== ''
  )
  
  return filledRequired && validationErrors.value.length === 0
})

const getCriteriaInBlock = (block) => {
  return criteria.value.filter(criterion => 
    block.criteria.includes(criterion.id)
  )
}

const isScoreValid = (criterion) => {
  return validateScore(userScores.value[criterion.id], criterion)
}

const validateInput = (criterion) => {
  if (!validateScore(userScores.value[criterion.id], criterion)) {
    validationErrors.value = [
      `Оценка для "${criterion.name}" должна быть между ${criterion.minScore} и ${criterion.maxScore}`
    ]
  } else {
    validationErrors.value = validationErrors.value.filter(
      error => !error.includes(criterion.name)
    )
  }
}

const loadScoringData = async () => {
  // Загрузка сохраненных оценок для этой сущности
  try {
    // const savedData = await api.getScoringData(props.entityType, props.entityId)
    // userScores.value = savedData.scores || {}
    // userComments.value = savedData.comments || {}
  } catch (error) {
    console.error('Error loading scoring data:', error)
  }
}

const saveDraft = async () => {
  try {
    const draftData = {
      entityType: props.entityType,
      entityId: props.entityId,
      scores: userScores.value,
      comments: userComments.value,
      calculation: calculationResults.value,
      status: 'draft'
    }
    
    // await api.saveScoringDraft(draftData)
    console.log('Draft saved:', draftData)
  } catch (error) {
    console.error('Error saving draft:', error)
  }
}

const completeScoring = async () => {
  try {
    const finalData = {
      entityType: props.entityType,
      entityId: props.entityId,
      scores: userScores.value,
      comments: userComments.value,
      calculation: calculationResults.value,
      status: 'completed',
      completedAt: new Date().toISOString()
    }
    
    // Сохраняем в основную карточку сущности
    await saveToEntityCard(finalData)
    
    // await api.completeScoring(finalData)
    console.log('Scoring completed:', finalData)
  } catch (error) {
    console.error('Error completing scoring:', error)
  }
}

const saveToEntityCard = async (scoringData) => {
  const entityFields = {
    quality_score: scoringData.calculation.actualScore,
    quality_percentage: scoringData.calculation.qualityPercentage,
    quality_max_score: scoringData.calculation.maxPossibleScore,
    quality_assessment_date: scoringData.completedAt,
    // Дополнительные поля по необходимости
  }
  
  // await api.updateEntity(props.entityType, props.entityId, entityFields)
  console.log('Updating entity fields:', entityFields)
}

const cancelScoring = () => {
  userScores.value = {}
  userComments.value = {}
  validationErrors.value = []
}
</script>

<style scoped>
.scoring-section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.scoring-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.scoring-stats {
  display: flex;
  gap: 20px;
  font-weight: bold;
}

.criteria-blocks {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.criteria-block {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 15px;
}

.block-title {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1.1em;
}

.criteria-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.criterion-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.criterion-info {
  flex: 1;
}

.criterion-name {
  font-weight: 500;
  display: block;
}

.score-range {
  font-size: 0.9em;
  color: #666;
}

.score-input-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  min-width: 200px;
}

.score-input {
  width: 80px;
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-align: center;
}

.score-input.error {
  border-color: #ff4444;
  background-color: #fff8f8;
}

.comment-section {
  width: 100%;
}

.comment-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9em;
  resize: vertical;
  min-height: 60px;
}

.scoring-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-save {
  background-color: white;
  border: 1px solid #ccc;
  color: #333;
}

.btn-save:hover:not(:disabled) {
  background-color: #f5f5f5;
}

.btn-complete {
  background-color: #4caf50;
  color: white;
}

.btn-complete:hover:not(:disabled) {
  background-color: #45a049;
}

.btn-cancel {
  background-color: #f44336;
  color: white;
}

.btn-cancel:hover:not(:disabled) {
  background-color: #da190b;
}

.validation-errors {
  margin-top: 15px;
  padding: 10px;
  background-color: #ffebee;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
}

.error-message {
  color: #c62828;
  font-size: 0.9em;
}
</style>