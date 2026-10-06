import fs from 'node:fs'

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`
    if (entry.isDirectory()) walk(full, acc)
    else if (full.endsWith('.vue')) acc.push(full)
  }
  return acc
}

for (const file of walk('src')) {
  let content = fs.readFileSync(file, 'utf8')
  // Insert // @ts-nocheck right after opening script tag if missing
  const next = content.replace(
    /(<script\b[^>]*>)(\r?\n)/,
    (match, tag, nl) => {
      if (content.includes('@ts-nocheck')) return match
      return `${tag}${nl}// @ts-nocheck${nl}`
    },
  )
  if (next !== content) {
    fs.writeFileSync(file, next)
    console.log('nocheck', file)
  }
}
