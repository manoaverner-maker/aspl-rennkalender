// Status-Logik: wird automatisch aus dem Renndatum berechnet, nicht hart codiert.
// Ein Rennen gilt als "gefahren", sobald der Rennabend vorbei ist (Start 20:30 + 60 Min + Puffer).
const RENNENDE_UHRZEIT = 'T22:00:00'

export function berechneStatus(datum) {
  if (!datum || datum === 'TBD') return 'tbd'
  const rennende = new Date(datum + RENNENDE_UHRZEIT)
  return Date.now() > rennende.getTime() ? 'gefahren' : 'ausstehend'
}

// Reichert Kalender-Eintraege mit Status an und markiert das naechste anstehende Rennen
export function annotiereEintraege(eintraege) {
  const mitStatus = eintraege.map((e) =>
    e.typ === 'rennen'
      ? { ...e, id: e.runde + '-' + e.streckeId, status: berechneStatus(e.datum), istNaechstes: false }
      : { ...e }
  )
  const naechstes = mitStatus
    .filter((e) => e.typ === 'rennen' && e.status === 'ausstehend')
    .sort((a, b) => a.datum.localeCompare(b.datum))[0]
  if (naechstes) naechstes.istNaechstes = true
  return mitStatus
}

// Datum huebsch formatieren: "Mi, 08.07.2026" — TBD bleibt TBD
export function formatiereDatum(datum) {
  if (!datum || datum === 'TBD') return 'Termin folgt'
  const d = new Date(datum + 'T12:00:00')
  return d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const STATUS_TEXT = { gefahren: 'GEFAHREN', ausstehend: 'AUSSTEHEND', tbd: 'TBD' }
