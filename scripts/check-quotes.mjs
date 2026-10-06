import fs from 'node:fs'

const content = fs.readFileSync('src/pages/Home.vue', 'utf8')
const match = content.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)
if (!match) {
  console.log('no script')
  process.exit(1)
}
const script = match[1]
let inTemplate = false
let inSingle = false
let inDouble = false
let escaped = false
const lines = script.split(/\r?\n/)

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i]
  for (let j = 0; j < line.length; j += 1) {
    const ch = line[j]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\' && (inTemplate || inSingle || inDouble)) {
      escaped = true
      continue
    }
    if (inTemplate) {
      if (ch === '`') inTemplate = false
      continue
    }
    if (inSingle) {
      if (ch === "'") inSingle = false
      continue
    }
    if (inDouble) {
      if (ch === '"') inDouble = false
      continue
    }
    if (ch === '`') inTemplate = true
    else if (ch === "'") inSingle = true
    else if (ch === '"') inDouble = true
  }
  if (inTemplate || inSingle || inDouble) {
    console.log(`UNCLOSED at script line ${i + 1}: template=${inTemplate} single=${inSingle} double=${inDouble}`)
    console.log(line)
  }
}
console.log('final', { inTemplate, inSingle, inDouble })
