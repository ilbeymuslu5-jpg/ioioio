// Yolcu ve belge üreticisi: her gün için kurallara uygun / uygunsuz yolcular üretir.

import { makeRng, pick, pickWeighted, randInt, shuffle, uid } from './util.js';
import { SYSTEMS, NAME_POOLS, PURPOSE_LABELS, CARGO_ITEMS, CONTRABAND_BY_DAY } from './data.js';
import { SPECIES_LIST, SPECIES_LABELS } from './art.js';

export const DOC_META = {
  id: { title: 'Kimlik Kartı', icon: 'id' },
  permit_transit: { title: 'Transit İzni', icon: 'permit' },
  permit_visitor: { title: 'Ziyaretçi İzni', icon: 'permit' },
  permit_worker: { title: 'Çalışma İzni', icon: 'permit' },
  permit_refugee: { title: 'Sığınma Belgesi', icon: 'permit' },
  permit_diplomat: { title: 'Diplomatik Kart', icon: 'permit' },
  permit_trader: { title: 'Taşıma İzni', icon: 'permit' },
  health: { title: 'Sağlık Sertifikası', icon: 'health' },
};

export function dayNumberFor(dayIndex1based) {
  return 20 + dayIndex1based * 10;
}

function randomName(rng, species) {
  if (species === 'insan') {
    const p = NAME_POOLS.insan;
    return `${pick(rng, p.first)} ${pick(rng, p.last)}`;
  }
  return pick(rng, NAME_POOLS[species].full);
}

function mutateName(rng, name, species) {
  if (species === 'insan' && name.includes(' ')) {
    const [first] = name.split(' ');
    const newLast = pick(rng, NAME_POOLS.insan.last);
    return `${first} ${newLast}`;
  }
  const chars = name.split('');
  const i = randInt(rng, 0, chars.length - 1);
  const alts = 'AEIOUZKV'.split('');
  chars[i] = pick(rng, alts);
  return chars.join('');
}

function randomIdNo(rng) {
  return `K9-${randInt(rng, 10000, 99999)}`;
}

function mutateIdNo(rng, id) {
  const digits = id.split('');
  const idx = digits.length - 1 - randInt(rng, 0, 2);
  if (idx < 0 || !/\d/.test(digits[idx])) return id.slice(0, -1) + '7';
  digits[idx] = String((parseInt(digits[idx], 10) + 1) % 10);
  return digits.join('');
}

const COMPANIES = ['Doruk Maden A.Ş.', 'Kaldera Lojistik', 'Sirenka Tersanesi', 'Onur Enerji Kolektifi', 'Talus Rafineri'];
const VISIT_REASONS = ['Aile Ziyareti', 'Ticaret Görüşmesi', 'Turizm', 'Tıbbi Tedavi'];
const TITLES = ['Elçi', 'Ataşe', 'Konsolos'];
const SPEECH_LINES = {
  transit: ['Sadece geçiyorum, memur bey.', 'Bağlantı uçuşum var, acelem var.'],
  visitor: ['Kız kardeşimi görmeye geldim.', 'İlk kez Kestra-9\'a geliyorum.'],
  worker: ['Vardiya başlamadan içeri girmem lazım.', 'Sözleşmem üç aylık.'],
  refugee: ['Lütfen... başka gidecek yerim yok.', 'Sistemim artık güvenli değil.'],
  diplomat: ['Protokolü biliyorsunuz sanırım.', 'Beni bekletmeyin lütfen.'],
  trader: ['Kargo tam beyan edildiği gibi.', 'Yükü hemen boşaltmam gerekiyor.'],
};

function requiredDocsFor(purpose) {
  const docs = ['id'];
  if (purpose === 'transit') docs.push('permit_transit');
  if (purpose === 'visitor') docs.push('permit_visitor');
  if (purpose === 'worker') docs.push('permit_worker');
  if (purpose === 'refugee') docs.push('permit_refugee');
  if (purpose === 'diplomat') docs.push('permit_diplomat');
  if (purpose === 'trader') docs.push('permit_trader');
  return docs;
}

function buildDoc(type, ctx) {
  const meta = DOC_META[type];
  let fields = {};
  switch (type) {
    case 'id':
      fields = {
        'Ad Soyad': ctx.name,
        'Tür': SPECIES_LABELS[ctx.declaredSpecies],
        'Doğum Tarihi': ctx.dob,
        'Kimlik No': ctx.idNo,
        'Menzil Sistemi': ctx.homeSystem,
      };
      break;
    case 'permit_transit':
    case 'permit_trader':
      fields = {
        'Ad Soyad': ctx.permitName,
        'Kimlik No': ctx.permitIdNo,
        'Varış Noktası': 'Kestra-9',
        'Geçerlilik Tarihi': `3413.${ctx.expiry}`,
      };
      break;
    case 'permit_visitor':
      fields = {
        'Ad Soyad': ctx.permitName,
        'Kimlik No': ctx.permitIdNo,
        'Ziyaret Amacı': ctx.visitReason,
        'Geçerlilik Tarihi': `3413.${ctx.expiry}`,
      };
      break;
    case 'permit_worker':
      fields = {
        'Ad Soyad': ctx.permitName,
        'Kimlik No': ctx.permitIdNo,
        'Sponsor Firma': ctx.company,
        'Geçerlilik Tarihi': `3413.${ctx.expiry}`,
      };
      break;
    case 'permit_refugee':
      fields = {
        'Ad Soyad': ctx.permitName,
        'Kimlik No': ctx.permitIdNo,
        'Çıkış Sistemi': ctx.homeSystem,
        'Başvuru Durumu': ctx.refugeeStatus,
      };
      break;
    case 'permit_diplomat':
      fields = {
        'Ad Soyad': ctx.permitName,
        'Unvan': ctx.title,
        'Kimlik No': ctx.permitIdNo,
      };
      break;
    case 'health':
      fields = {
        'Ad Soyad': ctx.permitName,
        'Aşı Durumu': ctx.healthStatus,
        'Geçerlilik Tarihi': `3413.${ctx.expiry}`,
      };
      break;
    default:
      break;
  }
  return { type, title: meta.title, icon: meta.icon, fields };
}

function pickPurpose(rng, dayConfig) {
  const weights = dayConfig.allowedPurposes.map((p) => {
    if (p === 'diplomat') return { v: p, w: 1 };
    if (p === 'trader') return { v: p, w: dayConfig.cargoEnabled ? 3 : 0 };
    if (p === 'refugee') return { v: p, w: 2.5 };
    return { v: p, w: 4 };
  }).filter((e) => e.w > 0);
  return pickWeighted(rng, weights);
}

function baseTraveler(rng, dayConfig, dayIndex) {
  const species = pick(rng, SPECIES_LIST);
  const name = randomName(rng, species);
  const purpose = pickPurpose(rng, dayConfig);
  const idNo = randomIdNo(rng);
  const homeSystem = pick(rng, SYSTEMS.filter((s) => s !== 'Kestra'));
  const dayNum = dayNumberFor(dayIndex);
  const expiry = dayNum + randInt(rng, 3, 25);

  const ctx = {
    name,
    permitName: name,
    idNo,
    permitIdNo: idNo,
    declaredSpecies: species,
    homeSystem,
    dob: `33${randInt(rng, 50, 99)}.${randInt(rng, 1, 9)}`,
    expiry,
    company: pick(rng, COMPANIES),
    visitReason: pick(rng, VISIT_REASONS),
    title: pick(rng, TITLES),
    refugeeStatus: dayConfig.refugeePolicy === 'deny_pending' ? pick(rng, ['Onaylı', 'Beklemede', 'Beklemede']) : 'Onaylı',
    healthStatus: 'Tamam',
  };

  const docTypes = requiredDocsFor(purpose);
  if (dayConfig.healthCertRequired) docTypes.push('health');

  const documents = docTypes.map((t) => buildDoc(t, ctx));

  let cargo = null;
  if (purpose === 'trader' && dayConfig.cargoEnabled) {
    const items = shuffle(rng, CARGO_ITEMS).slice(0, randInt(rng, 3, 5));
    cargo = { declared: items, actual: items.slice() };
  }

  return {
    id: uid(),
    seed: uid(),
    species,
    name,
    purpose,
    purposeLabel: PURPOSE_LABELS[purpose],
    speech: pick(rng, SPEECH_LINES[purpose] || ['...']),
    documents,
    cargo,
    correctAction: 'approve',
    flaw: null,
    flawNote: '',
    special: null,
  };
}

const FLAW_APPLIERS = {
  expired_permit(t, rng, dayConfig, dayIndex) {
    const permitDoc = t.documents.find((d) => d.type !== 'id' && 'Geçerlilik Tarihi' in d.fields);
    if (!permitDoc) return false;
    const dayNum = dayNumberFor(dayIndex);
    permitDoc.fields['Geçerlilik Tarihi'] = `3413.${dayNum - randInt(rng, 1, 15)}`;
    t.flawNote = `${permitDoc.title} üzerindeki geçerlilik tarihi dolmuş.`;
    return true;
  },
  name_mismatch(t, rng) {
    const permitDoc = t.documents.find((d) => d.type !== 'id' && 'Ad Soyad' in d.fields);
    if (!permitDoc) return false;
    permitDoc.fields['Ad Soyad'] = mutateName(rng, t.name, t.species);
    t.flawNote = `${permitDoc.title} üzerindeki isim, kimlik kartıyla uyuşmuyor.`;
    return true;
  },
  id_mismatch(t, rng) {
    const permitDoc = t.documents.find((d) => d.type !== 'id' && 'Kimlik No' in d.fields);
    if (!permitDoc) return false;
    permitDoc.fields['Kimlik No'] = mutateIdNo(rng, permitDoc.fields['Kimlik No']);
    t.flawNote = `${permitDoc.title} üzerindeki kimlik numarası, kimlik kartıyla uyuşmuyor.`;
    return true;
  },
  banned_system(t, rng, dayConfig) {
    const idDoc = t.documents.find((d) => d.type === 'id');
    if (!idDoc || !dayConfig.bannedSystems.length) return false;
    const sys = pick(rng, dayConfig.bannedSystems);
    idDoc.fields['Menzil Sistemi'] = sys;
    t.flawNote = `Menzil sistemi (${sys}) yasaklı listede.`;
    return true;
  },
  missing_doc(t) {
    const idx = t.documents.findIndex((d) => d.type !== 'id');
    if (idx === -1) return false;
    const removed = t.documents.splice(idx, 1)[0];
    t.flawNote = `${removed.title} eksik.`;
    return true;
  },
  species_mismatch(t, rng) {
    const idDoc = t.documents.find((d) => d.type === 'id');
    if (!idDoc) return false;
    const others = SPECIES_LIST.filter((s) => s !== t.species);
    const fake = pick(rng, others);
    idDoc.fields['Tür'] = SPECIES_LABELS[fake];
    t.flawNote = 'Kimlikteki tür beyanı, yolcunun görünümüyle uyuşmuyor.';
    return true;
  },
  health_bad(t) {
    const doc = t.documents.find((d) => d.type === 'health');
    if (!doc) return false;
    doc.fields['Aşı Durumu'] = 'Eksik';
    t.flawNote = 'Sağlık sertifikası eksik aşı durumu gösteriyor.';
    return true;
  },
  contraband(t, rng, dayConfig, dayIndex) {
    if (!t.cargo) return false;
    const list = CONTRABAND_BY_DAY[Math.min(dayIndex, 5)] || [];
    if (!list.length) return false;
    const item = pick(rng, list);
    const idx = randInt(rng, 0, t.cargo.actual.length - 1);
    t.cargo.actual[idx] = item;
    t.flawNote = `Kargoda beyan edilmemiş "${item}" tespit edildi.`;
    return true;
  },
  refugee_pending(t) {
    const doc = t.documents.find((d) => d.type === 'permit_refugee');
    if (!doc || doc.fields['Başvuru Durumu'] !== 'Beklemede') return false;
    t.flawNote = 'Sığınma başvurusu henüz onaylanmamış (Beklemede).';
    return true;
  },
};

function applyRandomFlaw(t, rng, dayConfig, dayIndex, unlockedFlaws, forceFlaw = false) {
  const candidates = shuffle(rng, unlockedFlaws.slice());
  for (const flawType of candidates) {
    if (flawType === 'contraband' && !t.cargo) continue;
    if (flawType === 'refugee_pending' && t.purpose !== 'refugee') continue;
    if (flawType === 'health_bad' && !t.documents.some((d) => d.type === 'health')) continue;
    const applier = FLAW_APPLIERS[flawType];
    if (!applier) continue;
    const ok = applier(t, rng, dayConfig, dayIndex);
    if (ok) {
      t.flaw = flawType;
      t.correctAction = 'deny';
      return true;
    }
  }
  if (forceFlaw) {
    FLAW_APPLIERS.name_mismatch(t, rng);
    t.flaw = 'name_mismatch';
    t.correctAction = 'deny';
    return true;
  }
  return false;
}

export function generateDay(dayConfig, dayIndex, unlockedFlaws) {
  const rng = makeRng(`day-${dayIndex}-${Date.now()}-${Math.random()}`);
  const quota = dayConfig.quota;

  const travelers = Array.from({ length: quota }, () => baseTraveler(rng, dayConfig, dayIndex));

  const wanted = [];
  for (let i = 0; i < dayConfig.wantedCount; i++) {
    const species = pick(rng, SPECIES_LIST);
    wanted.push({ name: randomName(rng, species), idNo: randomIdNo(rng), species, seed: uid() });
  }

  const specials = [];
  wanted.forEach((w) => specials.push({ kind: 'wanted', data: w }));
  if (dayIndex >= 2) specials.push({ kind: 'bribe' });
  if (dayIndex >= 3) specials.push({ kind: 'test' });
  if (dayIndex >= 3) specials.push({ kind: 'signal' });
  if (dayIndex >= 4 && dayConfig.wantedCount > 1) specials.push({ kind: 'signal' });

  const order = shuffle(rng, Array.from({ length: quota }, (_, i) => i));
  const chosenIdx = order.slice(0, Math.min(specials.length, quota));

  chosenIdx.forEach((travelerIdx, si) => {
    const t = travelers[travelerIdx];
    const special = specials[si];
    if (special.kind === 'wanted') {
      const w = special.data;
      t.name = w.name;
      t.documents.forEach((d) => {
        if ('Ad Soyad' in d.fields) d.fields['Ad Soyad'] = w.name;
        if ('Kimlik No' in d.fields) d.fields['Kimlik No'] = w.idNo;
      });
      w.species = t.species;
      w.seed = t.seed;
      t.correctAction = 'detain';
      t.flaw = 'wanted_match';
      t.flawNote = 'Bu kişi Aranıyor İlanı ile eşleşiyor.';
      t.special = 'wanted';
    } else if (special.kind === 'bribe') {
      t.special = 'bribe';
      applyRandomFlaw(t, rng, dayConfig, dayIndex, unlockedFlaws, true);
    } else if (special.kind === 'test') {
      t.special = 'test';
      applyRandomFlaw(t, rng, dayConfig, dayIndex, unlockedFlaws, true);
    } else if (special.kind === 'signal') {
      t.special = 'signal';
      const code = `HS-${randInt(rng, 1000, 9999)}`;
      t.documents.forEach((d) => { if ('Kimlik No' in d.fields) d.fields['Kimlik No'] = code; });
      applyRandomFlaw(t, rng, dayConfig, dayIndex, unlockedFlaws, true);
    }
  });

  travelers.forEach((t) => {
    if (t.flaw || t.special) return;
    if (rng() < dayConfig.flawChance) applyRandomFlaw(t, rng, dayConfig, dayIndex, unlockedFlaws, false);
  });

  return { travelers: shuffle(rng, travelers), wanted };
}
