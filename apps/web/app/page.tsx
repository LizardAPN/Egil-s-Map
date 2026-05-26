export default function HomePage() {
  return (
    <main className="imprint-shell">
      <section className="imprint-hero">
        <div className="imprint-copy">
          <div className="imprint-badge">Geo-social memory map</div>
          <h1>Imprint</h1>
          <p className="imprint-lead">Your life, mapped.</p>
          <p className="imprint-subcopy">
            Turn places into memories, organize them into chapters, and trace the path your story
            has taken across cities, countries, and years.
          </p>
          <div className="imprint-actions">
            <a className="imprint-primary" href="/">
              Explore Imprint
            </a>
            <a
              className="imprint-secondary"
              href="https://supabase.com"
              rel="noreferrer"
              target="_blank"
            >
              Supabase backend
            </a>
          </div>
        </div>

        <div className="imprint-visual" aria-hidden="true">
          <div className="imprint-orbit imprint-orbit-lg" />
          <div className="imprint-orbit imprint-orbit-md" />
          <div className="imprint-globe">
            <span className="imprint-pin imprint-pin-1" />
            <span className="imprint-pin imprint-pin-2" />
            <span className="imprint-pin imprint-pin-3" />
            <span className="imprint-grid imprint-grid-lat" />
            <span className="imprint-grid imprint-grid-lng" />
          </div>
          <div className="imprint-floating-card imprint-card-left">
            <strong>Memory Map</strong>
            <span>Pins anchored to real places</span>
          </div>
          <div className="imprint-floating-card imprint-card-right">
            <strong>Life Chapters</strong>
            <span>Stories grouped into arcs</span>
          </div>
        </div>
      </section>

      <section className="imprint-features">
        <article>
          <h2>Memory pins</h2>
          <p>Capture a moment, attach media, and drop it exactly where it happened.</p>
        </article>
        <article>
          <h2>Discovery</h2>
          <p>Explore public memories nearby and see what a city feels like through strangers.</p>
        </article>
        <article>
          <h2>Live presence</h2>
          <p>Opt-in location sharing with privacy-first controls for friends and community.</p>
        </article>
      </section>
    </main>
  );
}
