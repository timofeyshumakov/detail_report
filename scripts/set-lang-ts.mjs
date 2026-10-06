import fs from 'node:fs'

function setLangTs(file) {
  if (!fs.existsSync(file)) return false
  let content = fs.readFileSync(file, 'utf8')
  const original = content
  content = content.replace(/<script(\s+)setup(\s*)>/g, '<script$1setup lang="ts">')
  content = content.replace(/<script(\s+)lang="js"(\s*)>/g, '<script$1lang="ts">')
  content = content.replace(/<script(\s*)>/g, (m) => (m.includes('lang') ? m : '<script lang="ts">'))
  content = content.replace(/stores\/store\.js/g, 'stores/store')
  if (content !== original) {
    fs.writeFileSync(file, content)
    return true
  }
  return false
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`
    if (entry.isDirectory()) walk(full, acc)
    else if (entry.name.endsWith('.vue')) acc.push(full)
  }
  return acc
}

for (const file of walk('src')) {
  if (setLangTs(file)) console.log('lang=ts', file)
}
