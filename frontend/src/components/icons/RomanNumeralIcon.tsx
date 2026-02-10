"use client";

import L from "leaflet";

const ROMAN: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRoman(n: number): string {
  if (n < 1 || n > 39) return String(n);
  let s = "";
  let x = n;
  for (const [val, sym] of ROMAN) {
    while (x >= val) {
      s += sym;
      x -= val;
    }
  }
  return s;
}

export function getRomanNumeralDivIcon(roman: string, size = 28): L.DivIcon {
  const html = `
    <div class="roman-numeral-marker" style="
      width:${size}px;height:${size}px;
      border-radius:50%;
      background:rgba(139,69,19,0.95);
      border:1.5px solid #5D3A1A;
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:'Cinzel',serif;
      font-weight:700;
      font-size:${size * 0.5}px;
      color:#e2d1b0;
      box-shadow:0 1px 3px rgba(0,0,0,0.4);
    ">${roman}</div>
  `;
  return L.divIcon({
    className: "roman-numeral-marker-wrapper",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
