// Kestra-9 için el yapımı vektörel (SVG) görsel varlıklar.
// Dış görsel üretim servisi bu hesapta kredisiz olduğundan tüm GUI sanatı
// burada, ölçeklenebilir ve ağdan bağımsız SVG olarak üretiliyor.

import { makeRng, pick, hashString } from './util.js';

export function badgeLogoSVG(accent = '#ffb454') {
  return `
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="94" fill="#0e1a1c" stroke="${accent}" stroke-width="4"/>
    <circle cx="100" cy="100" r="80" fill="none" stroke="${accent}" stroke-width="2" opacity="0.55"/>
    <circle cx="100" cy="100" r="66" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.35"/>
    ${Array.from({ length: 16 }).map((_, i) => {
      const a = (i / 16) * Math.PI * 2;
      const x1 = 100 + Math.cos(a) * 88, y1 = 100 + Math.sin(a) * 88;
      const x2 = 100 + Math.cos(a) * 94, y2 = 100 + Math.sin(a) * 94;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${accent}" stroke-width="2"/>`;
    }).join('')}
    <path d="M100 44 L100 100 L142 122" stroke="${accent}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85"/>
    <circle cx="100" cy="100" r="6" fill="${accent}"/>
    <text x="100" y="152" text-anchor="middle" font-family="'Courier New',monospace" font-weight="700" font-size="34" fill="${accent}">9</text>
    <text x="100" y="66" text-anchor="middle" font-family="'Courier New',monospace" font-size="11" letter-spacing="3" fill="${accent}" opacity="0.8">KESTRA</text>
  </svg>`;
}

export function boothBackgroundSVG() {
  return `
    <rect x="0" y="0" width="400" height="220" fill="#111d1f"/>
    <rect x="0" y="0" width="400" height="140" fill="#16262a"/>
    <path d="M0 140 L400 140 L400 150 L0 150 Z" fill="#0a1416"/>
    ${Array.from({ length: 9 }).map((_, i) => `<rect x="${i * 46}" y="0" width="2" height="140" fill="#0a1416" opacity="0.6"/>`).join('')}
    <path d="M40 10 Q200 -18 360 10 L360 118 Q200 138 40 118 Z" fill="#0c2b2c" stroke="#3fb7ab" stroke-width="2" opacity="0.9"/>
    <path d="M40 10 Q200 -18 360 10 L360 30 Q200 4 40 30 Z" fill="#4fd7c9" opacity="0.10"/>
    ${Array.from({ length: 5 }).map((_, i) => `<circle cx="${70 + i * 65}" cy="8" r="3" fill="#3fb7ab"/>`).join('')}
    <rect x="6" y="150" width="388" height="16" fill="#caa227"/>
    ${Array.from({ length: 22 }).map((_, i) => `<rect x="${6 + i * 18}" y="150" width="9" height="16" fill="#1a1a16" transform="skewX(-20)"/>`).join('')}
    <rect x="0" y="166" width="400" height="54" fill="#1b2b2e"/>
    <rect x="16" y="176" width="70" height="34" rx="3" fill="#0a1416" stroke="#3fb7ab" stroke-width="1.5"/>
    <text x="51" y="197" text-anchor="middle" font-family="'Courier New',monospace" font-size="10" fill="#3fb7ab">K-9</text>
    <circle cx="360" cy="30" r="10" fill="#ffb454" opacity="0.9"/>
    <circle cx="360" cy="30" r="18" fill="#ffb454" opacity="0.18"/>
  `;
}

const SPECIES_LABELS = {
  insan: 'İnsan',
  surungen: 'Sürüngen',
  zarif: 'Zarif',
  tuylu: 'Tüylü',
  android: 'Sentetik',
};
export { SPECIES_LABELS };
export const SPECIES_LIST = Object.keys(SPECIES_LABELS);

function backdrop() {
  return `<rect width="160" height="160" fill="#aab8ba"/><rect width="160" height="160" fill="#e7edee" opacity="0.35"/>
  <rect x="0" y="128" width="160" height="32" fill="#8b9a9c"/>`;
}

export function portraitSVG(species, seed) {
  const rng = makeRng(hashString(species + ':' + seed));
  let body = '';
  switch (species) {
    case 'insan': {
      const skin = pick(rng, ['#e8b98c', '#c68a5f', '#8a5a3a', '#f2d3b3', '#6b4128']);
      const hair = pick(rng, ['#241d1a', '#5a3a22', '#161616', '#8a6b3f', '#cfcfcf', null]);
      const eye = pick(rng, ['#2f2318', '#254a3c', '#1c2c4a']);
      body = `
        <path d="M40 160 Q80 118 120 160 Z" fill="#33424a"/>
        <rect x="70" y="96" width="20" height="26" fill="${skin}"/>
        <ellipse cx="80" cy="72" rx="30" ry="34" fill="${skin}"/>
        ${hair ? `<path d="M50 58 Q80 24 110 58 Q112 40 80 34 Q48 40 50 58 Z" fill="${hair}"/>` : ''}
        <ellipse cx="68" cy="74" rx="4.2" ry="5.4" fill="${eye}"/>
        <ellipse cx="92" cy="74" rx="4.2" ry="5.4" fill="${eye}"/>
        <path d="M74 92 Q80 96 86 92" stroke="#5a3a2e" stroke-width="2" fill="none" stroke-linecap="round"/>
      `;
      break;
    }
    case 'surungen': {
      const skin = pick(rng, ['#5f8f4f', '#7fae4a', '#8f9f3f', '#4f7f6f', '#6f9f8f']);
      const eyeColor = pick(rng, ['#e8d13f', '#e8862f', '#cfe83f']);
      body = `
        <path d="M42 160 Q80 122 118 160 Z" fill="#33424a"/>
        <rect x="72" y="98" width="16" height="24" fill="${skin}"/>
        <ellipse cx="80" cy="70" rx="28" ry="32" fill="${skin}"/>
        <path d="M56 46 L48 30 L62 42 Z" fill="${skin}"/>
        <path d="M104 46 L112 30 L98 42 Z" fill="${skin}"/>
        ${Array.from({ length: 10 }).map(() => {
          const x = 58 + rng() * 44, y = 54 + rng() * 34;
          return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3" ry="2" fill="#00000022"/>`;
        }).join('')}
        <ellipse cx="67" cy="70" rx="6" ry="6.4" fill="${eyeColor}"/>
        <ellipse cx="93" cy="70" rx="6" ry="6.4" fill="${eyeColor}"/>
        <rect x="65.5" y="66" width="3" height="9" fill="#161616"/>
        <rect x="91.5" y="66" width="3" height="9" fill="#161616"/>
        <path d="M70 90 Q80 94 90 90" stroke="#2f3f28" stroke-width="2" fill="none" stroke-linecap="round"/>
      `;
      break;
    }
    case 'zarif': {
      const skin = pick(rng, ['#c9d6d9', '#b9c9d1', '#d9d0c9', '#c3d9cf']);
      body = `
        <path d="M46 160 Q80 128 114 160 Z" fill="#33424a"/>
        <rect x="74" y="102" width="12" height="20" fill="${skin}"/>
        <ellipse cx="80" cy="66" rx="24" ry="38" fill="${skin}"/>
        <ellipse cx="66" cy="66" rx="9" ry="12" fill="#141414"/>
        <ellipse cx="94" cy="66" rx="9" ry="12" fill="#141414"/>
        <ellipse cx="63" cy="62" rx="3" ry="4" fill="#ffffff" opacity="0.5"/>
        <ellipse cx="91" cy="62" rx="3" ry="4" fill="#ffffff" opacity="0.5"/>
        <path d="M76 92 Q80 94 84 92" stroke="#6f7f7f" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      `;
      break;
    }
    case 'tuylu': {
      const fur = pick(rng, ['#8a6f4f', '#5f4f3f', '#a98f6f', '#3f3f3f', '#c9b38f']);
      const eye = pick(rng, ['#2f2318', '#4a3a1c']);
      body = `
        <path d="M40 160 Q80 120 120 160 Z" fill="#33424a"/>
        <rect x="70" y="98" width="20" height="24" fill="${fur}"/>
        <ellipse cx="80" cy="70" rx="30" ry="32" fill="${fur}"/>
        <path d="M54 44 L44 22 L64 40 Z" fill="${fur}"/>
        <path d="M106 44 L116 22 L96 40 Z" fill="${fur}"/>
        ${Array.from({ length: 14 }).map(() => {
          const a = rng() * Math.PI * 2, r = 30 + rng() * 3;
          const x = 80 + Math.cos(a) * r, y = 70 + Math.sin(a) * r;
          const x2 = 80 + Math.cos(a) * (r + 6), y2 = 70 + Math.sin(a) * (r + 6);
          return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${fur}" stroke-width="2"/>`;
        }).join('')}
        <ellipse cx="68" cy="70" rx="4.5" ry="5" fill="${eye}"/>
        <ellipse cx="92" cy="70" rx="4.5" ry="5" fill="${eye}"/>
        <ellipse cx="80" cy="88" rx="9" ry="7" fill="${fur}" stroke="#00000030"/>
        <ellipse cx="80" cy="86" rx="2.6" ry="2" fill="#241c14"/>
      `;
      break;
    }
    case 'android':
    default: {
      const plate = pick(rng, ['#9fb3bf', '#b0b0b0', '#7f97a3', '#c7c2b8']);
      const visor = pick(rng, ['#5fd3ff', '#ff5f5f', '#7dff8a', '#ffd35f']);
      body = `
        <path d="M42 160 Q80 124 118 160 Z" fill="#33424a"/>
        <rect x="70" y="100" width="20" height="22" fill="${plate}"/>
        <rect x="52" y="38" width="56" height="64" rx="14" fill="${plate}"/>
        <rect x="52" y="66" width="56" height="3" fill="#00000022"/>
        <rect x="58" y="68" width="44" height="12" rx="4" fill="#0e1a1c"/>
        <rect x="60" y="71" width="40" height="6" rx="2" fill="${visor}"/>
        <rect x="78" y="30" width="4" height="10" fill="${plate}"/>
        <circle cx="80" cy="28" r="4" fill="${visor}"/>
      `;
      break;
    }
  }
  return `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">${backdrop()}${body}</svg>`;
}

export function cargoCrateSVG(scanned = false) {
  const glow = scanned ? '<rect x="4" y="4" width="152" height="118" fill="#4fd7c9" opacity="0.12"/>' : '';
  return `<svg viewBox="0 0 160 130" xmlns="http://www.w3.org/2000/svg">
    ${glow}
    <path d="M20 46 L80 20 L140 46 L140 100 L80 118 L20 100 Z" fill="#8a6a3f" stroke="#4a3a20" stroke-width="2"/>
    <path d="M20 46 L80 66 L140 46" fill="none" stroke="#4a3a20" stroke-width="2"/>
    <path d="M80 66 L80 118" stroke="#4a3a20" stroke-width="2"/>
    <path d="M40 55 L40 92" stroke="#4a3a20" stroke-width="1.5" opacity="0.6"/>
    <path d="M120 55 L120 92" stroke="#4a3a20" stroke-width="1.5" opacity="0.6"/>
    <polygon points="55,80 65,80 60,68" fill="#e8b93f" stroke="#4a3a20" stroke-width="1"/>
    <text x="60" y="90" font-family="'Courier New',monospace" font-size="9" fill="#4a3a20">!</text>
    ${scanned ? '<path d="M20 46 L140 46" stroke="#4fd7c9" stroke-width="2" opacity="0.9"/>' : ''}
  </svg>`;
}

export function stampMarkSVG(kind) {
  const cfg = {
    approved: { color: '#3fd18f', label: 'ONAYLANDI' },
    denied: { color: '#e0503c', label: 'REDDEDİLDİ' },
    detained: { color: '#e0503c', label: 'GÖZALTI' },
  }[kind] || { color: '#3fd18f', label: '' };
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="88" fill="none" stroke="${cfg.color}" stroke-width="8"/>
    <circle cx="100" cy="100" r="72" fill="none" stroke="${cfg.color}" stroke-width="3"/>
    <text x="100" y="94" text-anchor="middle" font-family="'Courier New',monospace" font-weight="700" font-size="22" fill="${cfg.color}">${cfg.label}</text>
    <text x="100" y="122" text-anchor="middle" font-family="'Courier New',monospace" font-size="12" fill="${cfg.color}">KESTRA-9</text>
  </svg>`;
}

export function docIconSVG(kind) {
  const icons = {
    id: `<rect x="20" y="30" width="60" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="34" cy="46" r="6" fill="currentColor"/><line x1="46" y1="42" x2="70" y2="42" stroke="currentColor" stroke-width="3"/><line x1="46" y1="52" x2="70" y2="52" stroke="currentColor" stroke-width="3"/>`,
    permit: `<rect x="22" y="18" width="56" height="64" rx="3" fill="none" stroke="currentColor" stroke-width="4"/><line x1="30" y1="32" x2="70" y2="32" stroke="currentColor" stroke-width="3"/><line x1="30" y1="44" x2="70" y2="44" stroke="currentColor" stroke-width="3"/><line x1="30" y1="56" x2="58" y2="56" stroke="currentColor" stroke-width="3"/><circle cx="65" cy="68" r="9" fill="none" stroke="currentColor" stroke-width="3"/>`,
    cargo: `<polygon points="18,36 50,22 82,36 82,66 50,80 18,66" fill="none" stroke="currentColor" stroke-width="4"/><line x1="18" y1="36" x2="50" y2="50" stroke="currentColor" stroke-width="4"/><line x1="82" y1="36" x2="50" y2="50" stroke="currentColor" stroke-width="4"/><line x1="50" y1="50" x2="50" y2="80" stroke="currentColor" stroke-width="4"/>`,
    health: `<rect x="18" y="20" width="64" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><line x1="50" y1="34" x2="50" y2="66" stroke="currentColor" stroke-width="6"/><line x1="34" y1="50" x2="66" y2="50" stroke="currentColor" stroke-width="6"/>`,
    wanted: `<circle cx="50" cy="42" r="18" fill="none" stroke="currentColor" stroke-width="4"/><path d="M28 82 Q50 60 72 82" fill="none" stroke="currentColor" stroke-width="4"/><line x1="20" y1="20" x2="80" y2="80" stroke="currentColor" stroke-width="3" opacity="0.7"/>`,
  };
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${icons[kind] || icons.id}</svg>`;
}
