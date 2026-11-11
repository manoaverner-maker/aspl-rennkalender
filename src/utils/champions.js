// Wall of Champions: alles wird aus den Ergebnis-Dateien abgeleitet.
// Nach jeder Saison reicht es, die Endstaende mit "final": true einzutragen —
// Meister, Titelzaehler und ewige Bestenliste aktualisieren sich von selbst.
import { berechneFahrerwertung, berechneTeamwertung } from './punkte.js'

// Alias-Liste { Hauptname: [andere Schreibweisen] } -> Map andereSchreibweise -> Hauptname
function aliasMap(alias = {}) {
  const m = new Map()
  for (const [haupt, andere] of Object.entries(alias)) {
    m.set(haupt, haupt)
    for (const a of andere) m.set(a, haupt)
  }
  return (name) => (name ? m.get(name) ?? name : name)
}

const saisonNummer = (id) => Number(String(id ?? '').replace(/\D+/g, '')) || 0

// Fahrer-/Teamtabelle einer Ergebnisdatei: hinterlegte Tabelle hat Vorrang,
// sonst wird aus den Einzelrennen gerechnet (wie im Leaderboard).
function fahrerTabelle(erg, system) {
  if (erg?.wertung?.fahrer) return { ...erg.wertung.fahrer, eintraege: erg.wertung.fahrer.eintraege }
  const eintraege = berechneFahrerwertung(erg?.strecken, system)
  return eintraege.length ? { final: !!erg?.final, eintraege } : null
}
function teamTabelle(erg, system) {
  if (erg?.wertung?.teams) return erg.wertung.teams
  const eintraege = berechneTeamwertung(erg?.strecken, system)
  return eintraege.length ? { final: !!erg?.final, eintraege } : null
}

// Meister + Abstand auf P2 aus einer Tabelle ziehen
function meisterAus(tabelle, feld) {
  if (!tabelle?.eintraege?.length) return null
  const [p1, p2] = tabelle.eintraege
  return {
    name: p1[feld],
    team: p1.team ?? null,
    punkte: p1.punkte,
    zweiter: p2 ? { name: p2[feld], punkte: p2.punkte } : null,
    final: !!tabelle.final,
  }
}

export function berechneWall({ kalender, ergebnisse, config }) {
  const fahrerName = aliasMap(config?.fahrerAlias)
  const teamName = aliasMap(config?.teamAlias)
  const systemVon = (erg) => erg?.punkteSystem ?? (erg?.seriesId === 'endurance' ? 'endurance' : 'dtm')
  const finde = (saisonId, seriesId) =>
    ergebnisse.find((e) => (e.saisonId ?? null) === (saisonId ?? null) && e.seriesId === seriesId)

  // --- Saisons (Solo-Fahrer + Team-Konstrukteure) ---
  const saisonIds = [...new Set(kalender.filter((k) => k.saisonId).map((k) => k.saisonId))]
    .sort((a, b) => saisonNummer(b) - saisonNummer(a))

  const saisons = saisonIds
    .map((id) => {
      const name = kalender.find((k) => k.saisonId === id)?.saisonName ?? id
      const solo = finde(id, 'solo')
      const team = finde(id, 'team')
      return {
        id,
        name,
        solo: solo ? meisterAus(fahrerTabelle(solo, systemVon(solo)), 'fahrer') : null,
        konstrukteur: team ? meisterAus(teamTabelle(team, systemVon(team)), 'team') : null,
      }
    })
    // Saisons ohne jegliche Ergebnisse (noch nicht gestartet) nicht zeigen
    .filter((s) => s.solo || s.konstrukteur)

  // --- Endurance (eigene Ausgaben, haengt an keiner Saison) ---
  const enduranceKalender = kalender.filter((k) => k.seriesId === 'endurance')
  const endurance = enduranceKalender.map((k) => {
    const erg = finde(k.saisonId, 'endurance')
    const sys = 'endurance'
    // In der Endurance zaehlt die Team-/Crewwertung, falls vorhanden
    const tab = erg ? teamTabelle(erg, sys) ?? fahrerTabelle(erg, sys) : null
    const feld = erg && teamTabelle(erg, sys) ? 'team' : 'fahrer'
    const rennen = k.eintraege.filter((e) => e.typ === 'rennen')
    const letztes = rennen.map((e) => e.datum).filter((d) => /^\d{4}-/.test(d)).sort().pop()
    return {
      id: k.seriesId + (k.saisonId ?? ''),
      name: erg?.ausgabe ?? k.ausgabe ?? k.seriesName,
      jahr: letztes ? letztes.slice(0, 4) : null,
      // Optional: "fahrer": ["Name 1", "Name 2"] am Team-Eintrag = Fahrer-Crew
      meister: tab?.eintraege?.length
        ? {
            ...meisterAus(tab, feld),
            crew: Array.isArray(tab.eintraege[0].fahrer) ? tab.eintraege[0].fahrer : null,
          }
        : null,
      // Alle Rennen gefahren, aber noch kein Endstand hinterlegt
      abgeschlossen: !!letztes && letztes < new Date().toISOString().slice(0, 10),
    }
  })

  // --- Titel zaehlen (nur abgeschlossene Wertungen) ---
  const titel = new Map() // Name -> { solo, endurance }
  const teamTitel = new Map()
  const plus = (map, name, art) => {
    const t = map.get(name) ?? { solo: 0, konstrukteur: 0, endurance: 0 }
    t[art] += 1
    map.set(name, t)
  }
  for (const s of saisons) {
    if (s.solo?.final) plus(titel, fahrerName(s.solo.name), 'solo')
    if (s.konstrukteur?.final) plus(teamTitel, teamName(s.konstrukteur.name), 'konstrukteur')
  }
  for (const e of endurance) {
    if (e.meister?.final) plus(teamTitel, teamName(e.meister.name), 'endurance')
  }

  // --- Ewige Bestenliste: Fahrerpunkte ueber alle Saisons + gewaehlte Series ---
  const series = config?.ewigeTabelle?.series ?? ['solo', 'team']
  const anzahl = config?.ewigeTabelle?.anzahl ?? 10
  const summe = new Map()
  for (const erg of ergebnisse) {
    if (!series.includes(erg.seriesId)) continue
    const tab = fahrerTabelle(erg, systemVon(erg))
    for (const e of tab?.eintraege ?? []) {
      const n = fahrerName(e.fahrer)
      const f = summe.get(n) ?? { fahrer: n, punkte: 0, proSeries: {}, saisons: new Set() }
      f.punkte += e.punkte
      f.proSeries[erg.seriesId] = (f.proSeries[erg.seriesId] ?? 0) + e.punkte
      if (erg.saisonId) f.saisons.add(erg.saisonId)
      summe.set(n, f)
    }
  }
  // Fahrer, die nicht mehr in der Liga fahren, werden ausgeblendet (champions.json)
  const ausblenden = new Set((config?.ausblenden ?? []).map(fahrerName))
  const sortiert = [...summe.values()].filter((f) => !ausblenden.has(f.fahrer)).sort((a, b) => b.punkte - a.punkte || a.fahrer.localeCompare(b.fahrer))
  // Gleiche Punkte = gleicher Rang
  let rang = 0
  const bestenliste = sortiert.slice(0, anzahl).map((f, i) => {
    if (i === 0 || f.punkte !== sortiert[i - 1].punkte) rang = i + 1
    return { ...f, rang, saisons: f.saisons.size, titel: titel.get(f.fahrer) ?? null }
  })

  // --- Driver of the Day: pro Ergebnisdatei "driverOfTheDay": { "R1": "Name", ... } ---
  // Zaehlt ueber alle Saisons und Series (inkl. Endurance), Gleichstand = gleicher Rang.
  const dotdAnzahl = config?.driverOfTheDay?.anzahl ?? 3
  const dotdMap = new Map()
  let dotdRennen = 0
  for (const erg of ergebnisse) {
    for (const name of Object.values(erg.driverOfTheDay ?? {})) {
      if (!name) continue
      const n = fahrerName(name)
      if (ausblenden.has(n)) continue
      dotdMap.set(n, (dotdMap.get(n) ?? 0) + 1)
      dotdRennen += 1
    }
  }
  const dotdSortiert = [...dotdMap.entries()]
    .map(([fahrer, anzahl]) => ({ fahrer, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || a.fahrer.localeCompare(b.fahrer))
  // Alle mit gleicher Anzahl wie der letzte Platz der Top-N bleiben drin
  const grenze = dotdSortiert[dotdAnzahl - 1]?.anzahl
  let dRang = 0
  const driverOfTheDay = dotdSortiert
    .filter((f, i) => i < dotdAnzahl || f.anzahl === grenze)
    .map((f, i, arr) => {
      if (i === 0 || f.anzahl !== arr[i - 1].anzahl) dRang = i + 1
      return { ...f, rang: dRang }
    })

  return { saisons, endurance, bestenliste, driverOfTheDay, dotdRennen, series, teamTitel, titel, fahrerName, teamName }
}
