// Re-Export der bestehenden Streckendaten, Kalender und Ergebnisse als
// oeffentlich abrufbare JSON-Dateien unter public/data/. Vite kopiert public/*
// beim Build 1:1 nach dist/, sodass sie live unter
//   https://manoaverner-maker.github.io/aspl-rennkalender/data/<name>.json
// erreichbar sind. Das Kommentatoren-Cockpit (eigenes Repo) laedt sie per fetch().
//
// Bewusst KEIN Datenumbau: strecken.json und kalender/ergebnisse werden nur
// gebuendelt und wortgetreu weitergereicht. Einzige Quelle bleibt src/data/.
// Laeuft automatisch vor `npm run dev` und `npm run build` (siehe package.json).

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(wurzel, 'src', 'data')
const zielOrdner = join(wurzel, 'public', 'data')

const liesJson = (pfad) => JSON.parse(readFileSync(pfad, 'utf8'))

// Alle JSON-Dateien eines Unterordners als sortiertes Array einlesen
function liesOrdner(name) {
  const ordner = join(src, name)
  return readdirSync(ordner)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => liesJson(join(ordner, f)))
}

const strecken = liesJson(join(src, 'strecken.json'))
const kalender = liesOrdner('kalender').sort(
  (a, b) => (a.sortierung ?? 99) - (b.sortierung ?? 99)
)
const ergebnisse = liesOrdner('ergebnisse')

mkdirSync(zielOrdner, { recursive: true })

const schreibe = (name, daten) =>
  writeFileSync(join(zielOrdner, name), JSON.stringify(daten, null, 2) + '\n', 'utf8')

schreibe('strecken.json', strecken)
schreibe('kalender.json', kalender)
schreibe('ergebnisse.json', ergebnisse)

console.log(
  `[export-daten] ${strecken.length} Strecken, ${kalender.length} Kalender, ` +
    `${ergebnisse.length} Ergebnis-Dateien -> public/data/`
)
