import { useEffect, useRef } from 'react'
import Globe from 'globe.gl'
import * as THREE from 'three'
import * as solar from 'solar-calculator'

const BASIS = import.meta.env.BASE_URL

// Tag/Nacht-Shader: mischt Tag- und Nacht-Textur entlang der echten
// Sonnen-Terminator-Linie (weicher Uebergang), wie bei Google Earth.
const TAG_NACHT_SHADER = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    #define PI 3.141592653589793
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform vec2 sunPosition;
    uniform vec2 globeRotation;
    uniform float dayBoost;
    varying vec3 vNormal;
    varying vec2 vUv;

    float toRad(in float a) {
      return a * PI / 180.0;
    }

    // Polarkoordinaten [lng, lat] -> kartesischer Richtungsvektor
    vec3 Polar2Cartesian(in vec2 c) {
      float theta = toRad(90.0 - c.x);
      float phi = toRad(90.0 - c.y);
      return vec3(
        sin(phi) * cos(theta),
        cos(phi),
        sin(phi) * sin(theta)
      );
    }

    void main() {
      // Sonnenrichtung in den View-Space der aktuellen Kameraposition drehen
      float invLon = toRad(globeRotation.x);
      float invLat = -toRad(globeRotation.y);
      mat3 rotX = mat3(
        1, 0, 0,
        0, cos(invLat), -sin(invLat),
        0, sin(invLat), cos(invLat)
      );
      mat3 rotY = mat3(
        cos(invLon), 0, sin(invLon),
        0, 1, 0,
        -sin(invLon), 0, cos(invLon)
      );
      vec3 rotatedSunDirection = rotX * rotY * Polar2Cartesian(sunPosition);
      float intensity = dot(normalize(vNormal), normalize(rotatedSunDirection));
      vec4 dayColor = texture2D(dayTexture, vUv);
      vec4 nightColor = texture2D(nightTexture, vUv);
      // Dezente Farbanhebung (Saettigung + Kontrast), damit die Fernansicht
      // farblich zu den Satellitenkacheln der Nahansicht passt
      float grau = dot(dayColor.rgb, vec3(0.299, 0.587, 0.114));
      vec3 tagFarbe = clamp(mix(vec3(grau), dayColor.rgb, 1.22), 0.0, 1.0);
      tagFarbe = clamp((tagFarbe - 0.5) * 1.07 + 0.5, 0.0, 1.0);
      dayColor = vec4(tagFarbe, 1.0);
      // Nachtseite: Stadtlichter + schwaches Mondlicht aus der Tag-Textur,
      // damit Land und Meer auch nachts erkennbar bleiben
      vec4 nachtSeite = nightColor + vec4(dayColor.rgb * vec3(0.10, 0.13, 0.20), 0.0);
      // dayBoost blendet die Nacht beim Reinzoomen aus (wie bei Google Earth)
      float blendFactor = max(smoothstep(-0.1, 0.1, intensity), dayBoost);
      gl_FragColor = mix(nachtSeite, dayColor, blendFactor);
    }
  `,
}

// Aktuelle Sonnenposition [lng, lat] fuer einen Zeitpunkt (echter Sonnenstand)
function sonnenPosition(dt) {
  const tagesbeginn = new Date(+dt).setUTCHours(0, 0, 0, 0)
  const t = solar.century(dt)
  const laenge = ((tagesbeginn - dt) / 864e5) * 360 - 180
  return [laenge - solar.equationOfTime(t) / 4, solar.declination(t)]
}

// Drehbarer 3D-Globus (globe.gl / Three.js) mit den Rennstrecken als Marker.
// Rot = gefahren, Gruen = ausstehend, das naechste Rennen pulsiert.
export default function Globus({ marker, flyZiel, onMarkerKlick, onHintergrundKlick, panelOffen }) {
  const containerRef = useRef(null)
  const globusRef = useRef(null)
  const idleTimerRef = useRef(null)
  const flugTimerRef = useRef(null)
  const callbacksRef = useRef({ onMarkerKlick, onHintergrundKlick })
  callbacksRef.current = { onMarkerKlick, onHintergrundKlick }
  // Ob gerade ein Detail-Panel offen ist — die Auto-Rotation soll dann nicht
  // hinter dem Sheet weiterlaufen (Erde wirkt sonst "beweglich")
  const panelOffenRef = useRef(panelOffen)
  panelOffenRef.current = panelOffen
  // Merkt sich, ob der Render-Loop von uns pausiert wurde, damit wir ihn nur
  // dann wieder fortsetzen (kein doppelter rAF-Loop beim Mount)
  const pausiertRef = useRef(false)

  // Finale Zoom-Hoehe des Rennen-Anflugs — per ?zoom= live einstellbar
  // (kleiner = naeher). Standard 0.0015 ≈ ganze Strecke im Bild.
  const zoomParam = parseFloat(new URLSearchParams(window.location.search).get('zoom'))
  const anflugAltitude = Number.isFinite(zoomParam)
    ? Math.min(0.02, Math.max(0.0008, zoomParam))
    : 0.0015

  // Globus einmalig initialisieren
  useEffect(() => {
    const container = containerRef.current
    // Touch-Geraet? Danach richten sich Antialiasing, Zoom-/Dreh-Tempo und
    // das Einfrieren hinter dem Panel.
    const istTouch = window.matchMedia('(pointer: coarse)').matches
    const globus = new Globe(container, {
      animateIn: true,
      // Antialiasing auf Handys aus: MSAA kostet auf mobilen GPUs spuerbar FPS,
      // die glatten Kugel-Texturen brauchen es kaum — fluessigeres Drehen
      rendererConfig: { antialias: !istTouch, alpha: true, powerPreference: 'high-performance' },
    })
    globusRef.current = globus

    // Texturen laden (Tag: NASA Blue Marble Juni — sattes Sommergruen aus
    // derselben Bildfamilie wie die Esri-Kacheln; Nacht: 8K-Nachtkarte)
    const lader = new THREE.TextureLoader()
    // Wichtig: KEIN colorSpace setzen — der Custom-Shader gibt die Texel
    // unveraendert aus; mit SRGBColorSpace wuerde doppelt Gamma angewendet
    // und die Mitteltoene wuerden stark abdunkeln
    const tagTextur = lader.load(BASIS + 'textures/earth-tag.jpg')
    const nachtTextur = lader.load(BASIS + 'textures/earth-night-8k.jpg')

    const material = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: tagTextur },
        nightTexture: { value: nachtTextur },
        sunPosition: { value: new THREE.Vector2() },
        globeRotation: { value: new THREE.Vector2() },
        dayBoost: { value: 0 },
      },
      vertexShader: TAG_NACHT_SHADER.vertexShader,
      fragmentShader: TAG_NACHT_SHADER.fragmentShader,
    })

    // Satelliten-Kacheln (Esri World Imagery): werden nah am Boden nachgeladen,
    // damit die Schaerfe beim Reinzoomen nicht mehr endet — wie bei Google Earth
    const TILE_URL = (x, y, l) =>
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' +
      l + '/' + y + '/' + x
    let tilesAktiv = false
    let tileWechselTimer = 0
    let tileWechselWartet = false
    let wolken = null
    let wolkenRaf = 0
    let attributionEl = null

    // Kacheln vorwaermen: Bilder anstossen, damit sie im Browser-Cache liegen,
    // wenn die Kachel-Engine sie kurz darauf wirklich anfragt
    const vorgewaermt = new Set()
    const waermeKachel = (x, y, z) => {
      const n = 2 ** z
      const url = TILE_URL(((x % n) + n) % n, y, z)
      if (y < 0 || y >= n || vorgewaermt.has(url)) return
      vorgewaermt.add(url)
      const img = new Image()
      img.src = url
    }
    // Ziel-Umfeld ueber alle Zoomstufen vorladen (laeuft waehrend des Anflugs)
    const waermeZiel = (lat, lng) => {
      const latR = (lat * Math.PI) / 180
      for (let z = 5; z <= 13; z++) {
        const n = 2 ** z
        const x0 = Math.floor(((lng + 180) / 360) * n)
        const y0 = Math.floor(
          ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n
        )
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            waermeKachel(x0 + dx, y0 + dy, z)
          }
        }
      }
    }
    globus.__kachelnVorwaermen = waermeZiel
    // Welt-Grundkacheln (Stufe 0–3, ~85 kleine Bilder) einmalig im Leerlauf
    // vorladen — die erste Kachel-Aktivierung zeigt dann sofort Bilder
    setTimeout(() => {
      for (let z = 0; z <= 3; z++) {
        const n = 2 ** z
        for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) waermeKachel(x, y, z)
      }
    }, 4000)

    // Reagiert auf die Zoom-Hoehe: Nacht und Wolken ausblenden, Kacheln umschalten
    const setzeZoomStufe = (altitude) => {
      // Nachtseite zwischen Hoehe 1.1 und 0.45 sanft ausblenden
      material.uniforms.dayBoost.value =
        1 - Math.min(1, Math.max(0, (altitude - 0.45) / 0.65))
      // Wolken zwischen Hoehe 0.9 und 0.5 ausblenden
      if (wolken) {
        const deckkraft = Math.min(1, Math.max(0, (altitude - 0.5) / 0.4))
        wolken.material.opacity = deckkraft
        wolken.visible = deckkraft > 0.02
      }
      // Nahzoom: Marker-Pixel-Versatz aufheben (echte Distanz sichtbar)
      container.classList.toggle('nahzoom', altitude < 0.004)
      // Versatz beim Rauszoomen ausblenden: ein fester Pixel-Abstand waere
      // bei Weltansicht geografisch hunderte km daneben (Nordschleife "in England")
      const versatzSkala = Math.min(1, Math.max(0, (0.7 - altitude) / 0.4))
      container.style.setProperty('--versatz-skala', versatzSkala.toFixed(3))
      // Cluster entzerren: Marker-Punkte weit draussen kleiner rendern, damit
      // der dichte Europa-Haufen weniger zu einem Blob verklebt (Tap-Flaeche
      // bleibt gleich — nur der farbige Punkt schrumpft optisch)
      const markerSkala = Math.max(0.65, Math.min(1, 1 - ((altitude - 0.5) / 1.1) * 0.35))
      container.style.setProperty('--marker-skala', markerSkala.toFixed(3))
      // Kacheln mit Hysterese (an < 0.42, aus > 0.60). Einschalten schnell
      // (150 ms — auch mitten in Flug/Zoom, damit das Laden frueh beginnt),
      // Ausschalten traege (450 ms), damit an der Schwelle nichts flackert.
      // Wichtig: Timer laeuft weiter, auch wenn onZoom dauernd feuert —
      // sonst wuerde die Umschaltung bis zum Bewegungsstopp verschleppt.
      const sollTiles = tilesAktiv ? altitude < 0.6 : altitude < 0.42
      if (sollTiles === tilesAktiv) {
        clearTimeout(tileWechselTimer)
        tileWechselWartet = false
      } else if (!tileWechselWartet) {
        tileWechselWartet = true
        tileWechselTimer = setTimeout(() => {
          tileWechselWartet = false
          const alt = globus.pointOfView().altitude
          const soll = tilesAktiv ? alt < 0.6 : alt < 0.42
          if (soll !== tilesAktiv) {
            tilesAktiv = soll
            globus.globeTileEngineUrl(soll ? TILE_URL : null)
            if (attributionEl) attributionEl.style.display = soll ? 'block' : 'none'
          }
        }, sollTiles ? 150 : 450)
      }
    }

    // Debug-Schalter per URL: ?shader=0 (nur Tag-Textur) / ?atmo=0 (ohne Glow)
    const debugParams = new URLSearchParams(window.location.search)
    if (debugParams.get('shader') === '0') {
      globus.globeImageUrl(BASIS + 'textures/earth-tag.jpg')
    } else {
      globus.globeMaterial(material)
    }
    if (debugParams.get('atmo') === '0') {
      globus.showAtmosphere(false)
    }

    globus
      .backgroundImageUrl(BASIS + 'textures/sterne-milchstrasse.jpg')
      .atmosphereColor('#4a7bd5')
      .atmosphereAltitude(0.18)
      .width(container.clientWidth)
      .height(container.clientHeight)
      .onGlobeReady(() => container.classList.add('bereit'))
      .globeTileEngineMaxLevel(18)
      // Kamerabewegung an den Shader melden + Zoom-Stufen aktualisieren
      .onZoom(({ lng, lat, altitude }) => {
        material.uniforms.globeRotation.value.set(lng, lat)
        setzeZoomStufe(altitude)
      })

    // Pixel-Ratio deckeln: auf Handys (DPR 3) rendert das sonst 2.25x mehr
    // Pixel als noetig — Hauptursache fuer ruckelndes Zoomen auf Mobilgeraeten
    globus.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    // Maximale Kantenglaettung der Texturen (schaerfer bei flachem Blickwinkel)
    const maxAniso = globus.renderer().capabilities.getMaxAnisotropy()
    tagTextur.anisotropy = maxAniso
    nachtTextur.anisotropy = maxAniso

    // Echten Sonnenstand setzen und jede Minute nachfuehren
    const setzeSonne = () => {
      const [lng, lat] = sonnenPosition(new Date())
      material.uniforms.sunPosition.value.set(lng, lat)
    }
    setzeSonne()
    const sonnenTimer = setInterval(setzeSonne, 60000)

    // Pflicht-Quellenangabe fuer die Satellitenkacheln (nur sichtbar, wenn aktiv)
    attributionEl = document.createElement('div')
    attributionEl.className = 'tile-attribution'
    attributionEl.textContent = 'Satellitenbilder: Esri · Maxar · Earthstar Geographics'
    attributionEl.style.display = 'none'
    container.appendChild(attributionEl)

    // Halbtransparente Wolkenschicht, die langsam ueber dem Globus rotiert
    const WOLKEN_HOEHE = 0.006
    const WOLKEN_DREHUNG = -0.0015 // Grad pro Frame — bewusst traege, wirkt natuerlicher
    lader.load(BASIS + 'textures/clouds.png', (wolkenTextur) => {
      wolkenTextur.anisotropy = maxAniso
      wolken = new THREE.Mesh(
        new THREE.SphereGeometry(globus.getGlobeRadius() * (1 + WOLKEN_HOEHE), 90, 90),
        new THREE.MeshLambertMaterial({ map: wolkenTextur, transparent: true, depthWrite: false })
      )
      wolken.raycast = () => {} // Klicks gehen durch die Wolken hindurch
      globus.scene().add(wolken)
      const drehe = () => {
        wolken.rotation.y += (WOLKEN_DREHUNG * Math.PI) / 180
        wolkenRaf = requestAnimationFrame(drehe)
      }
      drehe()
    })

    // Debug-Zugriff fuer Tests (Uniforms/Kamera von aussen inspizierbar)
    window.__aspl = { globus, material }

    // Startansicht: Europa (dort liegen die meisten Strecken) —
    // per URL-Parameter ?lat=&lng=&alt= laesst sich eine Ansicht teilen
    const params = new URLSearchParams(window.location.search)
    const pLat = parseFloat(params.get('lat'))
    const pLng = parseFloat(params.get('lng'))
    const pAlt = parseFloat(params.get('alt'))
    if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
      globus.pointOfView({ lat: pLat, lng: pLng, altitude: Number.isFinite(pAlt) ? pAlt : 0.3 }, 0)
    } else {
      globus.pointOfView({ lat: 35, lng: 8, altitude: 2.2 }, 0)
    }

    // Zoom-Grenzen: dank Satellitenkacheln darf man sehr nah ran
    // (Globus-Radius = 100; Distanz 100.10 entspricht ca. 6 km Hoehe)
    const controls = globus.controls()
    controls.minDistance = 100.1
    controls.maxDistance = 480
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.45
    controls.enableDamping = true

    // Traegheit/Momentum: nach dem Loslassen dreht die Erde sanft aus.
    // dampingFactor = Abklingrate pro Frame — kleiner = laengeres Nachlaufen.
    // Auf dem Handy laengeres Ausrollen (Momentum), an der Maus straffer.
    // Handy: kleinerer dampingFactor = laengeres, sanftes Ausrollen (Momentum).
    // Desktop bleibt beim three.js-Standard (0.05), damit die Maus sich nicht
    // anders anfuehlt als bisher.
    controls.dampingFactor = istTouch ? 0.04 : 0.05
    // Dreh-Tempo am Handy leicht gedrosselt: der Flick gibt weniger Wucht,
    // damit es trotz laengerem Ausrollen "nicht zu empfindlich" wird.
    controls.rotateSpeed = istTouch ? 0.8 : 1.0
    // Zwei Finger: gleichzeitig zoomen UND die Erde drehen (wie Google Earth).
    // Standard waere DOLLY_PAN — Pan verschiebt bei einer Kugel aber den
    // Mittelpunkt ins Leere, deshalb DOLLY_ROTATE.
    controls.touches.ONE = THREE.TOUCH.ROTATE
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE

    // zoomToCursor (globe.gl-Standard) verklemmt sich mit dem staendigen
    // Zuruecksetzen des Orbit-Ziels auf den Erdmittelpunkt — genau das war
    // das "Zoom geht manchmal nicht, bis man sich bewegt"
    controls.zoomToCursor = false

    // Pinch-Zoom (Touch) laeuft weiter ueber die Controls — Tempo an der
    // HOEHE UEBER GRUND ausrichten, nicht an der Mittelpunkt-Distanz.
    // Auf Touch-Geraeten stark drosseln: zoomSpeed ist bei OrbitControls der
    // EXPONENT der Pinch-Ratio — Werte um 8 machen die Geste unkontrollierbar
    const ZOOM_FAKTOR = 1.5
    const radius = globus.getGlobeRadius()
    const passeZoomTempoAn = () => {
      const d = globus.camera().position.length()
      const boden = Math.max(d - radius, radius * 0.0008)
      const zielRatio = (radius + boden * ZOOM_FAKTOR) / d
      const roh = Math.min(8, Math.max(0.05, Math.log(zielRatio) / Math.log(1 / 0.95)))
      // Touch: sanftes, eng gedeckeltes Tempo (0.4–0.75). Vorher schoss roh weit
      // draussen auf ~8 hoch → der erste Pinch fuehlte sich wie ein Ruck/Sprung
      // an. Das schmale Band macht den Zoom-Start weich und gleichmaessig.
      controls.zoomSpeed = istTouch ? Math.min(0.75, Math.max(0.4, roh * 0.15)) : roh
    }
    // Nach dem globe.gl-eigenen change-Listener registriert — unser Wert gilt
    controls.addEventListener('change', passeZoomTempoAn)
    passeZoomTempoAn()

    // Mausrad-Zoom komplett selbst: weich geglaettete Animation der Hoehe
    // (Google-Earth-Gefuehl) statt ruckartiger OrbitControls-Stufen.
    // Capture-Phase faengt das Event ab, bevor OrbitControls es sieht.
    let zielHoehe = null
    let zoomRaf = 0
    const beiMausrad = (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      const delta = ev.deltaMode === 1 ? ev.deltaY * 33 : ev.deltaY
      const staerke = Math.max(0.35, Math.min(2, Math.abs(delta) / 100))
      const faktor = Math.pow(1.32, (delta > 0 ? 1 : -1) * staerke)
      const basis = zielHoehe ?? globus.pointOfView().altitude
      zielHoehe = Math.min(3.8, Math.max(0.001, basis * faktor))
      stoppeRotation()
    }
    const glaetteZoom = () => {
      if (zielHoehe != null) {
        const pov = globus.pointOfView()
        const diff = zielHoehe - pov.altitude
        if (Math.abs(diff) / Math.max(pov.altitude, 0.001) < 0.003) {
          zielHoehe = null
        } else {
          // pointOfView mit Dauer 0 ersetzt auch laufende Fluganimationen —
          // Rauszoomen direkt nach dem Strecken-Anflug greift sofort
          globus.pointOfView({ altitude: pov.altitude + diff * 0.17 }, 0)
        }
      }
      zoomRaf = requestAnimationFrame(glaetteZoom)
    }
    container.addEventListener('wheel', beiMausrad, { capture: true, passive: false })
    glaetteZoom()

    // Bei Interaktion Rotation stoppen, nach Idle wieder aufnehmen —
    // aber nur, wenn weit genug rausgezoomt ist (sonst wirkt es rasend)
    const rotationSpaeterFortsetzen = (ms) => {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        const g = globusRef.current
        if (g && !panelOffenRef.current && g.pointOfView().altitude > 0.8) {
          g.controls().autoRotate = true
        }
      }, ms)
    }
    const stoppeRotation = () => {
      controls.autoRotate = false
      rotationSpaeterFortsetzen(15000)
    }
    container.addEventListener('pointerdown', stoppeRotation)
    globus.__rotationSpaeterFortsetzen = rotationSpaeterFortsetzen

    // Doppeltipp/-klick: sanft auf den getippten Punkt reinzoomen (Maps-Geste).
    // toGlobeCoords liefert die Geo-Koordinaten unter dem Bildschirmpunkt —
    // null, wenn ins All getippt wurde.
    const zoomAufPunkt = (x, y) => {
      const coords = globus.toGlobeCoords(x, y)
      if (!coords) return
      const pov = globus.pointOfView()
      const ziel = Math.max(0.03, pov.altitude * 0.4)
      globus.__kachelnVorwaermen?.(coords.lat, coords.lng)
      globus.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: ziel }, 650)
      stoppeRotation()
      navigator.vibrate?.(5)
    }

    // Kurzer Klick/Tap ins Leere (Globus ODER Weltraum) schliesst das offene
    // Panel — Marker fangen ihr pointerdown selbst ab (stopPropagation),
    // Drehen/Ziehen zaehlt durch die Bewegungs-Schwelle nicht als Klick.
    // Zwei schnelle Taps hintereinander = Doppeltipp -> reinzoomen.
    let letzterTapZeit = 0
    let letzterTapX = 0
    let letzterTapY = 0
    const beiHintergrundKlick = (ev) => {
      if (!ev.isPrimary) return
      const start = { x: ev.clientX, y: ev.clientY, t: Date.now() }
      const beiLoslassen = (up) => {
        window.removeEventListener('pointerup', beiLoslassen)
        const dx = up.clientX - start.x
        const dy = up.clientY - start.y
        if (Date.now() - start.t < 400 && dx * dx + dy * dy < 64) {
          callbacksRef.current.onHintergrundKlick?.()
          const jetzt = Date.now()
          const nahBeimLetzten =
            (up.clientX - letzterTapX) ** 2 + (up.clientY - letzterTapY) ** 2 < 900
          if (jetzt - letzterTapZeit < 320 && nahBeimLetzten) {
            letzterTapZeit = 0
            zoomAufPunkt(up.clientX, up.clientY)
          } else {
            letzterTapZeit = jetzt
            letzterTapX = up.clientX
            letzterTapY = up.clientY
          }
        }
      }
      window.addEventListener('pointerup', beiLoslassen)
    }
    container.addEventListener('pointerdown', beiHintergrundKlick)

    // Seite im Hintergrund (Tab-Wechsel, Bildschirm aus, PWA minimiert):
    // Render-Loop anhalten — spart Akku/Hitze. Beim Zurueckkommen fortsetzen,
    // ausser ein Panel haelt die Erde auf dem Handy bewusst eingefroren.
    const beiSichtbarkeit = () => {
      const g = globusRef.current
      if (!g) return
      if (document.hidden) {
        g.pauseAnimation?.()
      } else {
        const mobil = window.matchMedia('(max-width: 900px)').matches
        if (!(panelOffenRef.current && mobil)) g.resumeAnimation?.()
      }
    }
    document.addEventListener('visibilitychange', beiSichtbarkeit)

    // Groesse an den Container koppeln (responsive)
    const ro = new ResizeObserver(() => {
      globus.width(container.clientWidth).height(container.clientHeight)
    })
    ro.observe(container)

    return () => {
      clearTimeout(idleTimerRef.current)
      clearTimeout(flugTimerRef.current)
      clearTimeout(tileWechselTimer)
      clearInterval(sonnenTimer)
      cancelAnimationFrame(wolkenRaf)
      cancelAnimationFrame(zoomRaf)
      container.removeEventListener('pointerdown', stoppeRotation)
      container.removeEventListener('pointerdown', beiHintergrundKlick)
      container.removeEventListener('wheel', beiMausrad, { capture: true })
      document.removeEventListener('visibilitychange', beiSichtbarkeit)
      ro.disconnect()
      globus._destructor?.()
      container.innerHTML = ''
      globusRef.current = null
    }
  }, [])

  // Marker aktualisieren, wenn sich Series/Saison oder der Status aendert
  useEffect(() => {
    const globus = globusRef.current
    if (!globus) return
    globus
      .htmlElementsData(marker)
      .htmlLat((d) => d.strecke.lat)
      .htmlLng((d) => d.strecke.lng)
      .htmlAltitude(0.002)
      .htmlElement((d) => {
        const el = document.createElement('div')
        el.className =
          'globus-marker status-' + d.status + (d.istNaechstes ? ' naechstes' : '')
        el.innerHTML =
          '<div class="marker-punkt"></div><div class="marker-label">' +
          (d.runde ? d.runde + ' · ' : '') + d.strecke.kurzname +
          '</div>'
        el.style.pointerEvents = 'auto'
        el.style.cursor = 'pointer'
        // Optionaler Pixel-Versatz, damit fast identische Standorte
        // (z. B. Nuerburgring GP und Nordschleife) nicht uebereinanderliegen.
        // Wird per CSS-Klasse "nahzoom" entfernt, sobald man so nah dran ist,
        // dass die echte Distanz auf dem Bildschirm sichtbar wird.
        if (d.strecke.markerVersatz) {
          el.classList.add('mit-versatz')
          el.style.setProperty('--versatz-x', d.strecke.markerVersatz[0] + 'px')
          el.style.setProperty('--versatz-y', d.strecke.markerVersatz[1] + 'px')
        }
        // Klick-Erkennung ueber die GESTE statt ueber das Element: waehrend
        // Flug-Animationen wandern Marker unter dem Cursor weg, wodurch ein
        // normaler click-Event zerfaellt und das Panel "manchmal" nicht kam
        el.addEventListener('pointerdown', (ev) => {
          ev.stopPropagation()
          const start = { x: ev.clientX, y: ev.clientY, t: Date.now() }
          const beiLoslassen = (up) => {
            window.removeEventListener('pointerup', beiLoslassen)
            const dx = up.clientX - start.x
            const dy = up.clientY - start.y
            if (Date.now() - start.t < 500 && dx * dx + dy * dy < 100) {
              navigator.vibrate?.(8) // kurzes Haptik-Feedback beim Andocken (wo unterstuetzt)
              callbacksRef.current.onMarkerKlick?.(d)
            }
          }
          window.addEventListener('pointerup', beiLoslassen)
        })
        el.addEventListener('click', (ev) => ev.stopPropagation())
        return el
      })
  }, [marker])

  // Solange ein Detail-Panel offen ist: Auto-Rotation stoppen und auf dem
  // Handy die Erde ganz einfrieren — man sieht sie hinter dem Sheet, kann sie
  // aber nicht versehentlich verdrehen (auf Desktop bleibt sie neben dem
  // Panel bedienbar). Beim Schliessen wird die Interaktion wieder freigegeben.
  useEffect(() => {
    const globus = globusRef.current
    if (!globus) return
    const controls = globus.controls()
    if (panelOffen) {
      controls.autoRotate = false
      if (window.matchMedia('(max-width: 900px)').matches) {
        controls.enabled = false
        // Render-Loop anhalten: Erde ist ohnehin eingefroren und vom Sheet
        // fast verdeckt — spart Akku/Hitze und haelt das Sheet fluessig
        globus.pauseAnimation?.()
        pausiertRef.current = true
      }
    } else {
      controls.enabled = true
      if (pausiertRef.current) {
        globus.resumeAnimation?.()
        pausiertRef.current = false
      }
    }
  }, [panelOffen])

  // Zweistufiger Flug zur Strecke: erst hinfliegen, dann tief reinzoomen —
  // die Satellitenkacheln schalten sich dabei automatisch dazu
  useEffect(() => {
    const globus = globusRef.current
    if (!globus || !flyZiel) return
    globus.controls().autoRotate = false
    clearTimeout(flugTimerRef.current)
    // Ziel-Kacheln sofort vorladen — bis zur Landung liegen sie im Cache
    globus.__kachelnVorwaermen?.(flyZiel.lat, flyZiel.lng)
    globus.pointOfView({ lat: flyZiel.lat, lng: flyZiel.lng, altitude: 1.2 }, 1100)
    flugTimerRef.current = setTimeout(() => {
      const g = globusRef.current
      if (g) g.pointOfView({ lat: flyZiel.lat, lng: flyZiel.lng, altitude: anflugAltitude }, 1900)
    }, 1150)
    globus.__rotationSpaeterFortsetzen?.(25000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyZiel])

  return <div className="globus-container" ref={containerRef} />
}
