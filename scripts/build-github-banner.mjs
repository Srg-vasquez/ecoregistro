/**
 * Genera docs/assets/github-social-banner.svg y github-social-preview.svg.
 * Uso interno: npm install --no-save simple-icons && node scripts/build-github-banner.mjs
 */
import { writeFileSync } from "node:fs";
import {
    siDocker,
    siLaravel,
    siPhp,
    siPostgresql,
    siReact,
    siVite,
} from "simple-icons";

const W = 1280;
const H = 640;
const marginX = 88;

const icons = [
    { item: siLaravel, label: "Laravel 13", scale: 1.05 },
    { item: siReact, label: "React 19", scale: 1.05 },
    { item: siPostgresql, label: "PostgreSQL", scale: 0.95 },
    { item: siPhp, label: "PHP 8.4", scale: 0.78 },
    { item: siVite, label: "Vite", scale: 0.92 },
    { item: siDocker, label: "Docker", scale: 0.9 },
];

const cardW = 168;
const cardH = 128;
const rowY = 432;
const rowInnerW = W - marginX * 2;
const cardGap = (rowInnerW - cardW * icons.length) / (icons.length - 1);
const iconBox = 56;
const iconBoxTop = 22;

function stackCard({ item, label, scale }, index) {
    const x = marginX + index * (cardW + cardGap);
    const iconCx = cardW / 2;
    const iconCy = iconBoxTop + iconBox / 2;
    const s = (iconBox / 24) * scale;

    return `
  <g transform="translate(${x.toFixed(2)} ${rowY})">
    <rect width="${cardW}" height="${cardH}" rx="16" fill="#ffffff12" stroke="#ffffff24"/>
    <g transform="translate(${iconCx} ${iconCy})">
      <g transform="scale(${s.toFixed(4)}) translate(-12 -12)">
        <path d="${item.path}" fill="#${item.hex}"/>
      </g>
    </g>
    <text x="${iconCx}" y="110" text-anchor="middle" dominant-baseline="middle" fill="#d8e8dc" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="15" font-weight="600">${label}</text>
  </g>`;
}

const stackMarkup = icons.map(stackCard).join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="EcoRegistro — banner con stack técnico">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1613"/>
      <stop offset="45%" stop-color="#123d35"/>
      <stop offset="100%" stop-color="#1a5c47"/>
    </linearGradient>
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#b8df94"/>
      <stop offset="100%" stop-color="#5dce9a"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1080" cy="560" r="300" fill="#85a176" opacity="0.07"/>
  <circle cx="1140" cy="120" r="200" fill="#b8df94" opacity="0.05"/>
  <path d="M0 520 C 320 470, 520 560, 1280 500 L 1280 640 L 0 640 Z" fill="#ffffff" opacity="0.03"/>

  <g transform="translate(${marginX} 98)">
    <rect x="0" y="0" width="88" height="88" rx="22" fill="#1f4a3b" stroke="#7fc5a4" stroke-opacity="0.5" filter="url(#glow)"/>
    <svg x="0" y="0" width="88" height="88" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M18 42c-2-19 7-26 29-25 0 23-9 31-25 26m0 0 17-17" fill="none" stroke="url(#leaf)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <g transform="translate(104 18)">
      <text x="0" y="36" fill="#f3f7ef" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="52" font-weight="800" letter-spacing="-1.2">EcoRegistro</text>
      <text x="0" y="68" fill="#9db69f" font-family="system-ui,sans-serif" font-size="15.5" font-weight="600" letter-spacing="4.5">GESTIÓN AMBIENTAL</text>
    </g>
  </g>

  <text x="${marginX}" y="268" fill="#eef4ec" font-family="system-ui,sans-serif" font-size="34" font-weight="650">Cierre mensual energético</text>
  <text x="${marginX}" y="314" fill="#b8cfc0" font-family="system-ui,sans-serif" font-size="28" font-weight="500">Revisión · trazabilidad · datos aprobados</text>
  <text x="${marginX}" y="372" fill="#86a193" font-family="system-ui,sans-serif" font-size="17">Caso ficticio VerdeSur Alimentos · demo full-stack</text>
  <text x="${marginX}" y="406" fill="#a6bdb0" font-family="system-ui,sans-serif" font-size="13" font-weight="700" letter-spacing="1.4">STACK</text>
  ${stackMarkup}
</svg>
`;

writeFileSync("docs/assets/github-social-banner.svg", svg);
writeFileSync("docs/assets/github-social-preview.svg", svg);
console.log("Banner SVG generado en docs/assets/");
console.log(
    "PNG: npx @resvg/resvg-js-cli docs/assets/github-social-banner.svg docs/assets/github-social-preview.png --fit-width 1280",
);