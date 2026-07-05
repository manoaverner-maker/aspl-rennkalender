import nachweise from '../data/bildnachweise.json'

const BASIS = import.meta.env.BASE_URL

// Pflichtseite fuer die CC-BY-/CC-BY-SA-Lizenzen der Streckenfotos.
// Public-Domain-/CC0-Bilder werden der Vollstaendigkeit halber mitgelistet.
export default function Bildnachweise() {
  return (
    <div className="app">
      <header className="kopf">
        <div className="kopf-innen">
          <a className="logo" href="#/">
            <span className="logo-aspl">ASPL</span>
            <span className="logo-sub">BILDNACHWEISE</span>
          </a>
          <a className="zurueck-link" href="#/">
            ← Zurueck zum Kalender
          </a>
        </div>
        <div className="racing-streifen" />
      </header>

      <main className="nachweise">
        <p className="nachweise-intro">
          Alle Streckenfotos stammen von{' '}
          <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">
            Wikimedia Commons
          </a>
          . Nachfolgend die Urheber- und Lizenzangaben zu jedem verwendeten Bild.
        </p>
        {nachweise.map((gruppe) => (
          <section key={gruppe.strecke} className="nachweis-gruppe">
            <h2>{gruppe.strecke}</h2>
            <ul>
              {gruppe.eintraege.map((e) => (
                <li key={e.datei}>
                  <img
                    src={BASIS + 'images/strecken/' + e.datei.split('_')[0] + '/' + e.datei}
                    alt=""
                    loading="lazy"
                    className="nachweis-thumb"
                  />
                  <div>
                    <strong>{e.datei}</strong> — „{e.titel}"
                    <br />
                    Autor: {e.autor} · Lizenz: {e.lizenz} ·{' '}
                    <a href={e.quelle} target="_blank" rel="noreferrer">
                      Quelle (Wikimedia Commons)
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <footer className="fuss">
        <span>ASPL GT3 Racing Series · PS5 &amp; Xbox Series · ACC · asplracing.com</span>
        <a href="#/">Zum Kalender</a>
      </footer>
    </div>
  )
}
