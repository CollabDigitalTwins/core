// One-off: extracts core-consumed i18n namespaces from the app's message files.
// Run from core-local root: node scripts/migrate-i18n.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'

// 1. Discover namespaces from useTranslations() calls in core src
const raw = execSync(
  "grep -roh \"useTranslations('[^']*')\" src/ && grep -roh 'useTranslations(\"[^\"]*\")' src/",
  { encoding: 'utf8', shell: true }
)
const coreNamespaces = [
  ...new Set(
    raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => line.replace(/useTranslations\(['"]/, '').replace(/['"]\)/, ''))
      // Filter out namespaces that don't exist in the app (e.g. HomePage.*)
      .filter((ns) => !ns.includes('.'))
  ),
].sort()

console.log(`Found ${coreNamespaces.length} core namespaces`)

// 2. Read app message files
const APP_I18N = path.resolve('..', 'cdt-na', 'src', 'i18n', 'messages')
const locales = ['en', 'fr', 'es']
const appMessages = {}
for (const loc of locales) {
  appMessages[loc] = JSON.parse(readFileSync(path.join(APP_I18N, `${loc}.json`), 'utf8'))
}

// 3. Extract core namespaces into new message files
const DEST = path.resolve('src', 'core', 'i18n', 'messages')
mkdirSync(DEST, { recursive: true })

for (const loc of locales) {
  const coreMessages = {}
  for (const ns of coreNamespaces) {
    if (appMessages[loc][ns]) {
      coreMessages[ns] = appMessages[loc][ns]
    } else if (loc !== 'en') {
      console.log(`  [${loc}] namespace "${ns}" not found — EN fallback will cover`)
    } else {
      console.warn(`  [WARNING] EN namespace "${ns}" not found in app messages`)
    }
  }
  const sorted = Object.keys(coreMessages)
    .sort()
    .reduce((acc, k) => { acc[k] = coreMessages[k]; return acc }, {})
  writeFileSync(path.join(DEST, `${loc}.json`), JSON.stringify(sorted, null, 2) + '\n')
  console.log(`Wrote ${loc}.json (${Object.keys(sorted).length} namespaces)`)
}

console.log('\nDone. Review the generated files, then commit.')
