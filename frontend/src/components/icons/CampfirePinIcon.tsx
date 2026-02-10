"use client";

import { useId } from "react";
import L from "leaflet";

/**
 * Походный костёр — пин для карты.
 * Кольцо камней, дрова «шалашиком», пламя.
 */
const VIEWBOX = 36;
const DEFAULT_SIZE = 32;

// --- HTML string builder for L.divIcon (same design as React component) ---

const STONE_SIZE_VARIATIONS = [0.85, 1.0, 0.9, 1.1, 0.95, 1.05, 0.88, 1.08, 0.92, 1.02, 0.87, 1.03];

function buildStoneRingSvg(): string {
  const centerX = 18;
  const centerY = 24;
  const radius = 9;
  const parts: string[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius * 0.6;
    const sizeVariation = STONE_SIZE_VARIATIONS[i];
    const rx = 2.5 * sizeVariation;
    const ry = 2.0 * sizeVariation;
    const rotation = (angle * 180) / Math.PI;
    parts.push(
      `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rotation} ${x} ${y})" fill="#4a3f35" stroke="#3d2812" stroke-width="0.6"/>`
    );
  }
  return parts.join("");
}

function buildLogsSvg(): string {
  return (
    '<g stroke="#3d2812" stroke-width="0.7" stroke-linecap="round">' +
    '<path d="M12 24 L18 14 L20 24" fill="#5D3A1A"/>' +
    '<path d="M18 24 L18 12 L20 22" fill="#6B4423"/>' +
    '<path d="M24 24 L18 14 L16 24" fill="#5D3A1A"/>' +
    "</g>"
  );
}

function buildFlameActiveSvg(gradientId: string): string {
  return (
    `<g class="campfire-flame">` +
    `<defs><linearGradient id="${gradientId}" x1="0%" y1="100%" x2="0%" y2="0%">` +
    `<stop offset="0%" style="stop-color:#B22222"/>` +
    `<stop offset="30%" style="stop-color:#CC4400"/>` +
    `<stop offset="55%" style="stop-color:#FF6600"/>` +
    `<stop offset="80%" style="stop-color:#FF8C00"/>` +
    `<stop offset="100%" style="stop-color:#FFB347;stop-opacity:1"/></linearGradient></defs>` +
    `<path d="M13 24 Q12 20 12 16 Q12 12 13 8 Q13 4 14 6 Q13 10 13 16 Q13 20 13 24 Z" fill="url(#${gradientId})" stroke="#CC6600" stroke-width="0.3" stroke-linejoin="round"/>` +
    `<path d="M15 24 Q14 20 15 15 Q15 10 16 6 Q16 3 17 5 Q16 9 16 14 Q15 19 15 24 Z" fill="url(#${gradientId})" stroke="#CC6600" stroke-width="0.3" stroke-linejoin="round"/>` +
    `<path d="M17 24 Q16 19 17 14 Q17 9 18 5 Q18 2 19 4 Q18 8 18 13 Q17 18 17 24 Z" fill="url(#${gradientId})" stroke="#CC6600" stroke-width="0.3" stroke-linejoin="round"/>` +
    `<path d="M19 24 Q20 20 19 15 Q19 10 20 6 Q20 3 21 5 Q20 9 20 14 Q19 19 19 24 Z" fill="url(#${gradientId})" stroke="#CC6600" stroke-width="0.3" stroke-linejoin="round"/>` +
    `<path d="M21 24 Q22 20 22 16 Q22 12 21 8 Q21 4 20 6 Q21 10 21 16 Q21 20 21 24 Z" fill="url(#${gradientId})" stroke="#CC6600" stroke-width="0.3" stroke-linejoin="round"/>` +
    `<path d="M15 22 Q15 17 16 12 Q16 8 17 6 Q17 4 17 7 Q16 11 16 16 Q15 20 15 22 Z" fill="#FF8C00" opacity="1"/>` +
    `<path d="M17 22 Q17 17 18 12 Q18 8 18 5 Q18 3 19 5 Q18 9 18 14 Q17 19 17 22 Z" fill="#FF9933" opacity="1"/>` +
    `<path d="M19 22 Q19 17 20 12 Q20 8 19 6 Q19 4 19 7 Q20 11 20 16 Q19 20 19 22 Z" fill="#FF8C00" opacity="1"/>` +
    `<path d="M14 24 Q13 21 13 18 Q13 15 14 13 Q14 11 14 14 Q14 17 14 20 Q14 22 14 24 Z" fill="#FF6600" opacity="0.95"/>` +
    `<path d="M20 24 Q21 21 21 18 Q21 15 20 13 Q20 11 20 14 Q20 17 20 20 Q20 22 20 24 Z" fill="#FF6600" opacity="0.95"/>` +
    `</g>`
  );
}

function buildEmbersSvg(): string {
  return (
    '<g class="campfire-embers" fill="#555" opacity="0.9">' +
    '<circle cx="14" cy="18" r="1"/>' +
    '<circle cx="18" cy="16" r="1.2"/>' +
    '<circle cx="22" cy="18" r="0.9"/>' +
    "</g>"
  );
}

function buildCampfirePinHtml(active: boolean, size: number): string {
  const gradientId = `campfire-pin-flame-${size}-${active}-${Math.random().toString(36).slice(2)}`;
  const stateClass = active ? "active" : "extinguished";
  const svg =
    `<svg width="${size}" height="${size}" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" fill="none" xmlns="http://www.w3.org/2000/svg">` +
    buildStoneRingSvg() +
    buildLogsSvg() +
    (active ? buildFlameActiveSvg(gradientId) : buildEmbersSvg()) +
    "</svg>";
  const smoke = active
    ? ""
    : [
        '<div class="smoke-particle" style="left:28%;bottom:42%;animation-delay:0s"></div>',
        '<div class="smoke-particle" style="left:48%;bottom:38%;animation-delay:0.6s"></div>',
        '<div class="smoke-particle" style="left:68%;bottom:42%;animation-delay:1.2s"></div>',
      ].join("");
  return `<div class="campfire-marker campfire-pin ${stateClass}" style="width:${size}px;height:${size}px">${svg}${smoke}</div>`;
}

export function getCampfirePinDivIcon(options?: { active?: boolean; size?: number }): L.DivIcon {
  const active = options?.active ?? true;
  const size = options?.size ?? DEFAULT_SIZE;
  const html = buildCampfirePinHtml(active, size);
  return L.divIcon({
    className: "campfire-marker-wrapper",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

export type CampfirePinVariant = "default";

function StoneRing() {
  // Центр костра
  const centerX = 18;
  const centerY = 24;
  const radius = 9;
  
  // Предопределённые вариации размеров для каждого камня (для стабильности)
  const sizeVariations = [0.85, 1.0, 0.9, 1.1, 0.95, 1.05, 0.88, 1.08, 0.92, 1.02, 0.87, 1.03];
  
  // Создаём кольцо из 12 камней вокруг пламени
  const stones = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius * 0.6; // Немного сплющенный эллипс
    
    // Разные размеры камней для естественности
    const sizeVariation = sizeVariations[i];
    const rx = 2.5 * sizeVariation;
    const ry = 2.0 * sizeVariation;
    
    // Поворот камня по углу
    const rotation = (angle * 180) / Math.PI;
    
    stones.push(
      <ellipse
        key={i}
        cx={x}
        cy={y}
        rx={rx}
        ry={ry}
        transform={`rotate(${rotation} ${x} ${y})`}
        fill="#4a3f35"
        stroke="#3d2812"
        strokeWidth="0.6"
      />
    );
  }
  
  return <g>{stones}</g>;
}

function Logs() {
  return (
    <g stroke="#3d2812" strokeWidth="0.7" strokeLinecap="round">
      <path d="M12 24 L18 14 L20 24" fill="#5D3A1A" />
      <path d="M18 24 L18 12 L20 22" fill="#6B4423" />
      <path d="M24 24 L18 14 L16 24" fill="#5D3A1A" />
    </g>
  );
}

function FlameActive({ gradientId }: { gradientId: string }) {
  return (
    <g className="campfire-flame">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#B22222" />
          <stop offset="30%" stopColor="#CC4400" />
          <stop offset="55%" stopColor="#FF6600" />
          <stop offset="80%" stopColor="#FF8C00" />
          <stop offset="100%" stopColor="#FFB347" stopOpacity={1} />
        </linearGradient>
      </defs>
      {/* Левый язычок пламени — широкий внизу, сужается вверх, отклоняется влево */}
      <path
        d="M13 24 Q12 20 12 16 Q12 12 13 8 Q13 4 14 6 Q13 10 13 16 Q13 20 13 24 Z"
        fill={`url(#${gradientId})`}
        stroke="#CC6600"
        strokeWidth="0.3"
        strokeLinejoin="round"
      />
      {/* Центрально-левый язычок */}
      <path
        d="M15 24 Q14 20 15 15 Q15 10 16 6 Q16 3 17 5 Q16 9 16 14 Q15 19 15 24 Z"
        fill={`url(#${gradientId})`}
        stroke="#CC6600"
        strokeWidth="0.3"
        strokeLinejoin="round"
      />
      {/* Центральный язычок (самый высокий) */}
      <path
        d="M17 24 Q16 19 17 14 Q17 9 18 5 Q18 2 19 4 Q18 8 18 13 Q17 18 17 24 Z"
        fill={`url(#${gradientId})`}
        stroke="#CC6600"
        strokeWidth="0.3"
        strokeLinejoin="round"
      />
      {/* Центрально-правый язычок */}
      <path
        d="M19 24 Q20 20 19 15 Q19 10 20 6 Q20 3 21 5 Q20 9 20 14 Q19 19 19 24 Z"
        fill={`url(#${gradientId})`}
        stroke="#CC6600"
        strokeWidth="0.3"
        strokeLinejoin="round"
      />
      {/* Правый язычок — широкий внизу, сужается вверх, отклоняется вправо */}
      <path
        d="M21 24 Q22 20 22 16 Q22 12 21 8 Q21 4 20 6 Q21 10 21 16 Q21 20 21 24 Z"
        fill={`url(#${gradientId})`}
        stroke="#CC6600"
        strokeWidth="0.3"
        strokeLinejoin="round"
      />
      {/* Внутренние язычки для объёма и яркости */}
      <path
        d="M15 22 Q15 17 16 12 Q16 8 17 6 Q17 4 17 7 Q16 11 16 16 Q15 20 15 22 Z"
        fill="#FF8C00"
        opacity={1}
      />
      <path
        d="M17 22 Q17 17 18 12 Q18 8 18 5 Q18 3 19 5 Q18 9 18 14 Q17 19 17 22 Z"
        fill="#FF9933"
        opacity={1}
      />
      <path
        d="M19 22 Q19 17 20 12 Q20 8 19 6 Q19 4 19 7 Q20 11 20 16 Q19 20 19 22 Z"
        fill="#FF8C00"
        opacity={1}
      />
      {/* Маленькие боковые язычки для реалистичности */}
      <path
        d="M14 24 Q13 21 13 18 Q13 15 14 13 Q14 11 14 14 Q14 17 14 20 Q14 22 14 24 Z"
        fill="#FF6600"
        opacity={0.95}
      />
      <path
        d="M20 24 Q21 21 21 18 Q21 15 20 13 Q20 11 20 14 Q20 17 20 20 Q20 22 20 24 Z"
        fill="#FF6600"
        opacity={0.95}
      />
    </g>
  );
}

function Embers() {
  return (
    <g className="campfire-embers" fill="#555" opacity={0.9}>
      <circle cx="14" cy="18" r="1" />
      <circle cx="18" cy="16" r="1.2" />
      <circle cx="22" cy="18" r="0.9" />
    </g>
  );
}

type CampfirePinIconProps = {
  active?: boolean;
  size?: number;
  variant?: CampfirePinVariant;
};

export default function CampfirePinIcon({
  active = true,
  size = DEFAULT_SIZE,
  variant = "default",
}: CampfirePinIconProps) {
  const id = useId();
  const gradientId = `campfire-pin-flame-${id.replace(/:/g, "")}`;
  const stateClass = active ? "active" : "extinguished";
  return (
    <div
      className={`campfire-marker campfire-pin ${stateClass}`}
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-block",
      }}
      data-variant={variant}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <StoneRing />
        <Logs />
        {active ? <FlameActive gradientId={gradientId} /> : <Embers />}
      </svg>
      {!active && (
        <>
          <div
            className="smoke-particle"
            style={{ left: "28%", bottom: "42%", animationDelay: "0s" }}
          />
          <div
            className="smoke-particle"
            style={{ left: "48%", bottom: "38%", animationDelay: "0.6s" }}
          />
          <div
            className="smoke-particle"
            style={{ left: "68%", bottom: "42%", animationDelay: "1.2s" }}
          />
        </>
      )}
    </div>
  );
}
