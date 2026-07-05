import { useEffect, useState } from 'react'
import BildMitFallback from './BildMitFallback.jsx'
import Lightbox from './Lightbox.jsx'
import WetterBox from './WetterBox.jsx'
import { formatiereDatum, STATUS_TEXT } from '../utils/status.js'
import { SIMGRID_URL } from '../utils/links.js'
import { punkte } from '../utils/punkte.js'

// Rennergebnis: Podium prominent, Rest aufklappbar (Panel nicht ueberladen)
function ErgebnisAbschnitt({ ergebnisse }) {
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
            <span className="podium-punkte">{punkte(e.platz, e.quali)} Pkt</span>
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
                  <td className="punkte-spalte">{punkte(e.platz, e.quali)}</td>
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
    return [
      ['Rennen', rennen.dauer],
      ['Start', rennen.startzeit + ' Uhr'],
      ['Boxenstopp', 'Pflichtboxenstopps gemaess Endurance-Reglement'],
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

// Slide-in-Panel mit Hero-Bild, Galerie, Streckendaten und Rennformat
export default function DetailPanel({ rennen, zeiten, ergebnisse, onClose }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)
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

  return (
    <>
      {/* Klick ausserhalb schliesst das Panel */}
      <div className="panel-overlay" onClick={onClose} />
      <section className="detail-panel" aria-label={'Details ' + strecke.kurzname}>
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
            </div>
          ) : (
            <div className="panel-status-zeile">
              <span className="badge badge-tbd">Nicht im aktuellen ASPL-Kalender</span>
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
            <ErgebnisAbschnitt ergebnisse={ergebnisse} />
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
