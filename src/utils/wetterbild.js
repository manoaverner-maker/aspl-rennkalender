// Fertiges Wetterbild zum Weitergeben im Discord. Gezeichnet wird auf ein Canvas
// und als PNG zurueckgegeben — kein Server, keine Bibliothek.
//
// Format 1200x560: breit genug fuer Discords Vorschau, ohne leere Flaeche unten.
import { beschreibeWetter } from './wetter.js'

const BREITE = 1200
const HOEHE = 560

const FARBE = {
  grund: '#0a0a0c',
  karte: '#16161b',
  linie: '#2a2a33',
  weiss: '#f5f5f7',
  grau: '#9a9aa5',
  rot: '#e10600',
  gold: '#d4af37',
}

const TEXTE = {
  de: { titel: 'WETTERBERICHT', quali: 'Qualifying', rennen: 'Rennstart', regen: 'Regen',
        wind: 'Wind', quelle: 'Daten: Open-Meteo · Zeiten in Liga-Zeit (Europe/Zurich)' },
  en: { titel: 'WEATHER REPORT', quali: 'Qualifying', rennen: 'Race start', regen: 'Rain',
        wind: 'Wind', quelle: 'Data: Open-Meteo · times in league time (Europe/Zurich)' },
}

// Abgerundetes Rechteck — roundRect gibt es nicht ueberall, darum zu Fuss.
function kasten(ctx, x, y, b, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + b, y, x + b, y + h, r)
  ctx.arcTo(x + b, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + b, y, r)
  ctx.closePath()
}

function block(ctx, x, y, b, h, titel, w, sprache) {
  const be = beschreibeWetter(w.code, sprache)
  ctx.fillStyle = FARBE.karte
  kasten(ctx, x, y, b, h, 20)
  ctx.fill()
  ctx.strokeStyle = FARBE.linie
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = FARBE.grau
  ctx.font = '600 20px Rajdhani, Inter, sans-serif'
  ctx.fillText(titel.toUpperCase() + '  ·  ' + w.zeit, x + 28, y + 46)

  ctx.font = '56px sans-serif'
  ctx.fillText(be.symbol, x + 28, y + 118)

  ctx.fillStyle = FARBE.weiss
  ctx.font = '700 54px Orbitron, Rajdhani, sans-serif'
  ctx.fillText(w.temperatur + '°C', x + 110, y + 118)

  ctx.fillStyle = FARBE.grau
  ctx.font = '500 22px Rajdhani, Inter, sans-serif'
  ctx.fillText(be.text, x + 28, y + 158)

  const t = TEXTE[sprache === 'en' ? 'en' : 'de']
  const zeile = []
  if (w.regen != null) zeile.push(t.regen + ' ' + w.regen + '%')
  if (w.wind != null) zeile.push(t.wind + ' ' + w.wind + ' km/h')
  if (zeile.length) {
    ctx.fillStyle = FARBE.weiss
    ctx.font = '600 22px Rajdhani, Inter, sans-serif'
    ctx.fillText(zeile.join('   ·   '), x + 28, y + 196)
  }
}

/**
 * Zeichnet das Bild und gibt eine Data-URL (PNG) zurueck.
 */
export async function zeichneWetterbild(canvas, { strecke, rennen, wetter, seriesName, sprache, datumText }) {
  const t = TEXTE[sprache === 'en' ? 'en' : 'de']
  canvas.width = BREITE
  canvas.height = HOEHE
  const ctx = canvas.getContext('2d')

  // Hintergrund mit leichtem Verlauf
  ctx.fillStyle = FARBE.grund
  ctx.fillRect(0, 0, BREITE, HOEHE)
  const verlauf = ctx.createLinearGradient(0, 0, BREITE, HOEHE)
  verlauf.addColorStop(0, 'rgba(225, 6, 0, 0.14)')
  verlauf.addColorStop(0.55, 'rgba(225, 6, 0, 0)')
  ctx.fillStyle = verlauf
  ctx.fillRect(0, 0, BREITE, HOEHE)

  // Kopf
  ctx.textAlign = 'left'
  ctx.fillStyle = FARBE.rot
  ctx.font = '700 26px Orbitron, Rajdhani, sans-serif'
  ctx.fillText('ASPL', 64, 76)
  ctx.fillStyle = FARBE.grau
  ctx.font = '600 22px Rajdhani, Inter, sans-serif'
  ctx.fillText(t.titel + '   ·   ' + (seriesName ?? ''), 150, 76)

  ctx.strokeStyle = FARBE.linie
  ctx.beginPath()
  ctx.moveTo(64, 100)
  ctx.lineTo(BREITE - 64, 100)
  ctx.stroke()

  // Strecke und Termin
  ctx.fillStyle = FARBE.weiss
  ctx.font = '700 62px Orbitron, Rajdhani, sans-serif'
  const titel = (strecke?.flagge ? strecke.flagge + '  ' : '') + (strecke?.kurzname ?? '')
  ctx.fillText(titel, 64, 186)

  ctx.fillStyle = FARBE.gold
  ctx.font = '600 28px Rajdhani, Inter, sans-serif'
  ctx.fillText((rennen?.runde ? rennen.runde + '  ·  ' : '') + (datumText ?? rennen?.datum ?? ''), 64, 232)

  // Quali und Rennstart nebeneinander
  const kartenBreite = (BREITE - 64 * 2 - 32) / 2
  let x = 64
  for (const [art, w] of [['quali', wetter.quali], ['rennen', wetter.rennen]]) {
    if (!w) continue
    block(ctx, x, 268, kartenBreite, 222, art === 'quali' ? t.quali : t.rennen, w, sprache)
    x += kartenBreite + 32
  }

  // Fuss
  ctx.fillStyle = FARBE.grau
  ctx.font = '500 19px Rajdhani, Inter, sans-serif'
  ctx.fillText(t.quelle, 64, HOEHE - 42)
  ctx.textAlign = 'right'
  ctx.fillText('asplracing.com', BREITE - 64, HOEHE - 42)

  // Schriften koennen noch laden — ein Tick warten, dann erst ausgeben.
  if (document.fonts?.ready) { try { await document.fonts.ready } catch { /* egal */ } }
  return canvas.toDataURL('image/png')
}
