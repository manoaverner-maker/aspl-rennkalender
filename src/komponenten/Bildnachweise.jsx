import nachweise from '../data/bildnachweise.json'
import { useSprache } from '../i18n.jsx'

const BASIS = import.meta.env.BASE_URL

// Pflichtseite fuer die CC-BY-/CC-BY-SA-Lizenzen der Streckenfotos.
// Public-Domain-/CC0-Bilder werden der Vollstaendigkeit halber mitgelistet.
export default function Bildnachweise() {
  const { t } = useSprache()
  return (
    <div className="app">
      <header className="kopf">
        <div className="kopf-innen">
          <a className="logo" href="#/">
            <img className="logo-icon" src={BASIS + 'logo.svg'} alt="" />
            <span className="logo-text">
              <span className="logo-aspl">ASPL</span>
              <span className="logo-sub">{t('bildnachweiseSub')}</span>
            </span>
          </a>
          <a className="zurueck-link" href="#/">
            {t('zurueckKalender')}
          </a>
        </div>
        <div className="racing-streifen" />
      </header>

      <main className="nachweise">
        <p className="nachweise-intro">
          {t('nachweiseIntro1')}
          <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">
            Wikimedia Commons
          </a>
          {t('nachweiseIntro2')}
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
                    {t('autor')}: {e.autor} · {t('lizenz')}: {e.lizenz} ·{' '}
                    <a href={e.quelle} target="_blank" rel="noreferrer">
                      {t('quelle')} (Wikimedia Commons)
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="nachweis-gruppe">
          <h2>{t('erdTexturen')}</h2>
          <ul>
            <li>
              <div>
                <strong>{t('tagTextur')}</strong> — „Blue Marble Next Generation (Juni)"
                <br />
                {t('autor')}: NASA Earth Observatory (Reto Stoeckli) · {t('lizenz')}: Public domain ·{' '}
                <a href="https://visibleearth.nasa.gov/collection/1484/blue-marble" target="_blank" rel="noreferrer">
                  {t('quelle')} (NASA Visible Earth)
                </a>
              </div>
            </li>
            <li>
              <div>
                <strong>{t('wolkenTextur')}</strong> — „clouds.png"
                <br />
                {t('autor')}: globe.gl-Beispieldaten (Vasco Asturiano) · {t('lizenz')}: MIT ·{' '}
                <a href="https://github.com/vasturiano/globe.gl" target="_blank" rel="noreferrer">
                  {t('quelle')} (GitHub)
                </a>
              </div>
            </li>
            <li>
              <div>
                <strong>{t('nachtTextur')}</strong> — „8K Earth Night Map"
                <br />
                {t('autor')}: Solar System Scope · {t('lizenz')}: CC BY 4.0 ·{' '}
                <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">
                  {t('quelle')} (solarsystemscope.com)
                </a>
              </div>
            </li>
            <li>
              <div>
                <strong>{t('satellitenkacheln')}</strong> — „World Imagery"
                <br />
                {t('quelle')}: Esri, Maxar, Earthstar Geographics, and the GIS User Community ·{' '}
                <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noreferrer">
                  {t('quelle')} (ArcGIS World Imagery)
                </a>
              </div>
            </li>
            <li>
              <div>
                <strong>{t('sternenhimmel')}</strong> — „The Milky Way panorama"
                <br />
                {t('autor')}: ESO / S. Brunier · {t('lizenz')}: CC BY 4.0 (Helligkeit angepasst) ·{' '}
                <a href="https://www.eso.org/public/images/eso0932a/" target="_blank" rel="noreferrer">
                  {t('quelle')} (ESO)
                </a>
              </div>
            </li>
          </ul>
        </section>
      </main>

      <footer className="fuss">
        <span>ASPL GT3 Racing Series · PS5 &amp; Xbox Series · ACC · asplracing.com</span>
        <a href="#/">{t('zumKalender')}</a>
      </footer>
    </div>
  )
}
