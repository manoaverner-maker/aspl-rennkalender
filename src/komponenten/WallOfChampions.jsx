import { useMemo } from 'react'
import { useSprache } from '../i18n.jsx'
import { berechneWall } from '../utils/champions.js'
import config from '../data/champions.json'

const BASIS = import.meta.env.BASE_URL
const bild = (pfad) => (pfad ? BASIS + pfad : undefined)

// Ein Titel innerhalb einer Saisonkarte (Konstrukteur bzw. Solo-Champion)
function Titel({ label, icon, meister }) {
  const { t } = useSprache()
  if (!meister?.final) return null
  return (
    <div className="woc-titel-zeile">
      <span className="woc-titel-icon" aria-hidden="true">{icon}</span>
      <div className="woc-titel-text">
        <p className="woc-titel-label">{label}</p>
        <p className="woc-titel-name">{meister.name}</p>
      </div>
      <p className="woc-titel-punkte">
        <strong>{meister.punkte}</strong>
        <small>{t('punkteKurz')}</small>
      </p>
    </div>
  )
}

/**
 * Wall of Champions (#/champions) im Poster-Stil: alle Meister der ASPL auf einen Blick.
 * Komplett datengetrieben — Meister kommen aus den Ergebnis-Dateien mit final: true,
 * Namens-Zuordnungen, Einstellungen und Bilder aus src/data/champions.json.
 */
export default function WallOfChampions({ kalender, ergebnisse }) {
  const { t, saison } = useSprache()
  const wall = useMemo(() => berechneWall({ kalender, ergebnisse, config }), [kalender, ergebnisse])
  const bilder = config.bilder ?? {}

  // Zeitstrahl: aelteste Saison links, neueste rechts. Nur abgeschlossene Titel.
  const saisons = [...wall.saisons]
    .filter((s) => s.solo?.final || s.konstrukteur?.final)
    .reverse()
  // Endurance erscheint erst, wenn ein Endstand hinterlegt ist
  const endurance = wall.endurance.filter((e) => e.meister?.final)

  const seriesLabel = wall.series
    .map((s) => (s === 'solo' ? 'Solo' : s === 'team' ? 'Team' : 'Endurance'))
    .join(' + ')
  const ersteSaison = saisons[0]?.id.replace(/\D+/g, '')
  const letzteSaison = saisons[saisons.length - 1]?.id.replace(/\D+/g, '')

  // Top 10 in zwei Spalten (1–5 | 6–10), damit das Poster nicht in die Hoehe waechst
  const haelfte = Math.ceil(wall.bestenliste.length / 2)
  const spalten = [wall.bestenliste.slice(0, haelfte), wall.bestenliste.slice(haelfte)]

  return (
    <div className="app woc-app">
      <header className="kopf">
        <div className="kopf-innen">
          <a className="logo" href="#/">
            <img className="logo-icon" src={BASIS + 'logo.svg'} alt="" />
            <span className="logo-text">
              <span className="logo-aspl">ASPL</span>
              <span className="logo-sub">WALL OF CHAMPIONS</span>
            </span>
          </a>
          <a className="zurueck-link" href="#/">
            {t('zurueckKalender')}
          </a>
        </div>
        <div className="racing-streifen" />
      </header>

      <main className="woc">
        <div className="woc-poster">
          {/* Kopfbanner mit Rennfoto */}
          <section className="woc-hero" style={{ '--bild': `url(${bild(bilder.hero)})` }}>
            <div className="woc-hero-inhalt">
              <p className="woc-hero-kicker">ASPL GT3 Racing Series</p>
              <h1 className="woc-hero-titel">
                Wall of <span>Champions</span>
              </h1>
              {ersteSaison && (
                <p className="woc-hero-sub">
                  {t('wocSaisonSpanne')
                    .replace('{von}', ersteSaison)
                    .replace('{bis}', letzteSaison)}{' '}
                  · ACC · PS5 &amp; Xbox Series
                </p>
              )}
            </div>
            <div className="woc-hero-streifen" aria-hidden="true" />
          </section>

          {/* Meister pro Saison: Zeitstrahl nebeneinander */}
          <section className="woc-saisons">
            {saisons.map((s) => (
              <article key={s.id} className="woc-saison-karte">
                <div
                  className="woc-saison-bild"
                  style={{ '--bild': `url(${bild(bilder.saisons?.[s.id] ?? bilder.standard)})` }}
                >
                  <span className="woc-saison-nr">S{s.id.replace(/\D+/g, '')}</span>
                  <span className="woc-saison-name">{saison(s.name)}</span>
                </div>
                <div className="woc-saison-titel">
                  <Titel label={t('wocKonstrukteurKurz')} icon="🏁" meister={s.konstrukteur} />
                  <Titel label={t('wocSoloKurzLabel')} icon="👑" meister={s.solo} />
                </div>
              </article>
            ))}
            {endurance.map((e) => (
              <article key={e.id} className="woc-saison-karte">
                <div
                  className="woc-saison-bild"
                  style={{ '--bild': `url(${bild(bilder.endurance ?? bilder.standard)})` }}
                >
                  <span className="woc-saison-nr">E</span>
                  <span className="woc-saison-name">Endurance{e.jahr ? ' ' + e.jahr : ''}</span>
                </div>
                <div className="woc-saison-titel">
                  <Titel label={t('wocEndurance')} icon="⏱️" meister={e.meister} />
                </div>
              </article>
            ))}
          </section>

          {/* All-Time-Rekorde: Top 10 + Driver of the Day */}
          <section className="woc-rekorde" style={{ '--bild': `url(${bild(bilder.rekorde)})` }}>
            <div className="woc-rekord-block woc-top10">
              <h2 className="woc-rekord-titel">
                {t('wocEwig').replace('{n}', wall.bestenliste.length)}
              </h2>
              <p className="woc-rekord-info">{t('wocEwigInfo').replace('{series}', seriesLabel)}</p>
              <div className="woc-top10-spalten">
                {spalten.map((liste, i) => (
                  <ol key={i} className="woc-liste">
                    {liste.map((f) => (
                      <li key={f.fahrer} className={f.rang <= 3 ? 'top-' + f.rang : ''}>
                        <span className="woc-rang">{f.rang}</span>
                        <span className="woc-fahrer">
                          {f.fahrer}
                          {f.titel?.solo ? (
                            <span className="woc-krone" title={t('wocTitel')}>
                              👑{f.titel.solo > 1 ? f.titel.solo + '×' : ''}
                            </span>
                          ) : null}
                        </span>
                        <span className="woc-wert">{f.punkte}</span>
                      </li>
                    ))}
                  </ol>
                ))}
              </div>
            </div>

            <div className="woc-rekord-block woc-dotd">
              <h2 className="woc-rekord-titel">{t('wocDotd')}</h2>
              <p className="woc-rekord-info">{t('wocDotdInfo')}</p>
              {wall.driverOfTheDay.length === 0 ? (
                <p className="woc-leer">{t('wocDotdLeer')}</p>
              ) : (
                <ol className="woc-liste">
                  {wall.driverOfTheDay.map((f) => (
                    <li key={f.fahrer} className={'top-' + Math.min(f.rang, 3)}>
                      <span className="woc-rang">{['🥇', '🥈', '🥉'][f.rang - 1] ?? f.rang}</span>
                      <span className="woc-fahrer">{f.fahrer}</span>
                      <span className="woc-wert">{f.anzahl}×</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <p className="woc-fotos">
            {t('wocFotos')} · <a href="#/bildnachweise">{t('bildnachweise')}</a>
          </p>
        </div>
      </main>
    </div>
  )
}
