import { useEffect, useState } from 'react'
import { berechneFahrerwertung, berechneTeamwertung } from '../utils/punkte.js'

// Meisterschafts-Panel (🏆): Fahrer- und ggf. Teamwertung der gewaehlten Series.
// Gleiche Slide-in-/Bottom-Sheet-Optik wie das Strecken-Detail-Panel.
export default function Leaderboard({ saisonName, seriesId, seriesName, ergebnisse, onClose }) {
  const [tab, setTab] = useState('fahrer')

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Beim Serieswechsel zurueck auf die Fahrerwertung
  useEffect(() => setTab('fahrer'), [seriesId])

  const strecken = ergebnisse?.strecken ?? {}
  const anzahlRennen = Object.keys(strecken).length
  const fahrer = berechneFahrerwertung(strecken)
  const teams = seriesId === 'team' ? berechneTeamwertung(strecken) : []
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
            {anzahlRennen > 0 && (
              <> · {anzahlRennen} {anzahlRennen === 1 ? 'Rennen' : 'Rennen'} gewertet</>
            )}
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
                      <tr key={f.fahrer} className={i < 3 ? 'top-' + (i + 1) : ''}>
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
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
