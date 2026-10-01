// Wetterbericht fuer kommende Rennen — die Liga faehrt mit echtem Wetter, darum
// ist die Vorhersage vor dem Rennwochenende die meistgestellte Frage im Discord.
//
// Quelle ist Open-Meteo (gratis, kein Schluessel). Abgefragt wird mit
// timezone=Europe/Zurich: die Zeitachse ist damit Liga-Zeit, sodass die
// Quali- und Rennstunde direkt getroffen wird, ohne von Hand umzurechnen.
// Die Messwerte selbst gelten fuer die Koordinaten der Strecke.

// WMO-Wettercodes -> Symbol + [deutsch, englisch]. Gleiche Tabelle wie in der
// WetterBox, hier zentral, damit Panel und Bild dieselbe Sprache sprechen.
export const WETTER_CODES = {
  0: ['☀️', 'Klar', 'Clear'],
  1: ['🌤️', 'Überwiegend klar', 'Mainly clear'],
  2: ['⛅', 'Teils bewölkt', 'Partly cloudy'],
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

export function beschreibeWetter(code, sprache) {
  const e = WETTER_CODES[code] ?? ['🌡️', 'Wetter', 'Weather']
  return { symbol: e[0], text: sprache === 'en' ? e[2] : e[1] }
}

// Open-Meteo liefert hoechstens 16 Tage im Voraus. Alles danach bleibt leer —
// lieber ehrlich "noch keine Vorhersage" als eine erfundene Zahl.
export const VORHERSAGE_TAGE = 16

export function inVorhersage(datum, heute = new Date()) {
  const tage = (new Date(datum + 'T12:00:00') - heute) / 86400000
  return tage >= -1 && tage <= VORHERSAGE_TAGE - 1
}

const cache = new Map()
const SPEICHER_MS = 15 * 60 * 1000

async function hole(url) {
  const treffer = cache.get(url)
  if (treffer && Date.now() - treffer.zeit < SPEICHER_MS) return treffer.daten
  const antwort = await fetch(url)
  if (!antwort.ok) throw new Error('HTTP ' + antwort.status)
  const daten = await antwort.json()
  cache.set(url, { zeit: Date.now(), daten })
  return daten
}

/**
 * Vorhersage fuer ein Rennen holen.
 * @param strecke  Eintrag aus strecken.json (braucht lat/lng)
 * @param datum    'YYYY-MM-DD'
 * @param zeiten   { quali: 'HH:MM', rennstart: 'HH:MM' } in Liga-Zeit
 */
export async function holeRennwetter(strecke, datum, zeiten = {}) {
  const { lat, lng } = strecke ?? {}
  if (lat == null || lng == null) return null

  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m' +
    '&timezone=Europe%2FZurich&start_date=' + datum + '&end_date=' + datum

  const d = await hole(url)
  const tagIndex = (d.daily?.time ?? []).indexOf(datum)
  if (tagIndex < 0) return null

  // Werte zur gewuenschten Uhrzeit aus der Stundenreihe greifen
  const zurStunde = (zeit) => {
    if (!zeit) return null
    const stunde = datum + 'T' + zeit.slice(0, 2) + ':00'
    const i = (d.hourly?.time ?? []).indexOf(stunde)
    if (i < 0) return null
    return {
      zeit,
      temperatur: Math.round(d.hourly.temperature_2m[i]),
      code: d.hourly.weather_code[i],
      regen: d.hourly.precipitation_probability?.[i] ?? null,
      wind: Math.round(d.hourly.wind_speed_10m?.[i] ?? 0),
    }
  }

  return {
    datum,
    tag: {
      code: d.daily.weather_code[tagIndex],
      max: Math.round(d.daily.temperature_2m_max[tagIndex]),
      min: Math.round(d.daily.temperature_2m_min[tagIndex]),
      regen: d.daily.precipitation_probability_max?.[tagIndex] ?? null,
    },
    quali: zurStunde(zeiten.quali),
    rennen: zurStunde(zeiten.rennstart),
  }
}
