import { useCallback, useEffect, useRef } from 'react'

// Vollbild-Lightbox mit Pfeiltasten, Escape, Buttons und Touch-Swipe
export default function Lightbox({ bilder, index, onIndex, onClose }) {
  const touchStartX = useRef(null)

  const zurueck = useCallback(
    () => onIndex((index - 1 + bilder.length) % bilder.length),
    [index, bilder.length, onIndex]
  )
  const weiter = useCallback(
    () => onIndex((index + 1) % bilder.length),
    [index, bilder.length, onIndex]
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') zurueck()
      if (e.key === 'ArrowRight') weiter()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, zurueck, weiter])

  // Swipe-Gesten fuer Mobile
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40) return
    if (delta > 0) zurueck()
    else weiter()
  }

  return (
    <div
      className="lightbox"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-label="Bildergalerie Vollbild"
    >
      <button className="lightbox-schliessen" onClick={onClose} aria-label="Schliessen">
        ✕
      </button>
      {bilder.length > 1 && (
        <button
          className="lightbox-pfeil links"
          onClick={(e) => {
            e.stopPropagation()
            zurueck()
          }}
          aria-label="Vorheriges Bild"
        >
          ‹
        </button>
      )}
      <img
        src={bilder[index]}
        alt={'Bild ' + (index + 1) + ' von ' + bilder.length}
        onClick={(e) => e.stopPropagation()}
      />
      {bilder.length > 1 && (
        <button
          className="lightbox-pfeil rechts"
          onClick={(e) => {
            e.stopPropagation()
            weiter()
          }}
          aria-label="Naechstes Bild"
        >
          ›
        </button>
      )}
      <span className="lightbox-zaehler">
        {index + 1} / {bilder.length}
      </span>
    </div>
  )
}
