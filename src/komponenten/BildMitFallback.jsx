import { useEffect, useState } from 'react'

// Bild mit dunklem Gradient-Platzhalter als Fallback, falls die Datei fehlt
export default function BildMitFallback({ src, alt, className = '', fallbackText, onClick }) {
  const [fehler, setFehler] = useState(false)
  useEffect(() => setFehler(false), [src])

  if (fehler) {
    return (
      <div className={'bild-platzhalter ' + className} onClick={onClick}>
        <span>{fallbackText || alt}</span>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFehler(true)}
      onClick={onClick}
    />
  )
}
