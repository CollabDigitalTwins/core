// With tsup `bundle: false`, esbuild transpiles each .ts/.tsx file but leaves
// `import './foo.css'` and `import './bar.json'` references alone — it doesn't
// copy those files. This step mirrors every .css and .json under src/ into
// dist/ at the same relative path so those imports resolve.
import { readdirSync, mkdirSync, copyFileSync } from 'node:fs'
import path from 'node:path'

const SRC = 'src'
const DEST = 'dist'
const EXTENSIONS = ['.css', '.json']

let copied = 0
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const srcPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(srcPath)
    } else if (EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      const destPath = path.join(DEST, path.relative(SRC, srcPath))
      mkdirSync(path.dirname(destPath), { recursive: true })
      copyFileSync(srcPath, destPath)
      copied++
    }
  }
}

walk(SRC)
console.log(`Assets: copied ${copied} file(s) from ${SRC}/ to ${DEST}/`)