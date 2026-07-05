import { useCallback, useEffect, useMemo, useState } from 'react'
import Globus from './komponenten/Globus.jsx'
import RennListe from './komponenten/RennListe.jsx'
import DetailPanel from './komponenten/DetailPanel.jsx'
import SeriesAuswahl from './komponenten/SeriesAuswahl.jsx'
import ComingSoon from './komponenten/ComingSoon.jsx'
import Bildnachweise from './komponenten/Bildnachweise.jsx'
import streckenDaten from './data/strecken.json'
import { annotiereEintraege } from './utils/status.js'

// Alle Kalender-Dateien automatisch einlesen: eine neue Saison/Series ist nur
// eine neue JSON-Datei unter src/data/kalender/ — ohne Code-Aenderung.
const kalenderModule = import.meta.glob('./data/kalender/*.json', { eager: true })
const alleKalender = Object.values(kalenderModule)
  .map((m) => m.default)
  .sort((a, b) => (a.sortierung ?? 99) - (b.sortierung ?? 99))

// Strecken-Stammdaten als Map fuer schnellen Zugriff per ID
const streckenMap = Object.fromEntries(streckenDaten.map((s) => [s.id, s]))

// Einfache Hash-Route: '#/bildnachweise' zeigt die Nachweise-Seite
function aktuelleRoute() {
  return window.location.hash === '#/bildnachweise' ? 'bildnachweise' : 'kalender'
}

export default function App() {
  const [route, setRoute] = useState(aktuelleRoute)
  const [saisonId, setSaisonId] = useState(alleKalender[0]?.saisonId)
  const [seriesId, setSeriesId] = useState(alleKalender[0]?.seriesId)
  const [aktivesRennen, setAktivesRennen] = useState(null)
  const [flyZiel, setFlyZiel] = useState(null)

  useEffect(() => {
    const onHash = () => setRoute(aktuelleRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Auswahl-Listen fuer die Selektoren (rein datengetrieben)
  const saisons = useMemo(() => {
    const gesehen = new Map()
    alleKalender.forEach((k) => gesehen.set(k.saisonId, k.saisonName))
    return [...gesehen.entries()].map(([id, name]) => ({ id, name }))
  }, [])

  const seriesInSaison = useMemo(
    () => alleKalender.filter((k) => k.saisonId === saisonId),
    [saisonId]
  )

  const kalender = seriesInSaison.find((k) => k.seriesId === seriesId) ?? seriesInSaison[0]

  // Eintraege mit automatisch berechnetem Status anreichern
  const eintraege = useMemo(
    () => (kalender ? annotiereEintraege(kalender.eintraege) : []),
    [kalender]
  )

  // Marker-Daten fuer den Globus: Rennen + Streckenkoordinaten zusammenfuehren
  const marker = useMemo(
    () =>
      eintraege
        .filter((e) => e.typ === 'rennen' && streckenMap[e.streckeId])
        .map((e) => ({ ...e, strecke: streckenMap[e.streckeId] })),
    [eintraege]
  )

  // Klick auf Marker oder Rennkarte: Globus fliegt zur Strecke, Panel oeffnet
  const waehleRennen = useCallback((eintrag) => {
    const strecke = streckenMap[eintrag.streckeId]
    if (!strecke) return
    setAktivesRennen({ ...eintrag, strecke })
    setFlyZiel({ lat: strecke.lat, lng: strecke.lng, key: Date.now() })
  }, [])

  const schliessePanel = useCallback(() => setAktivesRennen(null), [])

  // Beim Wechsel von Saison/Series offenes Panel schliessen
  const wechsleSaison = (id) => {
    setSaisonId(id)
    const erste = alleKalender.find((k) => k.saisonId === id)
    if (erste && !alleKalender.some((k) => k.saisonId === id && k.seriesId === seriesId)) {
      setSeriesId(erste.seriesId)
    }
    setAktivesRennen(null)
  }
  const wechsleSeries = (id) => {
    setSeriesId(id)
    setAktivesRennen(null)
  }

  if (route === 'bildnachweise') {
    return <Bildnachweise />
  }

  return (
    <div className="app">
      <header className="kopf">
        <div className="kopf-innen">
          <a className="logo" href="#/">
            <span className="logo-aspl">ASPL</span>
            <span className="logo-sub">RENNKALENDER</span>
          </a>
          <SeriesAuswahl
            saisons={saisons}
            saisonId={saisonId}
            series={seriesInSaison.map((k) => ({ id: k.seriesId, name: k.seriesName }))}
            seriesId={kalender?.seriesId}
            onSaison={wechsleSaison}
            onSeries={wechsleSeries}
          />
          <a className="kopf-domain" href="https://asplracing.com" target="_blank" rel="noreferrer">
            asplracing.com
          </a>
        </div>
        <div className="racing-streifen" />
      </header>

      {kalender?.comingSoon ? (
        <ComingSoon seriesName={kalender.seriesName} />
      ) : (
        <main className="haupt">
          <section className="globus-bereich" aria-label="3D-Globus mit Rennstrecken">
            <Globus
              marker={marker}
              flyZiel={flyZiel}
              onMarkerKlick={waehleRennen}
              onHintergrundKlick={schliessePanel}
            />
            <div className="legende">
              <span className="legende-punkt gefahren" /> Gefahren
              <span className="legende-punkt ausstehend" /> Ausstehend
              <span className="legende-punkt naechstes" /> Naechstes Rennen
            </div>
          </section>
          <RennListe
            eintraege={eintraege}
            streckenMap={streckenMap}
            aktivId={aktivesRennen?.id}
            onWahl={waehleRennen}
            hinweis={kalender?.hinweis}
          />
        </main>
      )}

      {aktivesRennen && <DetailPanel rennen={aktivesRennen} onClose={schliessePanel} />}

      <footer className="fuss">
        <span>ASPL GT3 Racing Series · PS5 &amp; Xbox Series · ACC · asplracing.com</span>
        <a href="#/bildnachweise">Bildnachweise</a>
      </footer>
    </div>
  )
}
