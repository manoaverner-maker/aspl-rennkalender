import { useEffect, useState } from 'react'
import { berechneFahrerwertung, berechneTeamwertung, punkte, maxPunkteProRennen, QUALI_BONUS } from '../utils/punkte.js'
import { useSprache } from '../i18n.jsx'
import ChampionBanner from './ChampionBanner.jsx'

// Saisonverlauf eines Fahrers: Ergebnis + Punkte pro Rennen (klick im Leaderboard)
function FahrerDetail({ name, strecken, streckenMap, rundenMap, punkteSystem, zurueck, teilstand }) {
  const { t } = useSprache()
  const rennen = Object.entries(strecken)
    .map(([streckeId, liste]) => {
      const e = liste.find((x) => x.fahrer === name)
      return e ? { streckeId, ...e } : null
    })
    .filter(Boolean)

  // Bei hinterlegten Tabellen stehen Fahrer drin, zu denen (noch) keine
  // Einzelergebnisse vorliegen — dann gibt es keinen Saisonverlauf zu zeigen.
  if (rennen.length === 0) {
    return (
      <div className="fahrer-detail">
        <button className="zurueck-button" onClick={zurueck}>
          {t('zurWertung')}
        </button>
        <h3 className="fahrer-name">{name}</h3>
        <p className="panel-land">{t('keinVerlauf')}</p>
      </div>
    )
  }

  const gesamt = rennen.reduce((n, e) => n + punkte(e.platz, e.quali, punkteSystem), 0)
  const siege = rennen.filter((e) => e.platz === 1).length
  const podien = rennen.filter((e) => e.platz <= 3).length
  const poles = rennen.filter((e) => e.quali === 1).length
  const team = rennen[rennen.length - 1]?.team
  const MAX_PUNKTE = maxPunkteProRennen(punkteSystem)

  return (
    <div className="fahrer-detail">
      <button className="zurueck-button" onClick={zurueck}>
        {t('zurWertung')}
      </button>
      <h3 className="fahrer-name">{name}</h3>
      {team && <p className="panel-land">{team}</p>}
      <div className="fahrer-kennzahlen">
        <span><strong>{gesamt}</strong> {t('punkte')}</span>
        <span><strong>{siege}</strong> {siege === 1 ? t('sieg') : t('siege')}</span>
        <span><strong>{podien}</strong> {t('podien')}</span>
        <span><strong>{poles}</strong> {poles === 1 ? t('poleEinz') : t('poles')}</span>
      </div>
      {/* Bei hinterlegter Tabelle liegen nicht zu jedem Rennen Einzelergebnisse vor —
          sonst wirkt die Summe hier wie ein Widerspruch zur Tabelle daneben. */}
      {teilstand && (
        <p className="wertung-quelle">{t('nurTeilrennen').replace('{n}', rennen.length)}</p>
      )}
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
                  <small title={t('qualiBonus').replace('{n}', e.quali)}> Q+{QUALI_BONUS[e.quali]}</small>
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
  const { t, saison, feld } = useSprache()
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

  // Die Liga veroeffentlicht Tabellen, aber nicht zu jedem Rennen die Einzelergebnisse.
  // Liegt in der Ergebnisdatei eine "wertung" vor, gilt sie — sonst wird wie bisher
  // aus den vorhandenen Rennen gerechnet.
  const wertung = ergebnisse?.wertung
  const fahrerTabelle = wertung?.fahrer
  const teamTabelle = wertung?.teams

  const fahrer = fahrerTabelle
    ? fahrerTabelle.eintraege.map((e) => ({ fahrer: e.fahrer, team: e.team ?? null, punkte: e.punkte }))
    : berechneFahrerwertung(strecken, punkteSystem)
  const teams = seriesId !== 'team'
    ? []
    : teamTabelle
      ? teamTabelle.eintraege.map((e) => ({ team: e.team, punkte: e.punkte }))
      : berechneTeamwertung(strecken, punkteSystem)
  const keineDaten = fahrer.length === 0 && teams.length === 0

  // Der Meister der gewaehlten Serie: in der Team-Series zaehlt die Teamwertung.
  const meisterTabelle = seriesId === 'team' ? teamTabelle : fahrerTabelle
  const meister = meisterTabelle?.final ? meisterTabelle.eintraege[0] : null

  // Fusszeile der jeweils angezeigten Tabelle (Stand + Herkunft).
  const aktiveTabelle = tab === 'teams' && seriesId === 'team' ? teamTabelle : fahrerTabelle

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <section className="detail-panel" aria-label={t('meisterschaft') + ' ' + seriesName}>
        <button className="panel-schliessen" onClick={onClose} aria-label={t('schliessen')}>
          ✕
        </button>
        <div className="panel-inhalt leaderboard-inhalt">
          <h2 className="panel-titel">{t('meisterschaft')}</h2>
          <p className="panel-land">
            {saison(saisonName)} · {seriesName}
            {aktiveTabelle
              ? <> · {feld(aktiveTabelle, 'stand')}</>
              : anzahlRennen > 0 && <> · {anzahlRennen} {t('rennenGewertet')}</>}
          </p>

          {/* Bei abgeschlossener Wertung faehrt der Meister animiert ein. Der key
              sorgt dafuer, dass das bei jedem Serienwechsel neu passiert. */}
          {meister && !fahrerDetail && (
            <ChampionBanner
              key={seriesId}
              name={meister.team ?? meister.fahrer}
              punkte={meister.punkte}
              istTeam={seriesId === 'team'}
            />
          )}

          {keineDaten ? (
            <div className="leaderboard-leer">
              <span aria-hidden="true">🏁</span>
              <p>
                {t('nochKeineErgebnisse')}
                {seriesId === 'endurance' ? t('enduranceStartet') : t('resultateFolgen')}
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
              teilstand={!!fahrerTabelle}
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
                    {t('fahrer')}
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === 'teams'}
                    className={'series-button' + (tab === 'teams' ? ' aktiv' : '')}
                    onClick={() => setTab('teams')}
                  >
                    {t('teams')}
                  </button>
                </div>
              )}

              {tab === 'teams' && seriesId === 'team' ? (
                <>
                  <table className="wertung-tabelle">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('team')}</th>
                      <th className="punkte-spalte">{t('punkte')}</th>
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
                  {teamTabelle && wertung?.quelle && (
                    <p className="wertung-quelle">{t('quelle')}: {wertung.quelle}</p>
                  )}
                </>
              ) : (
                <>
                  <table className="wertung-tabelle">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t('fahrer')}</th>
                        <th className="punkte-spalte">{t('punkte')}</th>
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
                  <p className="leaderboard-tipp">{t('fahrerAntippen')}</p>
                  {fahrerTabelle && wertung?.quelle && (
                    <p className="wertung-quelle">{t('quelle')}: {wertung.quelle}</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
