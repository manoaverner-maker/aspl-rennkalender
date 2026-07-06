import { useEffect, useState } from 'react'

// Countdown zum naechsten Rennen — tickt alle 30 s, klickbar (fliegt zur Strecke).
// Zielzeit ist der Quali-Start (bzw. bei Endurance die individuelle Startzeit).

function zielZeit(eintrag, zeiten) {
  const uhr = eintrag.startzeit || zeiten?.quali || '20:30'
  return new Date((eintrag.verschobenAuf || eintrag.datum) + 'T' + uhr + ':00')
}

function formatiereRest(ms) {
  const min = Math.floor(ms / 60000)
  const tage = Math.floor(min / 1440)
  const std = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (tage >= 2) return 'in ' + tage + ' Tagen' + (std > 0 ? ' ' + std + ' Std' : '')
  if (tage >= 1) return 'in 1 Tag ' + std + ' Std'
  if (std >= 1) return 'in ' + std + ' Std ' + m + ' Min'
  if (min >= 1) return 'in ' + min + ' Min'
  return 'gleich!'
}

export default function Countdown({ eintrag, strecke, zeiten, onWahl }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  if (!eintrag || !strecke || !eintrag.datum || eintrag.datum === 'TBD') return null

  const diff = zielZeit(eintrag, zeiten).getTime() - Date.now()
  // Rennabend laeuft: von Quali-Start bis ca. 3 h danach
  const live = diff <= 0 && diff > -3 * 3600 * 1000
  if (diff <= 0 && !live) return null

  const uhr = eintrag.startzeit || zeiten?.quali || '20:30'

  return (
    <button className={'countdown' + (live ? ' live' : '')} onClick={() => onWahl(eintrag)}>
      <span className="countdown-label">{live ? '🔴 Jetzt live' : 'Naechstes Rennen'}</span>
      <span className="countdown-rennen">
        {eintrag.runde} · {strecke.flagge} {strecke.kurzname}
      </span>
      <span className="countdown-zeit">
        {live ? 'Rennabend laeuft — viel Erfolg!' : formatiereRest(diff) + ' · ' + uhr + ' Uhr'}
      </span>
    </button>
  )
}
