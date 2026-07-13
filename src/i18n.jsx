import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Zentrale Zweisprachigkeit (DE/EN). Auswahl bleibt in localStorage erhalten.
// UI-Texte kommen aus T[sprache], Dateninhalte (Strecken/Kalender) tragen bei
// Bedarf ein "_en"-Feld, das ueber feld() automatisch bevorzugt wird.
const GESPEICHERT = 'aspl_sprache_v1'

function initialeSprache() {
  const s = localStorage.getItem(GESPEICHERT)
  if (s === 'de' || s === 'en') return s
  return (navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en'
}

// Laendernamen + Streckenrichtung (kleine, feste Mengen -> Map statt _en-Feld)
const LAND = {
  Italien: 'Italy', Spanien: 'Spain', Oesterreich: 'Austria', USA: 'USA',
  Deutschland: 'Germany', Grossbritannien: 'United Kingdom', Australien: 'Australia',
  Belgien: 'Belgium', Frankreich: 'France', Ungarn: 'Hungary', Niederlande: 'Netherlands',
  Japan: 'Japan', Suedafrika: 'South Africa',
}
const RICHTUNG = {
  'Im Uhrzeigersinn': 'Clockwise',
  'Gegen den Uhrzeigersinn': 'Counter-clockwise',
}

const T = {
  de: {
    // Header / App
    anmelden: 'Anmelden',
    alleAcc: 'Alle ACC-Strecken',
    alleAccTitelAn: 'Zeigt alle 25 ACC-Strecken — klicken fuer nur Kalender-Rennen',
    alleAccTitelAus: 'Zeigt nur Kalender-Rennen — klicken fuer alle 25 ACC-Strecken',
    meisterschaftAria: 'Meisterschaft anzeigen',
    meisterschaftTitel: 'Meisterschaft / Leaderboard',
    globusAria: '3D-Globus mit Rennstrecken',
    saisonWaehlen: 'Saison waehlen',
    seriesWaehlen: 'Series waehlen',
    spracheTitel: 'Sprache: Deutsch — auf Englisch wechseln',
    updateBanner: '🔄 Neue Version verfuegbar — jetzt aktualisieren',
    bildnachweise: 'Bildnachweise',
    // Legende
    legGefahren: 'Gefahren',
    legAusstehend: 'Ausstehend',
    legVerschoben: 'Verschoben',
    legNext: 'Next',
    legAcc: 'ACC',
    // Status-Badges
    statusGefahren: 'GEFAHREN',
    statusAusstehend: 'AUSSTEHEND',
    statusVerschoben: 'VERSCHOBEN',
    statusTbd: 'TBD',
    terminFolgt: 'Termin folgt',
    next: 'NEXT',
    // RennListe
    rennlisteAria: 'Rennliste',
    suchePlaceholder: '🔍 Strecke oder Land suchen …',
    sucheAria: 'Strecke oder Land suchen',
    keineStrecke: 'Keine Strecke gefunden',
    weitereAcc: 'Weitere ACC-Strecken',
    accStrecke: 'ACC-Strecke',
    rennenAbgesagt: 'Rennen abgesagt',
    // Countdown
    naechstesRennen: 'Naechstes Rennen',
    jetztLive: '🔴 Jetzt live',
    rennabendLaeuft: 'Rennabend laeuft — viel Erfolg!',
    gleich: 'gleich!',
    in: 'in ',
    tag: 'Tag',
    tage: 'Tagen',
    std: 'Std',
    min: 'Min',
    uhr: ' Uhr',
    // DetailPanel
    schliessen: 'Schliessen',
    ergebnisse: 'Ergebnisse',
    pole: 'Pole',
    alleErgebnisse: 'Alle Ergebnisse anzeigen',
    teilen: '🔗 Teilen',
    linkKopiert: '✓ Link kopiert',
    linkPrompt: 'Link zum Kopieren:',
    nichtImKalender: 'Nicht im aktuellen ASPL-Kalender',
    verschobenUrspruenglich: '⚠️ Verschoben — urspruenglich',
    zumRennenAnmelden: '🏁 Zum Rennen anmelden — SimGrid',
    wetterVorOrt: 'Wetter vor Ort',
    streckendaten: 'Streckendaten',
    laenge: 'Laenge',
    kurven: 'Kurven',
    richtung: 'Richtung',
    eroeffnung: 'Eroeffnung',
    rennformat: 'Rennformat',
    pkt: 'Pkt',
    // Rennformat-Zeilen (Sprint)
    rfTraining: 'Training',
    rfTrainingWert: '30 Min — freies Joinen (ab {training})',
    rfQualifying: 'Qualifying',
    rfQualifyingWert: '20 Min — Start {quali}',
    rfRennen: 'Rennen',
    rfRennenWert: '60 Min — Start {rennstart}',
    rfBoxenstopp: 'Boxenstopp',
    rfBoxenstoppWert: '1 Pflichtboxenstopp, fixe Tankzeit 25 s, kein Boxenfenster',
    rfPunkte: 'Punkte',
    rfPunkteWert: 'DTM-System P1–P15 + Quali-Bonus P1=3 / P2=2 / P3=1',
    // Rennformat-Zeilen (Endurance)
    rfEnRennenWert: '{dauer} — Start {startzeit} Uhr',
    rfEnTeams: 'Teams',
    rfEnTeamsWert: '2–4 Fahrer pro Team; Solofahrer nur im 3-Stunden-Rennen',
    rfEnFahrzeuge: 'Fahrzeuge',
    rfEnFahrzeugeWert: 'Bei 3h/4h/6h darf ein Team beide Autos einsetzen',
    rfEnWechsel: 'Fahrerwechsel',
    rfEnWechselWert: 'Mind. 1 Pflichtstopp mit Fahrerwechsel (Solofahrer: Pflichtstopp ohne Wechsel)',
    rfEnStints: 'Stints',
    rfEnStintsWert: 'Ab 6 h gelten Maximal-Fahr- und Stintzeiten — Details vor dem Rennen im Discord',
    rfEnPunkteWert: 'FIA-Endurance-System: 38-27-23-18-15-12-9-6-3-2 · jedes weitere gewertete Auto 1 Punkt',
    // Leaderboard
    zurWertung: '← Zur Wertung',
    punkte: 'Punkte',
    sieg: 'Sieg',
    siege: 'Siege',
    podien: 'Podien',
    poleEinz: 'Pole',
    poles: 'Poles',
    meisterschaft: '🏆 Meisterschaft',
    rennenGewertet: 'Rennen gewertet',
    nochKeineErgebnisse: 'Noch keine Ergebnisse — ',
    enduranceStartet: 'die Endurance-Series startet erst.',
    resultateFolgen: 'die ersten Resultate folgen nach dem naechsten Rennen.',
    fahrer: 'Fahrer',
    teams: 'Teams',
    team: 'Team',
    fahrerAntippen: 'Fahrer antippen fuer den Saisonverlauf',
    qualiBonus: 'inkl. Quali-Bonus P{n}',
    // WetterBox
    wetterLaden: 'Wetter wird geladen …',
    wetterFehler: 'Wetter zurzeit nicht verfuegbar',
    wind: 'Wind',
    niederschlag: 'Niederschlag',
    heute: 'Heute',
    // ComingSoon
    csSub: 'Langstrecke. Teamwork. Nachtschichten. — Details folgen.',
    // BesucherZaehler
    besuche: 'Besuche',
    // Bildnachweise
    bildnachweiseSub: 'BILDNACHWEISE',
    zurueckKalender: '← Zurueck zum Kalender',
    zumKalender: 'Zum Kalender',
    nachweiseIntro1: 'Alle Streckenfotos stammen von ',
    nachweiseIntro2: '. Nachfolgend die Urheber- und Lizenzangaben zu jedem verwendeten Bild.',
    autor: 'Autor',
    lizenz: 'Lizenz',
    quelle: 'Quelle',
    erdTexturen: 'Erd-Texturen (3D-Globus)',
    tagTextur: 'Tag-Textur',
    wolkenTextur: 'Wolken-Textur',
    nachtTextur: 'Nacht-Textur',
    satellitenkacheln: 'Satellitenkacheln (Nahzoom)',
    sternenhimmel: 'Sternenhimmel',
  },
  en: {
    // Header / App
    anmelden: 'Sign up',
    alleAcc: 'All ACC tracks',
    alleAccTitelAn: 'Showing all 25 ACC tracks — click for calendar races only',
    alleAccTitelAus: 'Showing calendar races only — click for all 25 ACC tracks',
    meisterschaftAria: 'Show championship',
    meisterschaftTitel: 'Championship / Leaderboard',
    globusAria: '3D globe with race tracks',
    saisonWaehlen: 'Select season',
    seriesWaehlen: 'Select series',
    spracheTitel: 'Language: English — switch to German',
    updateBanner: '🔄 New version available — update now',
    bildnachweise: 'Image credits',
    // Legend
    legGefahren: 'Raced',
    legAusstehend: 'Upcoming',
    legVerschoben: 'Postponed',
    legNext: 'Next',
    legAcc: 'ACC',
    // Status badges
    statusGefahren: 'RACED',
    statusAusstehend: 'UPCOMING',
    statusVerschoben: 'POSTPONED',
    statusTbd: 'TBD',
    terminFolgt: 'Date TBA',
    next: 'NEXT',
    // Race list
    rennlisteAria: 'Race list',
    suchePlaceholder: '🔍 Search track or country …',
    sucheAria: 'Search track or country',
    keineStrecke: 'No track found',
    weitereAcc: 'More ACC tracks',
    accStrecke: 'ACC track',
    rennenAbgesagt: 'race cancelled',
    // Countdown
    naechstesRennen: 'Next race',
    jetztLive: '🔴 Live now',
    rennabendLaeuft: 'Race night in progress — good luck!',
    gleich: 'any moment!',
    in: 'in ',
    tag: 'day',
    tage: 'days',
    std: 'h',
    min: 'min',
    uhr: '',
    // DetailPanel
    schliessen: 'Close',
    ergebnisse: 'Results',
    pole: 'Pole',
    alleErgebnisse: 'Show all results',
    teilen: '🔗 Share',
    linkKopiert: '✓ Link copied',
    linkPrompt: 'Link to copy:',
    nichtImKalender: 'Not in the current ASPL calendar',
    verschobenUrspruenglich: '⚠️ Postponed — originally',
    zumRennenAnmelden: '🏁 Sign up for the race — SimGrid',
    wetterVorOrt: 'Local weather',
    streckendaten: 'Track data',
    laenge: 'Length',
    kurven: 'Corners',
    richtung: 'Direction',
    eroeffnung: 'Opened',
    rennformat: 'Race format',
    pkt: 'pts',
    // Race format rows (sprint)
    rfTraining: 'Practice',
    rfTrainingWert: '30 min — free join (from {training})',
    rfQualifying: 'Qualifying',
    rfQualifyingWert: '20 min — start {quali}',
    rfRennen: 'Race',
    rfRennenWert: '60 min — start {rennstart}',
    rfBoxenstopp: 'Pit stop',
    rfBoxenstoppWert: '1 mandatory pit stop, fixed refuel time 25 s, no pit window',
    rfPunkte: 'Points',
    rfPunkteWert: 'DTM system P1–P15 + quali bonus P1=3 / P2=2 / P3=1',
    // Race format rows (endurance)
    rfEnRennenWert: '{dauer} — start {startzeit}',
    rfEnTeams: 'Teams',
    rfEnTeamsWert: '2–4 drivers per team; solo drivers only in the 3-hour race',
    rfEnFahrzeuge: 'Cars',
    rfEnFahrzeugeWert: 'In 3h/4h/6h a team may run both cars',
    rfEnWechsel: 'Driver change',
    rfEnWechselWert: 'At least 1 mandatory stop with driver change (solo: mandatory stop without change)',
    rfEnStints: 'Stints',
    rfEnStintsWert: 'From 6 h max drive and stint times apply — details before the race on Discord',
    rfEnPunkteWert: 'FIA Endurance system: 38-27-23-18-15-12-9-6-3-2 · each further classified car 1 point',
    // Leaderboard
    zurWertung: '← Back to standings',
    punkte: 'Points',
    sieg: 'win',
    siege: 'wins',
    podien: 'Podiums',
    poleEinz: 'Pole',
    poles: 'Poles',
    meisterschaft: '🏆 Championship',
    rennenGewertet: 'races counted',
    nochKeineErgebnisse: 'No results yet — ',
    enduranceStartet: "the Endurance Series hasn't started yet.",
    resultateFolgen: 'first results will follow after the next race.',
    fahrer: 'Drivers',
    teams: 'Teams',
    team: 'Team',
    fahrerAntippen: 'Tap a driver for their season',
    qualiBonus: 'incl. quali bonus P{n}',
    // WeatherBox
    wetterLaden: 'Loading weather …',
    wetterFehler: 'Weather currently unavailable',
    wind: 'Wind',
    niederschlag: 'Precipitation',
    heute: 'Today',
    // ComingSoon
    csSub: 'Endurance. Teamwork. Night shifts. — Details to follow.',
    // Visitor counter
    besuche: 'visits',
    // Image credits
    bildnachweiseSub: 'IMAGE CREDITS',
    zurueckKalender: '← Back to the calendar',
    zumKalender: 'To the calendar',
    nachweiseIntro1: 'All track photos are from ',
    nachweiseIntro2: '. Below are the author and license details for each image used.',
    autor: 'Author',
    lizenz: 'License',
    quelle: 'Source',
    erdTexturen: 'Earth textures (3D globe)',
    tagTextur: 'Day texture',
    wolkenTextur: 'Cloud texture',
    nachtTextur: 'Night texture',
    satellitenkacheln: 'Satellite tiles (close zoom)',
    sternenhimmel: 'Starfield',
  },
}

const Ctx = createContext(null)

export function SpracheProvider({ children }) {
  const [sprache, setSprache] = useState(initialeSprache)
  // <html lang> immer synchron halten (auch beim ersten Laden aus localStorage)
  useEffect(() => {
    document.documentElement.lang = sprache
  }, [sprache])
  const umschalten = useCallback(() => {
    setSprache((s) => {
      const neu = s === 'de' ? 'en' : 'de'
      localStorage.setItem(GESPEICHERT, neu)
      return neu
    })
  }, [])
  return <Ctx.Provider value={{ sprache, umschalten }}>{children}</Ctx.Provider>
}

// Fuer nicht-Komponenten (z. B. Fallback), aber primaer via useSprache()
export function useSprache() {
  const ctx = useContext(Ctx)
  const sprache = ctx?.sprache ?? 'de'
  const t = (key) => T[sprache]?.[key] ?? T.de[key] ?? key
  // Datenfeld mit optionaler _en-Variante
  const feld = (obj, key) =>
    sprache === 'en' && obj && obj[key + '_en'] != null ? obj[key + '_en'] : obj?.[key]
  const land = (l) => (sprache === 'en' ? LAND[l] ?? l : l)
  const richtung = (r) => (sprache === 'en' ? RICHTUNG[r] ?? r : r)
  const saison = (n) => (sprache === 'en' && n ? n.replace('Saison', 'Season') : n)
  const statusText = (s) =>
    ({ gefahren: t('statusGefahren'), ausstehend: t('statusAusstehend'), verschoben: t('statusVerschoben'), tbd: t('statusTbd') }[s] ??
      s)
  const locale = sprache === 'en' ? 'en-GB' : 'de-CH'
  const datum = (d) => {
    if (!d || d === 'TBD') return t('terminFolgt')
    return new Date(d + 'T12:00:00').toLocaleDateString(locale, {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }
  return { sprache, umschalten: ctx?.umschalten, t, feld, land, richtung, saison, statusText, datum, locale }
}
