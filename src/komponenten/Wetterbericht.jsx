import { useEffect, useMemo, useRef, useState } from 'react'
import { useSprache } from '../i18n.jsx'
import { beschreibeWetter, holeRennwetter, inVorhersage } from '../utils/wetter.js'
import { canvasAlsBlob, schriftenBereit, zeichneWetterbild } from '../utils/wetterbild.js'

// Wetterbericht-Panel (🌦️): die Liga faehrt mit echtem Wetter, darum hier die
// Vorhersage fuer die kommenden Rennen auf einen Blick — und ein fertiges Bild
// zum Weitergeben im Discord.
// "serien" traegt alle Serien, die ins Bild sollen: montags wird ein Bild fuer die
// ganze Woche gepostet, also Solo (Mittwoch) und Team (Samstag) zusammen. Das Panel
// selbst zeigt weiter die gerade gewaehlte Serie.
export default function Wetterbericht({ seriesName, rennen, streckenMap, zeiten, serien = [], onClose }) {
  const { t, sprache, feld, datum: formatiereDatum } = useSprache()
  const [wetter, setWetter] = useState({})
  const [laedt, setLaedt] = useState(true)
  const [bildFehler, setBildFehler] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => { schriftenBereit() }, [])

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

  // Je Serie das naechste Rennen — daraus entsteht das Wochenbild.
  const naechstesJeSerie = useMemo(() => {
    const heute = new Date().toISOString().slice(0, 10)
    return serien
      .map((s) => {
        const r = (s.eintraege ?? [])
          .filter((e) => e.typ === 'rennen' && (e.verschobenAuf ?? e.datum) >= heute
                         && (e.verschobenAuf ?? e.datum) !== 'TBD')
          .map((e) => ({ ...e, datum: e.verschobenAuf ?? e.datum }))
          .sort((a, b) => a.datum.localeCompare(b.datum))[0]
        return r ? { serie: s, rennen: r } : null
      })
      .filter(Boolean)
  }, [serien])

  useEffect(() => {
    let abgebrochen = false
    const laden = async () => {
      setLaedt(true)
      const ergebnis = {}
      // Alles einsammeln, was Wetter braucht: die Liste der gewaehlten Serie und
      // je Serie das naechste Rennen fuers Bild. Doppelte fallen ueber den
      // Schluessel heraus, der Cache in wetter.js faengt den Rest ab.
      const aufgaben = [
        ...kommende.map((r) => ({ schluessel: r.runde, rennen: r, zeiten })),
        ...naechstesJeSerie.map(({ serie, rennen: r }) =>
          ({ schluessel: serie.id + ':' + r.runde, rennen: r, zeiten: serie.zeiten })),
      ]
      for (const a of aufgaben) {
        if (ergebnis[a.schluessel] || !inVorhersage(a.rennen.datum)) continue
        try {
          const w = await holeRennwetter(streckenMap?.[a.rennen.streckeId], a.rennen.datum, {
            quali: a.zeiten?.quali,
            rennstart: a.rennen.startzeit ?? a.zeiten?.rennstart,
          })
          if (w) ergebnis[a.schluessel] = w
        } catch { /* einzelner Ausfall soll den Rest nicht verhindern */ }
      }
      if (!abgebrochen) { setWetter(ergebnis); setLaedt(false) }
    }
    laden()
    return () => { abgebrochen = true }
  }, [kommende, naechstesJeSerie, streckenMap, zeiten])

  const naechstes = kommende[0]
  const naechstesWetter = naechstes ? wetter[naechstes.runde] : null

  // Fuers Bild: nur Serien, zu denen es auch eine Vorhersage gibt.
  const bildBloecke = naechstesJeSerie
    .map(({ serie, rennen: r }) => ({
      serienName: serie.name,
      rennen: r,
      strecke: streckenMap?.[r.streckeId],
      wetter: wetter[serie.id + ':' + r.runde],
      datumText: formatiereDatum(r.datum),
    }))
    .filter((b) => b.wetter)

  // Komplett synchron bis zum Klick auf den Link: jedes await dazwischen beendet
  // die Nutzergeste, und der Browser verwirft den Download ohne Meldung.
  const bildErzeugen = () => {
    if (bildBloecke.length === 0) return
    try {
      zeichneWetterbild(canvasRef.current, { bloecke: bildBloecke, sprache })
      const blob = canvasAlsBlob(canvasRef.current)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aspl-wetter-${bildBloecke[0].rennen.datum}.png`
      // Der Link muss im Dokument haengen, sonst ignorieren ihn manche Browser.
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      setBildFehler(false)
    } catch {
      // Laesst der Browser den Download nicht zu, wenigstens das Bild zeigen —
      // auf dem Handy reicht langes Antippen zum Sichern.
      setBildFehler(true)
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

                  {bildBloecke.length > 0 && (
                    <>
                      <button className="wetter-bild-knopf" onClick={bildErzeugen}>
                        {t('bildHerunterladen')}
                      </button>
                      {bildFehler && (
                        <p className="wetter-hinweis">{t('bildFehler')}</p>
                      )}
                    </>
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
      {/* Zeichenflaeche fuer das Bild. Normalerweise unsichtbar; lehnt der Browser
          den Download ab, wird sie eingeblendet, damit man das Bild sichern kann. */}
      <canvas ref={canvasRef} className={'wetter-canvas' + (bildFehler ? ' sichtbar' : '')} />
    </>
  )
}
