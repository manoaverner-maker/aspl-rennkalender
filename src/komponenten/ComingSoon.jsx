// "Coming Soon"-Screen im ASPL-Stil mit animiertem Hintergrund
export default function ComingSoon({ seriesName }) {
  return (
    <main className="coming-soon">
      <div className="cs-streifen" aria-hidden="true" />
      <div className="cs-inhalt">
        <span className="cs-flagge" aria-hidden="true">🏁</span>
        <h2 className="cs-titel">{seriesName}</h2>
        <p className="cs-text">COMING SOON</p>
        <p className="cs-sub">Langstrecke. Teamwork. Nachtschichten. — Details folgen.</p>
      </div>
    </main>
  )
}
