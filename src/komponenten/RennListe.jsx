import { useState } from 'react'
import BildMitFallback from './BildMitFallback.jsx'
import Countdown from './Countdown.jsx'
import { formatiereDatum, STATUS_TEXT } from '../utils/status.js'

const BASIS = import.meta.env.BASE_URL

function heroBildUrl(strecke) {
  return BASIS + 'images/strecken/' + strecke.bilderOrdner + '/' + strecke.bilder[0]
}

// Seitenleiste mit allen Rennen der gewaehlten Series (auf Mobile unter dem Globus).
// Optional darunter: alle weiteren ACC-Strecken (Toggle "Alle ACC-Strecken").
export default function RennListe({ eintraege, streckenMap, aktivId, onWahl, hinweis, accStrecken = [], siegerMap = {}, seriesId, zeiten }) {
  const [suche, setSuche] = useState('')
  const naechstes = eintraege.find((e) => e.typ === 'rennen' && e.istNaechstes)

  const passt = (strecke) =>
    !suche ||
    (strecke.kurzname + ' ' + strecke.name + ' ' + strecke.land)
      .toLowerCase()
      .includes(suche.toLowerCase().trim())

  const gefiltert = eintraege.filter((e) => {
    if (e.typ === 'pause') return suche === ''
    if (e.typ === 'abgesagt') return suche === ''
    const strecke = streckenMap[e.streckeId]
    return strecke && passt(strecke)
  })
  const accGefiltert = accStrecken.filter(passt)

  const alleTbd =
    eintraege.filter((e) => e.typ === 'rennen').every((e) => e.status === 'tbd') &&
    eintraege.some((e) => e.typ === 'rennen')

  return (
    <aside className="rennliste" aria-label="Rennliste">
      {naechstes && !suche && (
        <Countdown
          eintrag={naechstes}
          strecke={streckenMap[naechstes.streckeId]}
          zeiten={zeiten}
          onWahl={onWahl}
        />
      )}
      <input
        className="strecken-suche"
        type="search"
        placeholder="🔍 Strecke oder Land suchen …"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        aria-label="Strecke oder Land suchen"
      />
      {hinweis && !suche && <div className={'liste-hinweis' + (alleTbd ? ' tbd' : '')}>{hinweis}</div>}
      {/* key = Serieswechsel loest sanftes Einblenden der Liste aus */}
      <ol className="rennkarten" key={seriesId}>
        {gefiltert.map((e, i) => {
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
          if (e.typ === 'abgesagt') {
            const strecke = streckenMap[e.streckeId]
            return (
              <li key={'abgesagt-' + i} className="abgesagt-karte">
                <span className="pause-symbol">❌</span>
                <div>
                  <strong>
                    {e.runde}
                    {strecke ? ' · ' + strecke.kurzname : ''} — Rennen abgesagt
                  </strong>
                  <span className="pause-text">{e.grund}</span>
                </div>
              </li>
            )
          }
          const strecke = streckenMap[e.streckeId]
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
                  <BildMitFallback src={heroBildUrl(strecke)} alt={strecke.kurzname} fallbackText={strecke.kurzname} />
                  <span className="karte-runde">{e.runde}</span>
                </div>
                <div className="karte-info">
                  <span className="karte-name">
                    {strecke.flagge} {strecke.kurzname}
                  </span>
                  <span className="karte-datum">
                    {formatiereDatum(e.verschobenAuf || e.datum)}
                    {e.startzeit ? ' · ' + e.startzeit : ''}
                  </span>
                  <span className="karte-status-zeile">
                    <span className={'badge badge-' + e.status}>
                      {STATUS_TEXT[e.status]}
                      {e.istNaechstes ? ' · NEXT' : ''}
                    </span>
                    {e.status === 'gefahren' && siegerMap[e.streckeId] && (
                      <span className="karte-sieger">🥇 {siegerMap[e.streckeId]}</span>
                    )}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
        {suche !== '' && gefiltert.length === 0 && accGefiltert.length === 0 && (
          <li className="liste-hinweis">Keine Strecke gefunden</li>
        )}
      </ol>

      {accGefiltert.length > 0 && (
        <>
          <h3 className="acc-titel">Weitere ACC-Strecken</h3>
          <ol className="rennkarten">
            {accGefiltert.map((s) => {
              const id = 'acc-' + s.id
              return (
                <li key={id}>
                  <button
                    className={'rennkarte acc-karte' + (id === aktivId ? ' aktiv' : '')}
                    onClick={() => onWahl({ typ: 'acc', id, streckeId: s.id, status: 'acc' })}
                  >
                    <div className="karte-bild">
                      <BildMitFallback src={heroBildUrl(s)} alt={s.kurzname} fallbackText={s.kurzname} />
                    </div>
                    <div className="karte-info">
                      <span className="karte-name">
                        {s.flagge} {s.kurzname}
                      </span>
                      <span className="karte-datum">{s.land}</span>
                      <span className="badge badge-acc">ACC-Strecke</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </aside>
  )
}
