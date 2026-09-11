import { useSprache } from '../i18n.jsx'

// Feste Streuung statt Math.random(): sonst springen die Schnipsel bei jedem
// Re-Render an neue Stellen. 20 Stueck reichen, ohne die Karte zuzupflastern.
const KONFETTI = Array.from({ length: 20 }, (_, i) => {
  const winkel = (i / 20) * Math.PI * 2
  return {
    x: Math.cos(winkel) * (70 + (i % 5) * 22),
    y: Math.sin(winkel) * (34 + (i % 4) * 16) - 12,
    dreh: (i % 2 ? 1 : -1) * (140 + i * 18),
    verzug: 0.15 + (i % 6) * 0.05,
    breit: i % 3 === 0,
    farbe: i % 3,
  }
})

/**
 * Gewinner-Einblendung fuer eine abgeschlossene Wertung.
 * Erscheint oben im Meisterschafts-Panel, sobald eine Serie als final hinterlegt
 * ist — bei der Team-Series der Teammeister, sonst der Fahrer-Champion.
 * Die Animation laeuft bei jedem Serienwechsel neu; dafuer setzt der Aufrufer key.
 */
export default function ChampionBanner({ name, punkte, istTeam }) {
  const { t } = useSprache()
  if (!name) return null

  return (
    <div className="champion-banner">
      <div className="champion-konfetti" aria-hidden="true">
        {KONFETTI.map((k, i) => (
          <span
            key={i}
            className={'champion-schnipsel farbe-' + k.farbe + (k.breit ? ' breit' : '')}
            style={{
              '--x': k.x + 'px',
              '--y': k.y + 'px',
              '--dreh': k.dreh + 'deg',
              animationDelay: k.verzug + 's',
            }}
          />
        ))}
      </div>
      <div className="champion-pokal" aria-hidden="true">🏆</div>
      <div className="champion-text">
        <p className="champion-label">{istTeam ? t('teammeister') : t('champion')}</p>
        <p className="champion-name">{name}</p>
        {punkte != null && (
          <p className="champion-punkte">
            <strong>{punkte}</strong> {t('punkte')}
          </p>
        )}
      </div>
    </div>
  )
}
