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
      // Nachtseite: Stadtlichter + schwaches Mondlicht aus der Tag-Textur,
      // damit Land und Meer auch nachts erkennbar bleiben
      vec4 nachtSeite = nightColor + vec4(dayColor.rgb * vec3(0.10, 0.13, 0.20), 0.0);
      float blendFactor = smoothstep(-0.1, 0.1, intensity);
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
export default function Globus({ marker, flyZiel, onMarkerKlick, onHintergrundKlick }) {
  const containerRef = useRef(null)
  const globusRef = useRef(null)
  const idleTimerRef = useRef(null)
  const flugTimerRef = useRef(null)
  const callbacksRef = useRef({ onMarkerKlick, onHintergrundKlick })
  callbacksRef.current = { onMarkerKlick, onHintergrundKlick }

  // Globus einmalig initialisieren
  useEffect(() => {
    const container = containerRef.current
    const globus = new Globe(container, { animateIn: true })
    globusRef.current = globus

    // Texturen laden (Tag: NASA Blue Marble, Nacht: 8K-Nachtkarte)
    const lader = new THREE.TextureLoader()
    // Wichtig: KEIN colorSpace setzen — der Custom-Shader gibt die Texel
    // unveraendert aus; mit SRGBColorSpace wuerde doppelt Gamma angewendet
    // und die Mitteltoene wuerden stark abdunkeln
    const tagTextur = lader.load(BASIS + 'textures/earth-day-8k.jpg')
    const nachtTextur = lader.load(BASIS + 'textures/earth-night-8k.jpg')

    const material = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: tagTextur },
        nightTexture: { value: nachtTextur },
        sunPosition: { value: new THREE.Vector2() },
        globeRotation: { value: new THREE.Vector2() },
      },
      vertexShader: TAG_NACHT_SHADER.vertexShader,
      fragmentShader: TAG_NACHT_SHADER.fragmentShader,
    })

    // Debug-Schalter per URL: ?shader=0 (nur Tag-Textur) / ?atmo=0 (ohne Glow)
    const debugParams = new URLSearchParams(window.location.search)
    if (debugParams.get('shader') === '0') {
      globus.globeImageUrl(BASIS + 'textures/earth-day-8k.jpg')
    } else {
      globus.globeMaterial(material)
    }
    if (debugParams.get('atmo') === '0') {
      globus.showAtmosphere(false)
    }

    globus
      .backgroundImageUrl(BASIS + 'textures/night-sky.png')
      .atmosphereColor('#4a7bd5')
      .atmosphereAltitude(0.18)
      .width(container.clientWidth)
      .height(container.clientHeight)
      .onGlobeClick(() => callbacksRef.current.onHintergrundKlick?.())
      // Kamerabewegung an den Shader melden (fuer die Sonnenrichtung)
      .onZoom(({ lng, lat }) => material.uniforms.globeRotation.value.set(lng, lat))

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

    // Halbtransparente Wolkenschicht, die langsam ueber dem Globus rotiert
    const WOLKEN_HOEHE = 0.006
    const WOLKEN_DREHUNG = -0.006 // Grad pro Frame
    let wolken = null
    let wolkenRaf = 0
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

    // Zoom-Grenzen: nah genug fuer Details, aber nicht so nah,
    // dass die Textur unscharf wird (Globus-Radius = 100)
    const controls = globus.controls()
    controls.minDistance = 115
    controls.maxDistance = 480
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.45
    controls.enableDamping = true

    // Bei Interaktion Rotation stoppen, nach Idle wieder aufnehmen —
    // aber nur, wenn weit genug rausgezoomt ist (sonst wirkt es rasend)
    const rotationSpaeterFortsetzen = (ms) => {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        const g = globusRef.current
        if (g && g.pointOfView().altitude > 0.8) g.controls().autoRotate = true
      }, ms)
    }
    const stoppeRotation = () => {
      controls.autoRotate = false
      rotationSpaeterFortsetzen(15000)
    }
    container.addEventListener('pointerdown', stoppeRotation)
    globus.__rotationSpaeterFortsetzen = rotationSpaeterFortsetzen

    // Groesse an den Container koppeln (responsive)
    const ro = new ResizeObserver(() => {
      globus.width(container.clientWidth).height(container.clientHeight)
    })
    ro.observe(container)

    return () => {
      clearTimeout(idleTimerRef.current)
      clearTimeout(flugTimerRef.current)
      clearInterval(sonnenTimer)
      cancelAnimationFrame(wolkenRaf)
      container.removeEventListener('pointerdown', stoppeRotation)
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
      .htmlAltitude(0.01)
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
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          callbacksRef.current.onMarkerKlick?.(d)
        })
        return el
      })
  }, [marker])

  // Zweistufiger Flug zur Strecke: erst hinfliegen, dann nah reinzoomen
  useEffect(() => {
    const globus = globusRef.current
    if (!globus || !flyZiel) return
    globus.controls().autoRotate = false
    clearTimeout(flugTimerRef.current)
    globus.pointOfView({ lat: flyZiel.lat, lng: flyZiel.lng, altitude: 1.4 }, 1100)
    flugTimerRef.current = setTimeout(() => {
      const g = globusRef.current
      if (g) g.pointOfView({ lat: flyZiel.lat, lng: flyZiel.lng, altitude: 0.25 }, 900)
    }, 1150)
    globus.__rotationSpaeterFortsetzen?.(25000)
  }, [flyZiel])

  return <div className="globus-container" ref={containerRef} />
}
