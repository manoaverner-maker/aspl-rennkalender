import { useEffect, useState } from 'react'
import { berechneFahrerwertung, berechneTeamwertung, punkte, maxPunkteProRennen, QUALI_BONUS } from '../utils/punkte.js'

// Saisonverlauf eines Fahrers: Ergebnis + Punkte pro Rennen (klick im Leaderboard)
function FahrerDetail({ name, strecken, streckenMap, rundenMap, punkteSystem, zurueck }) {
  const rennen = Object.entries(strecken)
    .map(([streckeId, liste]) => {
      const e = liste.find((x) => x.fahrer === name)
      return e ? { streckeId, ...e } : null
    })
    .filter(Boolean)

  const gesamt = rennen.reduce((n, e) => n + punkte(e.platz, e.quali, punkteSystem), 0)
  const siege = rennen.filter((e) => e.platz === 1).length
  const podien = rennen.filter((e) => e.platz <= 3).length
  const poles = rennen.filter((e) => e.quali === 1).length
  const team = rennen[rennen.length - 1]?.team
  const MAX_PUNKTE = maxPunkteProRennen(punkteSystem)

  return (
    <div className="fahrer-detail">
      <button className="zurueck-button" onClick={zurueck}>
        ← Zur Wertung
      </button>
      <h3 className="fahrer-name">{name}</h3>
      {team && <p className="panel-land">{team}</p>}
      <div className="fahrer-kennzahlen">
        <span><strong>{gesamt}</strong> Punkte</span>
        <span><strong>{siege}</strong> {siege === 1 ? 'Sieg' : 'Siege'}</span>
        <span><strong>{podien}</strong> Podien</span>
        <span><strong>{poles}</strong> {poles === 1 ? 'Pole' : 'Poles'}</span>
      </div>
      <ol className="fahrer-rennen">
        {rennen.map((e) => {
          const pkt = punkte(e.platz, e.quali, punkteSystem)
          const strecke = streckenMap?.[e.streckeId]
          return (
            <li key={e.streckeId}>
              <span className="fahrer-rennen-name">
                {rundenMap?.[e.streckeId] ? rundenMap[e.streckeId] + ' · ' : ''}
                {strecke?.kurzname ?? e.streckeId}
              </span>
              <span className={'fahrer-platz' + (e.platz <= 3 ? ' top-' + e.platz : '')}>
                P{e.platz}
              </span>
              <span className="fahrer-balken">
                <span
                  className="fahrer-balken-wert"
                  style={{ width: Math.max(4, (pkt / MAX_PUNKTE) * 100) + '%' }}
                />
              </span>
              <span className="fahrer-punkte">
                {pkt}
                {punkteSystem !== 'endurance' && e.quali && QUALI_BONUS[e.quali] ? (
                  <small title={'inkl. Quali-Bonus P' + e.quali}> Q+{QUALI_BONUS[e.quali]}</small>
                ) : null}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// Meisterschafts-Panel (🏆): Fahrer- und ggf. Teamwertung der gewaehlten Series.
// Fahrer sind anklickbar und zeigen ihren Saisonverlauf.
export default function Leaderboard({ saisonName, seriesId, seriesName, ergebnisse, streckenMap, rundenMap, punkteSystem = 'dtm', onClose }) {
  const [tab, setTab] = useState('fahrer')
  const [fahrerDetail, setFahrerDetail] = useState(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Beim Serieswechsel zurueck auf die Fahrerwertung
  useEffect(() => {
    setTab('fahrer')
    setFahrerDetail(null)
  }, [seriesId])

  const strecken = ergebnisse?.strecken ?? {}
  const anzahlRennen = Object.keys(strecken).length
  const fahrer = berechneFahrerwertung(strecken, punkteSystem)
  const teams = seriesId === 'team' ? berechneTeamwertung(strecken, punkteSystem) : []
  const keineDaten = fahrer.length === 0

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <section className="detail-panel" aria-label={'Meisterschaft ' + seriesName}>
        <button className="panel-schliessen" onClick={onClose} aria-label="Schliessen">
          ✕
        </button>
        <div className="panel-inhalt leaderboard-inhalt">
          <h2 className="panel-titel">🏆 Meisterschaft</h2>
          <p className="panel-land">
            {saisonName} · {seriesName}
            {anzahlRennen > 0 && <> · {anzahlRennen} Rennen gewertet</>}
          </p>

          {keineDaten ? (
            <div className="leaderboard-leer">
              <span aria-hidden="true">🏁</span>
              <p>
                Noch keine Ergebnisse —{' '}
                {seriesId === 'endurance'
                  ? 'die Endurance-Series startet erst.'
                  : 'die ersten Resultate folgen nach dem naechsten Rennen.'}
              </p>
            </div>
          ) : fahrerDetail ? (
            <FahrerDetail
              name={fahrerDetail}
              strecken={strecken}
              streckenMap={streckenMap}
              rundenMap={rundenMap}
              punkteSystem={punkteSystem}
              zurueck={() => setFahrerDetail(null)}
            />
          ) : (
            <>
              {seriesId === 'team' && (
                <div className="series-buttons leaderboard-tabs" role="tablist">
                  <button
                    role="tab"
                    aria-selected={tab === 'fahrer'}
                    className={'series-button' + (tab === 'fahrer' ? ' aktiv' : '')}
                    onClick={() => setTab('fahrer')}
                  >
                    Fahrer
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === 'teams'}
                    className={'series-button' + (tab === 'teams' ? ' aktiv' : '')}
                    onClick={() => setTab('teams')}
                  >
                    Teams
                  </button>
                </div>
              )}

              {tab === 'teams' && seriesId === 'team' ? (
                <table className="wertung-tabelle">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th className="punkte-spalte">Punkte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((t, i) => (
                      <tr key={t.team} className={i < 3 ? 'top-' + (i + 1) : ''}>
                        <td className="platz-zelle">{i + 1}</td>
                        <td>{t.team}</td>
                        <td className="punkte-spalte">{t.punkte}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <>
                  <table className="wertung-tabelle">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Fahrer</th>
                        <th className="punkte-spalte">Punkte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fahrer.map((f, i) => (
                        <tr
                          key={f.fahrer}
                          className={'klickbar' + (i < 3 ? ' top-' + (i + 1) : '')}
                          onClick={() => setFahrerDetail(f.fahrer)}
                        >
                          <td className="platz-zelle">{i + 1}</td>
                          <td>
                            {f.fahrer}
                            {f.team && <small className="tabelle-sub">{f.team}</small>}
                          </td>
                          <td className="punkte-spalte">{f.punkte}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="leaderboard-tipp">Fahrer antippen fuer den Saisonverlauf</p>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
