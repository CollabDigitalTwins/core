// With tsup `bundle: false`, esbuild transpiles each .ts/.tsx file but leaves
// `import './foo.css'` references alone — it doesn't copy the .css files. Next
// resolves the import at consume-time, fails because dist/<path>/foo.css
// doesn't exist. This step mirrors every .css under src/ into dist/ at the
// same relative path so those imports resolve.
import { readdirSync, mkdirSync, copyFileSync } from 'node:fs'
import path from 'node:path'

const SRC = 'src'
const DEST = 'dist'

let copied = 0
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const srcPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(srcPath)
    } else if (entry.name.endsWith('.css')) {
      const destPath = path.join(DEST, path.relative(SRC, srcPath))
      mkdirSync(path.dirname(destPath), { recursive: true })
      copyFileSync(srcPath, destPath)
      copied++
    }
  }
}

walk(SRC)
console.log(`CSS: copied ${copied} file(s) from ${SRC}/ to ${DEST}/`)