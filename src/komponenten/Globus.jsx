import { useEffect, useRef } from 'react'
import Globe from 'globe.gl'

const BASIS = import.meta.env.BASE_URL

// Drehbarer 3D-Globus (globe.gl / Three.js) mit den Rennstrecken als Marker.
// Rot = gefahren, Gruen = ausstehend, das naechste Rennen pulsiert.
export default function Globus({ marker, flyZiel, onMarkerKlick, onHintergrundKlick }) {
  const containerRef = useRef(null)
  const globusRef = useRef(null)
  const idleTimerRef = useRef(null)
  const callbacksRef = useRef({ onMarkerKlick, onHintergrundKlick })
  callbacksRef.current = { onMarkerKlick, onHintergrundKlick }

  // Globus einmalig initialisieren
  useEffect(() => {
    const container = containerRef.current
    const globus = new Globe(container, { animateIn: true })
    globusRef.current = globus

    globus
      .globeImageUrl(BASIS + 'textures/earth-night.jpg')
      .backgroundImageUrl(BASIS + 'textures/night-sky.png')
      .atmosphereColor('#4a7bd5')
      .atmosphereAltitude(0.18)
      .width(container.clientWidth)
      .height(container.clientHeight)
      .onGlobeClick(() => callbacksRef.current.onHintergrundKlick?.())

    // Startansicht: Europa (dort liegen die meisten Strecken)
    globus.pointOfView({ lat: 35, lng: 8, altitude: 2.2 }, 0)

    // Dezente Auto-Rotation im Idle-Zustand
    const controls = globus.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.45
    controls.enableDamping = true

    // Bei Interaktion Rotation stoppen, nach 15 s Idle wieder aufnehmen
    const stoppeRotation = () => {
      controls.autoRotate = false
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        controls.autoRotate = true
      }, 15000)
    }
    container.addEventListener('pointerdown', stoppeRotation)

    // Groesse an den Container koppeln (responsive)
    const ro = new ResizeObserver(() => {
      globus.width(container.clientWidth).height(container.clientHeight)
    })
    ro.observe(container)

    return () => {
      clearTimeout(idleTimerRef.current)
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
          d.runde + ' · ' + d.strecke.kurzname +
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

  // Sanfter Flug zur ausgewaehlten Strecke (~1.5 s)
  useEffect(() => {
    const globus = globusRef.current
    if (!globus || !flyZiel) return
    globus.controls().autoRotate = false
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      const g = globusRef.current
      if (g) g.controls().autoRotate = true
    }, 20000)
    globus.pointOfView({ lat: flyZiel.lat, lng: flyZiel.lng, altitude: 1.5 }, 1500)
  }, [flyZiel])

  return <div className="globus-container" ref={containerRef} />
}
