import { useSprache } from '../i18n.jsx'

// Selektoren fuer Saison (Dropdown) und Series (Segment-Buttons)
export default function SeriesAuswahl({ saisons, saisonId, series, seriesId, onSaison, onSeries }) {
  const { t, saison } = useSprache()
  return (
    <div className="auswahl">
      <select
        className="saison-select"
        value={saisonId}
        onChange={(e) => onSaison(e.target.value)}
        aria-label={t('saisonWaehlen')}
      >
        {saisons.map((s) => (
          <option key={s.id} value={s.id}>
            {saison(s.name)}
          </option>
        ))}
      </select>
      <div className="series-buttons" role="tablist" aria-label={t('seriesWaehlen')}>
        {series.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={s.id === seriesId}
            className={'series-button' + (s.id === seriesId ? ' aktiv' : '')}
            onClick={() => onSeries(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}
