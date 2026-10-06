import fs from 'node:fs'

/**
 * Safely annotate function params with `: any` without using String.replace
 * (which treats `$` as special and corrupts template literals).
 */
function annotateParams(src) {
  const re = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g
  let out = ''
  let last = 0
  let match
  while ((match = re.exec(src))) {
    const [full, name, params] = match
    out += src.slice(last, match.index)
    if (!params.trim() || params.includes(':')) {
      out += full
    } else {
      const next = params
        .split(',')
        .map((part) => {
          const p = part.trim()
          if (!p) return part
          if (p.startsWith('...')) {
            const rest = p.slice(3).trim()
            if (rest.includes(':')) return part
            return `...${rest}: any[]`
          }
          if (p.includes('=')) {
            const eq = p.indexOf('=')
            const id = p.slice(0, eq).trim()
            const right = p.slice(eq + 1)
            if (id.includes(':')) return part
            return `${id}: any =${right}`
          }
          return `${p}: any`
        })
        .join(', ')
      out += `function ${name}(${next})`
    }
    last = match.index + full.length
  }
  out += src.slice(last)
  return out
}

function patchFile(file) {
  if (!fs.existsSync(file)) return
  const content = fs.readFileSync(file, 'utf8')
  const scriptRe = /<script\b[^>]*>/
  const open = scriptRe.exec(content)
  if (!open) return
  const start = open.index + open[0].length
  const close = content.indexOf('</script>', start)
  if (close < 0) return
  const script = content.slice(start, close)
  let nextScript = script

  // ensure lang=ts on opening tag
  let openTag = open[0]
  if (!/lang\s*=/.test(openTag)) {
    openTag = openTag.replace('<script', '<script lang="ts"').replace('setup', 'setup')
    if (openTag.includes('setup') && !openTag.includes('lang=')) {
      openTag = openTag.replace('setup', 'setup lang="ts"')
    }
    if (!openTag.includes('lang=')) {
      openTag = openTag.replace('<script', '<script lang="ts"')
    }
  } else if (/lang\s*=\s*["']js["']/.test(openTag)) {
    openTag = openTag.replace(/lang\s*=\s*["']js["']/, 'lang="ts"')
  } else if (openTag.includes('setup') && !/lang\s*=\s*["']ts["']/.test(openTag)) {
    openTag = openTag.replace('<script', '<script').replace(/<script([^>]*)>/, '<script$1 lang="ts">')
  }

  // Fix setup without lang
  if (/<script\s+setup\s*>/.test(open[0])) {
    openTag = '<script setup lang="ts">'
  } else if (/<script\s+setup\s+lang="ts"\s*>/.test(open[0])) {
    openTag = open[0]
  } else if (/<script\s+lang="ts"\s*>/.test(open[0])) {
    openTag = open[0]
  } else if (open[0].includes('setup') && !open[0].includes('lang=')) {
    openTag = open[0].replace('setup', 'setup lang="ts"')
  }

  nextScript = annotateParams(script)
  const next = content.slice(0, open.index) + openTag + nextScript + content.slice(close)
  fs.writeFileSync(file, next)
  console.log('patched', file)
}

const targets = [
  'src/pages/Home.vue',
  'src/Home.vue',
  'src/components/EventDealsDialog.vue',
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
  'src/components/LoadingProgress.vue',
  'src/components/LoadingSpinner.vue',
  'src/components/Errors.vue',
]

for (const file of targets) patchFile(file)
