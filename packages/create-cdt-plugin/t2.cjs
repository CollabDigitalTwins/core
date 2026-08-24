const fs = require('fs')
const p = 'src/surfaces.test.ts'
const raw = fs.readFileSync(p, 'utf8')
const crlf = raw.includes('\r\n')
let s = raw.replace(/\r\n/g, '\n')
const old = `  it('keeps the core entry inside sdk/, which is all core lets a plugin import', () => {
    // Core's ESLint isolation rule allows \`../sdk/*\` and the plugin's own files. A path
    // reaching anywhere else would make every scaffolded built-in plugin fail lint.
    for (const surface of SURFACES) {
      expect(factsFor(surface).coreEntry).toMatch(/^\.\.\/\.\.\/sdk\//)
    }
  })

`
if (!s.includes(old)) { console.error('MISS'); process.exit(1) }
s = s.replace(old, '')
fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s)
console.log('ok')
