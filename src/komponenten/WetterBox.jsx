import { useEffect, useState } from 'react'

// Aktuelles Wetter + Kurzvorhersage vor Ort via Open-Meteo (gratis, kein API-Key).
// Die Liga faehrt mit echtem Wetter — darum direkt im Detail-Panel sichtbar.

// WMO-Wettercodes -> Symbol + deutscher Text
const WETTER_CODES = {
  0: ['☀️', 'Klar'],
  1: ['🌤️', 'Ueberwiegend klar'],
  2: ['⛅', 'Teils bewoelkt'],
  3: ['☁️', 'Bedeckt'],
  45: ['🌫️', 'Nebel'],
  48: ['🌫️', 'Reifnebel'],
  51: ['🌦️', 'Leichter Nieselregen'],
  53: ['🌦️', 'Nieselregen'],
  55: ['🌧️', 'Starker Nieselregen'],
  56: ['🌧️', 'Gefrierender Nieselregen'],
  57: ['🌧️', 'Gefrierender Nieselregen'],
  61: ['🌧️', 'Leichter Regen'],
  63: ['🌧️', 'Regen'],
  65: ['🌧️', 'Starker Regen'],
  66: ['🌧️', 'Gefrierender Regen'],
  67: ['🌧️', 'Gefrierender Regen'],
  71: ['🌨️', 'Leichter Schneefall'],
  73: ['🌨️', 'Schneefall'],
  75: ['🌨️', 'Starker Schneefall'],
  77: ['🌨️', 'Schneegriesel'],
  80: ['🌦️', 'Leichte Regenschauer'],
  81: ['🌦️', 'Regenschauer'],
  82: ['⛈️', 'Heftige Regenschauer'],
  85: ['🌨️', 'Schneeschauer'],
  86: ['🌨️', 'Starke Schneeschauer'],
  95: ['⛈️', 'Gewitter'],
  96: ['⛈️', 'Gewitter mit Hagel'],
  99: ['⛈️', 'Gewitter mit Hagel'],
}

function beschreibeWetter(code) {
  return WETTER_CODES[code] ?? ['🌡️', 'Wetter']
}

// Einfacher Cache, damit beim erneuten Oeffnen nicht neu geladen wird (15 Min)
const cache = new Map()
const CACHE_MS = 15 * 60 * 1000

async function holeWetter(lat, lng) {
  const key = lat + ',' + lng
  const drin = cache.get(key)
  if (drin && Date.now() - drin.zeit < CACHE_MS) return drin.daten
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng +
    '&current=temperature_2m,weather_code,wind_speed_10m,precipitation' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&timezone=auto&forecast_days=3'
  const antwort = await fetch(url)
  if (!antwort.ok) throw new Error('HTTP ' + antwort.status)
  const daten = await antwort.json()
  cache.set(key, { daten, zeit: Date.now() })
  return daten
}

export default function WetterBox({ lat, lng }) {
  const [zustand, setZustand] = useState({ status: 'laden' })

  useEffect(() => {
    let aktiv = true
    setZustand({ status: 'laden' })
    holeWetter(lat, lng)
      .then((daten) => aktiv && setZustand({ status: 'ok', daten }))
      .catch(() => aktiv && setZustand({ status: 'fehler' }))
    return () => {
      aktiv = false
    }
  }, [lat, lng])

  if (zustand.status === 'laden') {
    return <div className="wetter-box wetter-laden">Wetter wird geladen …</div>
  }
  if (zustand.status === 'fehler') {
    return <div className="wetter-box wetter-laden">Wetter zurzeit nicht verfuegbar</div>
  }

  const { current, daily } = zustand.daten
  const [symbol, text] = beschreibeWetter(current.weather_code)

  return (
    <div className="wetter-box">
      <div className="wetter-aktuell">
        <span className="wetter-symbol">{symbol}</span>
        <span className="wetter-temp">{Math.round(current.temperature_2m)}°C</span>
        <span className="wetter-text">
          {text}
          <small>
            Wind {Math.round(current.wind_speed_10m)} km/h
            {current.precipitation > 0 ? ' · Niederschlag ' + current.precipitation + ' mm' : ''}
          </small>
        </span>
      </div>
      <div className="wetter-vorhersage">
        {daily.time.map((tag, i) => {
          const [tSymbol] = beschreibeWetter(daily.weather_code[i])
          const wochentag =
            i === 0
              ? 'Heute'
              : new Date(tag + 'T12:00:00').toLocaleDateString('de-CH', { weekday: 'short' })
          return (
            <div key={tag} className="wetter-tag">
              <span className="wetter-tag-name">{wochentag}</span>
              <span className="wetter-tag-symbol">{tSymbol}</span>
              <span className="wetter-tag-temp">
                {Math.round(daily.temperature_2m_max[i])}° / {Math.round(daily.temperature_2m_min[i])}°
              </span>
              <span className="wetter-tag-regen">💧 {daily.precipitation_probability_max[i] ?? 0}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
