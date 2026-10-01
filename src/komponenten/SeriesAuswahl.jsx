import { useSprache } from '../i18n.jsx'

// Selektoren fuer Saison (Dropdown) und Series (Segment-Buttons).
// Series ohne Saisonbezug — die Endurance faehrt in eigenem Rhythmus — stehen
// abgesetzt rechts. Ist eine davon gewaehlt, verschwindet die Saison-Auswahl:
// sie haette dort keine Bedeutung.
export default function SeriesAuswahl({
  saisons, saisonId, series, freieSeries = [], seriesId, freieAktiv, onSaison, onSeries,
}) {
  const { t, saison } = useSprache()

  const knopf = (s) => (
    <button
      key={s.id}
      role="tab"
      aria-selected={s.id === seriesId}
      className={'series-button' + (s.id === seriesId ? ' aktiv' : '')}
      onClick={() => onSeries(s.id)}
    >
      {s.name}
    </button>
  )

  return (
    <div className="auswahl">
      {!freieAktiv && (
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
      )}

      <div className="series-buttons" role="tablist" aria-label={t('seriesWaehlen')}>
        {series.map(knopf)}
      </div>

      {freieSeries.length > 0 && (
        <div className="series-buttons series-frei" role="tablist" aria-label={t('seriesWaehlen')}>
          {freieSeries.map(knopf)}
        </div>
      )}
    </div>
  )
}
