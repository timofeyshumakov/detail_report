import fs from 'node:fs'

const lines = fs.readFileSync('src/pages/Home.vue', 'utf8').split(/\r?\n/)
for (const n of [2526, 2814]) {
  const line = lines[n - 1]
  console.log('LINE', n, JSON.stringify(line))
  console.log([...line].map((ch, i) => `${i}:${ch}(${ch.charCodeAt(0)})`).join(' '))
}
