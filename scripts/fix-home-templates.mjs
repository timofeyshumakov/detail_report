import fs from 'node:fs'

const file = 'src/pages/Home.vue'
let content = fs.readFileSync(file, 'utf8')

content = content.replace(
  /:title="`Открыть сделки: \$\{item\.event\}`"/g,
  `:title="'Открыть сделки: ' + item.event"`,
)

content = content.replace(
  /:style="\{ width: `\$\{visualPercent\(item\.percent\)\}%` \}"/g,
  `:style="{ width: visualPercent(item.percent) + '%' }"`,
)

fs.writeFileSync(file, content)
console.log('fixed Home.vue template literals')
