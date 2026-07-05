// Status-Logik: wird automatisch aus dem Renndatum berechnet, nicht hart codiert.
// Ein Rennen gilt als "gefahren", sobald der Rennabend vorbei ist.
// Verschobene Rennen (Feld "verschobenAuf") sind orange, bis sie gefahren sind.
const RENNENDE_UHRZEIT = 'T23:00:00'

export function effektivesDatum(eintrag) {
  return eintrag.verschobenAuf || eintrag.datum
}

export function berechneStatus(datum, verschobenAuf) {
  const effektiv = verschobenAuf || datum
  if (!effektiv || effektiv === 'TBD') return 'tbd'
  const rennende = new Date(effektiv + RENNENDE_UHRZEIT)
  if (Date.now() > rennende.getTime()) return 'gefahren'
  return verschobenAuf ? 'verschoben' : 'ausstehend'
}

// Reichert Kalender-Eintraege mit Status an und markiert das naechste anstehende Rennen
export function annotiereEintraege(eintraege) {
  const mitStatus = eintraege.map((e) =>
    e.typ === 'rennen'
      ? {
          ...e,
          id: e.runde + '-' + e.streckeId,
          status: berechneStatus(e.datum, e.verschobenAuf),
          istNaechstes: false,
        }
      : { ...e }
  )
  const naechstes = mitStatus
    .filter((e) => e.typ === 'rennen' && (e.status === 'ausstehend' || e.status === 'verschoben'))
    .sort((a, b) => effektivesDatum(a).localeCompare(effektivesDatum(b)))[0]
  if (naechstes) naechstes.istNaechstes = true
  return mitStatus
}

// Datum huebsch formatieren: "Mi., 08.07.2026" — TBD bleibt TBD
export function formatiereDatum(datum) {
  if (!datum || datum === 'TBD') return 'Termin folgt'
  const d = new Date(datum + 'T12:00:00')
  return d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const STATUS_TEXT = {
  gefahren: 'GEFAHREN',
  ausstehend: 'AUSSTEHEND',
  verschoben: 'VERSCHOBEN',
  tbd: 'TBD',
}
