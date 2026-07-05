import BildMitFallback from './BildMitFallback.jsx'
import { formatiereDatum, STATUS_TEXT } from '../utils/status.js'

const BASIS = import.meta.env.BASE_URL

// Seitenleiste mit allen Rennen der gewaehlten Series (auf Mobile unter dem Globus)
export default function RennListe({ eintraege, streckenMap, aktivId, onWahl, hinweis }) {
  const alleTbd =
    eintraege.filter((e) => e.typ === 'rennen').every((e) => e.status === 'tbd') &&
    eintraege.some((e) => e.typ === 'rennen')

  return (
    <aside className="rennliste" aria-label="Rennliste">
      {hinweis && <div className={'liste-hinweis' + (alleTbd ? ' tbd' : '')}>{hinweis}</div>}
      <ol className="rennkarten">
        {eintraege.map((e, i) => {
          if (e.typ === 'pause') {
            return (
              <li key={'pause-' + i} className="pause-karte">
                <span className="pause-symbol">⏸</span>
                <div>
                  <strong>{e.titel}</strong>
                  <span className="pause-text">{e.beschreibung}</span>
                </div>
              </li>
            )
          }
          const strecke = streckenMap[e.streckeId]
          if (!strecke) return null
          const heroBild = BASIS + 'images/strecken/' + strecke.bilderOrdner + '/' + strecke.bilder[0]
          return (
            <li key={e.id}>
              <button
                className={
                  'rennkarte' +
                  (e.id === aktivId ? ' aktiv' : '') +
                  (e.istNaechstes ? ' naechstes' : '')
                }
                onClick={() => onWahl(e)}
              >
                <div className="karte-bild">
                  <BildMitFallback src={heroBild} alt={strecke.kurzname} fallbackText={strecke.kurzname} />
                  <span className="karte-runde">{e.runde}</span>
                </div>
                <div className="karte-info">
                  <span className="karte-name">
                    {strecke.flagge} {strecke.kurzname}
                  </span>
                  <span className="karte-datum">{formatiereDatum(e.datum)}</span>
                  <span className={'badge badge-' + e.status}>
                    {STATUS_TEXT[e.status]}
                    {e.istNaechstes ? ' · NEXT' : ''}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
