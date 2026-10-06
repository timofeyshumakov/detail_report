import { execSync } from 'node:child_process'
import fs from 'node:fs'

function restoreFromIndex(path) {
  const content = execSync(`git show :${path}`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  fs.writeFileSync(path, content)
  console.log('restored', path, 'lines', content.split(/\r?\n/).length)
}

restoreFromIndex('src/pages/Home.vue')
restoreFromIndex('src/components/EventDealsDialog.vue')

// Also check other annotated files for corruption pattern
const files = [
  'src/Home.vue',
  'src/components/DealGeneratorDialog.vue',
  'src/components/AudienceSegmentationDialog.vue',
  'src/components/WelcomeMailingDialog.vue',
  'src/components/AudienceSegmentationView.vue',
  'src/components/TheForm/Filtres.vue',
  'src/components/TheForm/TheForm.vue',
  'src/components/TheForm/Date/Date.vue',
  'src/components/TheForm/Date/DateFields.vue',
  'src/components/TheForm/Date/DatePickerPanel.vue',
  'src/components/TheForm/Date/NumberInput.vue',
  'src/components/LeadScoring.vue',
  'src/components/OrdersList.vue',
  'src/components/OrderForm.vue',
  'src/components/WorkloadChart.vue',
  'src/components/LineChart.vue',
  'src/components/admin/CriteriaAdmin.vue',
]

for (const file of files) {
  if (!fs.existsSync(file)) continue
  const text = fs.readFileSync(file, 'utf8')
  if (text.includes("<script setup lang=\"ts\">,") || (text.match(/<script/g) || []).length > 1) {
    console.log('CORRUPT?', file)
    try {
      restoreFromIndex(file.replace(/\\/g, '/'))
    } catch (e) {
      console.log('  cannot restore', e.message)
    }
  }
}
