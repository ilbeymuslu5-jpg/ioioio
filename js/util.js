// Küçük yardımcı fonksiyonlar: sözde-rastgelelik, seçim, tarih biçimleme.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seedInput) {
  const seed = typeof seedInput === 'number' ? seedInput : hashString(String(seedInput));
  return mulberry32(seed);
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function pickWeighted(rng, entries) {
  // entries: [{v, w}]
  const total = entries.reduce((s, e) => s + e.w, 0);
  let r = rng() * total;
  for (const e of entries) {
    if (r < e.w) return e.v;
    r -= e.w;
  }
  return entries[entries.length - 1].v;
}

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// İstasyon takvimi: gün sayısını "3413.Gün" biçimine çevirir.
export function stationDate(dayOffset) {
  return `3413.${dayOffset}`;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
