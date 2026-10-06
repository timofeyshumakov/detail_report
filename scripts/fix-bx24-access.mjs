import fs from 'node:fs'

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`
    if (entry.isDirectory()) walk(full, acc)
    else if (full.endsWith('.vue') || full.endsWith('.ts')) acc.push(full)
  }
  return acc
}

for (const file of walk('src')) {
  let content = fs.readFileSync(file, 'utf8')
  if (!content.includes('globalThis.BX24')) continue
  const next = content.replace(/globalThis\.BX24/g, '(window as any).BX24')
  fs.writeFileSync(file, next)
  console.log('patched BX24 access', file)
}
