import { useEffect, useState } from 'react'

// Zaehlt Website-Besuche global (ueber alle Nutzer) via Abacus — freier,
// offener CountAPI-Nachfolger, kein eigenes Backend noetig. Erhoeht den
// Zaehler einmal pro Browser-Session und zeigt den zuletzt bekannten Stand
// aus localStorage, solange die Anfrage laeuft oder der Dienst offline ist.
const API = 'https://abacus.jasoncameron.dev'
const NAMESPACE = 'aspl-rennkalender'
const KEY = 'besuche'
const CACHE_KEY = 'aspl_besucherzahl_v1'
const SESSION_KEY = 'aspl_besuch_gezaehlt_v1'

export default function BesucherZaehler() {
  const [anzahl, setAnzahl] = useState(() => {
    const cached = localStorage.getItem(CACHE_KEY)
    return cached ? Number(cached) : null
  })

  useEffect(() => {
    const schonGezaehlt = sessionStorage.getItem(SESSION_KEY)
    const url = schonGezaehlt
      ? `${API}/get/${NAMESPACE}/${KEY}`
      : `${API}/hit/${NAMESPACE}/${KEY}`

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.value === 'number') {
          setAnzahl(data.value)
          localStorage.setItem(CACHE_KEY, String(data.value))
          sessionStorage.setItem(SESSION_KEY, '1')
        }
      })
      .catch(() => {
        // Dienst nicht erreichbar — zuletzt bekannter Wert (falls vorhanden) bleibt stehen
      })
  }, [])

  if (anzahl === null) return null

  return (
    <span className="besucher-zaehler" title="Website-Besuche gesamt">
      👁 {anzahl.toLocaleString('de-CH')} Besuche
    </span>
  )
}
