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
