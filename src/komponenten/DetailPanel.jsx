import { useEffect, useRef, useState } from 'react'
import BildMitFallback from './BildMitFallback.jsx'
import Lightbox from './Lightbox.jsx'
import WetterBox from './WetterBox.jsx'
import { formatiereDatum, STATUS_TEXT } from '../utils/status.js'
import { SIMGRID_URL } from '../utils/links.js'
import { punkte } from '../utils/punkte.js'

// Rennergebnis: Podium prominent, Rest aufklappbar (Panel nicht ueberladen)
function ErgebnisAbschnitt({ ergebnisse, punkteSystem }) {
  const [zeigeAlle, setZeigeAlle] = useState(false)
  useEffect(() => setZeigeAlle(false), [ergebnisse])

  const pole = ergebnisse.find((e) => e.quali === 1)
  const podium = ergebnisse.slice(0, 3)
  const rest = ergebnisse.slice(3)

  return (
    <>
      <h3 className="panel-abschnitt">Ergebnisse</h3>
      {pole && <p className="pole-zeile">⏱️ Pole: {pole.fahrer}</p>}
      <ol className="podium">
        {podium.map((e) => (
          <li key={e.platz} className={'podium-eintrag podium-' + e.platz}>
            <span className="podium-platz">P{e.platz}</span>
            <span className="podium-fahrer">
              {e.fahrer}
              <small>{e.team ? e.team + ' · ' : ''}{e.fahrzeug}</small>
            </span>
            <span className="podium-punkte">{punkte(e.platz, e.quali, punkteSystem)} Pkt</span>
          </li>
        ))}
      </ol>
      {rest.length > 0 &&
        (zeigeAlle ? (
          <table className="wertung-tabelle ergebnis-tabelle">
            <tbody>
              {rest.map((e) => (
                <tr key={e.platz}>
                  <td className="platz-zelle">P{e.platz}</td>
                  <td>
                    {e.fahrer}
                    <small className="tabelle-sub">
                      {e.team ? e.team + ' · ' : ''}
                      {e.fahrzeug}
                      {e.nr != null ? ' · #' + e.nr : ''}
                    </small>
                  </td>
                  <td className="punkte-spalte">{punkte(e.platz, e.quali, punkteSystem)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <button className="mehr-button" onClick={() => setZeigeAlle(true)}>
            Alle Ergebnisse anzeigen ({ergebnisse.length})
          </button>
        ))}
    </>
  )
}

const BASIS = import.meta.env.BASE_URL

// Rennformat: Zeiten kommen aus dem Kalender der gewaehlten Series;
// Endurance-Rennen haben stattdessen Dauer + individuelle Startzeit
function baueRennformat(rennen, zeiten) {
  if (rennen.dauer) {
    // Endurance-Format gemaess ASPL Endurance Rulebook
    return [
      ['Rennen', rennen.dauer + ' — Start ' + rennen.startzeit + ' Uhr'],
      ['Teams', '2–4 Fahrer pro Team; Solofahrer nur im 3-Stunden-Rennen'],
      ['Fahrzeuge', 'Bei 3h/4h/6h darf ein Team beide Autos einsetzen'],
      ['Fahrerwechsel', 'Mind. 1 Pflichtstopp mit Fahrerwechsel (Solofahrer: Pflichtstopp ohne Wechsel)'],
      ['Stints', 'Ab 6 h gelten Maximal-Fahr- und Stintzeiten — Details vor dem Rennen im Discord'],
      ['Punkte', 'FIA-Endurance-System: 38-27-23-18-15-12-9-6-3-2 · jedes weitere gewertete Auto 1 Punkt'],
    ]
  }
  return [
    ['Training', '30 Min — freies Joinen (ab ' + (zeiten?.training ?? '20:00') + ')'],
    ['Qualifying', '20 Min — Start ' + (zeiten?.quali ?? '20:30')],
    ['Rennen', '60 Min — Start ' + (zeiten?.rennstart ?? '20:50')],
    ['Boxenstopp', '1 Pflichtboxenstopp, fixe Tankzeit 25 s, kein Boxenfenster'],
    ['Punkte', 'DTM-System P1–P15 + Quali-Bonus P1=3 / P2=2 / P3=1'],
  ]
}

// Teilen-Button: kopiert den Deep-Link zur Strecke (fuers Posten im Discord)
function TeilenButton({ streckeId }) {
  const [kopiert, setKopiert] = useState(false)
  const teile = async () => {
    const url =
      window.location.origin + import.meta.env.BASE_URL + '?rennen=' + streckeId
    try {
      await navigator.clipboard.writeText(url)
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2000)
    } catch {
      window.prompt('Link zum Kopieren:', url)
    }
  }
  return (
    <button className={'teilen-button' + (kopiert ? ' kopiert' : '')} onClick={teile}>
      {kopiert ? '✓ Link kopiert' : '🔗 Teilen'}
    </button>
  )
}

// Slide-in-Panel mit Hero-Bild, Galerie, Streckendaten und Rennformat
export default function DetailPanel({ rennen, zeiten, ergebnisse, punkteSystem = 'dtm', onClose }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const panelRef = useRef(null)
  const overlayRef = useRef(null)
  const strecke = rennen.strecke
  // ACC-Strecken ohne Kalender-Rennen: keine Termin-/Wetter-/Anmelde-Infos
  const istKalenderRennen = rennen.typ !== 'acc'
  const effektiv = rennen.verschobenAuf || rennen.datum
  const anzeigeZeit = rennen.startzeit || zeiten?.quali || '20:30'
  const rennformat = baueRennformat(rennen, zeiten)

  const bildUrls = strecke.bilder.map(
    (b) => BASIS + 'images/strecken/' + strecke.bilderOrdner + '/' + b
  )

  // Escape schliesst das Panel (aber erst die Lightbox, falls offen)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && lightboxIndex === null) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, lightboxIndex])

  // Handy: Bottom-Sheet nach unten wischen zum Schliessen. Nur wenn der Inhalt
  // ganz oben steht — sonst scrollt man normal im Panel. Der Hintergrund
  // (Erd-Ausschnitt) blendet beim Ziehen sanft mit aus.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const istSheet = () => window.matchMedia('(max-width: 900px)').matches
    const setOverlay = (o) => {
      if (overlayRef.current) overlayRef.current.style.opacity = String(o)
    }

    let startY = null
    let dy = 0
    let ziehend = false
    let startZeit = 0

    const onStart = (e) => {
      if (!istSheet() || e.touches.length !== 1) {
        startY = null
        return
      }
      startY = e.touches[0].clientY
      startZeit = Date.now()
      dy = 0
      ziehend = false
    }
    const onMove = (e) => {
      if (startY === null) return
      dy = e.touches[0].clientY - startY
      if (!ziehend) {
        // Zieh-Geste nur starten, wenn oben und nach unten gezogen wird
        if (dy > 6 && panel.scrollTop <= 0) ziehend = true
        else if (dy < 0 || panel.scrollTop > 0) {
          startY = null // normales Scrollen zulassen
          return
        } else return
      }
      e.preventDefault() // natives Scrollen/Bounce waehrend des Ziehens stoppen
      const t = Math.max(0, dy)
      panel.style.transition = 'none'
      panel.style.transform = `translateY(${t}px)`
      setOverlay(Math.max(0, 1 - t / 380))
    }
    const onEnd = () => {
      if (startY === null) return
      const schnellerFlick = dy > 45 && Date.now() - startZeit < 260
      const weitGenug = dy > panel.offsetHeight * 0.28
      if (ziehend && (weitGenug || schnellerFlick)) {
        navigator.vibrate?.(6) // kurzes Haptik-Feedback beim Zuschieben
        panel.style.transition = 'transform 0.2s ease-in'
        panel.style.transform = 'translateY(100%)'
        setOverlay(0)
        setTimeout(onClose, 190)
      } else if (ziehend) {
        panel.style.transition = 'transform 0.25s ease'
        panel.style.transform = 'translateY(0)'
        setOverlay(1)
      }
      startY = null
      ziehend = false
      dy = 0
    }

    panel.addEventListener('touchstart', onStart, { passive: true })
    panel.addEventListener('touchmove', onMove, { passive: false })
    panel.addEventListener('touchend', onEnd)
    panel.addEventListener('touchcancel', onEnd)
    return () => {
      panel.removeEventListener('touchstart', onStart)
      panel.removeEventListener('touchmove', onMove)
      panel.removeEventListener('touchend', onEnd)
      panel.removeEventListener('touchcancel', onEnd)
    }
  }, [onClose])

  return (
    <>
      {/* Klick auf den frei sichtbaren Erd-Ausschnitt (oder Desktop-Hintergrund)
          schliesst das Panel; auf dem Handy blendet er beim Wischen mit aus */}
      <div className="panel-overlay" ref={overlayRef} onClick={onClose} />
      <section className="detail-panel" ref={panelRef} aria-label={'Details ' + strecke.kurzname}>
        {/* Griff-Leiste als Wisch-Hinweis (nur Handy sichtbar) */}
        <div className="panel-griff" aria-hidden="true" />
        <button className="panel-schliessen" onClick={onClose} aria-label="Schliessen">
          ✕
        </button>

        <div className="panel-hero" onClick={() => setLightboxIndex(0)}>
          <BildMitFallback src={bildUrls[0]} alt={strecke.name} fallbackText={strecke.kurzname} />
          {rennen.runde && <span className="panel-runde">{rennen.runde}</span>}
        </div>

        <div className="panel-inhalt">
          <h2 className="panel-titel">{strecke.name}</h2>
          <p className="panel-land">
            {strecke.flagge} {strecke.land}
          </p>

          {istKalenderRennen ? (
            <div className="panel-status-zeile">
              <span className="panel-datum">📅 {formatiereDatum(effektiv)} · {anzeigeZeit}</span>
              <span className={'badge badge-' + rennen.status}>
                {STATUS_TEXT[rennen.status]}
                {rennen.istNaechstes ? ' · NEXT' : ''}
              </span>
              <TeilenButton streckeId={strecke.id} />
            </div>
          ) : (
            <div className="panel-status-zeile">
              <span className="badge badge-tbd">Nicht im aktuellen ASPL-Kalender</span>
              <TeilenButton streckeId={strecke.id} />
            </div>
          )}

          {/* Hinweis bei verschobenen Rennen (z. B. Server-Ausfall) */}
          {rennen.verschobenAuf && (
            <p className="verschoben-hinweis">
              ⚠️ Verschoben — urspruenglich {formatiereDatum(rennen.datum)}
              {rennen.grund ? ' (' + rennen.grund + ')' : ''}
            </p>
          )}

          {/* Anmeldung laeuft komplett ueber SimGrid */}
          {istKalenderRennen && rennen.status !== 'gefahren' && (
            <a className="anmelde-button" href={SIMGRID_URL} target="_blank" rel="noreferrer">
              🏁 Zum Rennen anmelden — SimGrid
            </a>
          )}

          {/* Ergebnisse nur, wenn gefahren UND Daten vorhanden — sonst weglassen */}
          {istKalenderRennen && rennen.status === 'gefahren' && ergebnisse?.length > 0 && (
            <ErgebnisAbschnitt ergebnisse={ergebnisse} punkteSystem={punkteSystem} />
          )}

          {istKalenderRennen && (
            <>
              <h3 className="panel-abschnitt">Wetter vor Ort</h3>
              <WetterBox lat={strecke.lat} lng={strecke.lng} />
            </>
          )}

          {/* Galerie: restliche Bilder, per Klick in der Lightbox, per Swipe scrollbar */}
          {bildUrls.length > 1 && (
            <div className="galerie">
              {bildUrls.slice(1).map((url, i) => (
                <BildMitFallback
                  key={url}
                  src={url}
                  alt={strecke.kurzname + ' Bild ' + (i + 2)}
                  className="galerie-bild"
                  fallbackText={strecke.kurzname}
                  onClick={() => setLightboxIndex(i + 1)}
                />
              ))}
            </div>
          )}

          <h3 className="panel-abschnitt">Streckendaten</h3>
          <dl className="daten-raster">
            <div>
              <dt>Laenge</dt>
              <dd>{strecke.laenge}</dd>
            </div>
            <div>
              <dt>Kurven</dt>
              <dd>{strecke.kurven}</dd>
            </div>
            <div>
              <dt>Richtung</dt>
              <dd>{strecke.richtung}</dd>
            </div>
            <div>
              <dt>Eroeffnung</dt>
              <dd>{strecke.eroeffnung}</dd>
            </div>
          </dl>

          <ul className="besonderheiten">
            {strecke.besonderheiten.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>

          {istKalenderRennen && (
            <>
              <h3 className="panel-abschnitt">Rennformat</h3>
              <ul className="rennformat">
                {rennformat.map(([label, wert]) => (
                  <li key={label}>
                    <strong>{label}</strong>
                    <span>{wert}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {lightboxIndex !== null && (
        <Lightbox
          bilder={bildUrls}
          index={lightboxIndex}
          onIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
