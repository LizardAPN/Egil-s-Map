import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Map | Imprint",
  description: "Your memory map — web experience in progress."
};

export default function MapPage() {
  return (
    <main className="imprint-shell imprint-map-route">
      <div className="imprint-copy imprint-map-panel">
        <div className="imprint-badge">Web</div>
        <h1>Memory map</h1>
        <p className="imprint-lead">The interactive map UI is shipping here next.</p>
        <p className="imprint-subcopy">
          Right now Imprint&apos;s map flows live in the mobile app. This page confirms navigation
          from the landing CTA works — the full Mapbox-powered map will plug in here as the web app
          grows.
        </p>
        <div className="imprint-actions">
          <Link className="imprint-primary" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
