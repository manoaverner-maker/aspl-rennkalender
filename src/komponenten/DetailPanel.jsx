import { useEffect, useState } from 'react'
import BildMitFallback from './BildMitFallback.jsx'
import Lightbox from './Lightbox.jsx'
import { formatiereDatum, STATUS_TEXT } from '../utils/status.js'

const BASIS = import.meta.env.BASE_URL

// Rennformat gilt fuer alle Rennen der Liga
const RENNFORMAT = [
  ['Training', '30 Min — freies Joinen vor Renntag'],
  ['Qualifying', '20 Min — Start um 20:30'],
  ['Rennen', '60 Min'],
  ['Boxenstopp', '1 Pflichtboxenstopp, fixe Tankzeit 25 s, kein Boxenfenster'],
  ['Punkte', 'DTM-System P1–P15 + Quali-Bonus P1=3 / P2=2 / P3=1'],
]

// Slide-in-Panel mit Hero-Bild, Galerie, Streckendaten und Rennformat
export default function DetailPanel({ rennen, onClose }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const strecke = rennen.strecke

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
          <span className="panel-runde">{rennen.runde}</span>
        </div>

        <div className="panel-inhalt">
          <h2 className="panel-titel">{strecke.name}</h2>
          <p className="panel-land">
            {strecke.flagge} {strecke.land}
          </p>

          <div className="panel-status-zeile">
            <span className="panel-datum">📅 {formatiereDatum(rennen.datum)} · 20:30</span>
            <span className={'badge badge-' + rennen.status}>
              {STATUS_TEXT[rennen.status]}
              {rennen.istNaechstes ? ' · NEXT' : ''}
            </span>
          </div>

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

          <h3 className="panel-abschnitt">Rennformat</h3>
          <ul className="rennformat">
            {RENNFORMAT.map(([label, wert]) => (
              <li key={label}>
                <strong>{label}</strong>
                <span>{wert}</span>
              </li>
            ))}
          </ul>
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
