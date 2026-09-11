# ASPL Rennkalender

3D-Globus-Rennkalender der ASPL (Assetto Corsa Competizione Liga, PS5 & Xbox Series).

**Live:** https://manoaverner-maker.github.io/aspl-rennkalender/

## Tech

- React + Vite, [globe.gl](https://globe.gl) (Three.js) fuer den 3D-Globus
- Kein Backend — alle Daten liegen als JSON unter `src/data/`
- Deployment: GitHub Actions baut bei jedem Push auf `main` automatisch und deployt zu GitHub Pages

## Daten pflegen (ohne Build-Werkzeuge!)

Die Renntermine liegen in `src/data/kalender/`. Dank GitHub Actions reicht es,
eine JSON-Datei direkt im GitHub-Webeditor zu aendern und zu committen —
die Seite baut und aktualisiert sich selbst.

- **Termine eintragen** (z. B. Team-Series): in `saison2-team.json` die
  `"TBD"`-Werte durch Daten im Format `"2026-09-16"` ersetzen.
- **Neue Saison/Series**: einfach eine neue Datei nach dem gleichen Schema in
  `src/data/kalender/` anlegen — sie erscheint automatisch in den Selektoren
  (kein Code noetig). `"comingSoon": true` zeigt den Coming-Soon-Screen.
- **Strecken-Stammdaten** (Koordinaten, Bilder, Streckendaten): `src/data/strecken.json`.
- **Rennergebnisse**: in `src/data/ergebnisse/<saison>-<series>.json` unter `strecken`
  je Strecke eine Liste mit `platz`, `fahrer`, `team`, `fahrzeug`, `nr` und optional
  `quali`. Die Meisterschaftstabelle rechnet sich daraus von selbst.
- **Tabelle direkt hinterlegen**: Liegt zu einem Rennen kein Einzelergebnis vor, die
  Liga aber eine fertige Tabelle veroeffentlicht hat, kommt sie in derselben Datei
  unter `wertung` — sie hat dann Vorrang vor der Berechnung:

  ```jsonc
  "wertung": {
    "quelle": "ASPL Liga-Tabelle",
    "fahrer": {
      "stand": "Endstand", "stand_en": "Final standings",
      "final": true,                     // true -> Champion wird gefeiert
      "eintraege": [{ "platz": 1, "fahrer": "Eric Sprott", "punkte": 164 }]
    },
    "teams": { "stand": "Endstand", "final": true, "eintraege": [
      { "platz": 1, "team": "Golden Dynasty", "punkte": 266 }
    ]}
  }
  ```

  `final: true` blendet den Meister animiert ueber der Tabelle ein — in der
  Team-Series den Teammeister, sonst den Fahrer-Champion. Damit der Klick auf einen
  Fahrer seinen Saisonverlauf zeigt, muss der Name genauso geschrieben sein wie in
  den Rennergebnissen.
- Der Status (GEFAHREN / AUSSTEHEND) wird automatisch aus dem Datum berechnet.

## Lokal entwickeln

```bash
npm install
npm run dev     # Dev-Server
npm run build   # Produktions-Build nach dist/
```

## Bildnachweise

Alle Streckenfotos stammen von Wikimedia Commons — Details in `LIZENZEN.md`
und auf der Seite „Bildnachweise" (im Footer verlinkt).
