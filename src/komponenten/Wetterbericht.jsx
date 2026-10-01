import { useEffect, useMemo, useRef, useState } from 'react'
import { useSprache } from '../i18n.jsx'
import { beschreibeWetter, holeRennwetter, inVorhersage } from '../utils/wetter.js'
import { zeichneWetterbild } from '../utils/wetterbild.js'

// Wetterbericht-Panel (🌦️): die Liga faehrt mit echtem Wetter, darum hier die
// Vorhersage fuer die kommenden Rennen auf einen Blick — und ein fertiges Bild
// zum Weitergeben im Discord.
export default function Wetterbericht({ seriesName, rennen, streckenMap, zeiten, onClose }) {
  const { t, sprache, feld, datum: formatiereDatum } = useSprache()
  const [wetter, setWetter] = useState({})
  const [laedt, setLaedt] = useState(true)
  const [bildLaeuft, setBildLaeuft] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Nur Rennen, die noch kommen — und nur die, fuer die es ueberhaupt eine
  // Vorhersage geben kann. Fuer spaetere sparen wir uns den Abruf.
  const kommende = useMemo(() => {
    const heute = new Date().toISOString().slice(0, 10)
    return (rennen ?? [])
      .filter((r) => r.typ === 'rennen' && (r.verschobenAuf ?? r.datum) >= heute)
      .map((r) => ({ ...r, datum: r.verschobenAuf ?? r.datum }))
      .sort((a, b) => a.datum.localeCompare(b.datum))
  }, [rennen])

  useEffect(() => {
    let abgebrochen = false
    const laden = async () => {
      setLaedt(true)
      const ergebnis = {}
      for (const r of kommende) {
        if (!inVorhersage(r.datum)) continue
        const strecke = streckenMap?.[r.streckeId]
        try {
          const w = await holeRennwetter(strecke, r.datum, {
            quali: zeiten?.quali,
            rennstart: r.startzeit ?? zeiten?.rennstart,
          })
          if (w) ergebnis[r.runde] = w
        } catch { /* einzelner Ausfall soll den Rest nicht verhindern */ }
      }
      if (!abgebrochen) { setWetter(ergebnis); setLaedt(false) }
    }
    laden()
    return () => { abgebrochen = true }
  }, [kommende, streckenMap, zeiten])

  const naechstes = kommende[0]
  const naechstesWetter = naechstes ? wetter[naechstes.runde] : null

  const bildErzeugen = async () => {
    if (!naechstes || !naechstesWetter) return
    setBildLaeuft(true)
    try {
      const strecke = streckenMap?.[naechstes.streckeId]
      const url = await zeichneWetterbild(canvasRef.current, {
        strecke, rennen: naechstes, wetter: naechstesWetter, seriesName, sprache,
        datumText: formatiereDatum(naechstes.datum),
      })
      const a = document.createElement('a')
      a.href = url
      a.download = `aspl-wetter-${naechstes.streckeId}-${naechstes.datum}.png`
      a.click()
    } finally {
      setBildLaeuft(false)
    }
  }

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <section className="detail-panel" aria-label={t('wetterbericht')}>
        <button className="panel-schliessen" onClick={onClose} aria-label={t('schliessen')}>✕</button>
        <div className="panel-inhalt leaderboard-inhalt">
          <h2 className="panel-titel">{t('wetterbericht')}</h2>
          <p className="panel-land">{seriesName}</p>

          {kommende.length === 0 && <p className="wetter-hinweis">{t('keineKommenden')}</p>}

          {kommende.length > 0 && (
            <>
              {/* Das naechste Rennen ausfuehrlich: dort gibt es verlaessliche Daten. */}
              {naechstes && (
                <div className="wetter-naechstes">
                  <p className="wetter-label">{t('naechstesRennen')}</p>
                  <h3 className="wetter-strecke">
                    {streckenMap?.[naechstes.streckeId]?.flagge}{' '}
                    {streckenMap?.[naechstes.streckeId]?.kurzname ?? naechstes.streckeId}
                  </h3>
                  <p className="wetter-datum">{formatiereDatum(naechstes.datum)}</p>

                  {laedt && <p className="wetter-hinweis">{t('wetterLaden')}</p>}

                  {!laedt && !naechstesWetter && (
                    <p className="wetter-hinweis">{t('keineVorhersage')}</p>
                  )}

                  {naechstesWetter && (
                    <div className="wetter-zeiten">
                      {[
                        ['quali', naechstesWetter.quali],
                        ['rennen', naechstesWetter.rennen],
                      ].filter(([, w]) => w).map(([art, w]) => {
                        const b = beschreibeWetter(w.code, sprache)
                        return (
                          <div className="wetter-slot" key={art}>
                            <p className="wetter-slot-titel">
                              {art === 'quali' ? t('qualifying') : t('rennstart')} · {w.zeit}
                            </p>
                            <p className="wetter-symbol">{b.symbol}</p>
                            <p className="wetter-text">{b.text}</p>
                            <p className="wetter-werte">
                              <strong>{w.temperatur}°C</strong>
                              {w.regen != null && <> · 💧 {w.regen}%</>}
                              {w.wind != null && <> · 💨 {w.wind} km/h</>}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {naechstesWetter && (
                    <button className="wetter-bild-knopf" onClick={bildErzeugen} disabled={bildLaeuft}>
                      {bildLaeuft ? t('bildLaeuft') : t('bildHerunterladen')}
                    </button>
                  )}
                </div>
              )}

              {/* Die weiteren Rennen knapp — mit Vorhersage, soweit es sie gibt. */}
              {kommende.length > 1 && (
                <ul className="wetter-liste">
                  {kommende.slice(1).map((r) => {
                    const w = wetter[r.runde]
                    const b = w ? beschreibeWetter(w.tag.code, sprache) : null
                    const strecke = streckenMap?.[r.streckeId]
                    return (
                      <li key={r.runde}>
                        <span className="wetter-runde">{r.runde}</span>
                        <span className="wetter-ort">
                          {strecke?.flagge} {strecke?.kurzname ?? r.streckeId}
                          <small>{formatiereDatum(r.datum)}</small>
                        </span>
                        {b ? (
                          <span className="wetter-kurz">
                            <span className="wetter-kurz-symbol">{b.symbol}</span>
                            {w.tag.max}° / {w.tag.min}°
                            {w.tag.regen != null && <> · 💧 {w.tag.regen}%</>}
                          </span>
                        ) : (
                          <span className="wetter-kurz leer">{t('nochKeineVorhersage')}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              <p className="wertung-quelle">{t('wetterQuelle')}</p>
            </>
          )}
        </div>
      </section>
      {/* Zeichenflaeche fuer das Discord-Bild — nie sichtbar, nur zum Rendern. */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  )
}
