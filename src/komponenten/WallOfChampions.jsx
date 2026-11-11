import { useMemo } from 'react'
import { useSprache } from '../i18n.jsx'
import { berechneWall } from '../utils/champions.js'
import config from '../data/champions.json'

const BASIS = import.meta.env.BASE_URL

// Eine Meister-Karte (Solo-Champion, Konstrukteur oder Endurance)
function MeisterKarte({ label, icon, meister, offenText }) {
  const { t } = useSprache()
  const offen = !meister?.final
  return (
    <div className={'woc-karte' + (offen ? ' offen' : '')}>
      <p className="woc-label">
        <span aria-hidden="true">{icon}</span> {label}
      </p>
      {offen ? (
        <>
          <p className="woc-name woc-name-offen">{offenText}</p>
          {meister && (
            <p className="woc-zusatz">
              {t('wocFuehrt')} {meister.name} · {meister.punkte} {t('punkte')}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="woc-name">{meister.name}</p>
          {meister.crew && <p className="woc-zusatz">{meister.crew.join(' · ')}</p>}
          <p className="woc-punkte">
            <strong>{meister.punkte}</strong> {t('punkte')}
            {meister.zweiter && (
              <span className="woc-vorsprung">
                {' '}
                · +{meister.punkte - meister.zweiter.punkte} {t('wocVor')} {meister.zweiter.name}
              </span>
            )}
          </p>
        </>
      )}
    </div>
  )
}

// Titel als kleine Abzeichen hinter dem Namen (z. B. "2× Solo")
function TitelAbzeichen({ titel }) {
  const { t } = useSprache()
  if (!titel) return null
  const teile = []
  if (titel.solo) teile.push((titel.solo > 1 ? titel.solo + '× ' : '') + t('wocSoloKurz'))
  if (!teile.length) return null
  return (
    <span className="woc-abzeichen" title={t('wocTitel')}>
      👑 {teile.join(' · ')}
    </span>
  )
}

/**
 * Wall of Champions (#/champions): alle Meister der ASPL auf einen Blick.
 * Komplett datengetrieben — Meister kommen aus den Ergebnis-Dateien mit final: true,
 * Namens-Zuordnungen und Einstellungen aus src/data/champions.json.
 */
export default function WallOfChampions({ kalender, ergebnisse }) {
  const { t, saison } = useSprache()
  const wall = useMemo(() => berechneWall({ kalender, ergebnisse, config }), [kalender, ergebnisse])

  const seriesLabel = wall.series
    .map((s) => (s === 'solo' ? 'Solo' : s === 'team' ? 'Team' : 'Endurance'))
    .join(' + ')

  return (
    <div className="app">
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
        <section className="woc-hero">
          <div className="woc-hero-pokal" aria-hidden="true">🏆</div>
          <h1 className="woc-titel">Wall of Champions</h1>
          <p className="woc-intro">{t('wocIntro')}</p>
        </section>

        {/* Saisons: neueste zuerst — jede Saison ein eigener Block */}
        <h2 className="woc-kapitel">{t('wocKapitelSaisons')}</h2>
        {wall.saisons.map((s) => {
          const fertig = s.solo?.final && s.konstrukteur?.final
          return (
            <section key={s.id} className={'woc-block' + (fertig ? '' : ' offen')}>
              <header className="woc-block-kopf">
                <span className="woc-block-nr">S{s.id.replace(/\D+/g, '')}</span>
                <div>
                  <h3 className="woc-block-titel">{saison(s.name)}</h3>
                  <p className="woc-block-status">{fertig ? t('wocAbgeschlossen') : t('wocLaeuft')}</p>
                </div>
              </header>
              <div className="woc-raster">
                <MeisterKarte
                  label={t('wocKonstrukteur')}
                  icon="🏁"
                  meister={s.konstrukteur}
                  offenText={t('wocLaeuft')}
                />
                <MeisterKarte
                  label={t('wocSolo')}
                  icon="👑"
                  meister={s.solo}
                  offenText={t('wocLaeuft')}
                />
              </div>
            </section>
          )
        })}

        {wall.endurance.map((e) => (
          <section key={e.id} className={'woc-block' + (e.meister?.final ? '' : ' offen')}>
            <header className="woc-block-kopf">
              <span className="woc-block-nr">E</span>
              <div>
                <h3 className="woc-block-titel">
                  Endurance{e.jahr ? ' ' + e.jahr : ''}
                </h3>
                <p className="woc-block-status">
                  {e.meister?.final ? t('wocAbgeschlossen') : e.abgeschlossen ? t('wocFolgt') : t('wocLaeuft')}
                </p>
              </div>
            </header>
            <div className="woc-raster">
              <MeisterKarte
                label={t('wocEndurance')}
                icon="⏱️"
                meister={e.meister}
                offenText={e.abgeschlossen ? t('wocFolgt') : t('wocLaeuft')}
              />
            </div>
          </section>
        ))}

        {/* All-Time: separat ganz unten */}
        <h2 className="woc-kapitel">{t('wocKapitelAllTime')}</h2>
        <div className="woc-alltime">
          <section className="woc-block">
            <h3 className="woc-block-titel">
              {t('wocEwig').replace('{n}', wall.bestenliste.length)}
            </h3>
            <p className="woc-tabelle-info">
              {t('wocEwigInfo').replace('{series}', seriesLabel)}
            </p>
            <ol className="woc-bestenliste">
              {wall.bestenliste.map((f) => (
                <li key={f.fahrer} className={f.rang <= 3 ? 'top-' + f.rang : ''}>
                  <span className="woc-rang">{f.rang}</span>
                  <span className="woc-fahrer">
                    <span className="woc-fahrer-name">
                      {f.fahrer}
                      <TitelAbzeichen titel={f.titel} />
                    </span>
                    <small>
                      {wall.series
                        .filter((s) => f.proSeries[s])
                        .map((s) => (s === 'solo' ? 'Solo' : s === 'team' ? 'Team' : 'Endurance') + ' ' + f.proSeries[s])
                        .join(' · ')}
                      {' · '}
                      {f.saisons} {f.saisons === 1 ? t('wocSaison') : t('wocSaisons')}
                    </small>
                  </span>
                  <span className="woc-gesamt">{f.punkte}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="woc-block woc-dotd">
            <h3 className="woc-block-titel">{t('wocDotd')}</h3>
            <p className="woc-tabelle-info">{t('wocDotdInfo')}</p>
            {wall.driverOfTheDay.length === 0 ? (
              <p className="woc-leer">{t('wocDotdLeer')}</p>
            ) : (
              <ol className="woc-bestenliste">
                {wall.driverOfTheDay.map((f) => (
                  <li key={f.fahrer} className={f.rang <= 3 ? 'top-' + f.rang : ''}>
                    <span className="woc-rang">{['🥇', '🥈', '🥉'][f.rang - 1] ?? f.rang}</span>
                    <span className="woc-fahrer">
                      <span className="woc-fahrer-name">{f.fahrer}</span>
                    </span>
                    <span className="woc-gesamt">{f.anzahl}×</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </main>

      <footer className="fuss">
        <span>ASPL GT3 Racing Series · PS5 &amp; Xbox Series · ACC · asplracing.com</span>
        <a href="#/">{t('zurueckKalender')}</a>
      </footer>
    </div>
  )
}
