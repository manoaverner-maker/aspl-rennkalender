import { useEffect, useState } from 'react'
import { useSprache } from '../i18n.jsx'

// Aktuelles Wetter + Kurzvorhersage vor Ort via Open-Meteo (gratis, kein API-Key).
// Die Liga faehrt mit echtem Wetter — darum direkt im Detail-Panel sichtbar.

// WMO-Wettercodes -> Symbol + [deutscher Text, englischer Text]
const WETTER_CODES = {
  0: ['☀️', 'Klar', 'Clear'],
  1: ['🌤️', 'Ueberwiegend klar', 'Mainly clear'],
  2: ['⛅', 'Teils bewoelkt', 'Partly cloudy'],
  3: ['☁️', 'Bedeckt', 'Overcast'],
  45: ['🌫️', 'Nebel', 'Fog'],
  48: ['🌫️', 'Reifnebel', 'Rime fog'],
  51: ['🌦️', 'Leichter Nieselregen', 'Light drizzle'],
  53: ['🌦️', 'Nieselregen', 'Drizzle'],
  55: ['🌧️', 'Starker Nieselregen', 'Heavy drizzle'],
  56: ['🌧️', 'Gefrierender Nieselregen', 'Freezing drizzle'],
  57: ['🌧️', 'Gefrierender Nieselregen', 'Freezing drizzle'],
  61: ['🌧️', 'Leichter Regen', 'Light rain'],
  63: ['🌧️', 'Regen', 'Rain'],
  65: ['🌧️', 'Starker Regen', 'Heavy rain'],
  66: ['🌧️', 'Gefrierender Regen', 'Freezing rain'],
  67: ['🌧️', 'Gefrierender Regen', 'Freezing rain'],
  71: ['🌨️', 'Leichter Schneefall', 'Light snow'],
  73: ['🌨️', 'Schneefall', 'Snow'],
  75: ['🌨️', 'Starker Schneefall', 'Heavy snow'],
  77: ['🌨️', 'Schneegriesel', 'Snow grains'],
  80: ['🌦️', 'Leichte Regenschauer', 'Light showers'],
  81: ['🌦️', 'Regenschauer', 'Showers'],
  82: ['⛈️', 'Heftige Regenschauer', 'Violent showers'],
  85: ['🌨️', 'Schneeschauer', 'Snow showers'],
  86: ['🌨️', 'Starke Schneeschauer', 'Heavy snow showers'],
  95: ['⛈️', 'Gewitter', 'Thunderstorm'],
  96: ['⛈️', 'Gewitter mit Hagel', 'Thunderstorm with hail'],
  99: ['⛈️', 'Gewitter mit Hagel', 'Thunderstorm with hail'],
}

function beschreibeWetter(code, sprache) {
  const eintrag = WETTER_CODES[code] ?? ['🌡️', 'Wetter', 'Weather']
  return [eintrag[0], sprache === 'en' ? eintrag[2] : eintrag[1]]
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
  const { t, sprache, locale } = useSprache()
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
    return <div className="wetter-box wetter-laden">{t('wetterLaden')}</div>
  }
  if (zustand.status === 'fehler') {
    return <div className="wetter-box wetter-laden">{t('wetterFehler')}</div>
  }

  const { current, daily } = zustand.daten
  const [symbol, text] = beschreibeWetter(current.weather_code, sprache)

  return (
    <div className="wetter-box">
      <div className="wetter-aktuell">
        <span className="wetter-symbol">{symbol}</span>
        <span className="wetter-temp">{Math.round(current.temperature_2m)}°C</span>
        <span className="wetter-text">
          {text}
          <small>
            {t('wind')} {Math.round(current.wind_speed_10m)} km/h
            {current.precipitation > 0 ? ' · ' + t('niederschlag') + ' ' + current.precipitation + ' mm' : ''}
          </small>
        </span>
      </div>
      <div className="wetter-vorhersage">
        {daily.time.map((tag, i) => {
          const [tSymbol] = beschreibeWetter(daily.weather_code[i], sprache)
          const wochentag =
            i === 0
              ? t('heute')
              : new Date(tag + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short' })
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
