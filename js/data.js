// Kestra-9 oyun verisi: sistemler, isimler, gün kuralları, olaylar, bütçe.

export const SYSTEMS = [
  'Veyra', 'Doruk', 'Kaldera', 'Sirenka', 'Ombra', 'Talus',
  'Feridun', 'Ashkar', 'Nyxvel', 'Kobalt', 'Serath', 'Onur',
];

export const NAME_POOLS = {
  insan: {
    first: ['Renata', 'Doran', 'Ilkay', 'Marek', 'Sena', 'Bora', 'Yelin', 'Costa', 'Priya', 'Halden', 'Nesrin', 'Ovan'],
    last: ['Voss', 'Aral', 'Demirci', 'Kant', 'Boru', 'Yıldıray', 'Petek', 'Marsh', 'Onat', 'Kade'],
  },
  surungen: {
    full: ['Ssathkaar', 'Kraylvex', 'Voskrath', 'Zethumal', 'Ilrikoss', 'Naskavor', 'Threxul', 'Yovulkar', 'Ozrantik', 'Miralux'],
  },
  zarif: {
    full: ['Ithren Vaal', 'Sylara Meen', 'Doviel Quor', 'Ashen Lir', 'Vezra Noth', 'Kael Yssa', 'Ombeth Rue', 'Ilsevi Karn'],
  },
  tuylu: {
    full: ['Borrik Fenn', 'Ussa Marrow', 'Kettle Dun', 'Grovash Pell', 'Tikka Nurr', 'Fenwick Rho', 'Mossa Ked', 'Dundle Vark'],
  },
  android: {
    full: ['UNIT-77Q', 'SVN-402', 'KX-19', 'RLY-8', 'ORB-231', 'TEK-560', 'AXN-014', 'MEV-903'],
  },
};

export const PURPOSE_LABELS = {
  transit: 'Transit Geçişi',
  visitor: 'Ziyaret',
  worker: 'Çalışma',
  refugee: 'Sığınma',
  diplomat: 'Diplomatik Görev',
  trader: 'Kargo Taşımacılığı',
};

export const CARGO_ITEMS = [
  'Gıda Konservesi', 'Yedek Parça', 'Su Arıtıcı', 'Tohum Kasası', 'Elektronik Devre',
  'Tıbbi Malzeme', 'Maden Cevheri', 'Giyim Balyası', 'İletişim Modülü', 'Yakıt Hücresi',
];

export const CONTRABAND_BY_DAY = {
  1: [], 2: [],
  3: ['Ruhsatsız Silah', 'Sızıntılı İzotop Kutusu'],
  4: ['Ruhsatsız Silah', 'Sızıntılı İzotop Kutusu', 'Kayıt Dışı İlaç'],
  5: ['Ruhsatsız Silah', 'Sızıntılı İzotop Kutusu', 'Kayıt Dışı İlaç', 'Şifreli Veri Çekirdeği'],
};

export const DAY_CONFIGS = [
  {
    day: 1,
    title: 'İlk Vardiya',
    briefingText: 'Sektör Yönetimi\'ne hoş geldin, Memur. Bugünden itibaren Kestra-9 gişesi senin sorumluluğunda. Kurallar basit: kimlik ve geçiş izni birbirini tutmalı, izin süresi dolmamış olmalı ve Ashkar sistemi vatandaşlarına giriş yasak.',
    allowedPurposes: ['transit', 'visitor'],
    bannedSystems: ['Ashkar'],
    healthCertRequired: false,
    cargoEnabled: false,
    wantedCount: 0,
    refugeePolicy: null,
    newFlaws: ['expired_permit', 'name_mismatch', 'banned_system', 'missing_doc'],
    quota: 6,
    payPerCorrect: 6,
    flawChance: 0.5,
  },
  {
    day: 2,
    title: 'Yeni Yönetmelik',
    briefingText: 'Salgın önlemleri yürürlüğe girdi: tüm yolculardan Sağlık Sertifikası isteniyor, "Eksik" ibaresi olanlar reddedilecek. Ayrıca Nyxvel sistemi de yasak listesine eklendi. Çalışma izinli yolcular artık gişeden geçebilir.',
    allowedPurposes: ['transit', 'visitor', 'worker'],
    bannedSystems: ['Ashkar', 'Nyxvel'],
    healthCertRequired: true,
    cargoEnabled: false,
    wantedCount: 0,
    refugeePolicy: null,
    newFlaws: ['species_mismatch', 'health_bad', 'id_mismatch'],
    quota: 7,
    payPerCorrect: 6,
    flawChance: 0.55,
  },
  {
    day: 3,
    title: 'Kargo Denetimi',
    briefingText: 'Ashkar yasağı kaldırıldı ancak Talus sistemi artık yasaklı. Kargo taşıyıcıları gişemize yönlendirildi — manifestoyu taranan içerikle karşılaştır. Ayrıca bir arananın bugün istasyona geleceğine dair istihbarat var; kimliğini Kural Kitapçığı\'ndan kontrol et.',
    allowedPurposes: ['transit', 'visitor', 'worker', 'trader'],
    bannedSystems: ['Nyxvel', 'Talus'],
    healthCertRequired: true,
    cargoEnabled: true,
    wantedCount: 1,
    refugeePolicy: null,
    newFlaws: ['contraband', 'wanted_match'],
    quota: 7,
    payPerCorrect: 7,
    flawChance: 0.6,
    signalIntro: true,
  },
  {
    day: 4,
    title: 'Sığınma Krizi',
    briefingText: 'Kobalt sistemi yasak listesine eklendi. Sığınma başvurusu yapanlar sadece "Onaylı" damgalıysa kabul edilecek; "Beklemede" olanlar geri çevrilecek — istisnasız. İki arananın bugün geçmeye çalışacağı bildirildi.',
    allowedPurposes: ['transit', 'visitor', 'worker', 'trader', 'refugee'],
    bannedSystems: ['Nyxvel', 'Talus', 'Kobalt'],
    healthCertRequired: true,
    cargoEnabled: true,
    wantedCount: 2,
    refugeePolicy: 'deny_pending',
    newFlaws: ['refugee_pending'],
    quota: 8,
    payPerCorrect: 7,
    flawChance: 0.62,
  },
  {
    day: 5,
    title: 'Son Vardiya',
    briefingText: 'Serath ve Ombra sistemleri artık yasak. Bugün bir diplomat konvoyu geçecek — evrakları kusursuz görünse de listeleri kontrol etmeyi ihmal etme. Sektör Yönetimi bu hafta performansını değerlendirecek.',
    allowedPurposes: ['transit', 'visitor', 'worker', 'trader', 'refugee', 'diplomat'],
    bannedSystems: ['Talus', 'Kobalt', 'Serath', 'Ombra'],
    healthCertRequired: true,
    cargoEnabled: true,
    wantedCount: 2,
    refugeePolicy: 'deny_pending',
    newFlaws: [],
    quota: 9,
    payPerCorrect: 8,
    flawChance: 0.65,
  },
];

export const BUDGET_ITEMS = [
  { key: 'rent', label: 'Kira (Bölme 4-C)', cost: 20, required: true, desc: 'Ödenmezse tahliye riski doğar.' },
  { key: 'food', label: 'Yemek (kişi başı)', costPer: 6, desc: 'Aile üyelerinin açlık göstergesini yeniler.' },
  { key: 'heat', label: 'Isıtma', cost: 12, desc: 'Sağlık göstergesinin düşüşünü yavaşlatır.' },
  { key: 'medicine', label: 'İlaç (karaborsa)', cost: 18, desc: 'Hasta bir aile üyesini hızla iyileştirir.' },
];

export const FAMILY_INIT = [
  { id: 'ese', name: 'Rae', role: 'Eş', hunger: 80, health: 80, joinDay: 1 },
  { id: 'cocuk', name: 'Vey', role: 'Çocuk', hunger: 80, health: 80, joinDay: 1 },
  { id: 'anne', name: 'Ilka', role: 'Anne', hunger: 70, health: 60, joinDay: 4 },
];

// Anlatı olayları: belirli günlerde tetiklenen aile/ev kararları.
export const HOME_EVENTS = {
  2: {
    title: 'Vey Hasta',
    text: 'Vey ateşlendi. Karaborsadan ilaç almak 18 kredi tutar. Almazsan sağlığı düşmeye devam eder.',
    choices: [
      { label: 'İlaç Al (18 Kredi)', cost: 18, effect: { member: 'cocuk', health: 20 } },
      { label: 'Bekle, kendi geçer', cost: 0, effect: { member: 'cocuk', health: -10 } },
    ],
  },
  4: {
    title: 'Ilka\'nın Öksürüğü',
    text: 'Annen sürekli öksürüyor, ısıtmanın yetersizliğinden şüpheleniyorsun. Ekstra battaniye ve ilaç 15 kredi.',
    choices: [
      { label: 'Battaniye ve İlaç Al (15 Kredi)', cost: 15, effect: { member: 'anne', health: 18 } },
      { label: 'Şimdilik idare etsin', cost: 0, effect: { member: 'anne', health: -12 } },
    ],
  },
};

export const BRIBE_TEXT = {
  title: 'Fısıltı',
  text: 'Yolcu masaya bir kredi çubuğu bırakıyor: "Belgelerimdeki eksiği görmesen olmaz mı, memur bey?" 15 kredi teklif ediyor.',
};

export const SIGNAL_INTRO_NOTE = 'Vardiyadan sonra bir el yazısı not cebine bırakılmış: "Kimlik numarası HS- ile başlayanlar bizdendir. Onlara göz yumarsan sana ihtiyacımız olacak. -Sinyal"';
