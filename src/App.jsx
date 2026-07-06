import { useCallback, useEffect, useMemo, useState } from 'react'
import Globus from './komponenten/Globus.jsx'
import RennListe from './komponenten/RennListe.jsx'
import DetailPanel from './komponenten/DetailPanel.jsx'
import SeriesAuswahl from './komponenten/SeriesAuswahl.jsx'
import ComingSoon from './komponenten/ComingSoon.jsx'
import Bildnachweise from './komponenten/Bildnachweise.jsx'
import Leaderboard from './komponenten/Leaderboard.jsx'
import streckenDaten from './data/strecken.json'
import { annotiereEintraege } from './utils/status.js'
import { SIMGRID_URL } from './utils/links.js'

// Alle Kalender-Dateien automatisch einlesen: eine neue Saison/Series ist nur
// eine neue JSON-Datei unter src/data/kalender/ — ohne Code-Aenderung.
const kalenderModule = import.meta.glob('./data/kalender/*.json', { eager: true })
const alleKalender = Object.values(kalenderModule)
  .map((m) => m.default)
  .sort((a, b) => (a.sortierung ?? 99) - (b.sortierung ?? 99))

// Rennergebnisse: pro Saison+Series eine JSON-Datei unter src/data/ergebnisse/ —
// neue Rennen sind nur ein weiterer Strecken-Key, neue Saisons eine neue Datei
const ergebnisModule = import.meta.glob('./data/ergebnisse/*.json', { eager: true })
const alleErgebnisse = Object.values(ergebnisModule).map((m) => m.default)

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
  const [leaderboardOffen, setLeaderboardOffen] = useState(false)
  const [neueVersion, setNeueVersion] = useState(false)
  // Alle ACC-Strecken sind standardmaessig sichtbar und klickbar;
  // der Toggle blendet sie bei Bedarf aus (?alle=0 als Deep-Link)
  const [alleStrecken, setAlleStrecken] = useState(
    () => new URLSearchParams(window.location.search).get('alle') !== '0'
  )

  useEffect(() => {
    const onHash = () => setRoute(aktuelleRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Update-Erkennung: vergleicht periodisch den Skript-Hash der Live-Seite
  // mit dem gerade laufenden Build — bei Abweichung erscheint der
  // "Aktualisieren"-Knopf (wichtig fuer installierte PWA/Handy-Nutzer)
  useEffect(() => {
    const laufendesSkript = document
      .querySelector('script[src*="assets/index-"]')
      ?.getAttribute('src')
    if (!laufendesSkript) return // Dev-Modus
    const pruefe = async () => {
      try {
        const antwort = await fetch(import.meta.env.BASE_URL + 'index.html', { cache: 'no-store' })
        if (!antwort.ok) return
        const html = await antwort.text()
        const neu = html.match(/assets\/index-[\w-]+\.js/)
        if (neu && !laufendesSkript.includes(neu[0])) setNeueVersion(true)
      } catch {
        /* offline o. ae. — beim naechsten Versuch */
      }
    }
    const timer = setInterval(pruefe, 5 * 60 * 1000)
    const beiSichtbar = () => {
      if (document.visibilityState === 'visible') pruefe()
    }
    document.addEventListener('visibilitychange', beiSichtbar)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', beiSichtbar)
    }
  }, [])

  // Deep-Link ?rennen=<runde|streckeId>: fliegt nach dem Laden direkt zum Rennen.
  // Ist die Strecke kein Rennen im aktiven Kalender, oeffnet sie als ACC-Strecke.
  useEffect(() => {
    const ziel = new URLSearchParams(window.location.search).get('rennen')
    if (!ziel) return
    const gesucht = ziel.toLowerCase()
    const eintrag =
      eintraege.find(
        (e) =>
          e.typ === 'rennen' &&
          (e.runde.toLowerCase() === gesucht || e.streckeId.toLowerCase() === gesucht)
      ) ??
      (streckenMap[gesucht]
        ? { typ: 'acc', id: 'acc-' + gesucht, streckeId: gesucht, status: 'acc' }
        : null)
    if (!eintrag) return
    const timer = setTimeout(() => waehleRennen(eintrag), 700)
    return () => clearTimeout(timer)
    // bewusst nur einmal beim Start ausfuehren
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Ergebnisse der aktuell gewaehlten Saison+Series (kann fehlen)
  const ergebnisse = alleErgebnisse.find(
    (e) => e.saisonId === kalender?.saisonId && e.seriesId === kalender?.seriesId
  )

  // Punktesystem der Series: Endurance nutzt FIA-Endurance, sonst DTM.
  // Kann pro Ergebnis-Datei via "punkteSystem" ueberschrieben werden.
  const punkteSystem =
    ergebnisse?.punkteSystem ?? (kalender?.seriesId === 'endurance' ? 'endurance' : 'dtm')

  // Sieger pro Strecke — fuer die Einblendung auf gefahrenen Rennkarten
  const siegerMap = useMemo(() => {
    const m = {}
    for (const [streckeId, liste] of Object.entries(ergebnisse?.strecken ?? {})) {
      const p1 = liste.find((e) => e.platz === 1)
      if (p1) m[streckeId] = p1.fahrer
    }
    return m
  }, [ergebnisse])

  // Eintraege mit automatisch berechnetem Status anreichern
  const eintraege = useMemo(
    () => (kalender ? annotiereEintraege(kalender.eintraege) : []),
    [kalender]
  )

  // Marker-Daten fuer den Globus: Rennen + Streckenkoordinaten zusammenfuehren
  const kalenderMarker = useMemo(
    () =>
      eintraege
        .filter((e) => e.typ === 'rennen' && streckenMap[e.streckeId])
        .map((e) => ({ ...e, strecke: streckenMap[e.streckeId] })),
    [eintraege]
  )

  // Zusaetzliche ACC-Strecken (blau): dynamisch alle Strecken, die im aktuell
  // gewaehlten Kalender NICHT als Rennen vorkommen — bleibt automatisch korrekt,
  // sobald z. B. die Team-Series eigene Termine bekommt
  const accStrecken = useMemo(() => {
    const imKalender = new Set(
      eintraege.filter((e) => e.typ === 'rennen').map((e) => e.streckeId)
    )
    return streckenDaten.filter((s) => !imKalender.has(s.id))
  }, [eintraege])

  const marker = useMemo(
    () =>
      alleStrecken
        ? [
            ...kalenderMarker,
            ...accStrecken.map((s) => ({
              typ: 'acc',
              id: 'acc-' + s.id,
              streckeId: s.id,
              status: 'acc',
              strecke: s,
            })),
          ]
        : kalenderMarker,
    [kalenderMarker, accStrecken, alleStrecken]
  )

  // Klick auf Marker oder Rennkarte: Globus fliegt zur Strecke, Panel oeffnet
  const waehleRennen = useCallback((eintrag) => {
    const strecke = streckenMap[eintrag.streckeId]
    if (!strecke) return
    setLeaderboardOffen(false)
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
            <img className="logo-icon" src={import.meta.env.BASE_URL + 'logo.svg'} alt="" />
            <span className="logo-text">
              <span className="logo-aspl">ASPL</span>
              <span className="logo-sub">RENNKALENDER</span>
            </span>
          </a>
          <SeriesAuswahl
            saisons={saisons}
            saisonId={saisonId}
            series={seriesInSaison.map((k) => ({ id: k.seriesId, name: k.seriesName }))}
            seriesId={kalender?.seriesId}
            onSaison={wechsleSaison}
            onSeries={wechsleSeries}
          />
          {!kalender?.comingSoon && (
            <button
              className={'strecken-toggle' + (alleStrecken ? ' aktiv' : '')}
              aria-pressed={alleStrecken}
              title={
                alleStrecken
                  ? 'Zeigt alle 25 ACC-Strecken — klicken fuer nur Kalender-Rennen'
                  : 'Zeigt nur Kalender-Rennen — klicken fuer alle 25 ACC-Strecken'
              }
              onClick={() => setAlleStrecken(!alleStrecken)}
            >
              <span className="toggle-punkt" aria-hidden="true" />
              Alle ACC-Strecken
            </button>
          )}
          <button
            className="pokal-button"
            aria-label="Meisterschaft anzeigen"
            title="Meisterschaft / Leaderboard"
            onClick={() => {
              setAktivesRennen(null)
              setLeaderboardOffen(true)
            }}
          >
            🏆
          </button>
          <a className="kopf-anmelden" href={SIMGRID_URL} target="_blank" rel="noreferrer">
            🏁 Anmelden
          </a>
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
          </section>
          {/* Desktop: Overlay unten links am Globus — Mobile: eigene Zeile darunter */}
          <div className="legende">
              <span className="legende-item">
                <span className="legende-punkt gefahren" /> Gefahren
              </span>
              <span className="legende-item">
                <span className="legende-punkt ausstehend" /> Ausstehend
              </span>
              {kalenderMarker.some((m) => m.status === 'verschoben') && (
                <span className="legende-item">
                  <span className="legende-punkt verschoben" /> Verschoben
                </span>
              )}
              <span className="legende-item">
                <span className="legende-punkt naechstes" /> Next
              </span>
              {alleStrecken && (
                <span className="legende-item">
                  <span className="legende-punkt acc" /> ACC
                </span>
              )}
          </div>
          <RennListe
            eintraege={eintraege}
            streckenMap={streckenMap}
            aktivId={aktivesRennen?.id}
            onWahl={waehleRennen}
            hinweis={kalender?.hinweis}
            accStrecken={alleStrecken ? accStrecken : []}
            siegerMap={siegerMap}
            seriesId={kalender?.seriesId}
            zeiten={kalender?.zeiten}
          />
        </main>
      )}

      {aktivesRennen && (
        <DetailPanel
          rennen={aktivesRennen}
          zeiten={kalender?.zeiten}
          ergebnisse={ergebnisse?.strecken?.[aktivesRennen.streckeId]}
          punkteSystem={punkteSystem}
          onClose={schliessePanel}
        />
      )}

      {leaderboardOffen && (
        <Leaderboard
          saisonName={kalender?.saisonName}
          seriesId={kalender?.seriesId}
          seriesName={kalender?.seriesName}
          ergebnisse={ergebnisse}
          streckenMap={streckenMap}
          rundenMap={Object.fromEntries(
            eintraege.filter((e) => e.typ === 'rennen').map((e) => [e.streckeId, e.runde])
          )}
          punkteSystem={punkteSystem}
          onClose={() => setLeaderboardOffen(false)}
        />
      )}

      {neueVersion && (
        <button className="update-banner" onClick={() => window.location.reload()}>
          🔄 Neue Version verfuegbar — jetzt aktualisieren
        </button>
      )}

      <footer className="fuss">
        <span>ASPL GT3 Racing Series · PS5 &amp; Xbox Series · ACC · asplracing.com</span>
        <a href="#/bildnachweise">Bildnachweise</a>
      </footer>
    </div>
  )
}
