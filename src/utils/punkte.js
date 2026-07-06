// Zentrales Punktesystem: wird fuer Ergebnis-Anzeige UND Standings gebraucht.
// Punkte werden IMMER on-the-fly aus platz + quali berechnet, nie hart in den
// Daten hinterlegt — neue Rennen rechnen sich von selbst.
// Solo/Team: DTM-System (P1-P15 + Quali-Bonus P1-P3).
// Endurance: FIA-Endurance-System (kein Quali-Bonus, jedes weitere
// gewertete Auto ab P11 erhaelt 1 Punkt) — gemaess ASPL Endurance Rulebook §5.
export const DTM_PUNKTE = { 1: 25, 2: 20, 3: 16, 4: 13, 5: 11, 6: 10, 7: 9, 8: 8, 9: 7, 10: 6, 11: 5, 12: 4, 13: 3, 14: 2, 15: 1 }
export const QUALI_BONUS = { 1: 3, 2: 2, 3: 1 }
export const ENDURANCE_PUNKTE = { 1: 38, 2: 27, 3: 23, 4: 18, 5: 15, 6: 12, 7: 9, 8: 6, 9: 3, 10: 2 }

export function maxPunkteProRennen(system = 'dtm') {
  return system === 'endurance' ? 38 : 28
}

export function punkte(platz, qualiPlatz, system = 'dtm') {
  if (system === 'endurance') {
    return ENDURANCE_PUNKTE[platz] ?? 1
  }
  return (DTM_PUNKTE[platz] || 0) + (qualiPlatz ? QUALI_BONUS[qualiPlatz] || 0 : 0)
}

// Fahrerwertung: ueber alle vorhandenen Strecken-Ergebnisse summieren.
// Tie-Break: mehr Siege, dann alphabetisch.
export function berechneFahrerwertung(streckenErgebnisse, system = 'dtm') {
  const fahrerMap = new Map()
  for (const ergebnisse of Object.values(streckenErgebnisse ?? {})) {
    for (const e of ergebnisse) {
      const f = fahrerMap.get(e.fahrer) ?? {
        fahrer: e.fahrer,
        team: e.team ?? null,
        punkte: 0,
        siege: 0,
        rennen: 0,
      }
      f.punkte += punkte(e.platz, e.quali, system)
      if (e.platz === 1) f.siege += 1
      f.rennen += 1
      if (e.team) f.team = e.team
      fahrerMap.set(e.fahrer, f)
    }
  }
  return [...fahrerMap.values()].sort(
    (a, b) => b.punkte - a.punkte || b.siege - a.siege || a.fahrer.localeCompare(b.fahrer)
  )
}

// Teamwertung (nur Team-Series): Punkte aller Fahrer eines Teams aufsummieren
export function berechneTeamwertung(streckenErgebnisse, system = 'dtm') {
  const teamMap = new Map()
  for (const ergebnisse of Object.values(streckenErgebnisse ?? {})) {
    for (const e of ergebnisse) {
      if (!e.team) continue
      const t = teamMap.get(e.team) ?? { team: e.team, punkte: 0, siege: 0 }
      t.punkte += punkte(e.platz, e.quali, system)
      if (e.platz === 1) t.siege += 1
      teamMap.set(e.team, t)
    }
  }
  return [...teamMap.values()].sort(
    (a, b) => b.punkte - a.punkte || b.siege - a.siege || a.team.localeCompare(b.team)
  )
}
