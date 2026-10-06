import fs from 'node:fs'
import path from 'node:path'

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (entry.name.endsWith('.vue')) acc.push(full)
  }
  return acc
}

const files = walk('src')
const changed = []

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  const original = content

  content = content.replace(/<script(\s+)setup(\s*)>/g, '<script$1setup lang="ts">')
  content = content.replace(/<script(\s+)lang="js"(\s*)>/g, '<script$1lang="ts">')
  content = content.replace(/<script(\s*)>/g, (match) => (match.includes('lang') ? match : '<script lang="ts">'))
  content = content.replace(/stores\/store\.js/g, 'stores/store')

  if (content !== original) {
    fs.writeFileSync(file, content)
    changed.push(file)
  }
}

console.log(changed.length ? changed.join('\n') : 'none')
