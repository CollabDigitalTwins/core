const fs = require('fs')
const p = 'README.md'
const raw = fs.readFileSync(p, 'utf8')
const crlf = raw.includes('\r\n')
let s = raw.replace(/\r\n/g, '\n')

const pairs = [
  ['npx create-cdt-plugin --mode external --name "Room Inventory" \',
   'npx create-cdt-plugin --name "Room Inventory" \'],
  ['| `--mode` | `external`, `builtin` | `external` is dropped into a running deployment. `builtin` is compiled into `@collabdt/core` and only runs inside that package. |\n', ''],
]
for (const [from, to] of pairs) {
  if (!s.includes(from)) { console.error('MISS:', JSON.stringify(from.slice(0, 60))); process.exit(1) }
  s = s.replace(from, to)
}
fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s)
console.log('ok')
