"use client";

import L from "leaflet";

const VIEWBOX = 32;

function buildCampfireSvg(active: boolean, size: number, gradientId: string): string {
  const vb = `0 0 ${VIEWBOX} ${VIEWBOX}`;
  // Fire pit base (stones/ring)
  const pit = `<path d="M4 20 Q6 22 16 22 Q26 22 28 20 L28 24 L4 24 Z" fill="#5D3A1A" stroke="#3d2812" stroke-width="0.8"/>`;
  // Logs (2–3 simple shapes)
  const logs =
    `<path d="M8 20 L8 14 L10 14 L10 20" fill="#6B4423" stroke="#4a2f18" stroke-width="0.6"/>` +
    `<path d="M14 20 L14 12 L16 12 L16 20" fill="#5D3A1A" stroke="#3d2812" stroke-width="0.6"/>` +
    `<path d="M20 20 L20 14 L22 14 L22 20" fill="#6B4423" stroke="#4a2f18" stroke-width="0.6"/>`;

  if (active) {
    // Flame: teardrop-style path with golden/orange fill
    const flame =
      `<g class="campfire-flame">` +
      `<defs><linearGradient id="${gradientId}" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" style="stop-color:#FF8C00"/><stop offset="60%" style="stop-color:#FFD700"/><stop offset="100%" style="stop-color:#FFA500;stop-opacity:0.9"/></linearGradient></defs>` +
      `<path d="M16 22 Q12 14 14 8 Q16 4 18 8 Q20 14 16 22 Z" fill="url(#${gradientId})" stroke="#CC6600" stroke-width="0.5" stroke-linejoin="round"/>` +
      `<path d="M16 20 Q14 12 15 10 Q16 8 17 10 Q18 12 16 20 Z" fill="#FFD700" opacity="0.85"/>` +
      `</g>`;
    return `<svg width="${size}" height="${size}" viewBox="${vb}" fill="none" xmlns="http://www.w3.org/2000/svg">${pit}${logs}${flame}</svg>`;
  }

  // Extinguished: same pit + logs, add ember circles (gradientId unused)
  const embers =
    `<g class="campfire-embers">` +
    `<circle cx="12" cy="16" r="1.2" fill="#4a4a4a" opacity="0.9"/>` +
    `<circle cx="16" cy="14" r="1" fill="#3d3d3d" opacity="0.8"/>` +
    `<circle cx="20" cy="16" r="1.1" fill="#555" opacity="0.85"/>` +
    `</g>`;
  return `<svg width="${size}" height="${size}" viewBox="${vb}" fill="none" xmlns="http://www.w3.org/2000/svg">${pit}${logs}${embers}</svg>`;
}

function buildCampfireHtml(active: boolean, size: number): string {
  const gradientId = `flameGrad-${size}-${active}-${Math.random().toString(36).slice(2)}`;
  const stateClass = active ? "active" : "extinguished";
  const svg = buildCampfireSvg(active, size, gradientId);
  const smoke =
    active
      ? ""
      : [
          '<div class="smoke-particle" style="left:30%;bottom:45%;animation-delay:0s"></div>',
          '<div class="smoke-particle" style="left:50%;bottom:40%;animation-delay:0.6s"></div>',
          '<div class="smoke-particle" style="left:65%;bottom:48%;animation-delay:1.2s"></div>',
        ].join("");
  return `<div class="campfire-marker ${stateClass}" style="width:${size}px;height:${size}px">${svg}${smoke}</div>`;
}

export function getCampfireDivIcon(options?: {
  active?: boolean;
  size?: number;
}): L.DivIcon {
  const active = options?.active ?? true;
  const size = options?.size ?? 32;
  const html = buildCampfireHtml(active, size);
  return L.divIcon({
    className: "campfire-marker-wrapper",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

type CampfireIconProps = { active?: boolean; size?: number };

export default function CampfireIcon({ active = true, size = 32 }: CampfireIconProps) {
  const stateClass = active ? "active" : "extinguished";
  return (
    <div
      className={`campfire-marker ${stateClass}`}
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-block",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 20 Q6 22 16 22 Q26 22 28 20 L28 24 L4 24 Z"
          fill="#5D3A1A"
          stroke="#3d2812"
          strokeWidth="0.8"
        />
        <path
          d="M8 20 L8 14 L10 14 L10 20"
          fill="#6B4423"
          stroke="#4a2f18"
          strokeWidth="0.6"
        />
        <path
          d="M14 20 L14 12 L16 12 L16 20"
          fill="#5D3A1A"
          stroke="#3d2812"
          strokeWidth="0.6"
        />
        <path
          d="M20 20 L20 14 L22 14 L22 20"
          fill="#6B4423"
          stroke="#4a2f18"
          strokeWidth="0.6"
        />
        {active ? (
          <g className="campfire-flame">
            <defs>
              <linearGradient id="flameGradReact" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#FF8C00" />
                <stop offset="60%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FFA500" stopOpacity={0.9} />
              </linearGradient>
            </defs>
            <path
              d="M16 22 Q12 14 14 8 Q16 4 18 8 Q20 14 16 22 Z"
              fill="url(#flameGradReact)"
              stroke="#CC6600"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
            <path
              d="M16 20 Q14 12 15 10 Q16 8 17 10 Q18 12 16 20 Z"
              fill="#FFD700"
              opacity={0.85}
            />
          </g>
        ) : (
          <g className="campfire-embers">
            <circle cx="12" cy="16" r="1.2" fill="#4a4a4a" opacity="0.9" />
            <circle cx="16" cy="14" r="1" fill="#3d3d3d" opacity="0.8" />
            <circle cx="20" cy="16" r="1.1" fill="#555" opacity="0.85" />
          </g>
        )}
      </svg>
      {!active && (
        <>
          <div
            className="smoke-particle"
            style={{ left: "30%", bottom: "45%", animationDelay: "0s" }}
          />
          <div
            className="smoke-particle"
            style={{ left: "50%", bottom: "40%", animationDelay: "0.6s" }}
          />
          <div
            className="smoke-particle"
            style={{ left: "65%", bottom: "48%", animationDelay: "1.2s" }}
          />
        </>
      )}
    </div>
  );
}
