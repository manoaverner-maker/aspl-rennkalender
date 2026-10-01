// Fertiges Wetterbild zum Weitergeben im Discord. Gezeichnet wird auf ein Canvas
// und als PNG zurueckgegeben — kein Server, keine Bibliothek.
//
// Das Bild deckt die ganze Woche ab: je Series das naechste Rennen (Solo am
// Mittwoch, Team am Samstag), damit montags ein Bild fuer alles reicht.
import { beschreibeWetter } from './wetter.js'

const BREITE = 1200
const RAND = 64
const KOPF_HOEHE = 150
const BLOCK_HOEHE = 302
const KACHEL_HOEHE = 176
const BLOCK_ABSTAND = 24
const FUSS_HOEHE = 86

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

// Eine Wetterkachel (Quali oder Rennstart)
function kachel(ctx, x, y, b, h, titel, w, sprache) {
  const be = beschreibeWetter(w.code, sprache)
  const t = TEXTE[sprache === 'en' ? 'en' : 'de']

  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  kasten(ctx, x, y, b, h, 16)
  ctx.fill()
  ctx.strokeStyle = FARBE.linie
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = FARBE.grau
  ctx.font = '600 18px Rajdhani, Inter, sans-serif'
  ctx.fillText(titel.toUpperCase() + '  ·  ' + w.zeit, x + 22, y + 36)

  ctx.font = '44px sans-serif'
  ctx.fillText(be.symbol, x + 22, y + 92)

  ctx.fillStyle = FARBE.weiss
  ctx.font = '700 42px Orbitron, Rajdhani, sans-serif'
  ctx.fillText(w.temperatur + '°C', x + 86, y + 92)

  ctx.fillStyle = FARBE.grau
  ctx.font = '500 20px Rajdhani, Inter, sans-serif'
  ctx.fillText(be.text, x + 22, y + 124)

  const zeile = []
  if (w.regen != null) zeile.push(t.regen + ' ' + w.regen + '%')
  if (w.wind != null) zeile.push(t.wind + ' ' + w.wind + ' km/h')
  if (zeile.length) {
    ctx.fillStyle = FARBE.weiss
    ctx.font = '600 20px Rajdhani, Inter, sans-serif'
    ctx.fillText(zeile.join('   ·   '), x + 22, y + 156)
  }
}

// Ein Serien-Block: Kopfzeile mit Strecke und Termin, darunter die Kacheln
function serienBlock(ctx, y, { serienName, rennen, strecke, wetter, datumText }, sprache) {
  const t = TEXTE[sprache === 'en' ? 'en' : 'de']
  const b = BREITE - RAND * 2

  ctx.fillStyle = FARBE.karte
  kasten(ctx, RAND, y, b, BLOCK_HOEHE, 22)
  ctx.fill()
  ctx.strokeStyle = FARBE.linie
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = FARBE.rot
  ctx.font = '700 20px Orbitron, Rajdhani, sans-serif'
  ctx.fillText((serienName ?? '').toUpperCase(), RAND + 26, y + 40)

  ctx.fillStyle = FARBE.weiss
  ctx.font = '700 40px Orbitron, Rajdhani, sans-serif'
  const titel = (strecke?.flagge ? strecke.flagge + '  ' : '') + (strecke?.kurzname ?? '')
  ctx.fillText(titel, RAND + 26, y + 86)

  ctx.textAlign = 'right'
  ctx.fillStyle = FARBE.gold
  ctx.font = '600 24px Rajdhani, Inter, sans-serif'
  ctx.fillText((rennen?.runde ? rennen.runde + '  ·  ' : '') + (datumText ?? ''), BREITE - RAND - 26, y + 40)
  ctx.textAlign = 'left'

  // Kacheln: beide nebeneinander, oder eine ueber die ganze Breite
  const vorhanden = [['quali', wetter.quali], ['rennen', wetter.rennen]].filter(([, w]) => w)
  const innen = b - 52
  const kachelBreite = vorhanden.length > 1 ? (innen - 20) / 2 : innen
  let x = RAND + 26
  for (const [art, w] of vorhanden) {
    kachel(ctx, x, y + 104, kachelBreite, KACHEL_HOEHE, art === 'quali' ? t.quali : t.rennen, w, sprache)
    x += kachelBreite + 20
  }
}

/**
 * Zeichnet das Bild auf das Canvas. Bewusst SYNCHRON: wird zwischen Klick und
 * Download ein await eingeschoben, verliert der Browser die Nutzergeste und
 * verweigert den Download stillschweigend. Schriften werden darum vorher
 * geladen (siehe schriftenBereit).
 *
 * @param bloecke [{ serienName, rennen, strecke, wetter, datumText }]
 */
export function zeichneWetterbild(canvas, { bloecke, sprache }) {
  const t = TEXTE[sprache === 'en' ? 'en' : 'de']
  const hoehe = KOPF_HOEHE + bloecke.length * (BLOCK_HOEHE + BLOCK_ABSTAND) - BLOCK_ABSTAND + FUSS_HOEHE
  canvas.width = BREITE
  canvas.height = hoehe
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = FARBE.grund
  ctx.fillRect(0, 0, BREITE, hoehe)
  const verlauf = ctx.createLinearGradient(0, 0, BREITE, hoehe)
  verlauf.addColorStop(0, 'rgba(225, 6, 0, 0.14)')
  verlauf.addColorStop(0.55, 'rgba(225, 6, 0, 0)')
  ctx.fillStyle = verlauf
  ctx.fillRect(0, 0, BREITE, hoehe)

  // Kopf
  ctx.textAlign = 'left'
  ctx.fillStyle = FARBE.rot
  ctx.font = '700 30px Orbitron, Rajdhani, sans-serif'
  ctx.fillText('ASPL', RAND, 72)
  ctx.fillStyle = FARBE.weiss
  ctx.font = '600 26px Rajdhani, Inter, sans-serif'
  ctx.fillText(t.titel, RAND + 110, 72)

  ctx.strokeStyle = FARBE.linie
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(RAND, 104)
  ctx.lineTo(BREITE - RAND, 104)
  ctx.stroke()

  let y = KOPF_HOEHE
  for (const block of bloecke) {
    serienBlock(ctx, y, block, sprache)
    y += BLOCK_HOEHE + BLOCK_ABSTAND
  }

  ctx.fillStyle = FARBE.grau
  ctx.font = '500 19px Rajdhani, Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(t.quelle, RAND, hoehe - 36)
  ctx.textAlign = 'right'
  ctx.fillText('asplracing.com', BREITE - RAND, hoehe - 36)

  return canvas
}

/** Einmal vorab abwarten, damit Orbitron/Rajdhani beim Zeichnen bereitstehen. */
export async function schriftenBereit() {
  try { await document.fonts?.ready } catch { /* dann eben mit Ersatzschrift */ }
}

/**
 * Canvas -> Blob, ohne Umweg ueber eine Promise. toBlob() waere asynchron und
 * damit wieder ausserhalb der Nutzergeste; grosse data:-URLs wiederum lehnt
 * Chrome als Download ab. Darum die Data-URL synchron in einen Blob umbauen.
 */
export function canvasAlsBlob(canvas) {
  const datenUrl = canvas.toDataURL('image/png')
  const roh = atob(datenUrl.split(',')[1])
  const bytes = new Uint8Array(roh.length)
  for (let i = 0; i < roh.length; i += 1) bytes[i] = roh.charCodeAt(i)
  return new Blob([bytes], { type: 'image/png' })
}
